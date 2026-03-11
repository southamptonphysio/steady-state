import { FONTS } from "../lib/constants.js";
import { last7Days, today, shortDay, mergeEntry, calcTrainingLoad, calcLifeLoad, calcTotalLoad } from "../lib/calculations.js";

const BAR_H = 80;
const LABEL_H = 18; // day label row height (approx)

export default function WeekChart({ entries, chronicLoad = 0 }) {
  const days = last7Days();
  const maxLoad = Math.max(30, chronicLoad * 1.15, ...days.map(d => calcTotalLoad(entries[d])));
  // Baseline line y-position from the bottom of the bar area
  const baselinePx = chronicLoad > 0 ? (chronicLoad / maxLoad) * BAR_H : 0;

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: BAR_H + LABEL_H + 8, paddingTop: 8 }}>
        {days.map(d => {
          const m = mergeEntry(entries[d]);
          const training = calcTrainingLoad(m);
          const life = calcLifeLoad(m);
          const synth = entries[d]?.synthetic;
          const isToday = d === today();
          return (
            <div key={d} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <div style={{ height: BAR_H, width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center" }}>
                <div style={{ width: "100%", maxWidth: 36, borderRadius: "4px 4px 0 0", background: synth ? "#D8CCAA" : "#C4953A", height: (life / maxLoad) * BAR_H, minHeight: life > 0 ? 2 : 0, opacity: synth ? 0.5 : 1 }} />
                <div style={{ width: "100%", maxWidth: 36, borderRadius: life > 0 ? "0 0 4px 4px" : 4, background: synth ? "#8CC5C1" : "#2A8A84", height: (training / maxLoad) * BAR_H, minHeight: training > 0 ? 2 : 0, opacity: synth ? 0.5 : 1 }} />
              </div>
              <span style={{ fontFamily: FONTS, fontSize: 10, color: isToday ? "#4A4A4A" : "#AAA", fontWeight: isToday ? 700 : 400, marginTop: 2 }}>
                {shortDay(d)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Chronic baseline dashed line */}
      {baselinePx > 0 && (
        <div style={{
          position: "absolute",
          // bottom of bar area = LABEL_H + 8(paddingTop gap) from container bottom.
          // Line sits at baselinePx above the bar area bottom.
          bottom: LABEL_H + baselinePx,
          left: 0, right: 0,
          borderTop: "1.5px dashed #B8C4C8",
          pointerEvents: "none",
          display: "flex",
          justifyContent: "flex-end"
        }}>
          <span style={{ fontFamily: FONTS, fontSize: 9, color: "#B8C4C8", position: "relative", top: -9, paddingRight: 2 }}>
            baseline
          </span>
        </div>
      )}
    </div>
  );
}
