import { NextResponse } from "next/server";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

/** Простая защита от CSRF: если браузер прислал Origin, он должен совпадать с хостом. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * Ограничение частоты в памяти процесса (подходит для одного сервера).
 * Возвращает true, если запрос разрешён. При нескольких инстансах замените на Redis/Upstash.
 */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= max;
}

const cooldowns = new Map<string, number>();

/**
 * Пауза между повторными действиями (в памяти процесса). Возвращает 0 и запускает паузу,
 * если действие разрешено, иначе сколько секунд осталось ждать.
 */
export function cooldownLeft(key: string, ms: number): number {
  const now = Date.now();
  if (cooldowns.size > 5000) {
    for (const [k, until] of cooldowns) if (until <= now) cooldowns.delete(k);
  }
  const until = cooldowns.get(key) ?? 0;
  if (until > now) return Math.ceil((until - now) / 1000);
  cooldowns.set(key, now + ms);
  return 0;
}

export function clearCooldown(key: string): void {
  cooldowns.delete(key);
}

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return typeof body === "object" && body !== null ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
