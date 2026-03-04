import { FONTS } from "../lib/constants.js";
import { last7Days, today, shortDay, mergeEntry, calcTrainingLoad, calcLifeLoad, calcTotalLoad } from "../lib/calculations.js";

export default function WeekChart({ entries }) {
  const days = last7Days();
  const maxLoad = Math.max(30, ...days.map(d => calcTotalLoad(entries[d])));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100, paddingTop: 8 }}>
      {days.map(d => {
        const m = mergeEntry(entries[d]);
        const training = calcTrainingLoad(m);
        const life = calcLifeLoad(m);
        const synth = entries[d]?.synthetic;
        const isToday = d === today();
        return (
          <div key={d} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <div style={{ height: 80, width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center" }}>
              <div style={{ width: "100%", maxWidth: 36, borderRadius: "4px 4px 0 0", background: synth ? "#D8CCAA" : "#C4953A", height: (life / maxLoad) * 80, minHeight: life > 0 ? 2 : 0, opacity: synth ? 0.5 : 1, transition: "height 0.4s ease" }} />
              <div style={{ width: "100%", maxWidth: 36, borderRadius: life > 0 ? "0 0 4px 4px" : 4, background: synth ? "#8CC5C1" : "#2A8A84", height: (training / maxLoad) * 80, minHeight: training > 0 ? 2 : 0, opacity: synth ? 0.5 : 1, transition: "height 0.4s ease" }} />
            </div>
            <span style={{ fontFamily: FONTS, fontSize: 10, color: isToday ? "#4A4A4A" : "#AAA", fontWeight: isToday ? 700 : 400, marginTop: 2 }}>
              {shortDay(d)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
