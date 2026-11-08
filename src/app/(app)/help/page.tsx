import { getCurrentMember } from "@/lib/auth";
import { TutorialSlides } from "@/components/TutorialSlides";
import { MEMBER_SLIDES, ADMIN_SLIDE } from "@/lib/tutorial";
import { BackLink, Card, PageTitle } from "@/components/ui";

export default async function HelpPage() {
  const member = await getCurrentMember();
  if (!member) return null;
  const slides = member.role === "ADMIN" ? [...MEMBER_SLIDES, ADMIN_SLIDE] : MEMBER_SLIDES;

  return (
    <div className="space-y-4">
      <BackLink href="/me" label="プロフィール" />
      <PageTitle>使い方</PageTitle>
      <Card>
        <TutorialSlides slides={slides} />
      </Card>
      <Card>
        <h2 className="mb-2 text-sm font-bold text-neutral-800">よくある質問</h2>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="font-semibold text-neutral-700">回答をあとから変えられますか？</dt>
            <dd className="mt-0.5 text-neutral-500">締切までは何度でも変えられます。予定の詳細を開いて、別のボタンを押してください。</dd>
          </div>
          <div>
            <dt className="font-semibold text-neutral-700">たくさんの予定に一度に回答したい</dt>
            <dd className="mt-0.5 text-neutral-500">ホームや「予定」タブの「まとめて回答」から、1画面で選んで一度に保存できます。</dd>
          </div>
          <div>
            <dt className="font-semibold text-neutral-700">メモだけ変えたいときは？</dt>
            <dd className="mt-0.5 text-neutral-500">メモを書き換えて、今の回答のボタンをもう一度押してください。</dd>
          </div>
          <div>
            <dt className="font-semibold text-neutral-700">名前を間違えて登録しました</dt>
            <dd className="mt-0.5 text-neutral-500">右上のアイコン →「プロフィール」から変更できます。</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
