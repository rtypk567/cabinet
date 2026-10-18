"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { PhoneLogin } from "@/components/PhoneLogin";
import { TelegramLogin } from "@/components/TelegramLogin";

type Method = "email" | "phone";

export function LoginForm({
  botUsername,
  telegramProblem,
  phoneEnabled,
}: {
  botUsername: string | null;
  /** Подсказка для разработчика, почему нет кнопки Telegram. На production всегда null. */
  telegramProblem: string | null;
  phoneEnabled: boolean;
}) {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("email");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const done = useCallback(() => {
    router.replace("/");
    router.refresh();
  }, [router]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    };
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Не удалось выполнить запрос");
        return;
      }
      done();
    } catch {
      setError("Нет соединения с сервером");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lstack">
      {botUsername ? (
        <TelegramLogin botUsername={botUsername} onSuccess={done} onError={setError} />
      ) : (
        telegramProblem && <p className="tg-hint">{telegramProblem}</p>
      )}
      {(botUsername || telegramProblem) && <div className="ldiv">или</div>}

      {phoneEnabled && (
        <div className="seg" role="group" aria-label="Способ входа">
          <button type="button" aria-pressed={method === "email"} onClick={() => setMethod("email")}>
            Почта
          </button>
          <button type="button" className="seg-tg" aria-pressed={method === "phone"} onClick={() => setMethod("phone")}>
            Телеграм
          </button>
        </div>
      )}

      {phoneEnabled && method === "phone" ? (
        <PhoneLogin onDone={done} />
      ) : (
        <form className="lform" onSubmit={submit}>
            <div className="lfield">
              <label htmlFor="email">Электронная почта</label>
              <input id="email" name="email" type="email" placeholder="name@example.com" autoComplete="email" required />
            </div>
            <div className="lfield">
              <label htmlFor="password">Пароль</label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>
            {error && (
              <p className="lerr" role="alert">
                {error}
              </p>
            )}
            <button className="btn btn-orange" type="submit" disabled={busy}>
              {busy ? "Подождите…" : "Войти"}
            </button>
          </form>
      )}
    </div>
  );
}
