import { getCurrentMember } from "@/lib/auth";
import {
  getAllGroups,
  getMemberGroupIds,
  getMemberCategoryForTheme,
  getCurrentTheme,
} from "@/lib/queries";
import { FlashMessage } from "@/components/FlashMessage";
import { MEMBER_CATEGORY_OPTIONS } from "@/lib/labels";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const member = await getCurrentMember();
  if (!member) return null;

  const currentTheme = await getCurrentTheme();
  const [groups, myGroupIds, myCategory] = await Promise.all([
    getAllGroups(),
    getMemberGroupIds(member.id),
    currentTheme ? getMemberCategoryForTheme(member.id, currentTheme.name) : Promise.resolve(null),
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
            ? "学年・パート・部員の種類・メールアドレスを編集できます。"
            : "学年・パート・部員の種類・メールアドレスを入力すると、正部員として登録されます。メールアドレスは練習場所の入館証発行に使用します。"}
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
            部員の種類{currentTheme && `（${currentTheme.name}）`}
          </label>
          {currentTheme ? (
            <>
              <p className="mb-2 text-xs text-neutral-400">
                今のテーマで希望する役割を選択してください。途中でも変更できますが、サポート登録の方が
                道具演出などを行う場合は区分変更後の会費が発生することがあります。演者から専門職・
                サポートへの変更による年会費の返金は行いません。演舞テーマが切り替わったら改めて選び直してください。
              </p>
              <select
                name="category"
                required
                defaultValue={myCategory ?? ""}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="" disabled>
                  選択してください
                </option>
                {MEMBER_CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <p className="text-xs text-neutral-400">
              現在、部員の種類の登録期間が設定されていません。管理者にご確認ください。
            </p>
          )}
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
