# よさこいチーム管理アプリ

よさこいチームの練習・イベントの出欠をまとめるWebアプリです。スマートフォンのブラウザから使います（ホーム画面に追加するとアプリのように使えます）。

ログインはGoogleアカウント（Gmail）のみです。ログインするとそのまま使い始められ、初回だけフルネームの入力と使い方の説明（Welcome）が表示されます。**はじめてログインした人が自動的に管理者になります。**

## 主な機能

**メンバー**

- ホーム: 回答が必要な予定・次に参加する予定・未回答のアンケート・新着のお知らせ・カレンダー
- 予定（練習・よさこい祭り・飲み会/イベント）への出欠回答（参加/未定/不参加＋メモ）。ホームのカードから直接回答、「まとめて回答」で複数を一度に回答
- 予定の詳細: 参加状況（メモ付き）、体験者の追加、質問・コメント、写真の閲覧
- 予定タブ: カレンダー/リスト表示、種類での絞り込み、過去の予定の表示切り替え
- お知らせの閲覧（未読バッジ付き）、アンケートへの回答
- プロフィール（名前の変更）、使い方（画像付きチュートリアル）

**管理者**

- 予定の作成・編集・複製・削除、毎週の予定の一括作成、回答締切、参加費の支払い管理、CSVダウンロード
- 代理回答（口頭で聞いた出欠の入力）、直前の変更（前日以降・締切後の回答変更）の表示
- お知らせ（PDF・画像の添付）、アンケートの作成と集計
- メンバー管理（管理者の設定・利用停止）
- LINEに貼る告知文の作成（告知・リマインド・参加者への案内・予定一覧）
- Googleカレンダー連携（予定の作成・変更・削除を指定のカレンダーへ自動反映）
- 写真のアップロード（Cloudflare R2）

## 使っている技術

- [Next.js](https://nextjs.org/)（App Router） + TypeScript + Tailwind CSS
- [Drizzle ORM](https://orm.drizzle.team/) + PostgreSQL（Neon / Supabase など）
- Googleログイン（OAuth 2.0 / OpenID Connect）
- Google Calendar API（サービスアカウント。任意）
- 写真の保存先: [Cloudflare R2](https://www.cloudflare.com/developer-platform/products/r2/)（任意）
- デプロイ先: [Vercel](https://vercel.com/)

## セットアップ

アカウント作成からデプロイ・動作確認までの手順は [`SETUP_GUIDE.md`](./SETUP_GUIDE.md) にまとめています。

## ローカル開発

```bash
npm install
cp .env.example .env   # 値を埋める
npx drizzle-kit push   # テーブルを作成・更新
npm run dev            # http://localhost:3000
```

ローカルでGoogleログインを試すには、Google CloudのOAuthクライアントの「承認済みのリダイレクトURI」に
`http://localhost:3000/api/auth/google/callback` を追加し、`.env` の `APP_URL` を `http://localhost:3000` にしてください。

## 環境変数

| 名前 | 必須 | 内容 |
|---|---|---|
| `DATABASE_URL` | ○ | PostgreSQLの接続文字列 |
| `APP_URL` | ○ | アプリの公開URL（末尾スラッシュなし） |
| `SESSION_SECRET` | ○ | ログインセッションの署名用（32文字以上のランダムな文字列） |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | ○ | GoogleログインのOAuthクライアント |
| `GOOGLE_CALENDAR_ID` / `GOOGLE_SERVICE_ACCOUNT_JSON` | | Googleカレンダー連携（未設定なら連携しない） |
| `R2_ENDPOINT` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` | | 写真の保存先（未設定なら写真のアップロード不可） |

## ディレクトリ構成（主要なもの）

```
src/
  app/
    login/              Googleログイン画面
    welcome/            初回のフルネーム入力・使い方
    (app)/              ログイン必須のページ
      dashboard/         ホーム
      events/            予定の一覧・詳細・まとめて回答（answer/）
      notices/           お知らせ
      surveys/           アンケート
      me/ help/          プロフィール・使い方
      admin/             管理（予定・一括作成・お知らせ・アンケート・メンバー）
    api/                フォーム送信を受けるAPIルート
  components/           画面の部品
  db/schema.ts          データベーススキーマ（Drizzle）
  lib/                  認証・クエリ・Googleカレンダー連携・告知文の作成など
  proxy.ts              ログイン必須ページの保護
public/tutorial/        使い方の画像
```

## データモデル

- `members`: メンバー（Googleアカウントと1対1）。役割は `ADMIN` / `MEMBER`。体験者（`is_guest`）もここに入る
- `events`: 予定（種類・日時・終了時刻・場所・参加費・回答締切・GoogleカレンダーのID）
- `responses`: 予定ごとの回答（参加/未定/不参加・メモ・参加費の支払い・代理入力者）
- `response_changes`: 回答の変更履歴（直前の変更の表示に使う）
- `event_comments`: 予定ごとの質問・コメント
- `event_photos`: 予定ごとの写真（本体はR2、DBにはメタデータのみ）
- `notices` / `notice_attachments`: お知らせと添付ファイル（添付はDBに保存。1回の送信で合計4MBまで）
- `surveys` / `survey_questions` / `survey_options` / `survey_responses` / `survey_answers` / `survey_answer_options`: アンケート（メンバー全員が対象）
