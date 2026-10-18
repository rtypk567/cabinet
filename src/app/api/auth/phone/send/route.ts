import { deletePhoneCode, findUserByPhone, savePhoneCode } from "@/lib/db";
import { clearCooldown, clientIp, cooldownLeft, json, rateLimit, readJson, sameOrigin } from "@/lib/http";
import { CODE_TTL_MS, RESEND_COOLDOWN_MS, generateCode, hashCode, normalizePhone } from "@/lib/phone";
import { getCodeSender } from "@/lib/sms";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Запрос отклонён" }, 403);

  const sender = getCodeSender();
  

  const body = await readJson(req);
  if (!body) return json({ error: "Некорректный запрос" }, 400);

  const phone = normalizePhone(body.phone);
  if (!phone) return json({ error: "Введите номер в международном формате, например +79123456789" }, 400);

  const hour = 60 * 60 * 1000;
  if (!rateLimit(`psend:ip:${clientIp(req)}`, 10, hour) || !rateLimit(`psend:${phone}`, 5, hour)) {
    return json({ error: "Слишком много запросов кода. Попробуйте через час." }, 429);
  }

  // Пауза действует одинаково для известных и неизвестных номеров, иначе по ответам можно узнать, кто подключён.
  const wait = cooldownLeft(`pcool:${phone}`, RESEND_COOLDOWN_MS);
  if (wait > 0) return json({ error: `Повторно отправить код можно через ${wait} с`, retryAfter: wait }, 429);

  const reply = { ok: true, retryAfter: Math.round(RESEND_COOLDOWN_MS / 1000) };
 if (!sender) return json(reply);
  // Кабинет закрытый: код уходит только на номера, которые добавил администратор.
  // Ответ для чужого номера такой же, как для своего.
  if (!findUserByPhone(phone)) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[phone-auth] номер ${phone} не подключён к кабинету, код не отправлен. Добавьте: npm run user -- add --phone ${phone} ...`);
    }
    return json(reply);
  }

  const now = Date.now();
  const code = generateCode();
  savePhoneCode(phone, hashCode(phone, code), now + CODE_TTL_MS, now);
  try {
    await sender(phone, code);
  } catch {
    deletePhoneCode(phone);
    clearCooldown(`pcool:${phone}`);
    return json({ error: "Не удалось отправить код: бот сейчас недоступен. Попробуйте позже." }, 502);
  }

  return json(reply);
}
