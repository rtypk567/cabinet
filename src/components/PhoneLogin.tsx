"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PhoneLogin({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // 1. Функция отправки кода
  const handleSendCode = async () => {
    if (!phone) {
      setError("Введите номер телефона");
      return;
    }
    setError("");
    setInfo("");
    setIsSendingCode(true);

    try {
      const res = await fetch("/api/auth/phone/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Ошибка отправки кода");
      
      setInfo("Код отправлен! Проверьте Telegram или консоль сервера.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSendingCode(false);
    }
  };

  // 2. Функция проверки кода и пароля
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !code) {
      setError("Введите номер и код");
      return;
    }
    setError("");
    setInfo("");
    setIsVerifying(true);

    try {
      // Отправляем запрос в наш route.ts
      const res = await fetch("/api/auth/phone/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, password }),
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Неверный код или пароль");
      
      // Если успех — редирект в кабинет
           // Если успех — редирект в кабинет
      if (onDone) {
        onDone();
      } else {
        router.push("/"); 
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-[#1e3a5f] rounded-xl text-white shadow-xl">
      <h1 className="text-2xl font-bold mb-2">Вход в кабинет</h1>
      <p className="text-sm text-gray-300 mb-6">
        Доходы, налоги и операции в одном месте. Войдите удобным способом.
      </p>

      {/* Заглушка для Telegram, если токена нет (как на скрине) */}
      <div className="bg-[#2a4a73] text-xs text-gray-300 p-3 rounded mb-6 text-center">
        В .env.local не задан TELEGRAM_BOT_TOKEN, поэтому вход через Telegram скрыт.
      </div>

      <div className="flex bg-[#152e4d] rounded-lg p-1 mb-6">
        <button className="flex-1 py-2 text-sm text-gray-400 rounded">Почта</button>
        <button className="flex-1 py-2 text-sm bg-[#3b6594] text-white rounded font-medium">Телефон</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Поле телефона */}
        <div>
          <label className="block text-sm text-gray-300 mb-1">Номер телефона</label>
          <input
            type="tel"
            placeholder="+7 (999) 123-45-67"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-[#152e4d] border border-[#2a4a73] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
          />
          <p className="text-xs text-gray-400 mt-1">
            Номер в международном формате, начиная с «+» и кода страны.
          </p>
        </div>

        {/* Поле кода с кнопкой */}
        <div>
          <label className="block text-sm text-gray-300 mb-1">Код из сообщения</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="flex-1 bg-[#152e4d] border border-[#2a4a73] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
            />
            <button
              type="button"
              onClick={handleSendCode}
              disabled={isSendingCode}
              className="px-4 py-3 bg-[#2a4a73] hover:bg-[#3b6594] text-sm text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isSendingCode ? "Отправка..." : "Получить код"}
            </button>
          </div>
        </div>

        {/* Поле пароля */}
        <div>
          <label className="block text-sm text-gray-300 mb-1">Пароль (если задан)</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#152e4d] border border-[#2a4a73] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
          />
        </div>

        {/* Сообщения об ошибках и успехе */}
        {error && <div className="text-red-400 text-sm bg-red-900/30 p-3 rounded">{error}</div>}
        {info && <div className="text-green-400 text-sm bg-green-900/30 p-3 rounded">{info}</div>}

        {/* Кнопка Войти */}
        <button
          type="submit"
          disabled={isVerifying}
          className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {isVerifying ? "Проверка..." : "Войти"}
        </button>
      </form>

      <p className="text-xs text-center text-gray-400 mt-6">
        Нажимая «Войти», вы соглашаетесь с политикой конфиденциальности
      </p>
    </div>
  );
}