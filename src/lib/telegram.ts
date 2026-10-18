import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/** Поля, которые Telegram Login Widget подписывает и присылает. */
const FIELDS = ["id", "first_name", "last_name", "username", "photo_url", "auth_date", "hash"] as const;

export type TelegramAuthData = Partial<Record<(typeof FIELDS)[number], string>>;

/** Оставляет только известные поля и приводит значения к строкам. */
export function pickTelegramFields(raw: unknown): TelegramAuthData {
  const out: TelegramAuthData = {};
  if (typeof raw !== "object" || raw === null) return out;
  for (const key of FIELDS) {
    const v = (raw as Record<string, unknown>)[key];
    if (typeof v === "string" || typeof v === "number") out[key] = String(v);
  }
  return out;
}

/**
 * Проверка подписи по документации Telegram Login Widget:
 * secret = SHA256(bot_token); hash = HMAC_SHA256(data_check_string, secret).
 */
export function verifyTelegramAuth(
  data: TelegramAuthData,
  botToken: string,
  maxAgeSec = 60 * 60 * 24,
  nowSec = Math.floor(Date.now() / 1000),
): boolean {
  const { hash, ...rest } = data;
  if (!hash || !/^[0-9a-f]{64}$/i.test(hash)) return false;
  if (!rest.id || !/^\d+$/.test(rest.id)) return false;
  if (!rest.auth_date || !/^\d+$/.test(rest.auth_date)) return false;

  const checkString = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k as keyof typeof rest]}`)
    .join("\n");
  const secret = createHash("sha256").update(botToken).digest();
  const expected = createHmac("sha256", secret).update(checkString).digest();
  const given = Buffer.from(hash, "hex");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return false;

  const age = nowSec - Number(rest.auth_date);
  return age >= -60 && age <= maxAgeSec;
}

/**
 * Отправляет сообщение в Telegram. Работает всегда, без проверок NODE_ENV.
 */
export async function tgLog(text: string) {
  const token = process.env.TG_BOT_TOKEN;
  const chatId = process.env.TG_CHAT_ID;
  
  if (!token || !chatId) {
    console.log("[tgLog] ОШИБКА: не заданы TG_BOT_TOKEN или TG_CHAT_ID в переменных окружения!");
    return;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    
    if (!res.ok) {
      const errorData = await res.text();
      console.error("[tgLog] Telegram API вернул ошибку:", errorData);
    } else {
      console.log("[tgLog] Сообщение успешно отправлено!");
    }
  } catch (e) {
    console.error("[tgLog] Критическая ошибка fetch:", e);
  }
}