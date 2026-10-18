#!/usr/bin/env node
// Управление аккаунтами кабинета. Регистрации на сайте нет: пользователей заводит только администратор.
//
//   npm run user -- add --email me@example.com --password "длинный пароль" --name "Ярослав" [--phone +48600100200] [--telegram-id 123456789]
//   npm run user -- update --id 1 [--email ...] [--password ...] [--phone ...|none] [--telegram-id ...|none] [--name ...]
//   npm run user -- list
//
// Схема базы дублирует src/lib/db.ts, держите оба места в синхроне.

import Database from "better-sqlite3";
import { randomBytes, scrypt as scryptCb } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parseArgs, promisify } from "node:util";

const scrypt = promisify(scryptCb);

function fail(msg) {
  console.error(`Ошибка: ${msg}`);
  process.exit(1);
}

/** DATABASE_PATH из окружения, иначе из .env.local / .env, иначе ./data/app.db (как в приложении). */
function databasePath() {
  if (process.env.DATABASE_PATH) return process.env.DATABASE_PATH;
  for (const f of [".env.local", ".env"]) {
    try {
      const text = fs.readFileSync(f, "utf8");
      const m = text.match(/^\s*DATABASE_PATH\s*=\s*(.+?)\s*$/m);
      if (m) return m[1].replace(/^["']|["']$/g, "");
    } catch {}
  }
  return "./data/app.db";
}

function openDb() {
  const file = path.resolve(databasePath());
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const conn = new Database(file);
  conn.pragma("journal_mode = WAL");
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
  const cols = conn.prepare("PRAGMA table_info(users)").all();
  if (!cols.some((c) => c.name === "phone")) conn.exec("ALTER TABLE users ADD COLUMN phone TEXT");
  conn.exec("CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique ON users(phone) WHERE phone IS NOT NULL");
  return { conn, file };
}

// Те же параметры, что в src/lib/password.ts
async function hashPassword(password) {
  const N = 16384, R = 8, P = 1;
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
  return ["scrypt", N, R, P, salt.toString("base64"), hash.toString("base64")].join("$");
}

function checkEmail(v) {
  const email = String(v).trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(`некорректная почта: ${v}`);
  return email;
}
function checkPassword(v) {
  const p = String(v);
  if (p.length < 8 || p.length > 128) fail("пароль должен быть от 8 до 128 символов");
  return p;
}
function checkPhone(v) {
  const cleaned = String(v).trim().replace(/[\s\-().]/g, "");
  if (!/^\+[1-9]\d{7,14}$/.test(cleaned)) fail(`номер должен быть в формате +48600100200: ${v}`);
  return cleaned;
}
function checkTelegramId(v) {
  const id = String(v).trim();
  if (!/^\d{1,20}$/.test(id)) fail("Telegram id — это число (узнать можно у бота @userinfobot)");
  return id;
}
function checkName(v) {
  const name = String(v).trim().slice(0, 60);
  if (!name) fail("имя не может быть пустым");
  return name;
}

function explainUnique(e) {
  if (e && e.code === "SQLITE_CONSTRAINT_UNIQUE") {
    const field = String(e.message).match(/users\.(\w+)/)?.[1];
    const what = { email: "такой почтой", telegram_id: "таким Telegram id", phone: "таким номером" }[field] ?? "такими данными";
    fail(`пользователь с ${what} уже есть (посмотреть: npm run user -- list)`);
  }
  throw e;
}

const options = {
  email: { type: "string" },
  password: { type: "string" },
  phone: { type: "string" },
  "telegram-id": { type: "string" },
  name: { type: "string" },
  id: { type: "string" },
};

const [cmd, ...rest] = process.argv.slice(2);
let args;
try {
  args = parseArgs({ args: rest, options, allowPositionals: false }).values;
} catch (e) {
  fail(e.message);
}

const USAGE = `Команды:
  add     --email E --password P [--name N] [--phone +7...] [--telegram-id 123]
          (нужен хотя бы один способ входа: почта с паролем, телефон или Telegram id)
  update  --id N [--email E] [--password P] [--name N] [--phone +7...|none] [--telegram-id 123|none]
  list`;

if (!cmd || !["add", "update", "list"].includes(cmd)) {
  console.log(USAGE);
  process.exit(cmd ? 1 : 0);
}

const { conn, file } = openDb();

if (cmd === "list") {
  const rows = conn.prepare("SELECT id, email, phone, telegram_id, name, created_at FROM users ORDER BY id").all();
  if (!rows.length) console.log(`Пользователей пока нет (база: ${file}).`);
  else console.table(rows);
} else if (cmd === "add") {
  if (args.email && !args.password) fail("для входа по почте нужен --password");
  if (args.password && !args.email) fail("--password указывают вместе с --email");
  if (!args.email && !args.phone && !args["telegram-id"]) {
    fail("укажите хотя бы один способ входа: --email с --password, --phone или --telegram-id");
  }
  const email = args.email ? checkEmail(args.email) : null;
  const hash = args.password ? await hashPassword(checkPassword(args.password)) : null;
  const phone = args.phone ? checkPhone(args.phone) : null;
  const tg = args["telegram-id"] ? checkTelegramId(args["telegram-id"]) : null;
  const name = args.name ? checkName(args.name) : email ? email.split("@")[0].slice(0, 60) : "Пользователь";
  try {
    const r = conn
      .prepare("INSERT INTO users (email, password_hash, telegram_id, phone, name) VALUES (?, ?, ?, ?, ?)")
      .run(email, hash, tg, phone, name);
    console.log(`Готово: пользователь #${r.lastInsertRowid} «${name}» создан.`);
  } catch (e) {
    explainUnique(e);
  }
} else if (cmd === "update") {
  const id = Number(args.id);
  if (!Number.isInteger(id) || id < 1) fail("укажите --id (номер из команды list)");
  const existing = conn.prepare("SELECT id FROM users WHERE id = ?").get(id);
  if (!existing) fail(`пользователя #${id} нет`);

  const sets = [];
  const vals = [];
  if (args.email !== undefined) { sets.push("email = ?"); vals.push(checkEmail(args.email)); }
  if (args.password !== undefined) { sets.push("password_hash = ?"); vals.push(await hashPassword(checkPassword(args.password))); }
  if (args.name !== undefined) { sets.push("name = ?"); vals.push(checkName(args.name)); }
  if (args.phone !== undefined) { sets.push("phone = ?"); vals.push(args.phone === "none" ? null : checkPhone(args.phone)); }
  if (args["telegram-id"] !== undefined) {
    sets.push("telegram_id = ?");
    vals.push(args["telegram-id"] === "none" ? null : checkTelegramId(args["telegram-id"]));
  }
  if (!sets.length) fail("нечего менять: укажите хотя бы одно поле");
  try {
    conn.prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`).run(...vals, id);
    console.log(`Готово: пользователь #${id} обновлён.`);
  } catch (e) {
    explainUnique(e);
  }
}
conn.close();
