// Подписанный токен сессии (JWT, HS256) на Web Crypto: работает и в Node, и в middleware (Edge)
// без сторонних библиотек.

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 дней

const enc = new TextEncoder();

/** Серверный секрет: подписывает сессии и кодов подтверждения. */
export function sessionSecret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return enc.encode(s);
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET не задан или короче 32 символов");
  }
  // Только для локальной разработки. В production без секрета приложение не стартует.
  return enc.encode("dev-only-secret-change-me-0123456789abcdef");
}

function toB64Url(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64Url(s: string): Uint8Array {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

function hmacKey(usage: "sign" | "verify"): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    sessionSecret() as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  );
}

export async function signSession(userId: number): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = toB64Url(enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = toB64Url(
    enc.encode(JSON.stringify({ sub: String(userId), iat: now, exp: now + SESSION_MAX_AGE })),
  );
  const data = `${header}.${payload}`;
  const sig = await crypto.subtle.sign("HMAC", await hmacKey("sign"), enc.encode(data));
  return `${data}.${toB64Url(sig)}`;
}

/** Возвращает id пользователя или null, если токен отсутствует, подделан или просрочен. */
export async function verifySessionToken(token?: string): Promise<number | null> {
  if (!token) return null;
  const key = await hmacKey("verify"); // ошибка конфигурации не маскируется под «нет сессии»
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, payload, sig] = parts;

    const head = JSON.parse(new TextDecoder().decode(fromB64Url(header)));
    if (head?.alg !== "HS256") return null;

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromB64Url(sig) as BufferSource,
      enc.encode(`${header}.${payload}`),
    );
    if (!valid) return null;

    const claims = JSON.parse(new TextDecoder().decode(fromB64Url(payload)));
    if (typeof claims.exp !== "number" || claims.exp <= Math.floor(Date.now() / 1000)) return null;
    const id = Number(claims.sub);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}
