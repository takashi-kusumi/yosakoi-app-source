よさこいチーム管理アプリの開発を、前のチャットから引き継ぎます。
以下の「概要」「実装済み機能・決定事項」「最新コード」「次の作業」を前提として把握したうえで、指示を待ってください。

---

## ■ アプリの概要・目的

よさこいチームのメンバー管理Webアプリ。スマートフォンのブラウザから使うことを前提としたモバイルファーストのPWAで、チーム運営で発生する「出欠の取りまとめ」「連絡」「持ち物管理」「アンケート」「部員登録・会費管理」を一箇所にまとめるのが目的。

- 認証はLINEログイン（OAuth 2.1）。**はじめてログインした人が自動的に管理者**になる（招待コード不要）
- 未回答者・回答済みの人を分けてLINEでリマインド送信できる
- デプロイ先はVercel、DBはPostgreSQL、写真ストレージはCloudflare R2

### 技術スタック

| 項目 | 内容 |
|---|---|
| フレームワーク | **Next.js 16.3.5**（App Router）+ React 19.2.8 + TypeScript |
| ORM | Drizzle ORM 0.45.2 + PostgreSQL（`pg`） |
| 認証 | LINEログイン（OAuth 2.1） / セッションは `jose` のJWTをhttpOnly Cookieに保存（30日） |
| 通知 | LINE Messaging API（プッシュメッセージ） |
| スタイル | Tailwind CSS v4 |
| 写真保存 | Cloudflare R2（S3互換、`@aws-sdk/client-s3`）。ブラウザから直接アップロード（presigned URL） |
| デプロイ | Vercel |

### ⚠️ 環境まわりの重要な注意

1. **Next.js 16 系なので、学習データにあるNext.jsとAPIや規約が違う可能性がある。** リポジトリ直下の `AGENTS.md` にも明記されており、コードを書く前に `node_modules/next/dist/docs/` の該当ガイドを読むこと。
2. **`middleware.ts` は Next.js 16 で `src/proxy.ts` にリネームされている**（エクスポートする関数名も `proxy`）。
3. このプロジェクトは **gitリポジトリではない**（`git init` されていない）。
4. 前のチャットの作業ディレクトリはクラウド上の一時環境のため、**新しいチャットにはソースが存在しない。** 全ソースが必要な場合は、別途お渡しするzipを添付してください。
5. **⚠️ 直近のスキーマ変更（会員種別・会費まわり）は、このセッションの作業環境にDB接続情報（`DATABASE_URL`）が無かったため、まだ実際のデータベースには反映していません。** 新しいチャットでは、まず本番／開発DBに対して `npx drizzle-kit push` を実行してスキーマを反映し、その後で下記の新機能の動作確認をお願いします。

---

## ■ これまでに実装した機能・決定事項

### 機能（メンバー向け）

- LINEログイン（初回ログイン時、最初の1人は自動的に「管理者・正部員」、以降は「体験（仮登録）」として開始）
- **正部員登録（`/register`）**：学年・パート（既存グループ機能を自己選択）・メールアドレス（入館証発行用、必須）を入力すると正部員に昇格。登録後も同じ画面から編集可能
- イベント（練習 / よさこい祭り / 飲み会）への参加・不参加の回答。カレンダー表示・種類別フィルタあり
- 道具の保有状況の更新（自分の分）
- お知らせの閲覧、添付ファイル（PDF・画像）のダウンロード
- イベント詳細画面での写真のアップロード・閲覧・削除（自分がアップロードしたものだけ削除可）
- アンケートへの回答（自分が対象のものだけ表示。受付中なら再回答で上書き可）
- **体験参加者（ゲスト）の追加**：正部員がイベント画面から名前だけで、LINEログイン不要の体験参加者をそのイベントの参加者として登録できる
- **イベント参加費の確認**：参加費が設定されたイベントでは、自分の支払い状況（支払済み/未払い）が表示される

### 機能（管理者向け）

- イベントの作成・編集・複製・締切、回答状況の確認、出欠CSVダウンロード（体験参加者の区分も列に含む）
- 未回答者／回答済みの人へのLINEリマインド送信（体験参加者はLINE未連携のため自動的にスキップされる）
- メンバーの権限変更（ADMIN / MEMBER）・有効無効の切り替え。一覧に正部員／体験の別、学年、メールアドレスを表示
- 道具マスタ管理（メンバーごとの保有状況を管理者が直接編集可能）
- お知らせの作成・編集・削除（イベントとの紐付け、ファイル添付）
- グループ管理（パートなどを登録し、メンバーを所属させる）
- アンケートの作成・編集・締切・削除・結果集計（自由記述の一覧表示、選択式は集計バー表示）。対象を「全員」または「特定グループ」に絞り込み、未回答者へLINEリマインド
- **イベント参加費の設定**：イベント作成・編集フォームで金額を任意設定。参加した人ごとに支払済み/未払いを切り替え可能
- **年会費管理（`/admin/fees`）**：年度ごとに正部員（体験登録中を除く）の金額・支払済みフラグ・支払日を記録。年度切り替えタブ、未作成分の一括作成機能あり

### アーキテクチャ上の決定事項（これを崩さないこと）

- **フォームはネイティブ `<form action method="POST">` + Route Handler。** クライアント側のfetch送信やServer Actionsは使っていない。アンケートの動的な質問ビルダーだけReactのクライアント状態を持つが、送信自体はhidden inputにJSONを埋めてネイティブformで行う
- **認可は2層。** エッジの `src/proxy.ts`（JWT検証・ADMIN判定、`/notices`・`/surveys`含む全ログイン必須パスをカバー）と、`src/app/(app)/layout.tsx` の `getCurrentMember()` によるフォールバック
- **API側の認可は `requireAdmin()` / `getCurrentMember()` に統一。** 失敗時は `redirectWithMessage()` でフラッシュメッセージ付きリダイレクト（303）
- **リダイレクト先URLは必ず `resolveAppUrl()` 経由。** 環境変数 `APP_URL` を優先し、無ければリクエストのoriginを使う（リバースプロキシ配下でのズレ対策）
- **IDはアプリ側で採番**（`src/lib/id.ts`）、全テーブル `text` 型の主キー
- **外部キーはカスケード削除を徹底。** 作成者参照など消えても困らないものだけ `set null`
- お知らせの添付ファイルは**DBに直接Base64で保存**（別ストレージ契約を不要にするため）。1ファイル4MB・1回の送信で合計4MBが上限（Vercelのリクエストサイズ上限に合わせている）
- イベント写真は枚数が多くなるので**R2に保存**し、DBにはメタデータのみ。アップロードはブラウザ→R2へ直接（Vercelを経由しない）。送信前にブラウザ側で長辺1600px・JPEG品質80%程度に圧縮
- R2の環境変数が未設定なら**写真機能だけ無効化**され、他機能には影響しない
- アンケートの**質問内容を編集すると既存回答は全削除**される（質問と回答の対応が壊れるのを防ぐための割り切り。編集画面に警告表示済み）。タイトル・説明・対象者だけの変更なら回答は残る。※イベント側は編集しても回答が残る仕様で、ここは意図的に非対称
- **`members.isGuest = true` のレコードはLINEアカウントを持たず、アプリにログインすることはない。** メンバー管理・グループ管理・道具管理・アンケート対象・「未回答者数」の分母からは一貫して除外し、追加されたイベントの参加者一覧・参加費管理にのみ現れる設計
- **`members.membershipStatus`（TRIAL / REGULAR）** は「正部員かどうか」を表し、`isActive`（有効/無効化）とは独立した軸。年会費管理の対象は「REGULARかつisActiveかつisGuestでない」人のみ

### 直近の作業①：コードベース全体レビューと高優先度修正（2026-09-21）

機能をつぎはぎで追加してきたため、全ファイルを通しでレビューした。**大きな設計崩壊はなし**。検出した高優先度の4件は修正済み・型チェッククリーン。

| # | 内容 | 状態 |
|---|---|---|
| 1 | `proxy.ts` の matcher に `/notices` と `/surveys` が抜けていた | ✅ 修正済 |
| 2 | GET系のファイル配信ルート3箇所だけ `resolveAppUrl` を通らず素の `request.url` を使っていた | ✅ 修正済 |
| 3 | 無効化(`isActive=false`)したメンバーの既存セッションが失効しなかった | ✅ 修正済（`getCurrentMember()`で`isActive`確認） |
| 4 | アンケート集計で、対象外になったメンバーの名前が「不明なメンバー」表示になっていた | ✅ 修正済（名前引き当てを全メンバーから行うよう変更） |

**⚠️ #4は「名前の表示」だけを直したもので、件数の意味の矛盾（`targetCount`と`responseCount`が別々の母集団）は未解決のまま。下記「次の作業」に積んである。**

### 直近の作業②：部員登録・会費管理機能の追加実装（2026-09-21、今回のセッション）

「体験（仮登録）／正部員」という会員ステータスの導入、正部員登録フォーム、ログイン不要のゲスト参加者追加、年会費管理、イベント参加費管理を新規実装した。設計判断はユーザーとの対話で以下の通り確定：

- 登録項目は学年・パート（既存グループ機能を流用）。メールアドレスは正部員登録時必須（入館証発行用）
- 年会費は金額・支払日まで記録する詳細管理
- イベント参加費は管理者がイベントごとに任意設定
- 体験参加者はほぼフル機能を利用可能、正部員登録は本人がいつでも進められる（強制ブロックなし）
- 体験参加者（ゲスト）は、LINEログイン前の人でも既存の正部員が名前だけで追加でき、後からの本人アカウントとの紐付けは行わない設計に確定

型チェック（`npx tsc --noEmit`）・ESLintともにクリーンな状態まで実装済み。**ただしこのセッションの作業環境にはDBがなく、実データでの動作確認は未実施。**

---

## ■ 現在の最新コード

設計判断が詰まっている中核ファイルと、今回追加した会員登録・会費管理まわりの新規ファイルを全量掲載する。それ以外のページ・APIルート・コンポーネント（計82ファイル・約6,900行）は分量が大きいため省略しているので、必要になったら都度聞いてください。

### ディレクトリ構成

```
src/
  app/
    login/                       LINEログイン画面
    (app)/                       ログイン必須のページ群（layout.tsxで認証チェック）
      dashboard/                  メンバーのホーム画面（正部員登録バナー表示）
      register/                   ★正部員登録フォーム
      events/                     イベント一覧・詳細・回答・体験参加者追加
      tools/                      道具の保有状況（自分の分）
      notices/                    お知らせ一覧・詳細
      surveys/                    アンケート一覧・回答
      admin/                      管理者メニュー
        events/                    イベント作成・回答状況・参加費管理・リマインド送信
        members/                   メンバーの権限/有効無効管理
        fees/                      ★年会費管理
        tools/                     道具マスタ管理・保有状況一覧
        notices/                   お知らせ作成・編集・削除
        groups/                    グループ管理
        surveys/                   アンケート作成・編集・結果集計
    api/                         フォーム送信を受けるRoute Handler群
      members/register/           ★正部員登録の送信先
      events/[id]/guests/         ★体験参加者の追加
      admin/fees/                 ★年会費の一括作成・個別更新
  components/                    TopBar, BottomNav, EventForm, NoticeForm,
                                 SurveyForm, SurveyQuestionBuilder, CalendarView,
                                 EventPhotoUpload, RespondForm, FlashMessage,
                                 MembershipStatusBanner（★新規） ほか
  db/
    schema.ts                    データベーススキーマ（Drizzle）★会員種別・会費まわり拡張
    index.ts                     DB接続
  lib/
    auth.ts                      セッション管理（★isActiveチェック追加）
    line.ts                      LINEログイン / Messaging API 連携 / resolveAppUrl
    queries.ts                   DBの読み取りクエリ（★会費・ゲスト対応で大幅拡張）
    formRedirect.ts              フォーム送信後のリダイレクト
    labels.ts                    表示ラベル・日付整形
    surveys.ts                   アンケートのフォーム解析ヘルパ
    storage.ts                   R2（S3互換）連携
    calendar.ts                  カレンダー表示用のロジック
    id.ts                        ID採番
  proxy.ts                       ルート保護（Next.js 16で middleware.ts から改称）
```

（★は今回のセッションで新規追加・大きく変更したもの）


### `package.json`

```json
{
  "name": "yosakoi-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.1136.0",
    "@aws-sdk/s3-request-presigner": "^3.1136.0",
    "drizzle-orm": "^0.45.2",
    "jose": "^6.2.10",
    "next": "^16.3.5",
    "pg": "^8.23.0",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "server-only": "^0.0.1"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/pg": "^8.23.1",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "drizzle-kit": "^0.31.10",
    "eslint": "^9",
    "eslint-config-next": "16.3.2",
    "s3rver": "^3.7.1",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

### `src/db/schema.ts`

```ts
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["ADMIN", "MEMBER"]);
export const eventTypeEnum = pgEnum("event_type", [
  "PRACTICE", // 練習
  "FESTIVAL", // よさこい祭り
  "PARTY", // 飲み会などイベント
]);
export const responseStatusEnum = pgEnum("response_status", [
  "ATTENDING",
  "NOT_ATTENDING",
]);
export const surveyQuestionTypeEnum = pgEnum("survey_question_type", [
  "TEXT", // 自由記述
  "SINGLE", // 単一選択
  "MULTI", // 複数選択
]);
export const membershipStatusEnum = pgEnum("membership_status", [
  "TRIAL", // 体験（仮登録）
  "REGULAR", // 正部員
]);

export const members = pgTable(
  "members",
  {
    id: text("id").primaryKey(),
    lineUserId: text("line_user_id").unique(),
    displayName: text("display_name").notNull(),
    pictureUrl: text("picture_url"),
    role: roleEnum("role").notNull().default("MEMBER"),
    isActive: boolean("is_active").notNull().default(true),
    // 正部員登録（学年・パート所属・入館証発行用メールアドレス）関連
    membershipStatus: membershipStatusEnum("membership_status").notNull().default("TRIAL"),
    email: text("email"),
    grade: text("grade"),
    // 体験参加者（LINEログインなし・既存の正部員がイベント画面から名前のみで追加）
    isGuest: boolean("is_guest").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("members_role_idx").on(table.role),
    index("members_is_guest_idx").on(table.isGuest),
  ]
);

export const events = pgTable(
  "events",
  {
    id: text("id").primaryKey(),
    type: eventTypeEnum("type").notNull(),
    title: text("title").notNull(),
    eventDate: timestamp("event_date", { withTimezone: true }),
    location: text("location"),
    description: text("description"),
    isOpen: boolean("is_open").notNull().default(true),
    // 参加費（円）。nullなら参加費なしのイベント
    feeAmount: integer("fee_amount"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("events_type_idx").on(table.type)]
);

export const responses = pgTable(
  "responses",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    status: responseStatusEnum("status").notNull(),
    respondedAt: timestamp("responded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // イベント参加費の支払い状況（events.feeAmountが設定されている場合のみ意味を持つ）
    feePaid: boolean("fee_paid").notNull().default(false),
    feePaidAt: timestamp("fee_paid_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("event_member_unique").on(table.eventId, table.memberId),
    index("responses_member_idx").on(table.memberId),
  ]
);

export const toolItems = pgTable("tool_items", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const memberTools = pgTable(
  "member_tools",
  {
    id: text("id").primaryKey(),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    toolItemId: text("tool_item_id")
      .notNull()
      .references(() => toolItems.id, { onDelete: "cascade" }),
    owned: boolean("owned").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("member_tool_unique").on(table.memberId, table.toolItemId),
    index("member_tools_tool_idx").on(table.toolItemId),
  ]
);

export const notices = pgTable(
  "notices",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    body: text("body"),
    eventId: text("event_id").references(() => events.id, { onDelete: "set null" }),
    createdBy: text("created_by").references(() => members.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("notices_created_at_idx").on(table.createdAt)]
);

export const noticeAttachments = pgTable(
  "notice_attachments",
  {
    id: text("id").primaryKey(),
    noticeId: text("notice_id")
      .notNull()
      .references(() => notices.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSize: integer("file_size").notNull(),
    // ファイル本体をBase64文字列として保存（Vercel Blob等の別サービス契約を不要にするため）
    dataBase64: text("data_base64").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("notice_attachments_notice_idx").on(table.noticeId)]
);

export const eventPhotos = pgTable(
  "event_photos",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    uploadedBy: text("uploaded_by").references(() => members.id, { onDelete: "set null" }),
    // オブジェクトストレージ（Cloudflare R2など、S3互換API）上のキー。ファイル本体はDBに保存しない
    objectKey: text("object_key").notNull().unique(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSize: integer("file_size").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("event_photos_event_idx").on(table.eventId)]
);

// ==================== グループ（パートなど、アンケート対象者の絞り込みに使う） ====================

export const groups = pgTable("groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memberGroups = pgTable(
  "member_groups",
  {
    id: text("id").primaryKey(),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("member_group_unique").on(table.memberId, table.groupId),
    index("member_groups_group_idx").on(table.groupId),
  ]
);

// ==================== 年会費（正部員のみ対象） ====================

export const membershipFees = pgTable(
  "membership_fees",
  {
    id: text("id").primaryKey(),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    // 年度（例: "2026"）
    fiscalYear: text("fiscal_year").notNull(),
    amount: integer("amount").notNull(),
    paid: boolean("paid").notNull().default(false),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("membership_fee_member_year_unique").on(table.memberId, table.fiscalYear),
    index("membership_fees_year_idx").on(table.fiscalYear),
  ]
);

// ==================== アンケート（Googleフォームのような自由設問アンケート） ====================

export const surveys = pgTable(
  "surveys",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    createdBy: text("created_by").references(() => members.id, { onDelete: "set null" }),
    // true: 全員対象 / false: target_groupsで指定したグループのみ対象
    targetAll: boolean("target_all").notNull().default(true),
    isOpen: boolean("is_open").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("surveys_created_at_idx").on(table.createdAt)]
);

export const surveyTargetGroups = pgTable(
  "survey_target_groups",
  {
    id: text("id").primaryKey(),
    surveyId: text("survey_id")
      .notNull()
      .references(() => surveys.id, { onDelete: "cascade" }),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("survey_target_group_unique").on(table.surveyId, table.groupId),
    index("survey_target_groups_group_idx").on(table.groupId),
  ]
);

export const surveyQuestions = pgTable(
  "survey_questions",
  {
    id: text("id").primaryKey(),
    surveyId: text("survey_id")
      .notNull()
      .references(() => surveys.id, { onDelete: "cascade" }),
    type: surveyQuestionTypeEnum("type").notNull(),
    questionText: text("question_text").notNull(),
    required: boolean("required").notNull().default(true),
    order: integer("order").notNull().default(0),
  },
  (table) => [index("survey_questions_survey_idx").on(table.surveyId)]
);

export const surveyOptions = pgTable(
  "survey_options",
  {
    id: text("id").primaryKey(),
    questionId: text("question_id")
      .notNull()
      .references(() => surveyQuestions.id, { onDelete: "cascade" }),
    order: integer("order").notNull().default(0),
    label: text("label").notNull(),
  },
  (table) => [index("survey_options_question_idx").on(table.questionId)]
);

export const surveyResponses = pgTable(
  "survey_responses",
  {
    id: text("id").primaryKey(),
    surveyId: text("survey_id")
      .notNull()
      .references(() => surveys.id, { onDelete: "cascade" }),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("survey_response_unique").on(table.surveyId, table.memberId),
    index("survey_responses_survey_idx").on(table.surveyId),
  ]
);

export const surveyAnswers = pgTable(
  "survey_answers",
  {
    id: text("id").primaryKey(),
    responseId: text("response_id")
      .notNull()
      .references(() => surveyResponses.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => surveyQuestions.id, { onDelete: "cascade" }),
    textAnswer: text("text_answer"),
  },
  (table) => [
    index("survey_answers_response_idx").on(table.responseId),
    index("survey_answers_question_idx").on(table.questionId),
  ]
);

export const surveyAnswerOptions = pgTable(
  "survey_answer_options",
  {
    id: text("id").primaryKey(),
    answerId: text("answer_id")
      .notNull()
      .references(() => surveyAnswers.id, { onDelete: "cascade" }),
    optionId: text("option_id")
      .notNull()
      .references(() => surveyOptions.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("survey_answer_options_answer_idx").on(table.answerId),
    index("survey_answer_options_option_idx").on(table.optionId),
  ]
);
```

### `src/db/index.ts`

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  var __yosakoiPgPool: Pool | undefined;
}

function shouldUseSsl() {
  const url = process.env.DATABASE_URL || "";
  if (process.env.PGSSL === "disable") return false;
  if (process.env.PGSSL === "require") return true;
  // Most managed Postgres providers (Neon / Supabase / Vercel Postgres)
  // require SSL and encode it in the connection string.
  return /sslmode=require|supabase\.co|neon\.tech|vercel-storage\.com/.test(
    url
  );
}

const pool =
  global.__yosakoiPgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: shouldUseSsl() ? { rejectUnauthorized: false } : undefined,
    max: 5,
  });

if (process.env.NODE_ENV !== "production") {
  global.__yosakoiPgPool = pool;
}

export const db = drizzle(pool, { schema });
export type Db = typeof db;
```

### `src/lib/id.ts`

```ts
import { randomUUID } from "crypto";

export function newId(): string {
  return randomUUID();
}
```

### `src/lib/auth.ts`

```ts
import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";

export const SESSION_COOKIE = "yosakoi_session";

export type SessionPayload = {
  memberId: string;
  role: "ADMIN" | "MEMBER";
};

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET が設定されていません。.env に32文字以上のランダムな文字列を設定してください。"
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (
      typeof payload.memberId === "string" &&
      (payload.role === "ADMIN" || payload.role === "MEMBER")
    ) {
      return { memberId: payload.memberId, role: payload.role };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getCurrentMember() {
  const session = await getSession();
  if (!session) return null;
  const [member] = await db
    .select()
    .from(members)
    .where(eq(members.id, session.memberId))
    .limit(1);
  if (!member || !member.isActive) return null;
  return member;
}

export async function requireAdmin() {
  const member = await getCurrentMember();
  if (!member || member.role !== "ADMIN") {
    throw new Error("管理者権限が必要です");
  }
  return member;
}
```

### `src/proxy.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "yosakoi_session";

function secretKey() {
  const secret = process.env.SESSION_SECRET || "";
  return new TextEncoder().encode(secret);
}

async function readSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (
      typeof payload.memberId === "string" &&
      (payload.role === "ADMIN" || payload.role === "MEMBER")
    ) {
      return { memberId: payload.memberId, role: payload.role as string };
    }
    return null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await readSession(request);

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin") && session.role !== "ADMIN") {
    const dashboardUrl = new URL("/dashboard", request.url);
    dashboardUrl.searchParams.set("error", "admin_only");
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/events/:path*", "/tools/:path*", "/notices/:path*", "/surveys/:path*", "/admin/:path*"],
};
```

### `src/lib/line.ts`

```ts
import "server-only";

export type LineProfile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
};

/**
 * このアプリが動いているURLを決定する。
 * 環境変数 APP_URL を優先し、無ければリクエストの origin を使う。
 */
export function resolveAppUrl(requestOrigin: string): string {
  return process.env.APP_URL?.replace(/\/$/, "") || requestOrigin;
}

export function buildLineAuthorizeUrl(params: {
  state: string;
  redirectUri: string;
}): string {
  const clientId = process.env.LINE_LOGIN_CHANNEL_ID;
  if (!clientId) {
    throw new Error("LINE_LOGIN_CHANNEL_ID が設定されていません");
  }
  const search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: params.redirectUri,
    state: params.state,
    scope: "profile openid",
    // LINE公式アカウント（Messaging API）と友だち追加を促す。
    // LINEログインチャンネルにOAが連携されていない場合は無視される。
    bot_prompt: "aggressive",
  });
  return `https://access.line.me/oauth2/v2.1/authorize?${search.toString()}`;
}

export async function exchangeLineCodeForToken(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; id_token?: string }> {
  const clientId = process.env.LINE_LOGIN_CHANNEL_ID;
  const clientSecret = process.env.LINE_LOGIN_CHANNEL_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "LINE_LOGIN_CHANNEL_ID / LINE_LOGIN_CHANNEL_SECRET が設定されていません"
    );
  }
  const res = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LINEトークン取得に失敗しました (${res.status}): ${text}`);
  }
  return res.json();
}

export async function fetchLineProfile(
  accessToken: string
): Promise<LineProfile> {
  const res = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LINEプロフィール取得に失敗しました (${res.status}): ${text}`);
  }
  return res.json();
}

/**
 * LINE Messaging API でユーザーにプッシュメッセージを送信する。
 * 送信先ユーザーは、LINE公式アカウントを友だち追加している必要がある。
 */
export async function pushLineMessage(
  to: string,
  text: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    return {
      ok: false,
      error: "LINE_MESSAGING_CHANNEL_ACCESS_TOKEN が設定されていません",
    };
  }
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to,
      messages: [{ type: "text", text }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: `LINE送信エラー (${res.status}): ${body}` };
  }
  return { ok: true };
}
```

### `src/lib/formRedirect.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { resolveAppUrl } from "@/lib/line";

/**
 * フォーム送信後のリダイレクト先を安全に決定する。
 * オープンリダイレクト対策として、サイト内の相対パスのみ許可する。
 */
export function safeRedirectTarget(value: FormDataEntryValue | null, fallback: string) {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export function redirectWithMessage(
  request: NextRequest,
  path: string,
  params?: Record<string, string>
) {
  const appUrl = resolveAppUrl(request.nextUrl.origin);
  const url = new URL(path, appUrl);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return NextResponse.redirect(url, { status: 303 });
}
```

### `src/lib/labels.ts`

```ts
export const EVENT_TYPE_LABELS: Record<string, string> = {
  PRACTICE: "練習",
  FESTIVAL: "よさこい祭り",
  PARTY: "飲み会・イベント",
};

export const EVENT_TYPE_OPTIONS = [
  { value: "PRACTICE", label: "練習" },
  { value: "FESTIVAL", label: "よさこい祭り" },
  { value: "PARTY", label: "飲み会・イベント" },
] as const;

export const VALID_EVENT_TYPES = ["PRACTICE", "FESTIVAL", "PARTY"] as const;
export type EventTypeValue = (typeof VALID_EVENT_TYPES)[number];

export const SURVEY_QUESTION_TYPE_LABELS: Record<string, string> = {
  TEXT: "自由記述",
  SINGLE: "単一選択",
  MULTI: "複数選択",
};

export const SURVEY_QUESTION_TYPE_OPTIONS = [
  { value: "TEXT", label: "自由記述" },
  { value: "SINGLE", label: "単一選択（1つだけ選ぶ）" },
  { value: "MULTI", label: "複数選択（複数選べる）" },
] as const;

export const VALID_SURVEY_QUESTION_TYPES = ["TEXT", "SINGLE", "MULTI"] as const;
export type SurveyQuestionType = (typeof VALID_SURVEY_QUESTION_TYPES)[number];

export function formatDateTime(date: Date | string | null): string {
  if (!date) return "日時未定";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(d);
}

export const STATUS_DOT_CLASS: Record<string, string> = {
  ATTENDING: "bg-orange-600",
  NOT_ATTENDING: "bg-neutral-400",
};
export const UNANSWERED_DOT_CLASS = "bg-amber-400";

export const STATUS_BADGE_CLASS: Record<string, string> = {
  ATTENDING: "bg-orange-100 text-orange-700",
  NOT_ATTENDING: "bg-neutral-100 text-neutral-500",
};
export const UNANSWERED_BADGE_CLASS = "bg-amber-50 text-amber-700";

export const STATUS_LABEL: Record<string, string> = {
  ATTENDING: "参加",
  NOT_ATTENDING: "不参加",
};

/** <input type="datetime-local"> の value 用に、JSTの "YYYY-MM-DDTHH:mm" を返す */
export function toDatetimeLocalValue(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/**
 * <input type="datetime-local"> の "YYYY-MM-DDTHH:mm" 文字列を、
 * JST（日本時間）の時刻として解釈しDateに変換する。
 * サーバーの実行タイムゾーンに依存させないための処理。
 */
export function parseJstDatetimeLocal(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) return null;
  const date = new Date(`${trimmed}:00+09:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "日時未定";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Tokyo",
  }).format(d);
}
```

### `src/lib/queries.ts`

```ts
import "server-only";
import { db } from "@/db";
import {
  members,
  events,
  responses,
  toolItems,
  memberTools,
  notices,
  noticeAttachments,
  eventPhotos,
  groups,
  memberGroups,
  membershipFees,
  surveys,
  surveyTargetGroups,
  surveyQuestions,
  surveyOptions,
  surveyResponses,
  surveyAnswers,
  surveyAnswerOptions,
} from "@/db/schema";
import { eq, and, asc, desc, inArray } from "drizzle-orm";

export async function getOpenEventsForMember(memberId: string) {
  return db
    .select({ event: events, response: responses })
    .from(events)
    .leftJoin(
      responses,
      and(eq(responses.eventId, events.id), eq(responses.memberId, memberId))
    )
    .where(eq(events.isOpen, true))
    .orderBy(asc(events.eventDate));
}

export async function getAllEventsForMember(memberId: string) {
  return db
    .select({ event: events, response: responses })
    .from(events)
    .leftJoin(
      responses,
      and(eq(responses.eventId, events.id), eq(responses.memberId, memberId))
    )
    .orderBy(desc(events.createdAt));
}

export async function getEventWithResponses(eventId: string) {
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  if (!event) return null;

  // 「対象者」の母集団はゲスト（体験参加者）を含めない。ゲストはイベントごとに
  // 任意で追加されるものであり、全イベント共通の回答対象ではないため。
  const activeMembers = await db
    .select()
    .from(members)
    .where(and(eq(members.isActive, true), eq(members.isGuest, false)))
    .orderBy(asc(members.createdAt));

  const eventResponses = await db
    .select()
    .from(responses)
    .where(eq(responses.eventId, eventId));

  const responseByMember = new Map(eventResponses.map((r) => [r.memberId, r]));

  const answered: { member: typeof activeMembers[number]; response: typeof eventResponses[number] }[] = [];
  const unanswered: typeof activeMembers = [];

  for (const m of activeMembers) {
    const r = responseByMember.get(m.id);
    if (r) {
      answered.push({ member: m, response: r });
    } else {
      unanswered.push(m);
    }
  }

  // このイベントに回答したゲスト（体験参加者）を、回答済み一覧に合流させる
  // （母集団には含めないが、参加者としては表示・参加費管理の対象にする）
  const respondedMemberIds = eventResponses.map((r) => r.memberId);
  const guestMembers = respondedMemberIds.length
    ? await db
        .select()
        .from(members)
        .where(and(inArray(members.id, respondedMemberIds), eq(members.isGuest, true)))
    : [];
  for (const gm of guestMembers) {
    const r = responseByMember.get(gm.id);
    if (r) answered.push({ member: gm, response: r });
  }

  return { event, answered, unanswered };
}

export async function getToolsForMember(memberId: string) {
  const items = await db
    .select()
    .from(toolItems)
    .orderBy(asc(toolItems.createdAt));
  const owned = await db
    .select()
    .from(memberTools)
    .where(eq(memberTools.memberId, memberId));
  const ownedMap = new Map(owned.map((o) => [o.toolItemId, o.owned]));
  return items.map((item) => ({
    item,
    owned: ownedMap.get(item.id) ?? false,
  }));
}

export async function getToolMatrix() {
  const items = await db
    .select()
    .from(toolItems)
    .orderBy(asc(toolItems.createdAt));
  const activeMembers = await db
    .select()
    .from(members)
    .where(and(eq(members.isActive, true), eq(members.isGuest, false)))
    .orderBy(asc(members.createdAt));
  const all = await db.select().from(memberTools);
  const map = new Map(all.map((mt) => [`${mt.memberId}:${mt.toolItemId}`, mt.owned]));
  return { items, members: activeMembers, map };
}

export async function getAllMembers() {
  return db
    .select()
    .from(members)
    .where(eq(members.isGuest, false))
    .orderBy(asc(members.createdAt));
}

// ==================== 年会費（正部員のみ対象） ====================

/** 指定年度の、現役正部員ごとの年会費支払い状況 */
export async function getMembershipFeeStatus(fiscalYear: string) {
  const regularMembers = await db
    .select()
    .from(members)
    .where(
      and(
        eq(members.membershipStatus, "REGULAR"),
        eq(members.isActive, true),
        eq(members.isGuest, false)
      )
    )
    .orderBy(asc(members.createdAt));

  const fees = await db
    .select()
    .from(membershipFees)
    .where(eq(membershipFees.fiscalYear, fiscalYear));
  const feeByMember = new Map(fees.map((f) => [f.memberId, f]));

  return regularMembers.map((member) => ({
    member,
    fee: feeByMember.get(member.id) ?? null,
  }));
}

/** これまでに年会費レコードが作られたことのある年度の一覧（新しい順） */
export async function getMembershipFeeFiscalYears(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ fiscalYear: membershipFees.fiscalYear })
    .from(membershipFees);
  return rows.map((r) => r.fiscalYear).sort((a, b) => b.localeCompare(a));
}

export async function getEventsWithCounts() {
  const allEvents = await db.select().from(events).orderBy(desc(events.createdAt));
  // 「未回答」の分母（activeMemberCount）にはゲスト（体験参加者）を含めない
  const activeMemberCount = (
    await db
      .select({ id: members.id })
      .from(members)
      .where(and(eq(members.isActive, true), eq(members.isGuest, false)))
  ).length;
  const allResponses = await db.select().from(responses);
  const guestIds = new Set(
    (await db.select({ id: members.id }).from(members).where(eq(members.isGuest, true))).map(
      (m) => m.id
    )
  );

  // ゲストの回答は attending/notAttending/total（=未回答計算に使う分子）には含めず、
  // 別枠の guestAttending としてカウントする
  const countMap = new Map<
    string,
    { attending: number; notAttending: number; total: number; guestAttending: number }
  >();
  for (const r of allResponses) {
    const c =
      countMap.get(r.eventId) ?? { attending: 0, notAttending: 0, total: 0, guestAttending: 0 };
    if (guestIds.has(r.memberId)) {
      if (r.status === "ATTENDING") c.guestAttending++;
    } else {
      if (r.status === "ATTENDING") c.attending++;
      else c.notAttending++;
      c.total++;
    }
    countMap.set(r.eventId, c);
  }

  return allEvents.map((e) => ({
    event: e,
    counts:
      countMap.get(e.id) ?? { attending: 0, notAttending: 0, total: 0, guestAttending: 0 },
    activeMemberCount,
  }));
}

export async function getEventOptionsForNotice() {
  return db
    .select({ id: events.id, title: events.title, eventDate: events.eventDate })
    .from(events)
    .orderBy(desc(events.eventDate));
}

export async function getNoticesList() {
  const rows = await db
    .select({ notice: notices, eventTitle: events.title, eventType: events.type })
    .from(notices)
    .leftJoin(events, eq(notices.eventId, events.id))
    .orderBy(desc(notices.createdAt));

  const attachmentRows = await db
    .select({ noticeId: noticeAttachments.noticeId })
    .from(noticeAttachments);
  const countMap = new Map<string, number>();
  for (const a of attachmentRows) {
    countMap.set(a.noticeId, (countMap.get(a.noticeId) ?? 0) + 1);
  }

  return rows.map((r) => ({ ...r, attachmentCount: countMap.get(r.notice.id) ?? 0 }));
}

export async function getRecentNotices(limit = 2) {
  return db
    .select({ notice: notices, eventTitle: events.title })
    .from(notices)
    .leftJoin(events, eq(notices.eventId, events.id))
    .orderBy(desc(notices.createdAt))
    .limit(limit);
}

export async function getNoticeWithAttachments(noticeId: string) {
  const [row] = await db
    .select({ notice: notices, eventTitle: events.title, authorName: members.displayName })
    .from(notices)
    .leftJoin(events, eq(notices.eventId, events.id))
    .leftJoin(members, eq(notices.createdBy, members.id))
    .where(eq(notices.id, noticeId))
    .limit(1);
  if (!row) return null;

  const attachments = await db
    .select({
      id: noticeAttachments.id,
      fileName: noticeAttachments.fileName,
      mimeType: noticeAttachments.mimeType,
      fileSize: noticeAttachments.fileSize,
    })
    .from(noticeAttachments)
    .where(eq(noticeAttachments.noticeId, noticeId))
    .orderBy(asc(noticeAttachments.createdAt));

  return { ...row, attachments };
}

export async function getEventPhotos(eventId: string) {
  return db
    .select({
      id: eventPhotos.id,
      objectKey: eventPhotos.objectKey,
      fileName: eventPhotos.fileName,
      mimeType: eventPhotos.mimeType,
      fileSize: eventPhotos.fileSize,
      uploadedBy: eventPhotos.uploadedBy,
      uploaderName: members.displayName,
      createdAt: eventPhotos.createdAt,
    })
    .from(eventPhotos)
    .leftJoin(members, eq(eventPhotos.uploadedBy, members.id))
    .where(eq(eventPhotos.eventId, eventId))
    .orderBy(desc(eventPhotos.createdAt));
}


// ==================== グループ ====================

export async function getAllGroups() {
  return db.select().from(groups).orderBy(asc(groups.createdAt));
}

export async function getGroupMatrix() {
  const allGroups = await getAllGroups();
  const activeMembers = await db
    .select()
    .from(members)
    .where(and(eq(members.isActive, true), eq(members.isGuest, false)))
    .orderBy(asc(members.createdAt));
  const links = await db.select().from(memberGroups);
  const map = new Map<string, boolean>();
  for (const l of links) map.set(`${l.memberId}:${l.groupId}`, true);
  return { groups: allGroups, members: activeMembers, map };
}

export async function getMemberGroupIds(memberId: string): Promise<Set<string>> {
  const links = await db
    .select({ groupId: memberGroups.groupId })
    .from(memberGroups)
    .where(eq(memberGroups.memberId, memberId));
  return new Set(links.map((l) => l.groupId));
}

// ==================== アンケート ====================

async function getSurveyTargetGroupIds(surveyId: string): Promise<string[]> {
  const rows = await db
    .select({ groupId: surveyTargetGroups.groupId })
    .from(surveyTargetGroups)
    .where(eq(surveyTargetGroups.surveyId, surveyId));
  return rows.map((r) => r.groupId);
}

/** そのアンケートの対象者（有効なメンバーのみ、ゲストは対象外）を返す */
export async function getSurveyTargetMembers(surveyId: string) {
  const [survey] = await db.select().from(surveys).where(eq(surveys.id, surveyId)).limit(1);
  if (!survey) return [];
  const activeMembers = await db
    .select()
    .from(members)
    .where(and(eq(members.isActive, true), eq(members.isGuest, false)))
    .orderBy(asc(members.createdAt));

  if (survey.targetAll) return activeMembers;

  const targetGroupIds = new Set(await getSurveyTargetGroupIds(surveyId));
  if (targetGroupIds.size === 0) return [];

  const links = await db.select().from(memberGroups);
  const memberIdsInTargetGroups = new Set(
    links.filter((l) => targetGroupIds.has(l.groupId)).map((l) => l.memberId)
  );
  return activeMembers.filter((m) => memberIdsInTargetGroups.has(m.id));
}

/** メンバー向け：自分が対象になっているアンケートの一覧（回答済みかどうか付き） */
export async function getSurveysForMember(memberId: string) {
  const allSurveys = await db.select().from(surveys).orderBy(desc(surveys.createdAt));
  if (allSurveys.length === 0) return [];

  const myGroupIds = await getMemberGroupIds(memberId);
  const allTargetLinks = await db.select().from(surveyTargetGroups);
  const targetGroupsBySurvey = new Map<string, string[]>();
  for (const l of allTargetLinks) {
    const list = targetGroupsBySurvey.get(l.surveyId) ?? [];
    list.push(l.groupId);
    targetGroupsBySurvey.set(l.surveyId, list);
  }

  const myResponses = await db
    .select({ surveyId: surveyResponses.surveyId })
    .from(surveyResponses)
    .where(eq(surveyResponses.memberId, memberId));
  const answeredSurveyIds = new Set(myResponses.map((r) => r.surveyId));

  return allSurveys
    .filter((s) => {
      if (s.targetAll) return true;
      const targetGroupIds = targetGroupsBySurvey.get(s.id) ?? [];
      return targetGroupIds.some((gId) => myGroupIds.has(gId));
    })
    .map((s) => ({ survey: s, answered: answeredSurveyIds.has(s.id) }));
}

export async function getSurveysWithCounts() {
  const allSurveys = await db.select().from(surveys).orderBy(desc(surveys.createdAt));
  const allResponses = await db.select().from(surveyResponses);
  const responseCountBySurvey = new Map<string, number>();
  for (const r of allResponses) {
    responseCountBySurvey.set(r.surveyId, (responseCountBySurvey.get(r.surveyId) ?? 0) + 1);
  }

  const results = [];
  for (const survey of allSurveys) {
    const targetMembers = await getSurveyTargetMembers(survey.id);
    results.push({
      survey,
      responseCount: responseCountBySurvey.get(survey.id) ?? 0,
      targetCount: targetMembers.length,
    });
  }
  return results;
}

export async function getSurveyWithQuestions(surveyId: string) {
  const [survey] = await db.select().from(surveys).where(eq(surveys.id, surveyId)).limit(1);
  if (!survey) return null;

  const questions = await db
    .select()
    .from(surveyQuestions)
    .where(eq(surveyQuestions.surveyId, surveyId))
    .orderBy(asc(surveyQuestions.order));

  const questionIds = questions.map((q) => q.id);
  const options = questionIds.length
    ? await db
        .select()
        .from(surveyOptions)
        .where(inArray(surveyOptions.questionId, questionIds))
        .orderBy(asc(surveyOptions.order))
    : [];
  const optionsByQuestion = new Map<string, typeof options>();
  for (const o of options) {
    const list = optionsByQuestion.get(o.questionId) ?? [];
    list.push(o);
    optionsByQuestion.set(o.questionId, list);
  }

  const targetGroupIds = await getSurveyTargetGroupIds(surveyId);

  return {
    survey,
    targetGroupIds,
    questions: questions.map((q) => ({
      ...q,
      options: optionsByQuestion.get(q.id) ?? [],
    })),
  };
}

/** メンバー向け：自分の既存回答（再編集用のプリフィル） */
export async function getMemberSurveyResponse(surveyId: string, memberId: string) {
  const [response] = await db
    .select()
    .from(surveyResponses)
    .where(and(eq(surveyResponses.surveyId, surveyId), eq(surveyResponses.memberId, memberId)))
    .limit(1);
  if (!response) return null;

  const answers = await db
    .select()
    .from(surveyAnswers)
    .where(eq(surveyAnswers.responseId, response.id));

  const answerIds = answers.map((a) => a.id);
  const selectedOptions = answerIds.length
    ? await db
        .select()
        .from(surveyAnswerOptions)
        .where(inArray(surveyAnswerOptions.answerId, answerIds))
    : [];
  const optionIdsByAnswer = new Map<string, string[]>();
  for (const so of selectedOptions) {
    const list = optionIdsByAnswer.get(so.answerId) ?? [];
    list.push(so.optionId);
    optionIdsByAnswer.set(so.answerId, list);
  }

  const byQuestionId = new Map<
    string,
    { textAnswer: string | null; optionIds: string[] }
  >();
  for (const a of answers) {
    byQuestionId.set(a.questionId, {
      textAnswer: a.textAnswer,
      optionIds: optionIdsByAnswer.get(a.id) ?? [],
    });
  }

  return { response, byQuestionId };
}

/** そのアンケートにすでに回答が1件でもあるか */
export async function getSurveyResponseCount(surveyId: string): Promise<number> {
  const rows = await db
    .select({ id: surveyResponses.id })
    .from(surveyResponses)
    .where(eq(surveyResponses.surveyId, surveyId));
  return rows.length;
}

/** 管理者向け：アンケートの集計結果 */
export async function getSurveyResults(surveyId: string) {
  const detail = await getSurveyWithQuestions(surveyId);
  if (!detail) return null;

  const targetMembers = await getSurveyTargetMembers(surveyId);

  const allResponses = await db
    .select()
    .from(surveyResponses)
    .where(eq(surveyResponses.surveyId, surveyId))
    .orderBy(asc(surveyResponses.submittedAt));

  // メンバー名の参照は全メンバーから行う（対象外になったメンバーの名前も表示するため）
  const allMembers = await db
    .select()
    .from(members)
    .orderBy(asc(members.createdAt));
  const memberById = new Map(allMembers.map((m) => [m.id, m]));
  const respondedMemberIds = new Set(allResponses.map((r) => r.memberId));
  const unansweredMembers = targetMembers.filter((m) => !respondedMemberIds.has(m.id));

  const responseIds = allResponses.map((r) => r.id);
  const allAnswers = responseIds.length
    ? await db.select().from(surveyAnswers).where(inArray(surveyAnswers.responseId, responseIds))
    : [];
  const answerIds = allAnswers.map((a) => a.id);
  const allSelectedOptions = answerIds.length
    ? await db
        .select()
        .from(surveyAnswerOptions)
        .where(inArray(surveyAnswerOptions.answerId, answerIds))
    : [];

  const optionIdsByAnswerId = new Map<string, string[]>();
  for (const so of allSelectedOptions) {
    const list = optionIdsByAnswerId.get(so.answerId) ?? [];
    list.push(so.optionId);
    optionIdsByAnswerId.set(so.answerId, list);
  }

  const responseById = new Map(allResponses.map((r) => [r.id, r]));

  const questionResults = detail.questions.map((q) => {
    const answersForQuestion = allAnswers.filter((a) => a.questionId === q.id);

    if (q.type === "TEXT") {
      const items = answersForQuestion
        .filter((a) => a.textAnswer && a.textAnswer.trim())
        .map((a) => {
          const response = responseById.get(a.responseId);
          const member = response ? memberById.get(response.memberId) : undefined;
          return {
            memberName: member?.displayName ?? "不明なメンバー",
            text: a.textAnswer ?? "",
          };
        });
      return { question: q, kind: "TEXT" as const, items };
    }

    const countByOption = new Map<string, number>();
    for (const a of answersForQuestion) {
      const optionIds = optionIdsByAnswerId.get(a.id) ?? [];
      for (const optId of optionIds) {
        countByOption.set(optId, (countByOption.get(optId) ?? 0) + 1);
      }
    }
    const options = q.options.map((o) => ({
      option: o,
      count: countByOption.get(o.id) ?? 0,
    }));
    return { question: q, kind: "CHOICE" as const, options, answeredCount: answersForQuestion.length };
  });

  return {
    survey: detail.survey,
    targetCount: targetMembers.length,
    responseCount: allResponses.length,
    unansweredMembers,
    questionResults,
  };
}
```

### `src/app/(app)/layout.tsx`

```tsx
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const member = await getCurrentMember();
  if (!member) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <TopBar displayName={member.displayName} role={member.role} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-5">
        {children}
      </main>
      <BottomNav isAdmin={member.role === "ADMIN"} />
    </div>
  );
}
```

### `src/app/api/auth/line/callback/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { exchangeLineCodeForToken, fetchLineProfile, resolveAppUrl } from "@/lib/line";
import { createSession } from "@/lib/auth";
import { newId } from "@/lib/id";

export async function GET(request: NextRequest) {
  const appUrl = resolveAppUrl(request.nextUrl.origin);
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const lineError = searchParams.get("error");
  const savedState = request.cookies.get("line_oauth_state")?.value;

  const fail = (message: string) =>
    NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(message)}`, appUrl)
    );

  if (lineError) {
    return fail(`LINEログインがキャンセルされました (${lineError})`);
  }
  if (!code || !state || !savedState || state !== savedState) {
    return fail("ログイン処理の検証に失敗しました。もう一度お試しください。");
  }

  try {
    const redirectUri = `${appUrl}/api/auth/line/callback`;
    const tokenResult = await exchangeLineCodeForToken(code, redirectUri);
    const profile = await fetchLineProfile(tokenResult.access_token);

    const [existing] = await db
      .select()
      .from(members)
      .where(eq(members.lineUserId, profile.userId))
      .limit(1);

    let member = existing;

    if (!member) {
      // まだ管理者が一人もいない場合、最初にログインした人が自動的に管理者になる。
      const existingAdmins = await db
        .select({ id: members.id })
        .from(members)
        .where(eq(members.role, "ADMIN"))
        .limit(1);
      const hasAdmin = existingAdmins.length > 0;

      const [created] = await db
        .insert(members)
        .values({
          id: newId(),
          lineUserId: profile.userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
          role: hasAdmin ? "MEMBER" : "ADMIN",
          // 最初のログイン者（自動的に管理者になる人）はチームの立ち上げ者なので、
          // 体験登録を挟まず最初から正部員として扱う。それ以外は体験（仮登録）から開始する。
          membershipStatus: hasAdmin ? "TRIAL" : "REGULAR",
        })
        .returning();
      member = created;
    } else if (member.pictureUrl !== profile.pictureUrl) {
      const [updated] = await db
        .update(members)
        .set({ pictureUrl: profile.pictureUrl, updatedAt: new Date() })
        .where(eq(members.id, member.id))
        .returning();
      member = updated;
    }

    if (!member.isActive) {
      return fail("アカウントが無効化されています。管理者にご連絡ください。");
    }

    await createSession({ memberId: member.id, role: member.role });

    const response = NextResponse.redirect(new URL("/dashboard", appUrl));
    response.cookies.delete("line_oauth_state");
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "ログインに失敗しました";
    return fail(message);
  }
}
```

### `src/components/MembershipStatusBanner.tsx`

```tsx
import Link from "next/link";

export function MembershipStatusBanner({
  membershipStatus,
}: {
  membershipStatus: "TRIAL" | "REGULAR";
}) {
  if (membershipStatus !== "TRIAL") return null;

  return (
    <Link
      href="/register"
      className="flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm shadow-sm"
    >
      <span className="font-semibold text-orange-800">
        正部員登録がまだです。学年・パート・メールアドレスを登録しましょう
      </span>
      <span className="shrink-0 text-xs text-orange-600">登録する ›</span>
    </Link>
  );
}
```

### `src/app/(app)/register/page.tsx`

```tsx
import { getCurrentMember } from "@/lib/auth";
import { getAllGroups, getMemberGroupIds } from "@/lib/queries";
import { FlashMessage } from "@/components/FlashMessage";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const member = await getCurrentMember();
  if (!member) return null;

  const [groups, myGroupIds] = await Promise.all([
    getAllGroups(),
    getMemberGroupIds(member.id),
  ]);

  const isRegular = member.membershipStatus === "REGULAR";

  return (
    <div className="space-y-5">
      <FlashMessage ok={ok} error={error} />

      <div>
        <h1 className="text-lg font-bold text-neutral-900">
          {isRegular ? "正部員情報の編集" : "正部員登録"}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {isRegular
            ? "学年・パート・メールアドレスを編集できます。"
            : "学年・パート・メールアドレスを入力すると、正部員として登録されます。メールアドレスは練習場所の入館証発行に使用します。"}
        </p>
      </div>

      <form
        action="/api/members/register"
        method="POST"
        className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
      >
        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-600">学年</label>
          <input
            type="text"
            name="grade"
            defaultValue={member.grade ?? ""}
            placeholder="例: 大学2年"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-600">
            メールアドレス（入館証発行に使用）
          </label>
          <input
            type="email"
            name="email"
            required
            defaultValue={member.email ?? ""}
            placeholder="example@mail.com"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-600">
            パート（複数選択可）
          </label>
          {groups.length === 0 ? (
            <p className="text-xs text-neutral-400">
              まだグループが登録されていません。管理者にご確認ください。
            </p>
          ) : (
            <div className="space-y-1.5">
              {groups.map((g) => (
                <label
                  key={g.id}
                  className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="groupIds"
                    value={g.id}
                    defaultChecked={myGroupIds.has(g.id)}
                    className="h-4 w-4"
                  />
                  {g.name}
                </label>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white"
        >
          {isRegular ? "更新する" : "正部員登録を完了する"}
        </button>
      </form>
    </div>
  );
}
```

### `src/app/api/members/register/route.ts`

```ts
import { NextRequest } from "next/server";
import { db } from "@/db";
import { members, memberGroups } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getCurrentMember } from "@/lib/auth";
import { newId } from "@/lib/id";
import { redirectWithMessage } from "@/lib/formRedirect";

export async function POST(request: NextRequest) {
  const member = await getCurrentMember();
  if (!member) {
    return redirectWithMessage(request, "/login");
  }

  const formData = await request.formData();
  const grade = String(formData.get("grade") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const groupIds = formData.getAll("groupIds").map((v) => String(v));

  if (!email) {
    return redirectWithMessage(request, "/register", {
      error: "メールアドレスを入力してください",
    });
  }

  await db
    .update(members)
    .set({
      grade: grade || null,
      email,
      membershipStatus: "REGULAR",
      updatedAt: new Date(),
    })
    .where(eq(members.id, member.id));

  // 所属グループ（パート）を選択内容に合わせて入れ替える
  const currentLinks = await db
    .select()
    .from(memberGroups)
    .where(eq(memberGroups.memberId, member.id));
  const currentGroupIds = new Set(currentLinks.map((l) => l.groupId));
  const nextGroupIds = new Set(groupIds);

  const toRemove = currentLinks.filter((l) => !nextGroupIds.has(l.groupId));
  const toAddGroupIds = groupIds.filter((id) => !currentGroupIds.has(id));

  if (toRemove.length > 0) {
    await db.delete(memberGroups).where(
      and(
        eq(memberGroups.memberId, member.id),
        inArray(
          memberGroups.groupId,
          toRemove.map((l) => l.groupId)
        )
      )
    );
  }
  if (toAddGroupIds.length > 0) {
    await db
      .insert(memberGroups)
      .values(toAddGroupIds.map((groupId) => ({ id: newId(), memberId: member.id, groupId })));
  }

  return redirectWithMessage(request, "/dashboard", {
    ok:
      member.membershipStatus === "REGULAR"
        ? "登録情報を更新しました"
        : "正部員登録が完了しました",
  });
}
```

### `src/app/(app)/dashboard/page.tsx`

```tsx
import Link from "next/link";
import { getCurrentMember } from "@/lib/auth";
import { getOpenEventsForMember, getToolsForMember, getRecentNotices } from "@/lib/queries";
import { MembershipStatusBanner } from "@/components/MembershipStatusBanner";
import { EVENT_TYPE_LABELS, formatDateTime } from "@/lib/labels";
import { RespondForm } from "@/components/RespondForm";
import { FlashMessage } from "@/components/FlashMessage";
import { jstTodayKey, jstDateKey } from "@/lib/calendar";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const member = await getCurrentMember();
  if (!member) return null;

  const allOpenEvents = await getOpenEventsForMember(member.id);
  // ホームは「これから回答すべきもの」だけを表示する。日付が過ぎたまま締切忘れのイベントは
  // /events (イベント一覧)の「過去のイベントを表示」から確認できる
  const todayKey = jstTodayKey();
  const openEvents = allOpenEvents.filter(
    (row) => !row.event.eventDate || jstDateKey(row.event.eventDate) >= todayKey
  );
  const tools = await getToolsForMember(member.id);
  const recentNotices = await getRecentNotices(2);
  const unownedCount = tools.filter((t) => !t.owned).length;
  const unanswered = openEvents.filter((row) => !row.response);

  return (
    <div className="space-y-6">
      <FlashMessage ok={ok} error={error} />

      <MembershipStatusBanner membershipStatus={member.membershipStatus} />

      <section>
        <h1 className="text-lg font-bold text-neutral-900">
          こんにちは、{member.displayName}さん
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {unanswered.length > 0
            ? `未回答のイベントが ${unanswered.length} 件あります`
            : "未回答のイベントはありません"}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-700">回答が必要なイベント</h2>
        {openEvents.length === 0 && (
          <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-400">
            現在募集中のイベントはありません
          </p>
        )}
        {openEvents.map(({ event, response }) => (
          <div key={event.id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                {EVENT_TYPE_LABELS[event.type] ?? event.type}
              </span>
              <Link href={`/events/${event.id}`} className="text-xs text-neutral-400">
                詳細
              </Link>
            </div>
            <p className="font-semibold text-neutral-900">{event.title}</p>
            <p className="text-sm text-neutral-500">{formatDateTime(event.eventDate)}</p>
            <p className="mb-3 flex items-center gap-1 text-xs text-neutral-400">
              {event.location && (
                <>
                  <span aria-hidden>📍</span>
                  {event.location}
                </>
              )}
            </p>
            <RespondForm
              eventId={event.id}
              currentStatus={response?.status}
              redirectTo="/dashboard"
            />
          </div>
        ))}
      </section>

      {recentNotices.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-700">最新のお知らせ</h2>
            <Link href="/notices" className="text-xs text-neutral-400">
              すべて見る ›
            </Link>
          </div>
          <ul className="space-y-2">
            {recentNotices.map(({ notice, eventTitle }) => (
              <li key={notice.id}>
                <Link
                  href={`/notices/${notice.id}`}
                  className="block rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm"
                >
                  {eventTitle && (
                    <span className="mb-1 inline-block rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                      {eventTitle}
                    </span>
                  )}
                  <p className="font-semibold text-neutral-900">{notice.title}</p>
                  <p className="text-xs text-neutral-400">{formatDateTime(notice.createdAt)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <Link
          href="/tools"
          className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm"
        >
          <span className="text-sm font-semibold text-neutral-700">道具の保有状況</span>
          <span className="text-xs text-neutral-400">
            {unownedCount === 0 ? "すべて保有済み" : `未保有 ${unownedCount} 件`} ›
          </span>
        </Link>
      </section>
    </div>
  );
}
```

### `src/app/api/events/[id]/guests/route.ts`

```ts
import { NextRequest } from "next/server";
import { db } from "@/db";
import { events, members, responses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentMember } from "@/lib/auth";
import { newId } from "@/lib/id";
import { redirectWithMessage } from "@/lib/formRedirect";

/**
 * 体験参加者（ゲスト）をイベントに追加する。
 * LINEログインしていない人でも、既存の正部員が名前だけでこのイベントの参加者として登録できる。
 * 作成されたゲストはアプリにログインすることはなく、このイベントの参加記録としてのみ存在する。
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await context.params;
  const member = await getCurrentMember();
  if (!member) {
    return redirectWithMessage(request, "/login");
  }
  if (member.membershipStatus !== "REGULAR") {
    return redirectWithMessage(request, `/events/${eventId}`, {
      error: "体験参加者の追加は正部員のみ行えます",
    });
  }

  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) {
    return redirectWithMessage(request, "/events", { error: "イベントが見つかりません" });
  }
  if (!event.isOpen) {
    return redirectWithMessage(request, `/events/${eventId}`, {
      error: "このイベントは回答受付を締め切っています",
    });
  }

  const formData = await request.formData();
  const displayName = String(formData.get("displayName") || "").trim();
  if (!displayName) {
    return redirectWithMessage(request, `/events/${eventId}`, {
      error: "体験参加者の名前を入力してください",
    });
  }

  const [guest] = await db
    .insert(members)
    .values({
      id: newId(),
      lineUserId: null,
      displayName,
      role: "MEMBER",
      isActive: true,
      isGuest: true,
      membershipStatus: "TRIAL",
    })
    .returning();

  await db.insert(responses).values({
    id: newId(),
    eventId,
    memberId: guest.id,
    status: "ATTENDING",
  });

  return redirectWithMessage(request, `/events/${eventId}`, {
    ok: `${displayName}さんを体験参加者として追加しました`,
  });
}
```

### `src/app/(app)/events/[id]/page.tsx`

```tsx
import { notFound } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { getEventWithResponses, getEventPhotos } from "@/lib/queries";
import { EVENT_TYPE_LABELS, formatDateTime } from "@/lib/labels";
import { RespondForm } from "@/components/RespondForm";
import { FlashMessage } from "@/components/FlashMessage";
import { EventPhotoUpload } from "@/components/EventPhotoUpload";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { id } = await params;
  const { ok, error } = await searchParams;
  const member = await getCurrentMember();
  if (!member) return null;

  const detail = await getEventWithResponses(id);
  if (!detail) notFound();

  const myAnswer = detail.answered.find((a) => a.member.id === member.id);
  const photos = await getEventPhotos(id);

  return (
    <div className="space-y-5">
      <FlashMessage ok={ok} error={error} />

      <div>
        <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
          {EVENT_TYPE_LABELS[detail.event.type] ?? detail.event.type}
        </span>
        <h1 className="mt-2 text-xl font-bold text-neutral-900">{detail.event.title}</h1>
        <p className="mt-1 text-sm text-neutral-500">{formatDateTime(detail.event.eventDate)}</p>
        {detail.event.location && (
          <p className="mt-1 flex items-center gap-1 text-sm text-neutral-500">
            <span aria-hidden>📍</span>
            {detail.event.location}
          </p>
        )}
        {detail.event.description && (
          <p className="mt-3 whitespace-pre-wrap text-sm text-neutral-700">
            {detail.event.description}
          </p>
        )}
        {detail.event.feeAmount != null && (
          <p className="mt-3 rounded-lg bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700">
            参加費: {detail.event.feeAmount}円
            {myAnswer?.response.status === "ATTENDING" &&
              (myAnswer.response.feePaid ? "（支払済み）" : "（未払い）")}
          </p>
        )}
        {!detail.event.isOpen && (
          <p className="mt-3 rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-500">
            このイベントは回答受付を締め切っています
          </p>
        )}
      </div>

      {detail.event.isOpen && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-neutral-700">あなたの回答</p>
          <RespondForm
            eventId={detail.event.id}
            currentStatus={myAnswer?.response.status}
            redirectTo={`/events/${detail.event.id}`}
          />
        </div>
      )}

      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-semibold text-neutral-700">
          回答状況（{detail.answered.filter((a) => !a.member.isGuest).length}/
          {detail.answered.filter((a) => !a.member.isGuest).length + detail.unanswered.length}）
        </p>
        <ul className="space-y-1 text-sm">
          {detail.answered.map(({ member: m, response }) => (
            <li key={m.id} className="flex items-center justify-between border-b border-neutral-100 py-1.5 last:border-0">
              <span className="flex items-center gap-1.5 text-neutral-700">
                {m.displayName}
                {m.isGuest && (
                  <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-500">
                    体験
                  </span>
                )}
              </span>
              <span
                className={
                  response.status === "ATTENDING" ? "text-orange-600" : "text-neutral-400"
                }
              >
                {response.status === "ATTENDING" ? "参加" : "不参加"}
              </span>
            </li>
          ))}
          {detail.unanswered.map((m) => (
            <li key={m.id} className="flex items-center justify-between border-b border-neutral-100 py-1.5 last:border-0">
              <span className="text-neutral-400">{m.displayName}</span>
              <span className="text-yellow-600">未回答</span>
            </li>
          ))}
        </ul>
      </div>

      {detail.event.isOpen && member.membershipStatus === "REGULAR" && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="mb-1 text-sm font-semibold text-neutral-700">体験参加者を追加</p>
          <p className="mb-3 text-xs text-neutral-400">
            体験したいと言っている人（LINEアカウント不要）を、このイベントの参加者として登録できます。
          </p>
          <form
            action={`/api/events/${detail.event.id}/guests`}
            method="POST"
            className="flex gap-2"
          >
            <input
              type="text"
              name="displayName"
              required
              placeholder="体験参加者の名前"
              className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white"
            >
              追加
            </button>
          </form>
        </div>
      )}

      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-neutral-700">
          写真{photos.length > 0 ? `（${photos.length}枚）` : ""}
        </p>

        <div className="mb-3">
          <EventPhotoUpload eventId={detail.event.id} />
        </div>

        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo) => {
              const canDelete = member.role === "ADMIN" || photo.uploadedBy === member.id;
              return (
                <div key={photo.id} className="relative aspect-square overflow-hidden rounded-lg bg-neutral-100">
                  <a
                    href={`/api/events/${detail.event.id}/photos/${photo.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src={`/api/events/${detail.event.id}/photos/${photo.id}`}
                      alt={photo.fileName ?? "写真"}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </a>
                  {canDelete && (
                    <form
                      action={`/api/events/${detail.event.id}/photos/${photo.id}`}
                      method="POST"
                      className="absolute right-1 top-1"
                    >
                      <input type="hidden" name="action" value="delete" />
                      <ConfirmSubmitButton
                        message="この写真を削除しますか？"
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                      >
                        ✕
                      </ConfirmSubmitButton>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
```

### `src/app/(app)/admin/events/[id]/page.tsx`

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventWithResponses } from "@/lib/queries";
import { EVENT_TYPE_LABELS, formatDateTime } from "@/lib/labels";
import { FlashMessage } from "@/components/FlashMessage";

export default async function AdminEventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { id } = await params;
  const { ok, error } = await searchParams;

  const detail = await getEventWithResponses(id);
  if (!detail) notFound();

  const unansweredWithLine = detail.unanswered.filter((m) => m.lineUserId).length;
  const answeredMembers = detail.answered.filter((a) => !a.member.isGuest);
  const answeredWithLine = answeredMembers.filter((a) => a.member.lineUserId).length;
  const guestAnswered = detail.answered.filter((a) => a.member.isGuest);

  return (
    <div className="space-y-5">
      <FlashMessage ok={ok} error={error} />

      <div>
        <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
          {EVENT_TYPE_LABELS[detail.event.type] ?? detail.event.type}
        </span>
        <h1 className="mt-2 text-xl font-bold text-neutral-900">{detail.event.title}</h1>
        <p className="mt-1 text-sm text-neutral-500">{formatDateTime(detail.event.eventDate)}</p>
        {detail.event.location && (
          <p className="mt-1 flex items-center gap-1 text-sm text-neutral-500">
            <span aria-hidden>📍</span>
            {detail.event.location}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/admin/events/${detail.event.id}/edit`}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-600"
          >
            編集する
          </Link>
          <Link
            href={`/admin/events/new?from=${detail.event.id}`}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-600"
          >
            複製して新規作成
          </Link>
          <a
            href={`/api/admin/events/${detail.event.id}/export`}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-600"
          >
            CSVダウンロード
          </a>
          <form action={`/api/admin/events/${detail.event.id}`} method="POST" className="inline-block">
            <input type="hidden" name="action" value={detail.event.isOpen ? "close" : "reopen"} />
            <input type="hidden" name="redirectTo" value={`/admin/events/${detail.event.id}`} />
            <button
              type="submit"
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-600"
            >
              {detail.event.isOpen ? "回答受付を締め切る" : "受付を再開する"}
            </button>
          </form>
        </div>
      </div>

      <section className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-neutral-700">LINEでリマインド送信</h2>
        <p className="text-xs text-neutral-400">
          未回答: {detail.unanswered.length}名（LINE連携済み {unansweredWithLine}名） / 回答済み:{" "}
          {answeredMembers.length}名（LINE連携済み {answeredWithLine}名）
          {guestAnswered.length > 0 && ` / 体験参加 ${guestAnswered.length}名`}
        </p>
        <form action="/api/admin/remind" method="POST" className="space-y-3">
          <input type="hidden" name="eventId" value={detail.event.id} />
          <textarea
            name="message"
            rows={3}
            placeholder="空欄の場合は定型メッセージを送信します"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              name="target"
              value="unanswered"
              className="flex-1 rounded-lg bg-orange-600 py-2 text-sm font-semibold text-white disabled:opacity-40"
              disabled={unansweredWithLine === 0}
            >
              未回答者に送信
            </button>
            <button
              type="submit"
              name="target"
              value="answered"
              className="flex-1 rounded-lg border border-neutral-300 py-2 text-sm font-semibold text-neutral-600 disabled:opacity-40"
              disabled={answeredWithLine === 0}
            >
              回答済みに送信
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-semibold text-neutral-700">
          回答状況（{answeredMembers.length}/{answeredMembers.length + detail.unanswered.length}）
          {detail.event.feeAmount != null && ` ・ 参加費 ${detail.event.feeAmount}円`}
        </p>
        <ul className="space-y-1 text-sm">
          {detail.answered.map(({ member: m, response }) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-2 border-b border-neutral-100 py-1.5 last:border-0"
            >
              <span className="min-w-0 text-neutral-700">
                {m.displayName}
                {m.isGuest && (
                  <span className="ml-1 rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-500">
                    体験
                  </span>
                )}
                {!m.lineUserId && !m.isGuest && (
                  <span className="ml-1 text-[10px] text-neutral-300">(LINE未連携)</span>
                )}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span
                  className={
                    response.status === "ATTENDING" ? "text-orange-600" : "text-neutral-400"
                  }
                >
                  {response.status === "ATTENDING" ? "参加" : "不参加"}
                </span>
                {detail.event.feeAmount != null && response.status === "ATTENDING" && (
                  <form action={`/api/admin/events/${detail.event.id}`} method="POST">
                    <input type="hidden" name="action" value="toggleFeePaid" />
                    <input type="hidden" name="memberId" value={m.id} />
                    <button
                      type="submit"
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        response.feePaid
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {response.feePaid ? "参加費 支払済み" : "参加費 未払い"}
                    </button>
                  </form>
                )}
              </span>
            </li>
          ))}
          {detail.unanswered.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between border-b border-neutral-100 py-1.5 last:border-0"
            >
              <span className="text-neutral-400">
                {m.displayName}
                {!m.lineUserId && (
                  <span className="ml-1 text-[10px] text-neutral-300">(LINE未連携)</span>
                )}
              </span>
              <span className="text-yellow-600">未回答</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
```

### `src/app/api/admin/events/[id]/route.ts`

```ts
import { NextRequest } from "next/server";
import { db } from "@/db";
import { events, responses } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { redirectWithMessage, safeRedirectTarget } from "@/lib/formRedirect";
import { VALID_EVENT_TYPES as VALID_TYPES, parseJstDatetimeLocal } from "@/lib/labels";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await context.params;
  try {
    await requireAdmin();
  } catch {
    return redirectWithMessage(request, "/dashboard", { error: "管理者のみ操作できます" });
  }

  const formData = await request.formData();
  const action = formData.get("action");
  const redirectTo = safeRedirectTarget(
    formData.get("redirectTo"),
    `/admin/events/${eventId}`
  );

  if (action === "close") {
    await db.update(events).set({ isOpen: false, updatedAt: new Date() }).where(eq(events.id, eventId));
  } else if (action === "reopen") {
    await db.update(events).set({ isOpen: true, updatedAt: new Date() }).where(eq(events.id, eventId));
  } else if (action === "update") {
    const type = formData.get("type");
    const title = String(formData.get("title") || "").trim();
    const eventDateRaw = String(formData.get("eventDate") || "").trim();
    const location = String(formData.get("location") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const feeAmountRaw = String(formData.get("feeAmount") || "").trim();

    if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number]) || !title) {
      return redirectWithMessage(request, `/admin/events/${eventId}/edit`, {
        error: "種類とタイトルは必須です",
      });
    }

    let feeAmount: number | null = null;
    if (feeAmountRaw) {
      const parsed = Number(feeAmountRaw);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return redirectWithMessage(request, `/admin/events/${eventId}/edit`, {
          error: "参加費が不正です",
        });
      }
      feeAmount = parsed;
    }

    const eventDate = parseJstDatetimeLocal(eventDateRaw);

    await db
      .update(events)
      .set({
        type: type as (typeof VALID_TYPES)[number],
        title,
        eventDate,
        location: location || null,
        description: description || null,
        feeAmount,
        updatedAt: new Date(),
      })
      .where(eq(events.id, eventId));

    return redirectWithMessage(request, `/admin/events/${eventId}`, { ok: "更新しました" });
  } else if (action === "toggleFeePaid") {
    const memberId = String(formData.get("memberId") || "");
    const [existing] = await db
      .select()
      .from(responses)
      .where(and(eq(responses.eventId, eventId), eq(responses.memberId, memberId)))
      .limit(1);
    if (existing) {
      const nextPaid = !existing.feePaid;
      await db
        .update(responses)
        .set({ feePaid: nextPaid, feePaidAt: nextPaid ? new Date() : null })
        .where(eq(responses.id, existing.id));
    }
    return redirectWithMessage(request, `/admin/events/${eventId}`, {
      ok: "参加費の状況を更新しました",
    });
  }

  return redirectWithMessage(request, redirectTo);
}
```

### `src/app/api/admin/events/route.ts`

```ts
import { NextRequest } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { newId } from "@/lib/id";
import { redirectWithMessage } from "@/lib/formRedirect";
import { VALID_EVENT_TYPES as VALID_TYPES, parseJstDatetimeLocal } from "@/lib/labels";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return redirectWithMessage(request, "/dashboard", { error: "管理者のみ操作できます" });
  }

  const formData = await request.formData();
  const type = formData.get("type");
  const title = String(formData.get("title") || "").trim();
  const eventDateRaw = String(formData.get("eventDate") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const feeAmountRaw = String(formData.get("feeAmount") || "").trim();

  if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number]) || !title) {
    return redirectWithMessage(request, "/admin/events/new", {
      error: "種類とタイトルは必須です",
    });
  }

  let feeAmount: number | null = null;
  if (feeAmountRaw) {
    const parsed = Number(feeAmountRaw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return redirectWithMessage(request, "/admin/events/new", {
        error: "参加費が不正です",
      });
    }
    feeAmount = parsed;
  }

  const eventDate = parseJstDatetimeLocal(eventDateRaw);

  await db.insert(events).values({
    id: newId(),
    type: type as (typeof VALID_TYPES)[number],
    title,
    eventDate,
    location: location || null,
    description: description || null,
    feeAmount,
  });

  return redirectWithMessage(request, "/admin", { ok: "イベントを作成しました" });
}
```

### `src/components/EventForm.tsx`

```tsx
import { EVENT_TYPE_OPTIONS } from "@/lib/labels";

export function EventForm({
  action,
  submitLabel,
  defaultValues,
  hiddenFields,
}: {
  action: string;
  submitLabel: string;
  defaultValues?: {
    type?: string;
    title?: string;
    eventDateLocal?: string;
    location?: string;
    description?: string;
    feeAmount?: number | null;
  };
  hiddenFields?: { name: string; value: string }[];
}) {
  return (
    <form
      action={action}
      method="POST"
      className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
    >
      {hiddenFields?.map((field) => (
        <input key={field.name} type="hidden" name={field.name} value={field.value} />
      ))}

      <div>
        <label className="mb-1 block text-xs font-semibold text-neutral-600">種類</label>
        <select
          name="type"
          required
          defaultValue={defaultValues?.type ?? "PRACTICE"}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        >
          {EVENT_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-neutral-600">タイトル</label>
        <input
          type="text"
          name="title"
          required
          defaultValue={defaultValues?.title ?? ""}
          placeholder="例: 8月度合同練習"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-neutral-600">日時</label>
        <input
          type="datetime-local"
          name="eventDate"
          defaultValue={defaultValues?.eventDateLocal ?? ""}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-neutral-600">
          場所（任意）
        </label>
        <input
          type="text"
          name="location"
          defaultValue={defaultValues?.location ?? ""}
          placeholder="例: 市民体育館 第2アリーナ"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-neutral-600">
          詳細（任意）
        </label>
        <textarea
          name="description"
          rows={4}
          defaultValue={defaultValues?.description ?? ""}
          placeholder="持ち物・注意事項などの補足"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-neutral-600">
          参加費（任意・円）
        </label>
        <input
          type="number"
          name="feeAmount"
          min={0}
          defaultValue={defaultValues?.feeAmount ?? ""}
          placeholder="空欄の場合は参加費なし"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-orange-600 py-2.5 text-sm font-semibold text-white"
      >
        {submitLabel}
      </button>
    </form>
  );
}
```

### `src/app/(app)/admin/fees/page.tsx`

```tsx
import Link from "next/link";
import { getMembershipFeeStatus, getMembershipFeeFiscalYears } from "@/lib/queries";
import { formatDateTime } from "@/lib/labels";
import { FlashMessage } from "@/components/FlashMessage";
import { jstTodayKey } from "@/lib/calendar";

export default async function AdminFeesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; year?: string }>;
}) {
  const { ok, error, year } = await searchParams;
  const currentYear = jstTodayKey().slice(0, 4);
  const fiscalYear = year && /^\d{4}$/.test(year) ? year : currentYear;

  const [rows, knownYears] = await Promise.all([
    getMembershipFeeStatus(fiscalYear),
    getMembershipFeeFiscalYears(),
  ]);
  const years = Array.from(new Set([currentYear, ...knownYears])).sort((a, b) =>
    b.localeCompare(a)
  );

  const unpaidCount = rows.filter((r) => !r.fee?.paid).length;

  return (
    <div className="space-y-4">
      <FlashMessage ok={ok} error={error} />
      <h1 className="text-lg font-bold text-neutral-900">年会費管理</h1>
      <p className="text-xs text-neutral-400">
        正部員（体験登録中を除く）を対象に、年度ごとの年会費の支払い状況を記録します。
      </p>

      <div className="flex flex-wrap gap-2 text-xs">
        {years.map((y) => (
          <Link
            key={y}
            href={`/admin/fees?year=${y}`}
            className={`rounded-full border px-3 py-1.5 font-semibold ${
              y === fiscalYear
                ? "border-orange-600 bg-orange-600 text-white"
                : "border-neutral-200 bg-white text-neutral-500"
            }`}
          >
            {y}年度
          </Link>
        ))}
      </div>

      <form
        action="/api/admin/fees"
        method="POST"
        className="space-y-2 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm"
      >
        <input type="hidden" name="action" value="bulkCreate" />
        <input type="hidden" name="fiscalYear" value={fiscalYear} />
        <p className="text-xs font-semibold text-neutral-600">
          {fiscalYear}年度のレコードが未作成の正部員に、一括で未払いレコードを作成する
        </p>
        <div className="flex gap-2">
          <input
            type="number"
            name="amount"
            required
            min={0}
            placeholder="金額（円）"
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white"
          >
            一括作成
          </button>
        </div>
      </form>

      <p className="text-xs text-neutral-500">
        {fiscalYear}年度: 対象 {rows.length}名 ・ 未払い {unpaidCount}名
      </p>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-400">
          対象となる正部員がいません
        </p>
      ) : (
        <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          {rows.map(({ member, fee }) => (
            <li key={member.id} className="space-y-2 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-neutral-800">{member.displayName}</p>
                {fee?.paid && (
                  <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                    支払済み{fee.paidAt ? `（${formatDateTime(fee.paidAt)}）` : ""}
                  </span>
                )}
              </div>
              <form
                action="/api/admin/fees"
                method="POST"
                className="flex flex-wrap items-center gap-2"
              >
                <input type="hidden" name="action" value="upsert" />
                <input type="hidden" name="memberId" value={member.id} />
                <input type="hidden" name="fiscalYear" value={fiscalYear} />
                <input
                  type="number"
                  name="amount"
                  min={0}
                  defaultValue={fee?.amount ?? ""}
                  placeholder="金額（円）"
                  className="w-28 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
                />
                <label className="flex items-center gap-1.5 text-xs text-neutral-600">
                  <input
                    type="checkbox"
                    name="paid"
                    value="true"
                    defaultChecked={fee?.paid ?? false}
                    className="h-4 w-4"
                  />
                  支払済み
                </label>
                <button
                  type="submit"
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-600"
                >
                  保存
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### `src/app/api/admin/fees/route.ts`

```ts
import { NextRequest } from "next/server";
import { db } from "@/db";
import { members, membershipFees } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { newId } from "@/lib/id";
import { redirectWithMessage } from "@/lib/formRedirect";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return redirectWithMessage(request, "/dashboard", { error: "管理者のみ操作できます" });
  }

  const formData = await request.formData();
  const action = formData.get("action");
  const fiscalYear = String(formData.get("fiscalYear") || "").trim();

  if (!fiscalYear) {
    return redirectWithMessage(request, "/admin/fees", { error: "年度が不正です" });
  }

  if (action === "upsert") {
    const memberId = String(formData.get("memberId") || "");
    const amountRaw = String(formData.get("amount") || "");
    const paid = formData.get("paid") === "true";

    if (!memberId || amountRaw === "") {
      return redirectWithMessage(request, `/admin/fees?year=${fiscalYear}`, {
        error: "金額を入力してください",
      });
    }
    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount < 0) {
      return redirectWithMessage(request, `/admin/fees?year=${fiscalYear}`, {
        error: "金額が不正です",
      });
    }

    const [existing] = await db
      .select()
      .from(membershipFees)
      .where(
        and(eq(membershipFees.memberId, memberId), eq(membershipFees.fiscalYear, fiscalYear))
      )
      .limit(1);

    if (existing) {
      await db
        .update(membershipFees)
        .set({
          amount,
          paid,
          paidAt: paid ? (existing.paid ? existing.paidAt : new Date()) : null,
          updatedAt: new Date(),
        })
        .where(eq(membershipFees.id, existing.id));
    } else {
      await db.insert(membershipFees).values({
        id: newId(),
        memberId,
        fiscalYear,
        amount,
        paid,
        paidAt: paid ? new Date() : null,
      });
    }

    return redirectWithMessage(request, `/admin/fees?year=${fiscalYear}`, {
      ok: "年会費の状況を更新しました",
    });
  }

  if (action === "bulkCreate") {
    const amountRaw = String(formData.get("amount") || "");
    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount < 0) {
      return redirectWithMessage(request, `/admin/fees?year=${fiscalYear}`, {
        error: "金額が不正です",
      });
    }

    const regularMembers = await db
      .select({ id: members.id })
      .from(members)
      .where(
        and(
          eq(members.membershipStatus, "REGULAR"),
          eq(members.isActive, true),
          eq(members.isGuest, false)
        )
      );
    const existingFees = await db
      .select({ memberId: membershipFees.memberId })
      .from(membershipFees)
      .where(eq(membershipFees.fiscalYear, fiscalYear));
    const existingMemberIds = new Set(existingFees.map((f) => f.memberId));

    const toCreate = regularMembers.filter((m) => !existingMemberIds.has(m.id));
    if (toCreate.length > 0) {
      await db.insert(membershipFees).values(
        toCreate.map((m) => ({
          id: newId(),
          memberId: m.id,
          fiscalYear,
          amount,
          paid: false,
        }))
      );
    }

    return redirectWithMessage(request, `/admin/fees?year=${fiscalYear}`, {
      ok: `${toCreate.length}件のレコードを作成しました`,
    });
  }

  return redirectWithMessage(request, `/admin/fees?year=${fiscalYear}`, {
    error: "操作が不正です",
  });
}
```

### `src/app/(app)/admin/members/page.tsx`

```tsx
import { getAllMembers } from "@/lib/queries";
import { FlashMessage } from "@/components/FlashMessage";

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const memberList = await getAllMembers();

  return (
    <div className="space-y-4">
      <FlashMessage ok={ok} error={error} />
      <h1 className="text-lg font-bold text-neutral-900">メンバー管理</h1>
      <p className="text-xs text-neutral-400">
        LINEでログインするとここに自動で追加されます。招待は不要です。
      </p>

      <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        {memberList.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-2 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-neutral-800">
                {m.displayName}
                {!m.lineUserId && (
                  <span className="ml-1 text-[10px] text-neutral-300">(LINE未連携)</span>
                )}
                <span
                  className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    m.membershipStatus === "REGULAR"
                      ? "bg-orange-50 text-orange-700"
                      : "bg-neutral-100 text-neutral-500"
                  }`}
                >
                  {m.membershipStatus === "REGULAR" ? "正部員" : "体験"}
                </span>
              </p>
              <p className="text-[11px] text-neutral-400">
                {m.role === "ADMIN" ? "管理者" : "メンバー"} ・{" "}
                {m.isActive ? "有効" : "無効"}
                {m.grade && ` ・ ${m.grade}`}
                {m.email && ` ・ ${m.email}`}
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <form action={`/api/admin/members/${m.id}`} method="POST">
                <input type="hidden" name="action" value="toggleRole" />
                <button
                  type="submit"
                  className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-[11px] text-neutral-600"
                >
                  {m.role === "ADMIN" ? "一般にする" : "管理者にする"}
                </button>
              </form>
              <form action={`/api/admin/members/${m.id}`} method="POST">
                <input type="hidden" name="action" value="toggleActive" />
                <button
                  type="submit"
                  className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-[11px] text-neutral-600"
                >
                  {m.isActive ? "無効化" : "有効化"}
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### `src/app/(app)/admin/page.tsx`

```tsx
import Link from "next/link";
import { getEventsWithCounts } from "@/lib/queries";
import {
  EVENT_TYPE_LABELS,
  EVENT_TYPE_OPTIONS,
  VALID_EVENT_TYPES,
  formatDateTime,
} from "@/lib/labels";
import { FlashMessage } from "@/components/FlashMessage";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; type?: string }>;
}) {
  const { ok, error, type } = await searchParams;
  const allRows = await getEventsWithCounts();
  const typeFilter = VALID_EVENT_TYPES.includes(type as (typeof VALID_EVENT_TYPES)[number])
    ? (type as (typeof VALID_EVENT_TYPES)[number])
    : undefined;
  const rows = typeFilter ? allRows.filter((r) => r.event.type === typeFilter) : allRows;

  return (
    <div className="space-y-5">
      <FlashMessage ok={ok} error={error} />

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-neutral-900">管理者メニュー</h1>
        <Link
          href="/admin/events/new"
          className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white"
        >
          ＋ イベント作成
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <Link
          href="/admin/members"
          className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
        >
          <p className="font-semibold text-neutral-800">メンバー管理</p>
          <p className="mt-1 text-xs text-neutral-400">権限・有効/無効の管理</p>
        </Link>
        <Link
          href="/admin/tools"
          className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
        >
          <p className="font-semibold text-neutral-800">道具マスタ管理</p>
          <p className="mt-1 text-xs text-neutral-400">道具の項目・保有状況一覧</p>
        </Link>
        <Link
          href="/admin/notices"
          className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
        >
          <p className="font-semibold text-neutral-800">お知らせ管理</p>
          <p className="mt-1 text-xs text-neutral-400">
            集合場所の連絡・しおりの共有などのお知らせを作成・編集
          </p>
        </Link>
        <Link
          href="/admin/surveys"
          className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
        >
          <p className="font-semibold text-neutral-800">アンケート管理</p>
          <p className="mt-1 text-xs text-neutral-400">自由記述・選択式のアンケートを作成・集計</p>
        </Link>
        <Link
          href="/admin/groups"
          className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
        >
          <p className="font-semibold text-neutral-800">グループ管理</p>
          <p className="mt-1 text-xs text-neutral-400">
            パートなどのグループを登録し、アンケートの対象者を絞り込めるようにする
          </p>
        </Link>
        <Link
          href="/admin/fees"
          className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
        >
          <p className="font-semibold text-neutral-800">年会費管理</p>
          <p className="mt-1 text-xs text-neutral-400">
            正部員の年会費の支払い状況を年度ごとに記録・確認する
          </p>
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-700">イベント一覧</h2>
        <div className="flex gap-2 overflow-x-auto pb-0.5 text-xs">
          <Link
            href="/admin"
            className={`shrink-0 rounded-full border px-3 py-1.5 font-semibold ${
              !typeFilter
                ? "border-orange-600 bg-orange-600 text-white"
                : "border-neutral-200 bg-white text-neutral-500"
            }`}
          >
            すべて
          </Link>
          {EVENT_TYPE_OPTIONS.map((opt) => (
            <Link
              key={opt.value}
              href={`/admin?type=${opt.value}`}
              className={`shrink-0 rounded-full border px-3 py-1.5 font-semibold ${
                typeFilter === opt.value
                  ? "border-orange-600 bg-orange-600 text-white"
                  : "border-neutral-200 bg-white text-neutral-500"
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>
        {rows.length === 0 && (
          <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-400">
            {typeFilter ? "該当するイベントがありません" : "まだイベントがありません"}
          </p>
        )}
        <ul className="space-y-2">
          {rows.map(({ event, counts, activeMemberCount }) => (
            <li key={event.id}>
              <Link
                href={`/admin/events/${event.id}`}
                className="block rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                    {EVENT_TYPE_LABELS[event.type] ?? event.type}
                  </span>
                  {!event.isOpen && (
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-500">
                      締切
                    </span>
                  )}
                </div>
                <p className="font-semibold text-neutral-900">{event.title}</p>
                <p className="text-xs text-neutral-500">{formatDateTime(event.eventDate)}</p>
                {event.location && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-400">
                    <span aria-hidden>📍</span>
                    {event.location}
                  </p>
                )}
                <p className="mt-2 text-xs text-neutral-500">
                  参加 {counts.attending} ・ 不参加 {counts.notAttending} ・ 未回答{" "}
                  {activeMemberCount - counts.total}
                  {counts.guestAttending > 0 && ` ・ 体験参加 ${counts.guestAttending}`}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
```
---

## ■ 次に取り組む予定の作業・要望

### 優先度：最高（今回実装した機能の反映・検証）

1. **DBへのスキーマ反映**
   実装環境にDB接続情報が無く未反映。お使いの環境で `npx drizzle-kit push` を実行してください（このプロジェクトはバージョン管理された migration ファイルを使わず、`drizzle-kit push` による直接反映方式）。

2. **実データでの動作確認**
   - 新規LINEログイン → 体験ステータスで開始 → ダッシュボードのバナーから `/register` → 正部員昇格の一連の流れ
   - イベント画面から体験参加者を追加 → 回答状況・CSV・管理者画面での表示・リマインド送信時に正しくスキップされるか
   - `/admin/fees` での年度切り替え・一括作成・個別の金額と支払済みチェックの保存
   - イベント編集で参加費を設定 → 参加者ごとの支払済み/未払いトグル → メンバー画面での表示

### 優先度：高

3. **体験参加者（ゲスト）の削除・回答編集ができない**
   誤って追加してしまった場合や、参加を取り消したい場合に、管理者がゲストのレコードを削除したり参加状況を変更したりするUIが現状ない（メンバー管理一覧からもゲストは意図的に除外しているため触れない）。イベント詳細画面などに削除・編集の導線を追加したい。

4. **アンケート集計の「対象者数」と「回答数」の意味を整理して表示し直す**
   `getSurveyResults()` の `targetCount`（現在の対象者数）と `responseCount`（これまでの全回答数）は別々の母集団のままで、対象者を絞り込むと「回答5 / 対象3」のような矛盾表示になり得る。どちらの意味を主に見せるか決めて、UI上でも区別表示したい。

5. **メンバー無効化時のUI警告**
   `getCurrentMember()` が `isActive` を見るため、無効化した瞬間に既存セッションが失効する。メンバー管理画面の無効化ボタンに確認・警告を出したい。

### 優先度：中

6. **ダッシュボードに「回答が必要なアンケート」セクションを追加**
   イベントには専用セクションがあるが、アンケートは下部ナビの「アンケート」タブに気づかないと存在にすら気づけない。以前から保留にしていた項目。

7. **`getSurveysWithCounts()` のN+1クエリを解消**
   イベント側の `getEventsWithCounts()` と同じく、全件を一度に取得してメモリ上で集計する実装に揃えたい。

8. **`getCurrentMember()` を React の `cache()` でラップ**
   `layout.tsx` と各ページの両方で呼んでいるため、1リクエストあたり最低2回SELECTが発生している。

9. **`getEventWithResponses()` 側の同種の問題**
   無効化されたメンバーの過去の回答が `answered`/`unanswered` どちらにも出てこず、未回答件数がマイナスになり得る問題が残っている（ゲスト対応で似た問題は解消済みだが、無効化メンバー自体の扱いは未対応）。

### 優先度：低（気づいているが実害はほぼない）

10. `member_groups` テーブルだけ、似た役割の `member_tools` にある `updatedAt` を持っていない。
11. `src/app/api/admin/members/[id]/route.ts` の管理者チェックだけ書き方が他と違う（即時実行関数でtry/catchをラップ）。
12. アンケートは「質問を編集すると既存回答が全削除」、イベントは「編集しても回答は残る」と、機能によって編集時の挙動が非対称（意図的な割り切りとして文書化済み）。

---

## ■ 作業の進め方について

- コードを書く前に、Next.js 16 の該当ガイド（`node_modules/next/dist/docs/`）を確認してください。学習データのNext.jsとは異なる可能性があります。
- 変更後は `npx tsc --noEmit` で型チェックが通ることを確認してください（現状クリーンです）。
- 既存のアーキテクチャ上の決定事項（ネイティブform + Route Handler、`requireAdmin` / `getCurrentMember`、`redirectWithMessage`、`resolveAppUrl`、ゲストの扱い、membershipStatusの扱い）は崩さないでください。
