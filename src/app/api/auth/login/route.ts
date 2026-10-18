import { findUserByEmail } from "@/lib/db";
import { clientIp, json, rateLimit, readJson, sameOrigin } from "@/lib/http";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";

// Хэш-пустышка: сравнение выполняется и для несуществующей почты,
// чтобы время ответа не выдавало, есть ли такой аккаунт.
let dummyHash: Promise<string> | null = null;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Запрос отклонён" }, 403);

  const body = await readJson(req);
  if (!body) return json({ error: "Некорректный запрос" }, 400);

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!email || !password || email.length > 254 || password.length > 128) {
    return json({ error: "Введите почту и пароль" }, 400);
  }

  const ip = clientIp(req);
  if (!rateLimit(`login:${ip}`, 30, 15 * 60 * 1000) || !rateLimit(`login:${ip}:${email}`, 8, 15 * 60 * 1000)) {
    return json({ error: "Слишком много попыток. Подождите 15 минут." }, 429);
  }

  const user = findUserByEmail(email);
  const hash = user?.password_hash ?? (await (dummyHash ??= hashPassword("dummy-password")));
  const ok = await verifyPassword(password, hash);

  if (!user || !user.password_hash || !ok) {
    return json({ error: "Неверная почта или пароль" }, 401);
  }

  await createSession(user.id);
  return json({ ok: true });
}
