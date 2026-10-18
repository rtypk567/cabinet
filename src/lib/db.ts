import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

declare global {
  // eslint-disable-next-line no-var
  var __cabinetDb: Database.Database | undefined;
}

// Схему создаёт и это приложение, и команда scripts/users.mjs. Держите оба места в синхроне.
function open(): Database.Database {
  const file = path.resolve(process.env.DATABASE_PATH || "./data/app.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const conn = new Database(file);
  conn.pragma("journal_mode = WAL");
  conn.pragma("foreign_keys = ON");
  conn.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT UNIQUE,
      password_hash TEXT,
      telegram_id   TEXT UNIQUE,
      phone         TEXT,
      name          TEXT NOT NULL,
      avatar_url    TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS phone_codes (
      phone      TEXT PRIMARY KEY,
      code_hash  TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      sent_at    INTEGER NOT NULL,
      attempts   INTEGER NOT NULL DEFAULT 0
    );
  `);
  const cols = conn.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  if (!cols.some((c) => c.name === "phone")) conn.exec("ALTER TABLE users ADD COLUMN phone TEXT");
  conn.exec("CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique ON users(phone) WHERE phone IS NOT NULL");
  return conn;
}

/** Ленивое подключение: база открывается при первом запросе, а не при импорте. */
export function db(): Database.Database {
  return (globalThis.__cabinetDb ??= open());
}

export type User = {
  id: number;
  email: string | null;
  telegram_id: string | null;
  phone: string | null;
  name: string;
  avatar_url: string | null;
};

type UserWithHash = User & { password_hash: string | null };

const PUBLIC_COLUMNS = "id, email, telegram_id, phone, name, avatar_url";

// Аккаунты создаются только администратором (npm run user -- add ...). Здесь их только ищут.

export function getUserById(id: number): User | null {
  return (
    (db().prepare(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ?`).get(id) as User | undefined) ??
    null
  );
}

export function findUserByEmail(email: string): UserWithHash | null {
  return (
    (db()
      .prepare(`SELECT ${PUBLIC_COLUMNS}, password_hash FROM users WHERE email = ?`)
      .get(email) as UserWithHash | undefined) ?? null
  );
}

export function findUserByPhone(phone: string): User | null {
  return (
    (db().prepare(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE phone = ?`).get(phone) as User | undefined) ??
    null
  );
}

/** Для входа по номеру с необязательным паролем: тот же пароль, что и для входа по почте. */
export function findUserByPhoneWithHash(phone: string): UserWithHash | null {
  return (
    (db()
      .prepare(`SELECT ${PUBLIC_COLUMNS}, password_hash FROM users WHERE phone = ?`)
      .get(phone) as UserWithHash | undefined) ?? null
  );
}

export function findUserByTelegramId(telegramId: string): User | null {
  return (
    (db()
      .prepare(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE telegram_id = ?`)
      .get(telegramId) as User | undefined) ?? null
  );
}

/** При входе через Telegram подтягиваем актуальное фото профиля. Имя задаёт администратор. */
export function updateAvatar(userId: number, avatarUrl: string | null): void {
  if (!avatarUrl) return;
  db().prepare("UPDATE users SET avatar_url = ? WHERE id = ?").run(avatarUrl, userId);
}

/* ---------- коды подтверждения номера ---------- */

export type PhoneCodeRow = {
  phone: string;
  code_hash: string;
  expires_at: number;
  sent_at: number;
  attempts: number;
};

export function getPhoneCode(phone: string): PhoneCodeRow | null {
  return (
    (db().prepare("SELECT * FROM phone_codes WHERE phone = ?").get(phone) as PhoneCodeRow | undefined) ??
    null
  );
}

/** Сохраняет новый код (старый для этого номера заменяется, счётчик попыток обнуляется). */
export function savePhoneCode(phone: string, codeHash: string, expiresAt: number, sentAt: number): void {
  db()
    .prepare(
      `INSERT INTO phone_codes (phone, code_hash, expires_at, sent_at, attempts)
       VALUES (?, ?, ?, ?, 0)
       ON CONFLICT(phone) DO UPDATE SET
         code_hash = excluded.code_hash, expires_at = excluded.expires_at,
         sent_at = excluded.sent_at, attempts = 0`,
    )
    .run(phone, codeHash, expiresAt, sentAt);
  // Заодно убираем давно просроченные коды других номеров, чтобы таблица не росла.
  db().prepare("DELETE FROM phone_codes WHERE expires_at < ?").run(sentAt - 24 * 60 * 60 * 1000);
}

/**
 * Атомарно засчитывает попытку ввода. Возвращает строку уже с учётом этой попытки
 * или null, если кода нет, он истёк или попытки закончились.
 */
export const takePhoneAttempt = (phone: string, maxAttempts: number, now: number): PhoneCodeRow | null =>
  db().transaction((): PhoneCodeRow | null => {
    const row = getPhoneCode(phone);
    if (!row || row.expires_at <= now || row.attempts >= maxAttempts) return null;
    db().prepare("UPDATE phone_codes SET attempts = attempts + 1 WHERE phone = ?").run(phone);
    return { ...row, attempts: row.attempts + 1 };
  })();

export function deletePhoneCode(phone: string): void {
  db().prepare("DELETE FROM phone_codes WHERE phone = ?").run(phone);
}
