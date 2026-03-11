import { FONTS, SYMPTOM_OPTIONS } from "../lib/constants.js";
import { last7Days, shortDay, mergeEntry } from "../lib/calculations.js";

const SYMPTOM_COLORS = ["#B5534A", "#C4953A", "#5B8FB9"];

export default function SymptomChart({ entries, selectedSymptoms = ["pain", "fatigue", "brain_fog"] }) {
  const days = last7Days();
  const w = 280, h = 60, px = 10;

  // Build per-day data using morningSymptoms from mergeEntry
  const points = days.map((d, i) => {
    const m = mergeEntry(entries[d]);
    const symptomVals = {};
    selectedSymptoms.forEach(id => {
      if (m?.morningSymptoms?.[id] != null) {
        symptomVals[id] = m.morningSymptoms[id];
      } else if (id === "pain") {
        symptomVals[id] = m?.painLevel ?? 0;
      } else if (id === "fatigue") {
        symptomVals[id] = m?.fatigueLevel ?? 0;
      } else if (id === "brain_fog") {
        symptomVals[id] = m?.brainFog ?? 0;
      } else {
        symptomVals[id] = 0;
      }
    });
    return { x: i, day: shortDay(d), ...symptomVals };
  });

  const makePath = (id) => points.map((p, i) => {
    const x = px + (i / 6) * (w - px * 2);
    const y = h - 4 - ((p[id] || 0) / 10) * (h - 12);
    return `${i === 0 ? "M" : "L"}${x},${y}`;
  }).join(" ");

  // Today's morning-to-evening delta (last day in array = today)
  // Removed — Dashboard renders this as "Today's cost" arrow section instead

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
        {selectedSymptoms.map((id, i) => (
          <path key={id} d={makePath(id)} fill="none" stroke={SYMPTOM_COLORS[i] ?? "#888"} strokeWidth={1.5} strokeLinecap="round" />
        ))}
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 4, flexWrap: "wrap" }}>
        {selectedSymptoms.map((id, i) => {
          const opt = SYMPTOM_OPTIONS.find(s => s.id === id);
          return (
            <div key={id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 8, height: 3, background: SYMPTOM_COLORS[i] ?? "#888", borderRadius: 2 }} />
              <span style={{ fontFamily: FONTS, fontSize: 10, color: "#888" }}>{opt?.label ?? id}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
