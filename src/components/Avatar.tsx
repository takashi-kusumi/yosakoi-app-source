"use client";

import { useEffect, useRef, useState } from "react";

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
  const imgRef = useRef<HTMLImageElement>(null);
  // 画像の読み込み失敗が画面の準備完了より先に起きた場合も、頭文字の表示に切り替える
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);
  const style = { width: size, height: size };
  if (pictureUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        ref={imgRef}
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
