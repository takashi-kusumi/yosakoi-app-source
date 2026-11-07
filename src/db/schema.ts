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
    location: text("location"),
    description: text("description"),
    isOpen: boolean("is_open").notNull().default(true),
    // 参加費（円）。nullなら参加費なしのイベント
    feeAmount: integer("fee_amount"),
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
