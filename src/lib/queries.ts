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
  memberCategories,
  performanceThemes,
  surveys,
  surveyTargetGroups,
  surveyQuestions,
  surveyOptions,
  surveyResponses,
  surveyAnswers,
  surveyAnswerOptions,
} from "@/db/schema";
import { eq, and, asc, desc, inArray, ne, gt } from "drizzle-orm";
import { jstTodayKey, jstDateKey } from "@/lib/calendar";
import { isSurveyOpen } from "@/lib/labels";

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

/** 指定の演舞テーマの、現役正部員ごとの年会費支払い状況 */
export async function getMembershipFeeStatus(theme: string) {
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

  const fees = await db.select().from(membershipFees).where(eq(membershipFees.theme, theme));
  const feeByMember = new Map(fees.map((f) => [f.memberId, f]));

  return regularMembers.map((member) => ({
    member,
    fee: feeByMember.get(member.id) ?? null,
  }));
}

/** これまでに年会費レコードが作られたことのある演舞テーマの一覧（新しい順） */
export async function getMembershipFeeThemes(): Promise<string[]> {
  const rows = await db.selectDistinct({ theme: membershipFees.theme }).from(membershipFees);
  return rows.map((r) => r.theme).sort((a, b) => b.localeCompare(a));
}

// ==================== 部員の種類（演舞テーマごとに本人が/registerで選択） ====================

/** 本人向け：指定の演舞テーマにおける自分の「部員の種類」（未選択ならnull） */
export async function getMemberCategoryForTheme(memberId: string, theme: string) {
  const [row] = await db
    .select()
    .from(memberCategories)
    .where(and(eq(memberCategories.memberId, memberId), eq(memberCategories.theme, theme)))
    .limit(1);
  return row?.category ?? null;
}

/** 管理者向け：指定の演舞テーマにおける、メンバーごとの「部員の種類」一覧（閲覧専用。編集は本人のみ） */
export async function getMemberCategoriesForTheme(theme: string) {
  const rows = await db
    .select()
    .from(memberCategories)
    .where(eq(memberCategories.theme, theme));
  return new Map(rows.map((r) => [r.memberId, r.category]));
}

// ==================== 演舞テーマ（管理者が切り替える。年会費・部員の種類の基準） ====================

/** 現在の演舞テーマ（isCurrent=trueの1件）。まだ一度もテーマを作っていない場合はnull。 */
export async function getCurrentTheme() {
  const [theme] = await db
    .select()
    .from(performanceThemes)
    .where(eq(performanceThemes.isCurrent, true))
    .limit(1);
  return theme ?? null;
}

/** これまでに作成した演舞テーマの一覧（新しい順） */
export async function getAllThemes() {
  return db.select().from(performanceThemes).orderBy(desc(performanceThemes.createdAt));
}

/**
 * 指定メンバーの、「今のテーマ」より前に登録されていた直近の「部員の種類」。
 * テーマ切替直後の引き継ぎ候補として使う（今のテーマの分は除外して検索する）。
 */
export async function getMemberLatestCategory(memberId: string, currentTheme: string) {
  const rows = await db
    .select()
    .from(memberCategories)
    .where(and(eq(memberCategories.memberId, memberId), ne(memberCategories.theme, currentTheme)))
    .orderBy(desc(memberCategories.createdAt))
    .limit(1);
  return rows[0]?.category ?? null;
}

/**
 * 管理者向け：現在の演舞テーマの「部員の種類」がまだ登録されていない、現役正部員の一覧。
 * それぞれ、直近（前回）の種類が分かればあわせて返す（引き継ぎボタンの表示用）。
 */
export async function getPendingCategoryMembers(currentTheme: string) {
  const activeMembers = await db
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

  const currentRows = await db
    .select({ memberId: memberCategories.memberId })
    .from(memberCategories)
    .where(eq(memberCategories.theme, currentTheme));
  const hasCurrent = new Set(currentRows.map((r) => r.memberId));

  const pendingMembers = activeMembers.filter((m) => !hasCurrent.has(m.id));
  if (pendingMembers.length === 0) return [];

  const pastRows = await db
    .select()
    .from(memberCategories)
    .where(
      and(
        inArray(
          memberCategories.memberId,
          pendingMembers.map((m) => m.id)
        ),
        ne(memberCategories.theme, currentTheme)
      )
    );
  const latestByMember = new Map<string, (typeof pastRows)[number]>();
  for (const row of pastRows) {
    const existing = latestByMember.get(row.memberId);
    if (!existing || row.createdAt > existing.createdAt) {
      latestByMember.set(row.memberId, row);
    }
  }

  return pendingMembers.map((m) => ({
    member: m,
    previousCategory: latestByMember.get(m.id)?.category ?? null,
  }));
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

  // ゲストの回答は attending/notAttending/undecided/total（=未回答計算に使う分子）には含めず、
  // 別枠の guestAttending としてカウントする
  const countMap = new Map<
    string,
    { attending: number; notAttending: number; undecided: number; total: number; guestAttending: number }
  >();
  for (const r of allResponses) {
    const c =
      countMap.get(r.eventId) ??
      { attending: 0, notAttending: 0, undecided: 0, total: 0, guestAttending: 0 };
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
    counts:
      countMap.get(e.id) ??
      { attending: 0, notAttending: 0, undecided: 0, total: 0, guestAttending: 0 },
    activeMemberCount,
  }));
}

// ==================== ボトムナビのバッジ件数 ====================

/** 本人向け：今後の募集中イベントのうち、まだ回答していない件数（ダッシュボードの計算と同じ条件） */
export async function getPendingEventCountForMember(memberId: string): Promise<number> {
  const rows = await getOpenEventsForMember(memberId);
  const todayKey = jstTodayKey();
  return rows.filter(
    (row) =>
      (!row.event.eventDate || jstDateKey(row.event.eventDate) >= todayKey) && !row.response
  ).length;
}

/** 本人向け：対象になっている、実質的に回答受付中のアンケートのうち未回答の件数 */
export async function getPendingSurveyCountForMember(memberId: string): Promise<number> {
  const rows = await getSurveysForMember(memberId);
  return rows.filter(({ survey, answered }) => !answered && isSurveyOpen(survey)).length;
}

/**
 * 最後にお知らせ一覧を開いた日時（lastSeenNoticesAt）より後に作られたお知らせの件数。
 * まだ一度も開いたことがない（null）場合は、これまでの全件を未読として数える。
 */
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
