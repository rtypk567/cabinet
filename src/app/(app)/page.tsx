import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import { formatMoney, getSummary, operations } from "@/lib/demo";
import { getCurrentUser } from "@/lib/session";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const s = getSummary();
  const recent = operations.filter((o) => o.kind === "sale").slice(0, 3);

  return (
    <>
      <header className="hero">
        <div className="hero-top">
          <div className="avatar">
            {user.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar_url} alt="" referrerPolicy="no-referrer" />
            ) : (
              initials(user.name)
            )}
          </div>
          <div className="who">{user.name}</div>
          <div className="spacer" />
          <LogoutButton />
        </div>

        <div className="rev-label">Выручка за {s.monthLabel}</div>
        <div className="rev-val tnum">
          {formatMoney(s.revenue)}
          <span className="rub">₽</span>
        </div>

        <button className="cta" type="button">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Новая продажа
        </button>

        <div className="substats">
          <div className="substat">
            <div className="k">Предварительный налог</div>
            <div className="v tnum">
              {formatMoney(s.preliminaryTax)}
              <span className="rub">₽</span>
            </div>
          </div>
          <div className="substat">
            <div className="k">Задолженность</div>
            <div className="v tnum">
              {formatMoney(s.debt)}
              <span className="rub">₽</span>
            </div>
          </div>
        </div>
      </header>

      <section className="sheet">
        <div className="tax-card">
          <div className="tx">
            <div className="tl">Налог к оплате</div>
            <div className="tv tnum">{formatMoney(s.taxToPay)} ₽</div>
            <div className="td">Оплатить до {s.payUntil}</div>
          </div>
          <button className="pay-btn" type="button">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="2" y="5" width="20" height="14" rx="2.5" />
              <path d="M2 10h20" />
            </svg>
            Оплатить
          </button>
        </div>

        <div className="sec-h">
          Последние операции
          <Link className="link" href="/operations">
            Все →
          </Link>
        </div>
        {recent.map((o) => (
          <div className="op" key={o.id}>
            <div className="ic">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="2" y="6" width="20" height="13" rx="2.5" />
                <path d="M16 6V5a2 2 0 0 0-2-2H6" />
              </svg>
            </div>
            <div className="mid">
              <div className="t">{o.title}</div>
              <div className="s">
                {o.time} · {o.category}
              </div>
            </div>
            <div className="amt">
              <div className="a tnum">{formatMoney(o.amount)} ₽</div>
              <div className="q tnum">налог {formatMoney(o.tax ?? 0)} ₽</div>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
