import { formatMoneyShort, getMonthlyBars, operations } from "@/lib/demo";

export default function StatsPage() {
  const bars = getMonthlyBars();
  const sales = operations.filter((o) => o.kind === "sale");
  const services = sales.filter((o) => o.category === "услуга");
  const goods = sales.filter((o) => o.category === "товар");
  const sum = (list: typeof sales) => list.reduce((s, o) => s + o.amount, 0);

  return (
    <div className="pad">
      <h1 className="scr-title">Статистика</h1>
      <p className="scr-sub">Выручка по месяцам и структура продаж.</p>

      <div className="kpis">
        <div className="kpi">
          <div className="k">Выручка, год</div>
          <div className="v tnum">38 200 ₽</div>
          <div className="d">+12% к прошлому</div>
        </div>
        <div className="kpi">
          <div className="k">Налог, год</div>
          <div className="v tnum">1 528 ₽</div>
          <div className="d neutral">ставка 4%</div>
        </div>
      </div>

      <div className="chart" role="img" aria-label="Выручка по месяцам, столбчатая диаграмма">
        <div className="bars">
          {bars.map((b) => (
            <div className="col" key={b.label}>
              <div className={b.current ? "bar current" : "bar"} style={{ height: `${b.height}%` }} />
              <div className="lab">{b.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="sec-h">Разбивка</div>
      <div className="op">
        <div className="mid">
          <div className="t">Услуги</div>
          <div className="s">{services.length} операции</div>
        </div>
        <div className="amt">
          <div className="a tnum">{formatMoneyShort(sum(services))} ₽</div>
        </div>
      </div>
      <div className="op">
        <div className="mid">
          <div className="t">Товары</div>
          <div className="s">{goods.length} операция</div>
        </div>
        <div className="amt">
          <div className="a tnum">{formatMoneyShort(sum(goods))} ₽</div>
        </div>
      </div>
    </div>
  );
}
