import { json, sameOrigin } from "@/lib/http";
import { destroySession } from "@/lib/session";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Запрос отклонён" }, 403);
  await destroySession();
  return json({ ok: true });
}
