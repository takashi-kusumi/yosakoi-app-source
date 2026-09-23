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
  "UNDECIDED",
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
export const memberCategoryEnum = pgEnum("member_category", [
  "PERFORMER", // 演者（踊り子/中旗/道具演出）
  "SPECIALIST_FLAG", // 専門職（大旗）
  "SPECIALIST_VOICE", // 専門職（歌手/MC）
  "SUPPORT_GENERAL", // サポート（給水・鳴子拾い等）
  "SUPPORT_MEDIA", // サポート（撮影）
  "CHEER", // 応援
  "OTHER", // その他
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
    // 正部員登録（部員の属性・パート所属・入館証発行用メールアドレス）関連
    membershipStatus: membershipStatusEnum("membership_status").notNull().default("TRIAL"),
    email: text("email"),
    attribute: text("attribute"),
    // 部員の行動規範への同意日時（CODE_OF_CONDUCT_URL未設定の場合はこの画面自体を使わない）
    codeOfConductAgreedAt: timestamp("code_of_conduct_agreed_at", { withTimezone: true }),
    // お知らせ一覧を最後に開いた日時（バッジの未読件数の算出に使う。nullは「未読数を全件扱い」）
    lastSeenNoticesAt: timestamp("last_seen_notices_at", { withTimezone: true }),
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
    // 写真をまとめて共有したい場合などに、Googleドライブなどの外部共有リンクを貼れるようにする。
    // 添付ファイル（DBに直接Base64保存）と違い、DB容量を消費しない。
    externalUrl: text("external_url"),
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

// ==================== 演舞テーマ（管理者が切り替える。年会費・部員の種類はこのテーマに紐づく） ====================
// 例: 「ギャルマインド」「ワンスピ」のような、暦年ではなくその代の演舞テーマ名で区切って管理する。

export const performanceThemes = pgTable(
  "performance_themes",
  {
    id: text("id").primaryKey(),
    // テーマ名（例: "ギャルマインド"）。管理者が切替時に自由入力する。
    name: text("name").notNull().unique(),
    // 「現在のテーマ」は常に1件だけ true になる（切替時にアプリ側で入れ替える）。
    isCurrent: boolean("is_current").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("performance_themes_is_current_idx").on(table.isCurrent)]
);

// ==================== 年会費（正部員のみ対象） ====================

export const membershipFees = pgTable(
  "membership_fees",
  {
    id: text("id").primaryKey(),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    // 演舞テーマ名（例: "ギャルマインド"）。performanceThemes.nameと同じ文字列を使う（緩い結合）。
    theme: text("theme").notNull(),
    amount: integer("amount").notNull(),
    paid: boolean("paid").notNull().default(false),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("membership_fee_member_theme_unique").on(table.memberId, table.theme),
    index("membership_fees_theme_idx").on(table.theme),
  ]
);

// ==================== 部員の種類（演舞テーマごとに本人が/registerで選択） ====================

export const memberCategories = pgTable(
  "member_categories",
  {
    id: text("id").primaryKey(),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    // 演舞テーマ名（例: "ギャルマインド"）。テーマごとに1件だけ持つ。
    theme: text("theme").notNull(),
    category: memberCategoryEnum("category").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("member_category_member_theme_unique").on(table.memberId, table.theme),
    index("member_categories_theme_idx").on(table.theme),
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
    // 回答締切（任意）。設定すると、この日時を過ぎた回答は自動的に受け付けなくなる
    // （isOpenの値自体は管理者が手動で変更するまで変わらない。実際に開いているかどうかの
    // 判定は isSurveyOpen() ヘルパー（isOpen && 締切前）を必ず使うこと）
    closesAt: timestamp("closes_at", { withTimezone: true }),
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
