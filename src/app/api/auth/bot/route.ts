import { json } from "@/lib/http";

const API_BASE = process.env.TELEGRAM_API_BASE || "https://api.telegram.org";

// ====== ЗДЕСЬ МЕНЯЕТЕ ТЕКСТ И КНОПКУ ======

// Текст после /start. Пишите между обратными кавычками, переносы строк сохраняются.
// Внутри текста нельзя использовать символ ` (обратная кавычка) и последовательность ${
const START_TEXT = `Здравствуйте! Этот бот предоставляет справочную информацию о налогах и сборах и помогает быстро перейти к сервисам ФНС России.

Доступные разделы:
Сроки уплаты налогов и представления деклараций
Налоговые вычеты и льготы
Специальные налоговые режимы (НПД, УСН, патент)
Регистрация и прекращение деятельности индивидуального предпринимателя
Адреса и режим работы налоговых инспекций
Ответы на часто задаваемые вопросы

Продолжая работу с ботом, вы подтверждаете согласие на обработку персональных данных в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных».
`;

// Кнопка под сообщением, открывает мини-апп
const BUTTON_TEXT = "Открыть приложение";
const MINI_APP_URL = "https://t.me/Nalog_IP_Gosbot/app"; // обязательно https://

// ==========================================

export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return json({ error: "forbidden" }, 403);
  }
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const update = await req.json().catch(() => null);
  const msg = update?.message;

  if (token && msg?.chat?.id && typeof msg.text === "string" && /^\/start(@\w+)?(\s|$)/.test(msg.text)) {
    const body: Record<string, unknown> = {
      chat_id: msg.chat.id,
      text: START_TEXT,
      link_preview_options: { is_disabled: true },
    };
    if (MINI_APP_URL.startsWith("https://") && !MINI_APP_URL.includes("ВСТАВЬТЕ")) {
      body.reply_markup = { inline_keyboard: [[{ text: BUTTON_TEXT, web_app: { url: MINI_APP_URL } }]] };
    }
    await fetch(`${API_BASE}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});
  }
  return json({ ok: true });
}