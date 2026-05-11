const store = new Map<
  string,
  { buffer: Buffer; mimeType: string; expiresAt: number }
>();

const TTL_MS = 30 * 60 * 1000;

export function putTempImage(buffer: Buffer, mimeType: string): string {
  const token = crypto.randomUUID();
  store.set(token, { buffer, mimeType, expiresAt: Date.now() + TTL_MS });
  pruneExpired();
  return token;
}

export function getTempImage(
  token: string
): { buffer: Buffer; mimeType: string } | null {
  pruneExpired();
  const entry = store.get(token);
  if (!entry || Date.now() > entry.expiresAt) {
    store.delete(token);
    return null;
  }
  return { buffer: entry.buffer, mimeType: entry.mimeType };
}

function pruneExpired() {
  const now = Date.now();
  for (const [key, v] of store) {
    if (now > v.expiresAt) store.delete(key);
  }
}
