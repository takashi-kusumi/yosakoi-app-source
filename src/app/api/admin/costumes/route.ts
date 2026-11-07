import { NextRequest } from "next/server";
import { db } from "@/db";
import { costumes, members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { newId } from "@/lib/id";
import { redirectWithMessage } from "@/lib/formRedirect";

const BACK = "/admin/costumes";

function textOrNull(value: FormDataEntryValue | null): string | null {
  const v = String(value ?? "").trim();
  return v || null;
}

/** ownerIdが指定されていれば、実在するメンバーかを確認する（空ならOK＝部の共用） */
async function ownerExists(ownerId: string | null): Promise<boolean> {
  if (!ownerId) return true;
  const [row] = await db.select({ id: members.id }).from(members).where(eq(members.id, ownerId)).limit(1);
  return !!row;
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return redirectWithMessage(request, "/dashboard", { error: "管理者のみ操作できます" });
  }

  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "delete") {
    // 削除すると、この衣装の貸し借りの記録（写真も含む）もカスケード削除される
    const costumeId = String(formData.get("costumeId") || "");
    await db.delete(costumes).where(eq(costumes.id, costumeId));
    return redirectWithMessage(request, BACK, { ok: "衣装を削除しました" });
  }

  const name = String(formData.get("name") || "").trim();
  const theme = textOrNull(formData.get("theme"));
  const size = textOrNull(formData.get("size"));
  const note = textOrNull(formData.get("note"));
  const ownerId = textOrNull(formData.get("ownerId"));

  if (!name) {
    return redirectWithMessage(request, BACK, { error: "衣装名を入力してください" });
  }
  if (!(await ownerExists(ownerId))) {
    return redirectWithMessage(request, BACK, { error: "持ち主のメンバーが見つかりません" });
  }

  if (action === "update") {
    const costumeId = String(formData.get("costumeId") || "");
    await db
      .update(costumes)
      .set({ name, theme, size, note, ownerId, updatedAt: new Date() })
      .where(eq(costumes.id, costumeId));
    return redirectWithMessage(request, BACK, { ok: "衣装の情報を更新しました" });
  }

  // action === "create"
  await db.insert(costumes).values({ id: newId(), name, theme, size, note, ownerId });
  return redirectWithMessage(request, BACK, { ok: "衣装を台帳に追加しました" });
}
