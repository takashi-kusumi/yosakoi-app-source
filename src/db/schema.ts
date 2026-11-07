import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  uniqueIndex,
  index,
  type AnyPgColumn,
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

export const members = pgTable(
  "members",
  {
    id: text("id").primaryKey(),
    // Googleアカウント固有のID（sub）。ログインはGoogleのみ。体験参加者（ゲスト）はnull。
    googleSub: text("google_sub").unique(),
    // Googleアカウントのメールアドレス（管理画面での表示用）
    googleEmail: text("google_email"),
    displayName: text("display_name").notNull(),
    pictureUrl: text("picture_url"),
    role: roleEnum("role").notNull().default("MEMBER"),
    isActive: boolean("is_active").notNull().default(true),
    // 体験参加者（ログインなし。メンバーがイベント画面から名前だけで追加する）
    isGuest: boolean("is_guest").notNull().default(false),
    // 体験参加者を追加したメンバー（追加した本人と管理者だけが、名前の訂正・削除をできる）
    guestAddedBy: text("guest_added_by").references((): AnyPgColumn => members.id, {
      onDelete: "set null",
    }),
    // 初回のWelcome（フルネーム入力とチュートリアル）を終えた日時。nullなら初回ログイン時にWelcomeへ案内する
    onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
    // お知らせ一覧を最後に開いた日時（未読バッジの件数の算出に使う）
    lastSeenNoticesAt: timestamp("last_seen_notices_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
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
    // 終了日時（任意）。開始日時と同じ日の終了時刻として入力する（開始より前の時刻なら翌日扱い）
    endDate: timestamp("end_date", { withTimezone: true }),
    location: text("location"),
    description: text("description"),
    isOpen: boolean("is_open").notNull().default(true),
    // 参加費（円）。nullなら参加費なしのイベント
    feeAmount: integer("fee_amount"),
    // 回答締切（任意）。過ぎると自動的に回答を受け付けない（実際の受付判定は isEventOpen() を使う）
    responseDeadline: timestamp("response_deadline", { withTimezone: true }),
    // 連携先のGoogleカレンダー上の予定ID（カレンダー連携が有効な場合のみ）
    googleCalendarEventId: text("google_calendar_event_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
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
    // 回答に添えるひとことメモ（例: 「30分遅れます」「途中で抜けます」）
    note: text("note"),
    respondedAt: timestamp("responded_at", { withTimezone: true }).notNull().defaultNow(),
    // イベント参加費の支払い状況（events.feeAmountが設定されている場合のみ意味を持つ）
    feePaid: boolean("fee_paid").notNull().default(false),
    feePaidAt: timestamp("fee_paid_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("event_member_unique").on(table.eventId, table.memberId),
    index("responses_member_idx").on(table.memberId),
  ]
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("event_photos_event_idx").on(table.eventId)]
);

// ==================== お知らせ（管理者から全員へ） ====================

export const notices = pgTable(
  "notices",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    body: text("body"),
    // 写真をまとめて共有したい場合などに、Googleドライブなどの外部共有リンクを貼れるようにする
    externalUrl: text("external_url"),
    eventId: text("event_id").references(() => events.id, { onDelete: "set null" }),
    createdBy: text("created_by").references(() => members.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
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
    // ファイル本体をBase64文字列として保存（別のストレージ契約を不要にするため）
    dataBase64: text("data_base64").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("notice_attachments_notice_idx").on(table.noticeId)]
);

// ==================== アンケート（メンバー全員が対象） ====================

export const surveys = pgTable(
  "surveys",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    createdBy: text("created_by").references(() => members.id, { onDelete: "set null" }),
    isOpen: boolean("is_open").notNull().default(true),
    // 回答締切（任意）。実際に回答受付中かどうかは isSurveyOpen()（isOpen && 締切前）で判定する
    closesAt: timestamp("closes_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("surveys_created_at_idx").on(table.createdAt)]
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
