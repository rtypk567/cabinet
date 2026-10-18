import { cache } from "react";
import { cookies } from "next/headers";
import { getUserById, type User } from "@/lib/db";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySessionToken } from "@/lib/jwt";

function cookieSecure(): boolean {
  if (process.env.COOKIE_SECURE) return process.env.COOKIE_SECURE === "true";
  return process.env.NODE_ENV === "production";
}

export async function createSession(userId: number): Promise<void> {
  const token = await signSession(userId);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Текущий пользователь по cookie. В пределах одного запроса вычисляется один раз. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const id = await verifySessionToken(token);
  return id ? getUserById(id) : null;
});
