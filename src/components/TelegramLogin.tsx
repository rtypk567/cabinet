"use client";

import { useEffect, useRef } from "react";

type TelegramUser = Record<string, string | number>;

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramUser) => void;
  }
}

/**
 * Официальный Telegram Login Widget. Работает только на домене, указанном у бота через
 * @BotFather → /setdomain (нужен https, на http://localhost виджет не откроется).
 */
export function TelegramLogin({
  botUsername,
  onSuccess,
  onError,
}: {
  botUsername: string;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!box.current) return;
    const el = box.current;

    window.onTelegramAuth = async (user) => {
      try {
        const res = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(user),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return onError(data.error ?? "Не удалось войти через Telegram");
        onSuccess();
      } catch {
        onError("Нет соединения с сервером");
      }
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "14");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    el.appendChild(script);

    return () => {
      el.innerHTML = "";
      delete window.onTelegramAuth;
    };
  }, [botUsername, onSuccess, onError]);

  return <div className="tg-wrap" ref={box} />;
}
