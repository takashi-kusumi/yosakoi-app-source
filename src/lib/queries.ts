import "server-only";
import { db } from "@/db";
import { members, events, responses, eventPhotos } from "@/db/schema";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { jstTodayKey, jstDateKey } from "@/lib/calendar";

/** 今後（今日以降・日時未定を含む）の募集中イベントと、本人の回答。日付の近い順 */
export async function getUpcomingOpenEventsForMember(memberId: string) {
  const rows = await db
    .select({ event: events, response: responses })
    .from(events)
    .leftJoin(responses, and(eq(responses.eventId, events.id), eq(responses.memberId, memberId)))
    .where(eq(events.isOpen, true))
    .orderBy(asc(events.eventDate));
  const todayKey = jstTodayKey();
  return rows.filter((r) => !r.event.eventDate || jstDateKey(r.event.eventDate) >= todayKey);
}

export async function getAllEventsForMember(memberId: string) {
  return db
    .select({ event: events, response: responses })
    .from(events)
    .leftJoin(responses, and(eq(responses.eventId, events.id), eq(responses.memberId, memberId)))
    .orderBy(desc(events.createdAt));
}

export async function getEventWithResponses(eventId: string) {
  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) return null;

  // 「対象者」の母集団は体験参加者（ゲスト）を含めない。ゲストはイベントごとに
  // 任意で追加されるものであり、全イベント共通の回答対象ではないため。
  const activeMembers = await db
    .select()
    .from(members)
    .where(and(eq(members.isActive, true), eq(members.isGuest, false)))
    .orderBy(asc(members.createdAt));

  const eventResponses = await db.select().from(responses).where(eq(responses.eventId, eventId));
  const responseByMember = new Map(eventResponses.map((r) => [r.memberId, r]));

  type MemberRow = (typeof activeMembers)[number];
  type ResponseRow = (typeof eventResponses)[number];
  const answered: { member: MemberRow; response: ResponseRow }[] = [];
  const unanswered: MemberRow[] = [];

  for (const m of activeMembers) {
    const r = responseByMember.get(m.id);
    if (r) answered.push({ member: m, response: r });
    else unanswered.push(m);
  }

  // このイベントに追加された体験参加者を、回答済み一覧に合流させる
  const respondedMemberIds = eventResponses.map((r) => r.memberId);
  const guestMembers = respondedMemberIds.length
    ? await db
        .select()
        .from(members)
        .where(and(inArray(members.id, respondedMemberIds), eq(members.isGuest, true)))
        .orderBy(asc(members.createdAt))
    : [];
  for (const gm of guestMembers) {
    const r = responseByMember.get(gm.id);
    if (r) answered.push({ member: gm, response: r });
  }

  // 体験参加者を追加した人の名前（「〇〇さんが追加」の表示用）
  const nameById = new Map(activeMembers.map((m) => [m.id, m.displayName]));

  return { event, answered, unanswered, nameById };
}

export async function getEventsWithCounts() {
  const allEvents = await db.select().from(events).orderBy(desc(events.eventDate));
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

  type Counts = {
    attending: number;
    notAttending: number;
    undecided: number;
    total: number;
    guestAttending: number;
  };
  const empty = (): Counts => ({ attending: 0, notAttending: 0, undecided: 0, total: 0, guestAttending: 0 });
  const countMap = new Map<string, Counts>();
  for (const r of allResponses) {
    const c = countMap.get(r.eventId) ?? empty();
    if (guestIds.has(r.memberId)) {
      if (r.status === "ATTENDING") c.guestAttending++;
    } else {
      if (r.status === "ATTENDING") c.attending++;
      else if (r.status === "UNDECIDED") c.undecided++;
      else c.notAttending++;
      c.total++;
    }
    countMap.set(r.eventId, c);
  }

  return allEvents.map((e) => ({
    event: e,
    counts: countMap.get(e.id) ?? empty(),
    activeMemberCount,
  }));
}

/** 本人向け：今後の募集中イベントのうち、まだ回答していない件数（ナビのバッジ用） */
export async function getPendingEventCountForMember(memberId: string): Promise<number> {
  const rows = await getUpcomingOpenEventsForMember(memberId);
  return rows.filter((row) => !row.response).length;
}

export async function getAllMembers() {
  return db
    .select()
    .from(members)
    .where(eq(members.isGuest, false))
    .orderBy(asc(members.createdAt));
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
