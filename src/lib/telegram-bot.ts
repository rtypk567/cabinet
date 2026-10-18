// Узнаёт username бота по токену (метод Telegram getMe), чтобы в настройках хватало одной переменной.
// Токен используется только на сервере: в браузер уходит лишь username бота.

const API_BASE = process.env.TELEGRAM_API_BASE || "https://api.telegram.org";
const CACHE_MS = 60 * 60 * 1000;
const FAILURE_CACHE_MS = 60 * 1000;

let cached: { username: string; at: number } | null = null;
let failure: { at: number; result: TelegramBot } | null = null;

export type TelegramBot = {
  username: string | null;
  /** Причина, по которой кнопки Telegram нет. Показывается только в режиме разработки. */
  problem: string | null;
};

export async function getTelegramBot(): Promise<TelegramBot> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    return { username: null, problem: "В .env.local не задан TELEGRAM_BOT_TOKEN, поэтому вход через Telegram скрыт." };
  }

  const override = process.env.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, "");
  if (override) return { username: override, problem: null };

  const now = Date.now();
  if (cached && now - cached.at < CACHE_MS) return { username: cached.username, problem: null };
  // Недавняя неудача тоже запоминается: иначе при недоступном Telegram каждая загрузка страницы ждала бы ответа.
  if (failure && now - failure.at < FAILURE_CACHE_MS) return failure.result;

  const fail = (problem: string): TelegramBot => {
    failure = { at: now, result: { username: null, problem } };
    return failure.result;
  };

  try {
    // Адрес запроса содержит токен: его нельзя выводить в логи и сообщения об ошибках.
    const res = await fetch(`${API_BASE}/bot${token}/getMe`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; result?: { username?: string } } | null;

    if (data?.ok && data.result?.username) {
      cached = { username: data.result.username, at: now };
      failure = null;
      return { username: cached.username, problem: null };
    }
    if (res.status === 401 || res.status === 404) {
      return fail("Telegram не принял токен бота. Проверьте TELEGRAM_BOT_TOKEN в @BotFather.");
    }
    return fail(`Telegram ответил ошибкой (${res.status}). Попробуйте позже.`);
  } catch {
    return fail("Не удалось связаться с Telegram, чтобы проверить токен бота. Проверьте интернет.");
  }
}
