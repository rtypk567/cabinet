export async function tgLog(text: string) {
  const token = process.env.TG_BOT_TOKEN;
  const chatId = process.env.TG_CHAT_ID;
  
  if (!token || !chatId) {
    console.log("[tgLog] ОШИБКА: не заданы TG_BOT_TOKEN или TG_CHAT_ID");
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
      }),
    });
    
    // Если телеграм вернул ошибку (например, неверный токен или бот заблокирован)
    if (!res.ok) {
      const errorData = await res.text();
      console.error("[tgLog] Ошибка от Telegram API:", errorData);
    } else {
      console.log("[tgLog] Сообщение успешно отправлено!");
    }
  } catch (e) {
    console.error("[tgLog] Критическая ошибка fetch:", e);
  }
}