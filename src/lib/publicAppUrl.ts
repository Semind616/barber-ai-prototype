/**
 * Публичный базовый URL приложения (без завершающего /).
 * Нужен для callback NanoBanana и для URL временного изображения,
 * которое их серверы скачивают по HTTP.
 */
export function resolvePublicAppUrl(request: Request): string {
  const fromEnv = process.env.APP_BASE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export function isLikelyUnreachableForExternalFetch(publicUrl: string): boolean {
  try {
    const host = new URL(publicUrl).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return true;
  }
}
