"use client";

import { useState } from "react";
import { TutorialSlides } from "@/components/TutorialSlides";
import { MEMBER_SLIDES, ADMIN_SLIDE } from "@/lib/tutorial";
import { AppLogo } from "@/components/AppLogo";

/**
 * 初回ログイン時のWelcome。①フルネームの入力（必須） → ②使い方のスライド → 登録完了。
 * フルネームは最後の「はじめる」でまとめて送信する（スライドを飛ばしても名前は必ず送られる）。
 */
export function WelcomeFlow({ googleName, isAdmin }: { googleName: string; isAdmin: boolean }) {
  const [name, setName] = useState("");
  const [step, setStep] = useState<"name" | "tour">("name");
  const trimmed = name.replace(/[\s　]+/g, " ").trim();
  const valid = trimmed.length >= 2 && trimmed.length <= 30;
  const slides = isAdmin ? [...MEMBER_SLIDES, ADMIN_SLIDE] : MEMBER_SLIDES;

  const finishForm = (label: string, className: string) => (
    <form action="/api/me" method="POST" className={className}>
      <input type="hidden" name="action" value="completeOnboarding" />
      <input type="hidden" name="fullName" value={trimmed} />
      <button type="submit" className="w-full rounded-xl bg-orange-600 py-3 text-sm font-bold text-white">
        {label}
      </button>
    </form>
  );

  if (step === "name") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) setStep("tour");
        }}
        className="space-y-4"
      >
        <div className="text-center">
          <AppLogo size={96} className="mx-auto mb-4 shadow-lg shadow-black/20" />
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">ようこそ！</h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500">
            はじめに、あなたのフルネームを教えてください。
            <br />
            出欠の一覧などで、この名前がメンバーに表示されます。
          </p>
        </div>
        <div>
          <label htmlFor="fullName" className="mb-1 block text-xs font-semibold text-neutral-600">
            フルネーム（必須）
          </label>
          <input
            id="fullName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={30}
            autoComplete="name"
            autoFocus
            placeholder="例: 山田 太郎"
            className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-base focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
          />
          <p className="mt-1.5 text-[11px] text-neutral-400">
            Googleの登録名は「{googleName}」です。名前はあとから「プロフィール」で変更できます。
          </p>
        </div>
        <button
          type="submit"
          disabled={!valid}
          className="w-full rounded-xl bg-orange-600 py-3 text-sm font-bold text-white disabled:opacity-40"
        >
          次へ
        </button>
      </form>
    );
  }

  return (
    <div>
      <p className="mb-2 text-center text-xs font-semibold text-neutral-400">
        {trimmed}さん、かんたんな使い方を紹介します
      </p>
      <TutorialSlides slides={slides} finish={finishForm("はじめる", "flex-1")} />
      <div className="mt-3 text-center">
        <form action="/api/me" method="POST">
          <input type="hidden" name="action" value="completeOnboarding" />
          <input type="hidden" name="fullName" value={trimmed} />
          <button type="submit" className="text-xs font-semibold text-neutral-400 underline-offset-2 hover:underline">
            説明をスキップしてはじめる
          </button>
        </form>
      </div>
    </div>
  );
}
