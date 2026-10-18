"use client";

import { useEffect, useState } from "react";

type Step = "phone" | "code";

export function PhoneLogin({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0); // секунд до повторной отправки

  useEffect(() => {
    if (retry <= 0) return;
    const t = setTimeout(() => setRetry((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [retry]);

  async function post(path: string, payload: object) {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  }

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { ok, data } = await post("/api/auth/phone/send", { phone });
      if (!ok) {
        if (typeof data.retryAfter === "number") {
          setRetry(data.retryAfter);
          if (step === "phone") setStep("code"); // код уже был отправлен недавно
        }
        setError(data.error ?? "Не удалось отправить код: бот сейчас недоступен. Попробуйте позже.");
        return;
      }
      setStep("code");
      setCode("");
      setRetry(data.retryAfter ?? 60);
    } catch {
      setError("Не удалось отправить код: бот сейчас недоступен. Попробуйте позже.");
    } finally {
      setBusy(false);
    }
  }

  const FAIL = "Неверный код или пароль. Если всё верно, возможно бот сейчас недоступен — попробуйте позже.";

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { ok, data } = await post("/api/auth/phone/verify", { phone, code, password });
      if (!ok) {
        setError(data.error ?? FAIL);
        return;
      }
      onDone();
    } catch {
      setError(FAIL); // нет связи с сервером тоже попадает сюда
    } finally {
      setBusy(false);
    }
  }

  if (step === "phone") {
    return (
      <form className="lform" onSubmit={sendCode}>
        <div className="lfield">
          <label htmlFor="phone">Номер телефона</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+7 912 345 67 89"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        <p className="lhint">Номер в международном формате, начиная с «+» и кода страны. Если номер подключён к кабинету, пришлём код.</p>
        {error && (
          <p className="lerr" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-orange" type="submit" disabled={busy}>
          {busy ? "Отправляем…" : "Получить код"}
        </button>
      </form>
    );
  }

  return (
    <form className="lform" onSubmit={verify}>
      <p className="lhint">
        Если номер <b>{phone}</b> подключён к кабинету, на него отправлен код. Он действует 5 минут.
      </p>
      <div className="lfield">
        <label htmlFor="code">Код из сообщения</label>
        <input
          id="code"
          name="code"
          type="text"
          inputMode="text"
          
          autoComplete="one-time-code"
          placeholder="••••••"
          
          value={code}
         onChange={(e) => setCode(e.target.value)};
          autoFocus
          required
        />
      </div>
      <div className="lfield">
        <label htmlFor="tg-password">Пароль (необязательно)</label>
        <input
          id="tg-password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          maxLength={128}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && (
        <p className="lerr" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn-orange" type="submit" disabled={busy || code.length === 0}>
        {busy ? "Проверяем…" : "Войти"}
      </button>
      <button className="lswitch" type="button" onClick={() => sendCode()} disabled={busy || retry > 0}>
        {retry > 0 ? `Отправить код ещё раз через ${retry} с` : "Отправить код ещё раз"}
      </button>
      <button
        className="lswitch"
        type="button"
        onClick={() => {
          setStep("phone");
          setError("");
        }}
      >
        Изменить номер
      </button>
    </form>
  );
}
