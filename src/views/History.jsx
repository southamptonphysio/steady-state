import { FONTS, MONO, SERIF, cardStyle, sectionLabel, pageStyle } from "../lib/constants.js";
import { dayLabel, mergeEntry, calcTrainingLoad, calcLifeLoad, calcSymptomScore, calcReadiness } from "../lib/calculations.js";

export default function History({ entries, onEditEntry, onReset, onLogout, onBack, selectedSymptoms = ["pain", "fatigue", "brain_fog"] }) {
  const sorted = Object.keys(entries).filter(k => !entries[k].synthetic).sort((a, b) => b.localeCompare(a));

  return (
    <div style={pageStyle}>
      <div style={{ paddingTop: 40, paddingBottom: 12 }}>
        <button type="button" onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: FONTS, fontSize: 13, color: "#8F979D", padding: "10px 12px 10px 0", minHeight: 44, minWidth: 44, display: "flex", alignItems: "center" }}>← Dashboard</button>
        <h2 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, color: "#1C2E33", margin: "10px 0 0" }}>History</h2>
      </div>
      {sorted.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <p style={{ fontSize: 13, color: "#8F979D" }}>No entries yet.</p>
        </div>
      ) : sorted.map(date => {
        const e = entries[date];
        const m = mergeEntry(e);
        const training = calcTrainingLoad(m);
        const life = calcLifeLoad(m);
        const total = training + life;
        const rd = calcReadiness(entries, date, selectedSymptoms);
        return (
          <div key={date} style={{ ...cardStyle, cursor: "pointer" }} onClick={() => onEditEntry(date)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#1C2E33" }}>{dayLabel(date)}</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {rd && (
                  <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: rd.score >= 7 ? "#2A8A84" : rd.score >= 4 ? "#C4953A" : "#B5534A" }}>
                    R:{rd.score}
                  </span>
                )}
                <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600 }}>{total.toFixed(1)}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#888" }}>
              <span style={{ color: "#2A8A84" }}>Train {training.toFixed(1)}</span>
              <span style={{ color: "#C4953A" }}>Life {life.toFixed(1)}</span>
              <span style={{ color: "#B5534A" }}>Sx {calcSymptomScore(e, selectedSymptoms).toFixed(1)}</span>
              <span>{e.morning ? "☀" : ""}{e.evening ? " ☾" : ""}</span>
            </div>
            {m.exercises?.length > 0 && (
              <div style={{ marginTop: 5, fontSize: 11, color: "#8F979D" }}>
                {m.exercises.map(ex => ex.type).join(" · ")}
              </div>
            )}
            {m.recovery?.length > 0 && (
              <div style={{ marginTop: 3, fontSize: 11, color: "#5BABA5" }}>
                Recovery: {m.recovery.map(r => r.type).join(" · ")}
              </div>
            )}
          </div>
        );
      })}
      <div style={{ marginTop: 24, textAlign: "center", display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
        <button onClick={onReset} style={{ background: "none", border: "none", fontFamily: FONTS, fontSize: 12, color: "#C9C4BD", cursor: "pointer", textDecoration: "underline" }}>
          Reset all data
        </button>
        <button onClick={onLogout} style={{ background: "none", border: "none", fontFamily: FONTS, fontSize: 12, color: "#B8C2C6", cursor: "pointer" }}>
          Log out
        </button>
      </div>
    </div>
  );
}
