/**
 * このアプリが動いているURLを決定する。
 * 環境変数 APP_URL を優先し、無ければリクエストの origin を使う。
 */
export function resolveAppUrl(requestOrigin: string): string {
  return process.env.APP_URL?.replace(/\/$/, "") || requestOrigin;
}
