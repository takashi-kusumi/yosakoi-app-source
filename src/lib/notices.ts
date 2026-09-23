// お知らせの添付ファイルの制約。
// Vercelのサーバーレス関数は1リクエストあたりのボディサイズに上限（約4.5MB）があるため、
// 余裕を持って1ファイル4MB・1回の送信で合計4MBまでに制限する。
export const MAX_ATTACHMENT_SIZE = 4 * 1024 * 1024; // 4MB
export const MAX_TOTAL_ATTACHMENTS_SIZE = 4 * 1024 * 1024; // 4MB（1回の送信の合計）

export const ALLOWED_ATTACHMENT_TYPES = ["application/pdf", "image/png", "image/jpeg"];

export const ATTACHMENT_TYPE_ICON: Record<string, string> = {
  "application/pdf": "📄",
  "image/png": "🖼️",
  "image/jpeg": "🖼️",
};

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
