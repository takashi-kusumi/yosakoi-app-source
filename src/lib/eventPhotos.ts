// イベント写真アップロードの制約。
// 画像はアップロード前にブラウザ側で自動リサイズ・JPEG圧縮するため、
// ここでのサイズ上限はあくまで安全のための上限（通常はもっと小さくなる想定）。
export const MAX_PHOTO_SIZE = 8 * 1024 * 1024; // 8MB
export const MAX_PHOTOS_PER_BATCH = 20;
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png"];

export function newPhotoObjectKey(eventId: string, fileExt: string): string {
  const id = crypto.randomUUID();
  return `events/${eventId}/${id}.${fileExt}`;
}
