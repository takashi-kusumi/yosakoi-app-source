"use client";

import { useState } from "react";

/** メンバーのアイコン。Googleのプロフィール画像が無い・読み込めない場合は名前の頭文字を表示する */
export function Avatar({
  name,
  pictureUrl,
  size = 32,
}: {
  name: string;
  pictureUrl?: string | null;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size };
  if (pictureUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={pictureUrl}
        alt=""
        style={style}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="shrink-0 rounded-full bg-neutral-100 object-cover"
      />
    );
  }
  return (
    <span
      style={{ ...style, fontSize: Math.round(size * 0.42) }}
      className="flex shrink-0 items-center justify-center rounded-full bg-orange-100 font-bold text-orange-700"
      aria-hidden
    >
      {name.trim().slice(0, 1) || "?"}
    </span>
  );
}
