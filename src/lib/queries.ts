import "server-only";
import { db } from "@/db";
import {
  members,
  events,
  responses,
  eventPhotos,
  notices,
  noticeAttachments,
  surveys,
  surveyQuestions,
  surveyOptions,
  surveyResponses,
  surveyAnswers,
  surveyAnswerOptions,
} from "@/db/schema";
import { eq, and, asc, desc, inArray, gt } from "drizzle-orm";
import { jstTodayKey, jstDateKey } from "@/lib/calendar";
import { isEventOpen, isSurveyOpen } from "@/lib/labels";

/** 今後（今日以降・日時未定を含む）の募集中イベントと、本人の回答。日付の近い順 */
export async function getUpcomingOpenEventsForMember(memberId: string) {
  const rows = await db
    .select({ event: events, response: responses })
    .from(events)
    .leftJoin(responses, and(eq(responses.eventId, events.id), eq(responses.memberId, memberId)))
    .orderBy(asc(events.eventDate));
  const todayKey = jstTodayKey();
  return rows.filter(
    (r) => isEventOpen(r.event) && (!r.event.eventDate || jstDateKey(r.event.eventDate) >= todayKey)
  );
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

// ==================== お知らせ ====================

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

  const attachmentRows = await db.select({ noticeId: noticeAttachments.noticeId }).from(noticeAttachments);
  const countMap = new Map<string, number>();
  for (const a of attachmentRows) {
    countMap.set(a.noticeId, (countMap.get(a.noticeId) ?? 0) + 1);
  }
  return rows.map((r) => ({ ...r, attachmentCount: countMap.get(r.notice.id) ?? 0 }));
}

/** 指定日時より後に作られたお知らせ（未読）。lastSeenAtがnullなら全件 */
export async function getUnreadNotices(lastSeenAt: Date | null, limit = 3) {
  const base = db
    .select({ notice: notices, eventTitle: events.title })
    .from(notices)
    .leftJoin(events, eq(notices.eventId, events.id));
  const rows = await (lastSeenAt ? base.where(gt(notices.createdAt, lastSeenAt)) : base)
    .orderBy(desc(notices.createdAt))
    .limit(limit);
  return rows;
}

export async function getUnreadNoticeCount(lastSeenAt: Date | null): Promise<number> {
  const rows = lastSeenAt
    ? await db.select({ id: notices.id }).from(notices).where(gt(notices.createdAt, lastSeenAt))
    : await db.select({ id: notices.id }).from(notices);
  return rows.length;
}

/** お知らせ一覧を開いたタイミングで呼び、未読件数の基準日時を更新する */
export async function markNoticesSeen(memberId: string) {
  await db.update(members).set({ lastSeenNoticesAt: new Date() }).where(eq(members.id, memberId));
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

// ==================== アンケート（メンバー全員が対象） ====================

async function getActiveMembers() {
  return db
    .select()
    .from(members)
    .where(and(eq(members.isActive, true), eq(members.isGuest, false)))
    .orderBy(asc(members.createdAt));
}

/** メンバー向け：アンケートの一覧（回答済みかどうか付き） */
export async function getSurveysForMember(memberId: string) {
  const allSurveys = await db.select().from(surveys).orderBy(desc(surveys.createdAt));
  if (allSurveys.length === 0) return [];
  const myResponses = await db
    .select({ surveyId: surveyResponses.surveyId })
    .from(surveyResponses)
    .where(eq(surveyResponses.memberId, memberId));
  const answered = new Set(myResponses.map((r) => r.surveyId));
  return allSurveys.map((s) => ({ survey: s, answered: answered.has(s.id) }));
}

/** 本人向け：回答受付中で未回答のアンケートの件数（ナビのバッジ用） */
export async function getPendingSurveyCountForMember(memberId: string): Promise<number> {
  const rows = await getSurveysForMember(memberId);
  return rows.filter(({ survey, answered }) => !answered && isSurveyOpen(survey)).length;
}

export async function getSurveysWithCounts() {
  const allSurveys = await db.select().from(surveys).orderBy(desc(surveys.createdAt));
  const allResponses = await db.select({ surveyId: surveyResponses.surveyId }).from(surveyResponses);
  const countBySurvey = new Map<string, number>();
  for (const r of allResponses) countBySurvey.set(r.surveyId, (countBySurvey.get(r.surveyId) ?? 0) + 1);
  const targetCount = (await getActiveMembers()).length;
  return allSurveys.map((survey) => ({
    survey,
    responseCount: countBySurvey.get(survey.id) ?? 0,
    targetCount,
  }));
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

  return {
    survey,
    questions: questions.map((q) => ({ ...q, options: optionsByQuestion.get(q.id) ?? [] })),
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

  const answers = await db.select().from(surveyAnswers).where(eq(surveyAnswers.responseId, response.id));
  const answerIds = answers.map((a) => a.id);
  const selected = answerIds.length
    ? await db.select().from(surveyAnswerOptions).where(inArray(surveyAnswerOptions.answerId, answerIds))
    : [];
  const optionIdsByAnswer = new Map<string, string[]>();
  for (const so of selected) {
    const list = optionIdsByAnswer.get(so.answerId) ?? [];
    list.push(so.optionId);
    optionIdsByAnswer.set(so.answerId, list);
  }
  const byQuestionId = new Map<string, { textAnswer: string | null; optionIds: string[] }>();
  for (const a of answers) {
    byQuestionId.set(a.questionId, { textAnswer: a.textAnswer, optionIds: optionIdsByAnswer.get(a.id) ?? [] });
  }
  return { response, byQuestionId };
}

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

  const targetMembers = await getActiveMembers();
  const allResponses = await db
    .select()
    .from(surveyResponses)
    .where(eq(surveyResponses.surveyId, surveyId))
    .orderBy(asc(surveyResponses.submittedAt));
  const allMembers = await db.select().from(members);
  const memberById = new Map(allMembers.map((m) => [m.id, m]));
  const responded = new Set(allResponses.map((r) => r.memberId));
  const unansweredMembers = targetMembers.filter((m) => !responded.has(m.id));

  const responseIds = allResponses.map((r) => r.id);
  const allAnswers = responseIds.length
    ? await db.select().from(surveyAnswers).where(inArray(surveyAnswers.responseId, responseIds))
    : [];
  const answerIds = allAnswers.map((a) => a.id);
  const allSelected = answerIds.length
    ? await db.select().from(surveyAnswerOptions).where(inArray(surveyAnswerOptions.answerId, answerIds))
    : [];
  const optionIdsByAnswerId = new Map<string, string[]>();
  for (const so of allSelected) {
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
          const r = responseById.get(a.responseId);
          const m = r ? memberById.get(r.memberId) : undefined;
          return { memberName: m?.displayName ?? "不明なメンバー", text: a.textAnswer ?? "" };
        });
      return { question: q, kind: "TEXT" as const, items };
    }
    const countByOption = new Map<string, number>();
    const namesByOption = new Map<string, string[]>();
    for (const a of answersForQuestion) {
      const r = responseById.get(a.responseId);
      const name = (r && memberById.get(r.memberId)?.displayName) || "不明なメンバー";
      for (const optId of optionIdsByAnswerId.get(a.id) ?? []) {
        countByOption.set(optId, (countByOption.get(optId) ?? 0) + 1);
        namesByOption.set(optId, [...(namesByOption.get(optId) ?? []), name]);
      }
    }
    const options = q.options.map((o) => ({
      option: o,
      count: countByOption.get(o.id) ?? 0,
      names: namesByOption.get(o.id) ?? [],
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
