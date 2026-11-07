"use client";

import { useState } from "react";
import type { ShareTemplate } from "@/lib/shareText";

/**
 * LINEに貼る告知文のカード。テンプレートを選んで、必要なら手直ししてから
 * 「コピー」または「LINEで送る」（LINEアプリの送信先選択が開く）。
 */
export function ShareTextCard({
  title = "LINEに貼る文章",
  description,
  templates,
  defaultOpen = false,
}: {
  title?: string;
  description?: string;
  templates: ShareTemplate[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [active, setActive] = useState(templates[0]?.key ?? "");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const current = templates.find((t) => t.key === active) ?? templates[0];
  const text = edits[current.key] ?? current.text;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 古いブラウザなど、クリップボードAPIが使えない場合の代わり
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[#06C755]/30 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left"
      >
        <span className="flex items-center gap-2">
          <span className="rounded-md bg-[#06C755] px-1.5 py-0.5 text-[10px] font-black text-white">LINE</span>
          <span className="text-sm font-bold text-neutral-800">{title}</span>
        </span>
        <span className="text-xs font-semibold text-neutral-400">{open ? "閉じる ▲" : "作る ▾"}</span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-neutral-100 px-5 pb-5 pt-3">
          {description && <p className="text-[11px] text-neutral-400">{description}</p>}
          {templates.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto">
              {templates.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActive(t.key)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    t.key === current.key
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 bg-white text-neutral-500"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
          <textarea
            value={text}
            onChange={(e) => setEdits({ ...edits, [current.key]: e.target.value })}
            rows={Math.min(14, Math.max(6, text.split("\n").length + 1))}
            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-[13px] leading-relaxed text-neutral-800 focus:border-[#06C755] focus:outline-none focus:ring-2 focus:ring-[#06C755]/20"
          />
          <p className="-mt-1 text-[11px] text-neutral-400">送る前に、ここで文章を自由に直せます。</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={copy}
              className="rounded-xl border border-neutral-200 bg-white py-2.5 text-sm font-bold text-neutral-700"
            >
              {copied ? "コピーしました ✓" : "コピー"}
            </button>
            <a
              href={`https://line.me/R/share?text=${encodeURIComponent(text)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-[#06C755] py-2.5 text-center text-sm font-bold text-white"
            >
              LINEで送る
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
