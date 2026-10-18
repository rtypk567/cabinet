// Канал доставки кода на номер. Сейчас есть только тестовый: код пишется в консоль сервера.
//
// Чтобы подключить реальный канал (Telegram Gateway, SMS-провайдер), добавьте ветку в getCodeSender()
// и задайте PHONE_PROVIDER в .env.local. Остальной код (эндпоинты, экран входа) менять не нужно.

export type CodeSender = (phone: string, code: string) => Promise<void>;

export function getCodeSender(): CodeSender | null {
  const production = process.env.NODE_ENV === "production";
  const provider = process.env.PHONE_PROVIDER ?? (production ? "" : "console");

  // Тестовый канал запрещён в production: там код никто не получит, а вход по номеру должен быть выключен.
  if (provider === "console" && !production) {
    return async (phone, code) => {
      console.log(`[phone-auth] код для ${phone}: ${code}`);
    };
  }

  // if (provider === "telegram-gateway") return sendViaTelegramGateway;
  // if (provider === "sms") return sendViaSmsProvider;

  return null;
}
