import { FONTS } from "../lib/constants.js";
import { last7Days, today, shortDay, mergeEntry, calcTrainingLoad, calcLifeLoad, calcTotalLoad, calcRecentMeanLoad } from "../lib/calculations.js";

const BAR_H = 80;
const LABEL_H = 18; // day label row height (approx)

export default function WeekChart({ entries, chronicLoad = 0 }) {
  const days = last7Days();

  // Imputed load: mean of real entries in last 14 days, used for missing days
  const imputedLoad = calcRecentMeanLoad(entries, 14);

  const getBarData = (d) => {
    const entry = entries[d];
    if (!entry) {
      // No entry at all — show imputed bar if we have a recent mean
      if (imputedLoad > 0) {
        return { training: imputedLoad * 0.5, life: imputedLoad * 0.5, imputed: true, synth: false };
      }
      return { training: 0, life: 0, imputed: false, synth: false };
    }
    const m = mergeEntry(entry);
    return {
      training: calcTrainingLoad(m),
      life: calcLifeLoad(m),
      imputed: false,
      synth: !!entry.synthetic,
    };
  };

  const barDataList = days.map(d => ({ d, ...getBarData(d) }));
  const maxLoad = Math.max(30, chronicLoad * 1.15, ...barDataList.map(b => b.training + b.life));
  const baselinePx = chronicLoad > 0 ? (chronicLoad / maxLoad) * BAR_H : 0;

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: BAR_H + LABEL_H + 8, paddingTop: 8 }}>
        {barDataList.map(({ d, training, life, imputed, synth }) => {
          const isToday = d === today();
          const lifeH = (life / maxLoad) * BAR_H;
          const trainH = (training / maxLoad) * BAR_H;
          const opacity = synth ? 0.5 : imputed ? 0.35 : 1;
          return (
            <div key={d} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <div style={{ height: BAR_H, width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center" }}>
                <div style={{
                  width: "100%", maxWidth: 36,
                  borderRadius: "4px 4px 0 0",
                  background: synth ? "#D8CCAA" : "#C4953A",
                  height: lifeH, minHeight: life > 0 ? 2 : 0,
                  opacity,
                  outline: imputed ? "1.5px dotted #C4953A" : "none",
                  outlineOffset: -1,
                }} />
                <div style={{
                  width: "100%", maxWidth: 36,
                  borderRadius: life > 0 ? "0 0 4px 4px" : 4,
                  background: synth ? "#8CC5C1" : "#2A8A84",
                  height: trainH, minHeight: training > 0 ? 2 : 0,
                  opacity,
                  outline: imputed ? "1.5px dotted #2A8A84" : "none",
                  outlineOffset: -1,
                }} />
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
