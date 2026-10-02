// Platewise: classic menu engineering. Sorts dishes into Stars, Plowhorses, Puzzles and Dogs and says what to do with each.
import { csvObjects, num } from "./lib/csv";
import { moneyFmt } from "./lib/money";
import { uid, useStored } from "./lib/store";
import { CurrencySelect, ImportBox, Section, Stat, Stats } from "./ui/kit";

const T = "platewise";
type Dish = { id: string; name: string; section: string; price: number; cost: number; sold: number };
type Klass = "Star" | "Plowhorse" | "Puzzle" | "Dog";
const SAMPLE: Dish[] = [
  { id: "d1", name: "Couscous with lamb", section: "Mains", price: 32, cost: 11, sold: 410 },
  { id: "d2", name: "Grilled sea bream", section: "Mains", price: 38, cost: 19, sold: 260 },
  { id: "d3", name: "Chicken escalope", section: "Mains", price: 22, cost: 7, sold: 520 },
  { id: "d4", name: "Seafood pasta", section: "Mains", price: 36, cost: 12, sold: 95 },
  { id: "d5", name: "Ojja merguez", section: "Mains", price: 18, cost: 6.5, sold: 180 },
  { id: "d6", name: "Brik à l'oeuf", section: "Starters", price: 6, cost: 1.4, sold: 610 },
  { id: "d7", name: "Mechouia salad", section: "Starters", price: 9, cost: 2.2, sold: 230 },
  { id: "d8", name: "Lamb chorba", section: "Starters", price: 10, cost: 3.8, sold: 70 },
  { id: "d9", name: "Makroudh plate", section: "Desserts", price: 8, cost: 2, sold: 150 },
  { id: "d10", name: "Chocolate fondant", section: "Desserts", price: 14, cost: 3.5, sold: 40 },
];
const ADVICE: Record<Klass, { tone: string; what: string }> = {
  Star: { tone: "good", what: "Popular and profitable. Keep it, give it the best spot on the menu, and test a small price rise." },
  Plowhorse: { tone: "warn", what: "Popular but low margin. Trim the portion or cost of ingredients, or raise the price a little at a time." },
  Puzzle: { tone: "warn", what: "Profitable but few people order it. Move it higher on the menu, rename it, or have staff recommend it." },
  Dog: { tone: "bad", what: "Unpopular and low margin. Remove it, or rework it into something new." },
};

export default function Platewise() {
  const [dishes, setDishes] = useStored<Dish[]>(T, "dishes", SAMPLE);
  const [cur, setCur] = useStored(T, "cur", "TND");
  const [section, setSection] = useStored(T, "section", "All");
  const money = moneyFmt(cur);
  const sections = ["All", ...new Set(dishes.map(d => d.section))];
  const list = dishes.filter(d => section === "All" || d.section === section);

  // Kasavana and Smith: popularity threshold is 70% of an equal share, margin threshold is the weighted average margin.
  const totalSold = list.reduce((a, d) => a + d.sold, 0);
  const popLine = list.length ? (1 / list.length) * 0.7 : 0;
  const avgMargin = totalSold ? list.reduce((a, d) => a + (d.price - d.cost) * d.sold, 0) / totalSold : 0;
  const rows = list.map(d => {
    const mix = totalSold ? d.sold / totalSold : 0, margin = d.price - d.cost;
    const k: Klass = mix >= popLine ? (margin >= avgMargin ? "Star" : "Plowhorse") : margin >= avgMargin ? "Puzzle" : "Dog";
    return { ...d, mix, margin, k, profit: margin * d.sold, fc: d.price ? d.cost / d.price : 0 };
  });
  const profit = rows.reduce((a, r) => a + r.profit, 0);
  const revenue = rows.reduce((a, r) => a + r.price * r.sold, 0);
  const set = (id: string, p: Partial<Dish>) => setDishes(dishes.map(d => (d.id === id ? { ...d, ...p } : d)));
  const maxMargin = Math.max(1, ...rows.map(r => r.margin)), maxMix = Math.max(0.01, ...rows.map(r => r.mix));

  return (
    <div className="stack">
      <Section title="Menu at a glance" aside={<select id="pw-sec" className="input" style={{ width: "auto" }} value={section} onChange={e => setSection(e.target.value)} aria-label="Menu section">{sections.map(s => <option key={s}>{s}</option>)}</select>}>
        <Stats><Stat value={money(revenue)} label="Revenue" /><Stat value={money(profit)} label="Gross profit" tone="good" /><Stat value={`${revenue ? Math.round((1 - profit / revenue) * 100) : 0}%`} label="Food cost" /><Stat value={money(avgMargin)} label="Average margin per plate" /></Stats>
      </Section>

      <div className="grid2">
        <Section title="The matrix">
          <div className="pw-plot" role="img" aria-label="Dishes plotted by popularity and margin">
            <span className="pw-q" style={{ left: 0, top: 0 }}>Puzzles</span><span className="pw-q" style={{ right: 0, top: 0 }}>Stars</span>
            <span className="pw-q" style={{ left: 0, bottom: 0 }}>Dogs</span><span className="pw-q" style={{ right: 0, bottom: 0 }}>Plowhorses</span>
            <i className="pw-v" style={{ left: `${(popLine / maxMix) * 90 + 5}%` }} /><i className="pw-h" style={{ bottom: `${(avgMargin / maxMargin) * 90 + 5}%` }} />
            {rows.map(r => <b key={r.id} className={"pw-dot " + ADVICE[r.k].tone} style={{ left: `${(r.mix / maxMix) * 90 + 5}%`, bottom: `${(r.margin / maxMargin) * 90 + 5}%` }} title={`${r.name}: ${r.k}`}><em>{r.name}</em></b>)}
          </div>
          <p className="note" style={{ marginTop: 10 }}>Across: share of plates sold. Up: profit per plate.</p>
        </Section>
        <Section title="What to do">
          <div className="stack" style={{ gap: 12 }}>
            {(["Star", "Plowhorse", "Puzzle", "Dog"] as Klass[]).map(k => {
              const ds = rows.filter(r => r.k === k);
              return ds.length ? <div key={k}><p><span className={"pill " + ADVICE[k].tone}>{k}s</span> <strong>{ds.map(d => d.name).join(", ")}</strong></p><p className="note" style={{ marginTop: 4 }}>{ADVICE[k].what}</p></div> : null;
            })}
          </div>
        </Section>
      </div>

      <Section title="Dishes" aside={<CurrencySelect id="pw-cur" value={cur} onChange={setCur} />}>
        <div className="table-wrap"><table className="t">
          <thead><tr><th>Dish</th><th>Section</th><th className="r">Price</th><th className="r">Food cost</th><th className="r">Sold</th><th className="r">Margin</th><th className="r">Cost %</th><th>Class</th><th /></tr></thead>
          <tbody>{rows.sort((a, b) => b.profit - a.profit).map(r => (
            <tr key={r.id}>
              <td><input className="input" aria-label="Dish" value={r.name} onChange={e => set(r.id, { name: e.target.value })} /></td>
              <td><input className="input" style={{ width: 100 }} aria-label="Section" value={r.section} onChange={e => set(r.id, { section: e.target.value })} /></td>
              <td><input className="input num" style={{ width: 70 }} aria-label="Price" value={r.price} onChange={e => set(r.id, { price: num(e.target.value) })} /></td>
              <td><input className="input num" style={{ width: 70 }} aria-label="Food cost" value={r.cost} onChange={e => set(r.id, { cost: num(e.target.value) })} /></td>
              <td><input className="input num" style={{ width: 70 }} aria-label="Sold" value={r.sold} onChange={e => set(r.id, { sold: num(e.target.value) })} /></td>
              <td className="r">{money(r.margin)}</td>
              <td className="r" style={{ color: r.fc > 0.35 ? "var(--bad)" : undefined }}>{Math.round(r.fc * 100)}%</td>
              <td><span className={"pill " + ADVICE[r.k].tone}>{r.k}</span></td>
              <td><button className="btn ghost small danger" onClick={() => setDishes(dishes.filter(d => d.id !== r.id))}>Delete</button></td>
            </tr>
          ))}</tbody>
        </table></div>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn small" onClick={() => setDishes([...dishes, { id: uid(), name: "New dish", section: section === "All" ? "Mains" : section, price: 0, cost: 0, sold: 0 }])}>Add a dish</button>
        </div>
      </Section>
      <Section title="Import from your till">
        <ImportBox label="CSV with name, section, price, cost, sold (one row per dish, for the same period)" rows={3} placeholder={"name,section,price,cost,sold\nBrik,Starters,6,1.4,610"} onText={t => { const r = csvObjects(t).map(x => ({ id: uid(), name: x.name || x.dish || x.item, section: x.section || x.category || "Menu", price: num(x.price), cost: num(x.cost), sold: num(x.sold || x.qty || x.quantity) })).filter(x => x.name); if (r.length) setDishes(r); }} />
      </Section>
      <style>{`.pw-plot{position:relative;height:320px;border:1px solid var(--line);border-radius:8px;background:var(--sunk);overflow:hidden}.pw-q{position:absolute;padding:6px 10px;font-family:var(--mono);font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
      .pw-v{position:absolute;top:0;bottom:0;border-left:1px dashed var(--muted)}.pw-h{position:absolute;left:0;right:0;border-top:1px dashed var(--muted)}
      .pw-dot{position:absolute;width:12px;height:12px;margin:0 0 -6px -6px;border-radius:50%;background:var(--muted)}.pw-dot.good{background:var(--good)}.pw-dot.warn{background:var(--warn)}.pw-dot.bad{background:var(--bad)}
      .pw-dot em{position:absolute;left:14px;top:-3px;font-style:normal;font-size:11px;font-weight:600;white-space:nowrap;color:var(--ink)}`}</style>
    </div>
  );
}
