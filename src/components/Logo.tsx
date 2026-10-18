// Чтобы подставить свой логотип: положите файл в /public (например, public/logo.svg)
// и задайте NEXT_PUBLIC_LOGO_SRC=/logo.svg в .env.local. Пока переменная пуста, показывается заглушка.
const LOGO_SRC = process.env.NEXT_PUBLIC_LOGO_SRC;

export function Logo({ size = 84 }: { size?: number }) {
  if (LOGO_SRC) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="logo-img" src={LOGO_SRC} width={size} height={size} alt="" />;
  }
  return (
    <div className="logo-ph" style={{ width: size, height: size }} aria-hidden="true">
      Ваш
      <br />
      логотип
    </div>
  );
}
