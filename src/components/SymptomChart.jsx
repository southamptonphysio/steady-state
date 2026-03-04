import { FONTS } from "../lib/constants.js";
import { last7Days, shortDay, mergeEntry } from "../lib/calculations.js";

export default function SymptomChart({ entries }) {
  const days = last7Days();
  const w = 280, h = 60, px = 10;
  const points = days.map((d, i) => {
    const m = mergeEntry(entries[d]);
    return { x: i, pain: m?.painLevel || 0, fatigue: m?.fatigueLevel || 0, fog: m?.brainFog || 0, day: shortDay(d) };
  });
  const makePath = (key) => points.map((p, i) => {
    const x = px + (i / 6) * (w - px * 2);
    const y = h - 4 - (p[key] / 10) * (h - 12);
    return `${i === 0 ? "M" : "L"}${x},${y}`;
  }).join(" ");
  return (
    <div style={{ width: "100%", overflow: "hidden" }}>
      <svg viewBox={`0 0 ${w} ${h + 16}`} style={{ width: "100%", height: "auto" }}>
        {points.map((p, i) => (
          <text key={i} x={px + (i / 6) * (w - px * 2)} y={h + 14} textAnchor="middle" fontSize="8" fill="#AAA" fontFamily={FONTS}>
            {p.day}
          </text>
        ))}
        {[0, 5, 10].map(v => (
          <line key={v} x1={px} x2={w - px} y1={h - 4 - (v / 10) * (h - 12)} y2={h - 4 - (v / 10) * (h - 12)} stroke="#F0EDED" strokeWidth={0.5} />
        ))}
        <path d={makePath("pain")} fill="none" stroke="#B5534A" strokeWidth={1.5} strokeLinecap="round" />
        <path d={makePath("fatigue")} fill="none" stroke="#C4953A" strokeWidth={1.5} strokeLinecap="round" />
        <path d={makePath("fog")} fill="none" stroke="#5B8FB9" strokeWidth={1.5} strokeLinecap="round" />
      </svg>
      <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 4 }}>
        {[["Pain", "#B5534A"], ["Fatigue", "#C4953A"], ["Brain fog", "#5B8FB9"]].map(([l, c]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 3, background: c, borderRadius: 2 }} />
            <span style={{ fontFamily: FONTS, fontSize: 10, color: "#888" }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
