import { formatMoney, formatMoneyShort, getSummary, operations, type Operation } from "@/lib/demo";

const groups: { day: Operation["day"]; label: string }[] = [
  { day: "today", label: "Сегодня" },
  { day: "yesterday", label: "Вчера" },
];

export default function OperationsPage() {
  const s = getSummary();
  const count = operations.length;

  return (
    <div className="pad">
      <h1 className="scr-title">Операции</h1>
      <p className="scr-sub">Продажи и платежи за {s.monthLabel}.</p>

      <div className="kpis" style={{ marginBottom: 8 }}>
        <div className="kpi">
          <div className="k">Операций</div>
          <div className="v tnum">{count}</div>
        </div>
        <div className="kpi">
          <div className="k">Выручка</div>
          <div className="v tnum">{formatMoneyShort(s.revenue)} ₽</div>
        </div>
      </div>

      {groups.map((g) => {
        const items = operations.filter((o) => o.day === g.day);
        if (!items.length) return null;
        return (
          <section key={g.day}>
            <div className="op-date">{g.label}</div>
            {items.map((o) => (
              <div className="op" key={o.id}>
                <div className={o.kind === "payment" ? "ic paid" : "ic"}>
                  {o.kind === "payment" ? (
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  ) : (
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <rect x="2" y="6" width="20" height="13" rx="2.5" />
                      <path d="M16 6V5a2 2 0 0 0-2-2H6" />
                    </svg>
                  )}
                </div>
                <div className="mid">
                  <div className="t">{o.title}</div>
                  <div className="s">
                    {o.time} · {o.category}
                  </div>
                </div>
                <div className="amt">
                  <div className="a tnum">{formatMoney(o.amount)} ₽</div>
                  {o.kind === "payment" ? (
                    <div className="q ok">проведено</div>
                  ) : (
                    <div className="q tnum">налог {formatMoney(o.tax ?? 0)} ₽</div>
                  )}
                </div>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
