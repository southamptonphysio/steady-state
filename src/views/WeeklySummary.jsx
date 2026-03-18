import { useState } from "react";
import { FONTS, MONO, SERIF, cardStyle, sectionLabel, pageStyle, SYMPTOM_OPTIONS } from "../lib/constants.js";
import { dayLabel, generateWeekExport } from "../lib/calculations.js";
import InfoTooltip from "../components/InfoTooltip.jsx";

const SYMPTOM_COLORS = ["#B5534A", "#C4953A", "#5B8FB9"];

export default function WeeklySummary({ weekSummary, weekDays, signal, summaryWeek, setSummaryWeek, onBack, selectedSymptoms = ["pain", "fatigue", "brain_fog"] }) {
  const [copied, setCopied] = useState(false);
  const ws = weekSummary;
  const start = dayLabel(weekDays[0]);
  const end = dayLabel(weekDays[6]);
  const exportText = generateWeekExport(ws, signal.acr, selectedSymptoms, SYMPTOM_OPTIONS);

  return (
    <div style={pageStyle}>
      <div style={{ paddingTop: 40, paddingBottom: 12 }}>
        <button type="button" onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: FONTS, fontSize: 13, color: "#8F979D", padding: "10px 12px 10px 0", minHeight: 44, minWidth: 44, display: "flex", alignItems: "center" }}>← Dashboard</button>
        <h2 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, color: "#1C2E33", margin: "10px 0 0" }}>Weekly summary</h2>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {["current", "previous"].map(w => (
            <button key={w} onClick={() => setSummaryWeek(w)} style={{
              fontFamily: FONTS, fontSize: 12, fontWeight: 500, padding: "6px 14px", borderRadius: 20,
              border: summaryWeek === w ? "2px solid #2A8A84" : "1.5px solid #DDD",
              background: summaryWeek === w ? "#2A8A8412" : "#FFF", color: summaryWeek === w ? "#2A8A84" : "#666", cursor: "pointer"
            }}>
              {w === "current" ? "This week" : "Last week"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ ...cardStyle, textAlign: "center", padding: 10 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: "#8F979D" }}>{start} — {end}</span>
      </div>

      {ws.daysLogged === 0 ? (
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <p style={{ fontSize: 13, color: "#8F979D" }}>No data logged for this week yet.</p>
        </div>
      ) : (
        <>
          {/* Load overview */}
          <div style={cardStyle}>
            <span style={sectionLabel}>Load overview<InfoTooltip text="Your total load for the week split into training (exercise) and life (work, stress, symptoms). Net load is the final number after recovery credit is subtracted." /></span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center", marginBottom: 12 }}>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 600 }}>{ws.totalLoad.toFixed(0)}</div>
                <div style={{ fontSize: 10, color: "#8F979D" }}>Net load<InfoTooltip text="Training + life load, minus recovery credit. Your actual weekly load after restorative work is accounted for." /></div>
              </div>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 600, color: "#2A8A84" }}>{ws.totalTraining.toFixed(0)}</div>
                <div style={{ fontSize: 10, color: "#8F979D" }}>Training</div>
              </div>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 600, color: "#C4953A" }}>{ws.totalLife.toFixed(0)}</div>
                <div style={{ fontSize: 10, color: "#8F979D" }}>Life</div>
              </div>
            </div>
            {ws.totalRecovery > 0 && (
              <div style={{ textAlign: "center", marginBottom: 12, padding: "8px 0", background: "#2A8A8408", borderRadius: 8 }}>
                <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 600, color: "#2A8A84" }}>−{ws.totalRecovery.toFixed(1)}</span>
                <span style={{ fontSize: 11, color: "#2A8A84", marginLeft: 6 }}>recovery credit this week</span>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, textAlign: "center" }}>
              <div style={{ background: "#F0F5F6", borderRadius: 8, padding: 10 }}>
                <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 600 }}>{ws.avgDailyLoad.toFixed(1)}</div>
                <div style={{ fontSize: 10, color: "#8F979D" }}>Avg daily load<InfoTooltip text="Total net load divided by 7. Useful for comparing weeks — even ones where you didn't log every day." /></div>
              </div>
              <div style={{ background: "#F0F5F6", borderRadius: 8, padding: 10 }}>
                <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 600 }}>{ws.sessions}</div>
                <div style={{ fontSize: 10, color: "#8F979D" }}>Sessions</div>
              </div>
            </div>
          </div>

          {/* Symptoms */}
          <div style={cardStyle}>
            <span style={sectionLabel}>Average symptoms<InfoTooltip text="Mean symptom levels across all logged morning check-ins this week. Compare with previous weeks to see whether your symptom load is trending up, down, or staying steady." /></span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center" }}>
              {selectedSymptoms.map((id, i) => {
                const opt = SYMPTOM_OPTIONS.find(s => s.id === id);
                const avg = ws.symptomAverages?.[id] ?? 0;
                const delta = ws.deltaAverages?.[id];
                return (
                  <div key={id}>
                    <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 600, color: SYMPTOM_COLORS[i] ?? "#B5534A" }}>{avg.toFixed(1)}</div>
                    <div style={{ fontSize: 10, color: "#8F979D" }}>{opt?.label ?? id}</div>
                    {delta != null && (
                      <div style={{ fontSize: 10, color: delta > 0.3 ? "#B5534A" : delta < -0.3 ? "#2A8A84" : "#8F979D", marginTop: 2 }}>
                        {delta >= 0 ? "+" : ""}{delta.toFixed(1)} Δ
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sleep */}
          <div style={cardStyle}>
            <span style={sectionLabel}>Sleep<InfoTooltip text="Average sleep quality score across logged days this week. Consistently low scores here often explain a lot — poor sleep suppresses recovery and lowers your load tolerance." /></span>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 600 }}>
                {ws.avgSleep.toFixed(1)}<span style={{ fontSize: 12, color: "#8F979D" }}>/10</span>
              </div>
              <div style={{ fontSize: 11, color: "#8F979D", marginTop: 2 }}>Average quality</div>
            </div>
          </div>

          {/* ACWR context */}
          <div style={cardStyle}>
            <span style={sectionLabel}>Load ratio<InfoTooltip text="ACWR — Acute:Chronic Workload Ratio. Your 7-day average load divided by your 28-day average. It measures whether this week's effort is in line with what your body is used to. Sweet spot: 0.80–1.15." /></span>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontFamily: MONO, fontSize: 24, fontWeight: 600, color: signal.color }}>{signal.acr.ratio.toFixed(2)}</span>
              <span style={{ fontSize: 12, color: "#8F979D" }}>ACWR</span>
            </div>
            <p style={{ fontSize: 12, color: "#777", margin: "6px 0 0", lineHeight: 1.5 }}>
              {signal.acr.ratio < 0.8 ? "Below baseline this week. Consider maintaining or slightly increasing activity." :
               signal.acr.ratio <= 1.15 ? "Load is well-matched to your chronic baseline. Keep it here." :
               signal.acr.ratio <= 1.3 ? "Slightly above baseline. Monitor symptoms and don't add more this week." :
               "Significantly above baseline. Prioritise recovery next week."}
            </p>
          </div>

          <div style={{ fontSize: 11, color: "#C9C4BD", textAlign: "center", marginBottom: 8 }}>{ws.daysLogged}/7 days logged</div>

          {/* Export */}
          <button onClick={async () => {
            try { await navigator.clipboard.writeText(exportText); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch (e) {}
          }} style={{
            width: "100%", padding: "13px 0", borderRadius: 10, border: "1px solid #E2E7EA",
            background: copied ? "#2A8A8412" : "#FFF", color: copied ? "#2A8A84" : "#4A4A4A",
            fontFamily: FONTS, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.3s"
          }}>
            {copied ? "Copied to clipboard ✓" : "Copy summary for clinician"}
          </button>
        </>
      )}
    </div>
  );
}
