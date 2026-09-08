export function BarChart({ data = [], valueKey = 'value', labelKey = 'label', height = 200 }) {
  const max = Math.max(1, ...data.map((d) => Number(d[valueKey]) || 0));
  return <div className="bar-chart" style={{ height }}><div className="bar-chart__grid">{[100,75,50,25,0].map((v) => <span key={v}>{v}%</span>)}</div><div className="bar-chart__bars">{data.map((d, i) => { const value = Number(d[valueKey]) || 0; return <div className="bar-chart__item" key={i} title={`${d[labelKey]}: ${value}`}><div className="bar-chart__bar" style={{ height: `${Math.max(4, (value / max) * 100)}%` }}/><small>{d[labelKey]}</small></div>; })}</div></div>;
}

export function Donut({ value = 0, label = 'AI handled' }) { const pct = Math.min(100, Math.max(0, Number(value) || 0)); return <div className="donut-wrap"><div className="donut" style={{ '--pct': `${pct * 3.6}deg` }}><div><strong>{Math.round(pct)}%</strong><span>{label}</span></div></div></div>; }
