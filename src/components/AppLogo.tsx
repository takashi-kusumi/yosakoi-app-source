import Image from "next/image";

/**
 * チームのロゴ（丸型）。画像は public/icon-192.png / icon-512.png。
 * ロゴを差し替えるときは、public/ の icon-*.png と src/app/favicon.ico を置き換える。
 */
export function AppLogo({ size, className = "" }: { size: number; className?: string }) {
  return (
    <Image
      src={size > 64 ? "/icon-512.png" : "/icon-192.png"}
      alt=""
      width={size}
      height={size}
      priority
      className={`shrink-0 rounded-full ${className}`}
    />
  );
}
