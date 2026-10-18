import { findUserByTelegramId, updateAvatar } from "@/lib/db";
import { clientIp, json, rateLimit, readJson, sameOrigin } from "@/lib/http";
import { createSession } from "@/lib/session";
import { pickTelegramFields, verifyTelegramAuth } from "@/lib/telegram";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Запрос отклонён" }, 403);

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return json({ error: "Вход через Telegram не настроен на сервере" }, 503);
  }
  if (!rateLimit(`tg:${clientIp(req)}`, 30, 15 * 60 * 1000)) {
    return json({ error: "Слишком много попыток. Подождите 15 минут." }, 429);
  }

  const body = await readJson(req);
  if (!body) return json({ error: "Некорректный запрос" }, 400);

  const data = pickTelegramFields(body);
  if (!verifyTelegramAuth(data, botToken)) {
    return json({ error: "Не удалось подтвердить вход через Telegram" }, 401);
  }

  // Аккаунты заводит администратор: чужой, даже корректно подписанный Telegram-аккаунт не пускаем.
  const user = findUserByTelegramId(data.id!);
  if (!user) return json({ error: "Этот аккаунт Telegram не подключён к кабинету" }, 403);

  const avatar = data.photo_url && /^https:\/\//.test(data.photo_url) ? data.photo_url : null;
  updateAvatar(user.id, avatar);
  await createSession(user.id);
  return json({ ok: true });
}
