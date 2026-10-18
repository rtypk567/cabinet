import { createEmailUser, findUserByEmail, isUniqueViolation } from "@/lib/db";
import { clientIp, json, rateLimit, readJson, sameOrigin } from "@/lib/http";
import { hashPassword } from "@/lib/password";
import { createSession } from "@/lib/session";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Запрос отклонён" }, 403);
  if (!rateLimit(`register:${clientIp(req)}`, 10, 60 * 60 * 1000)) {
    return json({ error: "Слишком много попыток. Попробуйте позже." }, 429);
  }

  const body = await readJson(req);
  if (!body) return json({ error: "Некорректный запрос" }, 400);

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const name = String(body.name ?? "").trim().slice(0, 60);

  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return json({ error: "Введите корректный адрес почты" }, 400);
  }
  if (password.length < 8 || password.length > 128) {
    return json({ error: "Пароль должен быть от 8 до 128 символов" }, 400);
  }
  if (findUserByEmail(email)) {
    return json({ error: "Эта почта уже зарегистрирована. Войдите." }, 409);
  }

  const passwordHash = await hashPassword(password);
  try {
    const user = createEmailUser({ email, passwordHash, name: name || email.split("@")[0] });
    await createSession(user.id);
    return json({ ok: true });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return json({ error: "Эта почта уже зарегистрирована. Войдите." }, 409);
    }
    throw err;
  }
}
