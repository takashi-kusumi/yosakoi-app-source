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
      <div className="flex flex-col items-center px-1 text-center">
        <div className="flex h-56 w-full items-center justify-center overflow-hidden rounded-2xl bg-neutral-100 p-3">
          {/* 全スライドの画像を先に読み込んでおき、表示中の1枚だけ見せる（切り替え時のちらつき防止） */}
          {slides.map((s, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={s.image}
              src={s.image}
              alt={i === index ? s.imageAlt : ""}
              aria-hidden={i !== index}
              className={`max-h-full max-w-full rounded-xl object-contain shadow-sm ${i === index ? "" : "hidden"}`}
            />
          ))}
        </div>
        <h2 className="mt-4 text-lg font-bold text-neutral-900">{slide.title}</h2>
        <p className="mt-1.5 min-h-[4.5rem] text-sm leading-relaxed text-neutral-600">{slide.body}</p>
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
