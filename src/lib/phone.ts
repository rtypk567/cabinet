import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { sessionSecret } from "@/lib/jwt";

export const CODE_TTL_MS = (Number(process.env.PHONE_CODE_TTL_SEC) || 300) * 1000; // 5 минут
export const RESEND_COOLDOWN_MS = (Number(process.env.PHONE_RESEND_COOLDOWN_SEC) || 60) * 1000;
export const MAX_ATTEMPTS = 5;

/** Приводит номер к международному формату E.164 (+380501234567) или возвращает null. */
export function normalizePhone(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const cleaned = input.trim().replace(/[\s\-().]/g, "");
  return /^\+[1-9]\d{7,14}$/.test(cleaned) ? cleaned : null;
}

export function generateCode(): string {
  return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
}

/** В базе хранится не сам код, а HMAC от номера и кода с серверным секретом. */
export function hashCode(phone: string, code: string): string {
  return createHmac("sha256", sessionSecret()).update(`${phone}:${code}`).digest("hex");
}

export function codeMatches(phone: string, code: string, storedHash: string): boolean {
  const a = Buffer.from(hashCode(phone, code), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export const CODE_LENGTH = 6;
