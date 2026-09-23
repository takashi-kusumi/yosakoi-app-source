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
