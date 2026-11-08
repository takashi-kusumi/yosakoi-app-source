/** 管理者がメンバーの代わりに回答を入力するフォーム（未回答の人を先頭に並べる） */
export function ProxyRespondForm({
  action,
  options,
}: {
  action: string;
  options: { id: string; displayName: string; currentLabel: string | null }[];
}) {
  const unanswered = options.filter((o) => !o.currentLabel);
  const answered = options.filter((o) => o.currentLabel);
  return (
    <section id="proxy" className="scroll-mt-20 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-bold text-neutral-800">代理で回答を入力</h2>
      <p className="mt-0.5 text-[11px] text-neutral-400">
        口頭やLINEで出欠を聞いた人の分を、管理者が代わりに入力できます。締切後でも入力できます。参加状況には「管理者が代理入力」と表示されます。
      </p>
      <form action={action} method="POST" className="mt-3 space-y-2">
        <input type="hidden" name="action" value="proxyRespond" />
        <select
          name="memberId"
          required
          defaultValue=""
          className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
        >
          <option value="" disabled>
            メンバーを選択
          </option>
          {unanswered.length > 0 && (
            <optgroup label="未回答">
              {unanswered.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.displayName}
                </option>
              ))}
            </optgroup>
          )}
          {answered.length > 0 && (
            <optgroup label="回答済み（上書きされます）">
              {answered.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.displayName}（今: {o.currentLabel}）
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <input
          type="text"
          name="note"
          maxLength={100}
          placeholder="メモ（任意）例: LINEで連絡あり"
          className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm placeholder:text-neutral-300 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
        />
        <div className="grid grid-cols-3 gap-2">
          <button type="submit" name="status" value="ATTENDING" className="rounded-xl border border-emerald-600 bg-emerald-600 py-2.5 text-sm font-bold text-white">
            参加
          </button>
          <button type="submit" name="status" value="UNDECIDED" className="rounded-xl border border-sky-600 bg-sky-600 py-2.5 text-sm font-bold text-white">
            未定
          </button>
          <button type="submit" name="status" value="NOT_ATTENDING" className="rounded-xl border border-neutral-600 bg-neutral-600 py-2.5 text-sm font-bold text-white">
            不参加
          </button>
        </div>
      </form>
    </section>
  );
}
