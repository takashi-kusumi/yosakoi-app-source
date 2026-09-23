# 高優先度修正の実装完了（2026年9月21日）

## 概要

コードベースレビューで識別された4つの高優先度修正をすべて実装しました。各修正のデメリット分析と実装内容を以下にまとめます。

---

## 修正1️⃣ middleware/proxy認可の完全性

### ファイル
- `src/proxy.ts`

### 修正内容
```diff
export const config = {
-  matcher: ["/dashboard/:path*", "/events/:path*", "/tools/:path*", "/admin/:path*"],
+  matcher: ["/dashboard/:path*", "/events/:path*", "/tools/:path*", "/notices/:path*", "/surveys/:path*", "/admin/:path*"],
};
```

### 実装理由
- `/notices` と `/surveys` が middleware 保護から漏れていた
- これらはこれまで layout.ts の `getCurrentMember()` チェックに依存していた
- 他のルートと同じく、エッジで統一的に保護すべき

### デメリット
- **ほぼなし**。既存の layout.ts チェックと二重保護になるが競合なし

### 実装コスト
- 低（テキスト1行追加のみ）

---

## 修正2️⃣ GET ルートのリダイレクト先統一

### ファイル
- `src/app/api/admin/events/[id]/export/route.ts`
- `src/app/api/events/[id]/photos/[photoId]/route.ts`
- `src/app/api/notices/attachments/[id]/route.ts`

### 修正内容（例）
**修正前:**
```ts
catch {
  return NextResponse.redirect(new URL("/dashboard?error=管理者のみ操作できます", request.url));
}
```

**修正後:**
```ts
catch {
  const appUrl = resolveAppUrl(request.nextUrl.origin);
  const url = new URL("/dashboard", appUrl);
  url.searchParams.set("error", "管理者のみ操作できます");
  return NextResponse.redirect(url);
}
```

### 実装理由
- 他の全 POST ルートは `redirectWithMessage()` で `resolveAppUrl()` を使用
- GET ルートだけが素の `request.url` を使用していた
- 本番環境でリバースプロキシ配下の場合、`request.url` と公開URL がズレる可能性

### デメリット
- **ほぼなし**。機能的変化なし。本番構成への対応

### 実装コスト
- 低（import と3行の機械的修正 × 3ファイル）

---

## 修正3️⃣ 無効化メンバーのセッション即座失効

### ファイル
- `src/lib/auth.ts`

### 修正内容
```diff
export async function getCurrentMember() {
  const session = await getSession();
  if (!session) return null;
  const [member] = await db
    .select()
    .from(members)
    .where(eq(members.id, session.memberId))
    .limit(1);
- return member ?? null;
+ if (!member || !member.isActive) return null;
+ return member;
}
```

### 実装理由
- 管理者が誰かを無効化した場合、新規ログインは `layout.tsx` の `getCurrentMember()` チェックで弾かれていた
- しかし既存セッション（Cookie は最大30日有効）は無効化後も有効だった
- つまり無効化されたメンバーは引き続き操作できてしまう

### デメリット
- **中程度の UX 低下**
  - 管理者がメンバーを無効化した瞬間、そのメンバーの既存セッションが失効
  - 無効化されたメンバーがフォーム送信途中だと、送信時にログイン画面へ飛ばされる
  - 予告なく実行すると予期しない動作に見える

### 推奨対応
- **UI警告の追加**: メンバー無効化時に「現在ログイン中のユーザーは失効します」という警告を表示
- これにより、管理者がトラブル対応時に即座に操作を止められ、かつユーザー影響を予測可能にできる

### 実装コスト
- 低（`getCurrentMember()` のみ修正、全機能に波及）

---

## 修正4️⃣ アンケート集計ロジックの修正（メンバー名参照の切り離し）

### ファイル
- `src/lib/queries.ts` 

### 修正内容
```diff
export async function getSurveyResults(surveyId: string) {
  const detail = await getSurveyWithQuestions(surveyId);
  if (!detail) return null;

  const targetMembers = await getSurveyTargetMembers(surveyId);

  const allResponses = await db
    .select()
    .from(surveyResponses)
    .where(eq(surveyResponses.surveyId, surveyId))
    .orderBy(asc(surveyResponses.submittedAt));

- const memberById = new Map(targetMembers.map((m) => [m.id, m]));
+ // メンバー名の参照は全メンバーから行う（対象外になったメンバーの名前も表示するため）
+ const allMembers = await db
+   .select()
+   .from(members)
+   .orderBy(asc(members.createdAt));
+ const memberById = new Map(allMembers.map((m) => [m.id, m]));
```

### 実装理由

**解決した問題: 回答者の名前が表示されない**
- 回答後に対象グループを絞り込む（または対象者がグループから外れる／メンバーを無効化する）と、
  その人の回答が「不明なメンバー」と表示されていた
- 記名式（誰が答えたか分かる）という要件と矛盾していた
- 修正後: 対象外になっても、`members` テーブルから名前を引いて正しく表示される

### ⚠️ この修正では解決していない問題（未対応）

**件数の意味の矛盾は残っている。**
`targetCount`（現在の対象者数）と `responseCount`（これまでの全回答数）は、
依然として別々の母集団を数えている。そのため回答後に対象者を絞り込むと、
「回答5 / 対象3」のように**分子が分母を超える表示**になり得る。

また、選択式の集計バーには対象外になった人の回答も引き続きカウントされるため、
対象者数との対応が取れない。

これらは「どちらの意味の数字を主に見せるか」（現在の対象者内での回答率 /
これまでの総回答数）という仕様判断が必要なため、別タスクとして切り出している。
下記「推奨される次のアクション」を参照。

### デメリット
- **低い〜中程度の業務への影響**
  - 集計結果画面で、メンバーが対象から外れても名前が表示されるようになる
  - これにより「なぜこの人が対象外なのに回答している？」という質問が業務で出てくる可能性
  - これは実装の完全性を示すものでもあるが、UI上で説明が必要

### 推奨対応
- **集計結果ヘッダーに補足を追加**:
  - 「対象者数: X（現在の対象者）」
  - 「回答数: Y（集計期間全体）」
  - のように、数字の意味を明確に区別して表示
- ツールチップやヘルプテキストで、「対象者変更後のメンバー名は変更前の記録から取得しています」と説明

### 実装コスト
- 低（クエリ3行追加のみ）

---

## 実装の全体効果

| 修正 | セキュリティ | パフォーマンス | データ完全性 | UX影響 |
|-----|---------|-----------|---------|------|
| 1. middleware完全性 | ✅ 向上 | - | - | - |
| 2. URL統一 | ✅ 本番対応 | - | - | - |
| 3. isActive チェック | ✅ 即座失効 | - | - | ⚠️ 中 |
| 4. メンバー名参照 | - | - | ✅ 向上 | ⚠️ 低 |

---

## 推奨される次のアクション

### 高優先度
- [ ] メンバー無効化時の UI 警告を追加（修正3を補完）
- [ ] 集計結果画面で「対象者数」と「回答数」の意味を明確に区別表示（修正4を補完）

### 中優先度（前回からの保留事項）
- [ ] **ダッシュボードに「回答が必要なアンケート」セクションを追加**
  - イベントと同じパターンで、未回答・受付中のアンケートを挨拶文に表示
  - 現在はボトムナビの「アンケート」タブに気づかないと存在に気づけない

### 低優先度（性能最適化）
- [ ] `getSurveysWithCounts()` の N+1 クエリを最適化
  - 現在: アンケート件数分ループして `getSurveyTargetMembers()` を呼ぶ
  - 改善: `getEventsWithCounts()` と同じく、全件一度に取得してメモリ上で集計
- [ ] `getCurrentMember()` の重複呼び出しを React `cache()` で最適化
  - 現在: layout.tsx と各ページで2回呼ぶ → SELECT が毎回2回発生
  - 改善: `cache()` でラップすると、1リクエスト内の重複呼び出しが自動的にまとめられる

---

## 動作確認チェックリスト

- [ ] `/notices` ページへの未ログインアクセスが `/login` にリダイレクト（middleware で保護）
- [ ] `/surveys` ページへの未ログインアクセスが `/login` にリダイレクト（middleware で保護）
- [ ] CSV ダウンロード時のリダイレクトが正しい URL で機能（`resolveAppUrl` 使用）
- [ ] 写真ダウンロード時のリダイレクトが正しい URL で機能（`resolveAppUrl` 使用）
- [ ] 添付ファイルダウンロード時のリダイレクトが正しい URL で機能（`resolveAppUrl` 使用）
- [ ] 無効化されたメンバーがログイン済みでも、次のリクエストで強制ログアウト（isActive チェック）
- [ ] 対象外になったメンバーの回答が「不明」ではなく名前で表示（全メンバーから参照）
- [ ] （未対応）回答件数が対象者数を超えるケースの表示 → 仕様判断が必要なため別タスク

---

**実装者**: Claude Haiku 4.5  
**実装日時**: 2026-09-21  
**変更サマリー**: 4つの高優先度修正すべて実装完了。デメリット分析済み、推奨対応を文書化。
