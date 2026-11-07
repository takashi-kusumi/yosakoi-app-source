// シンプル版（v2）へのデータベース移行スクリプト。1回だけ実行します。
//
//   node scripts/migrate-v2.mjs
//
// 実行内容（元に戻せません）:
//   - お知らせ・アンケート・道具・衣装・年会費・演舞テーマ・グループのテーブルを削除
//   - 部員（members）を全員削除（LINEでの登録はリセット。出欠の回答も一緒に消えます）
//     ※イベント（練習・祭り・飲み会の予定）と写真の記録は残します
//   - members からLINE・部員登録用の列を削除し、Googleログイン用の列を追加
//   - 出欠の回答（responses）にメモ欄を追加
//   - 予定（events）に終了日時の列を追加
//
// 移行後は、最初にGoogleでログインした人が自動的に管理者になります。
// 必ず、新しいアプリを公開した直後に、管理者になる人が最初にログインしてください。

import pg from "pg";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // ファイルが無い場合は無視
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL が見つかりません。.env または .env.local に設定してください（Node.js 20.12以上が必要です）。");
  process.exit(1);
}

function shouldUseSsl() {
  if (process.env.PGSSL === "disable") return false;
  if (process.env.PGSSL === "require") return true;
  return /sslmode=require|supabase\.co|neon\.tech|vercel-storage\.com/.test(url);
}

const client = new pg.Client({
  connectionString: url,
  ssl: shouldUseSsl() ? { rejectUnauthorized: false } : undefined,
});

const DROP_TABLES = [
  "survey_answer_options",
  "survey_answers",
  "survey_responses",
  "survey_options",
  "survey_questions",
  "survey_target_groups",
  "surveys",
  "member_groups",
  "groups",
  "membership_fees",
  "member_categories",
  "performance_themes",
  "costume_loan_photos",
  "costume_loans",
  "costumes",
  "member_tools",
  "tool_items",
  "notice_attachments",
  "notices",
];

const DROP_MEMBER_COLUMNS = [
  "line_user_id",
  "membership_status",
  "email",
  "attribute",
  "grade",
  "code_of_conduct_agreed_at",
  "last_seen_notices_at",
];

const DROP_TYPES = ["membership_status", "member_category", "survey_question_type"];

async function count(table) {
  const exists = await client.query("select to_regclass($1) as t", [`public.${table}`]);
  if (!exists.rows[0].t) return null;
  const r = await client.query(`select count(*)::int as n from "${table}"`);
  return r.rows[0].n;
}

await client.connect();

try {
  const host = new URL(url.replace(/^postgres(ql)?:/, "http:")).hostname;
  console.log(`接続先: ${host}`);
  console.log(`部員: ${await count("members")}件 / イベント: ${await count("events")}件 / 出欠回答: ${await count("responses")}件`);
  console.log("");
  console.log("この操作で、部員と出欠回答、および不要になった機能のデータがすべて削除されます（元に戻せません）。");
  console.log("イベントの予定と写真の記録は残ります。");

  const rl = readline.createInterface({ input: stdin, output: stdout });
  const answer = (await rl.question('続ける場合は "yes" と入力してください: ')).trim();
  rl.close();
  if (answer !== "yes") {
    console.log("中止しました。何も変更していません。");
    process.exit(0);
  }

  await client.query("begin");

  for (const table of DROP_TABLES) {
    await client.query(`drop table if exists "${table}" cascade`);
  }

  // 部員のリセット。responses はカスケード削除、event_photos.uploaded_by は null になる
  await client.query("delete from members");

  for (const col of DROP_MEMBER_COLUMNS) {
    await client.query(`alter table members drop column if exists "${col}"`);
  }

  await client.query("alter table members add column if not exists google_sub text");
  await client.query("alter table members add column if not exists google_email text");
  await client.query("alter table members add column if not exists guest_added_by text");
  await client.query(`
    do $$ begin
      if not exists (select 1 from pg_constraint where conname = 'members_google_sub_unique') then
        alter table members add constraint members_google_sub_unique unique (google_sub);
      end if;
      if not exists (select 1 from pg_constraint where conname = 'members_guest_added_by_members_id_fk') then
        alter table members add constraint members_guest_added_by_members_id_fk
          foreign key (guest_added_by) references members(id) on delete set null on update no action;
      end if;
    end $$;
  `);

  await client.query("alter table responses add column if not exists note text");
  await client.query("alter table events add column if not exists end_date timestamp with time zone");

  for (const type of DROP_TYPES) {
    await client.query(`drop type if exists "${type}"`);
  }

  await client.query("commit");
  console.log("");
  console.log("移行が完了しました。");
  console.log("続けて `npx drizzle-kit push` を実行してください（お知らせ・アンケートなどの新しいテーブルが作成されます）。");
} catch (err) {
  await client.query("rollback").catch(() => {});
  console.error("エラーが発生したため、すべての変更を取り消しました。");
  console.error(err);
  process.exitCode = 1;
} finally {
  await client.end();
}
