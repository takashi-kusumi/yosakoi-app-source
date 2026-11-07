"use client";

import { useState } from "react";

import type { Slide } from "@/lib/tutorial";

/**
 * スライド形式の使い方説明。最後のスライドで onFinish を表示する（Welcomeでは登録ボタン、使い方ページでは何もしない）。
 */
export function TutorialSlides({
  slides,
  finish,
}: {
  slides: Slide[];
  finish?: React.ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const last = index === slides.length - 1;

  return (
    <div className="flex flex-col">
      <div className="flex min-h-64 flex-col items-center justify-center px-2 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-50 text-4xl">
          {slide.emoji}
        </div>
        <h2 className="text-lg font-bold text-neutral-900">{slide.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">{slide.body}</p>
      </div>

      <div className="my-4 flex justify-center gap-1.5" aria-hidden>
        {slides.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-orange-600" : "w-1.5 bg-neutral-300"}`}
          />
        ))}
      </div>

      <div className="flex gap-2">
        {index > 0 && (
          <button
            type="button"
            onClick={() => setIndex(index - 1)}
            className="flex-1 rounded-xl border border-neutral-200 bg-white py-3 text-sm font-bold text-neutral-600"
          >
            戻る
          </button>
        )}
        {!last ? (
          <button
            type="button"
            onClick={() => setIndex(index + 1)}
            className="flex-1 rounded-xl bg-neutral-900 py-3 text-sm font-bold text-white"
          >
            次へ
          </button>
        ) : (
          finish ?? null
        )}
      </div>
    </div>
  );
}
