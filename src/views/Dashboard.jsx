import { FONTS, MONO, SERIF, cardStyle, sectionLabel, pageStyle } from "../lib/constants.js";
import { today, dayLabel, mergeEntry, calcTrainingLoad, calcLifeLoad, calcRecoveryCredit } from "../lib/calculations.js";
import MiniBar from "../components/MiniBar.jsx";
import WeekChart from "../components/WeekChart.jsx";
import SymptomChart from "../components/SymptomChart.jsx";
import InfoTooltip from "../components/InfoTooltip.jsx";

export default function Dashboard({
  entries, signal, saving,
  hasMorning, hasEvening,
  todayTraining, todayLife, todayRecovery, todayLoad,
  realDays, streak,
  onMorningLog, onEveningLog,
  onViewSummary, onViewHistory
}) {
  return (
    <div style={pageStyle}>
      <div style={{ paddingTop: 24, paddingBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 500, color: "#1C2E33", margin: 0 }}>SteadyState</h1>
            <p style={{ fontSize: 12, color: "#8F979D", margin: "2px 0 0" }}>
              {dayLabel(today())}{saving && " · Saving..."}
            </p>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <button onClick={onViewSummary} style={{ fontFamily: FONTS, fontSize: 12, fontWeight: 500, padding: "6px 12px", borderRadius: 8, border: "1px solid #E2E7EA", background: "#FFF", color: "#4A4A4A", cursor: "pointer" }}>Week</button>
            <button onClick={onViewHistory} style={{ fontFamily: FONTS, fontSize: 12, fontWeight: 500, padding: "6px 12px", borderRadius: 8, border: "1px solid #E2E7EA", background: "#FFF", color: "#4A4A4A", cursor: "pointer" }}>History</button>
          </div>
        </div>
      </div>

      {/* Unified daily signal */}
      <div style={{ ...cardStyle, background: signal.bg, border: `1px solid ${signal.color}25`, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${signal.color}18`, border: `2px solid ${signal.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
            {signal.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: signal.color, letterSpacing: "0.08em", textTransform: "uppercase" }}>{signal.zone}</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#1C2E33", marginTop: 1 }}>{signal.label}</div>
          </div>
          {signal.readiness && (
            <div style={{ textAlign: "center", flexShrink: 0 }}>
              <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 600, color: signal.readiness.score >= 7 ? "#2A8A84" : signal.readiness.score >= 4 ? "#C4953A" : "#B5534A", lineHeight: 1 }}>
                {signal.readiness.score}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 9, color: "#8F979D", letterSpacing: "0.05em" }}>
                READY<InfoTooltip text="Readiness score (1–10). Weighs your sleep quality, morning symptoms, and recent load history. A higher score means your body is better prepared to handle more today." />
              </div>
            </div>
          )}
        </div>
        <p style={{ fontSize: 13, lineHeight: 1.55, color: "#5A5A5A", margin: 0 }}>{signal.advice}</p>
        {signal.readinessModifier && (
          <p style={{ fontSize: 12, lineHeight: 1.5, color: signal.color, margin: "8px 0 0", padding: "8px 12px", background: `${signal.color}08`, borderRadius: 6 }}>
            {signal.readinessModifier}
          </p>
        )}
      </div>

      {/* ACWR */}
      <div style={cardStyle}>
        <span style={sectionLabel}>Acute : Chronic Ratio<InfoTooltip text="Your 7-day average load divided by your 28-day average. Below 0.8 means you're doing less than usual — possible undertraining or deconditioning. Above 1.15 means you've ramped up quickly, which raises injury and flare risk. The sweet spot is 0.80–1.15." /></span>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
          <span style={{ fontFamily: MONO, fontSize: 32, fontWeight: 600, color: signal.color, lineHeight: 1 }}>{signal.acr.ratio.toFixed(2)}</span>
          <span style={{ fontSize: 12, color: "#8F979D" }}>target 0.80 – 1.15</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <span style={{ fontSize: 11, color: "#888" }}>7-day avg</span>
            <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 600, marginTop: 2 }}>{signal.acr.acute.toFixed(1)}</div>
          </div>
          <div>
            <span style={{ fontSize: 11, color: "#888" }}>28-day avg</span>
            <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 600, marginTop: 2 }}>{signal.acr.chronic.toFixed(1)}</div>
          </div>
        </div>
      </div>

      {/* Today's load */}
      <div style={cardStyle}>
        <span style={sectionLabel}>Today's load<InfoTooltip text="Your combined stress score for today — training, life stress, and symptoms added together. Recovery activities subtract from it. This is the number that feeds into your acute:chronic ratio." /></span>
        {(hasMorning || hasEvening) ? (
          <>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: "#2A8A84", marginBottom: 4 }}>
                Training<InfoTooltip text="Load from exercise. Calculated from duration × effort (RPE). A 45-minute session at RPE 7 scores higher than the same time at RPE 4." />
              </div>
              <MiniBar value={todayTraining} max={Math.max(30, (todayTraining + todayLife) * 1.3)} color="#2A8A84" />
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: "#C4953A", marginBottom: 4 }}>
                Life<InfoTooltip text="Load from work, stress, and symptoms. Even rest days have a life load — a stressful day at a desk takes something out of you the same way a workout does." />
              </div>
              <MiniBar value={todayLife} max={Math.max(30, (todayTraining + todayLife) * 1.3)} color="#C4953A" />
            </div>
            {todayRecovery > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: "#2A8A84", marginBottom: 4 }}>
                  Recovery credit<InfoTooltip text="A reduction in your total load earned through restorative activities — breathwork, gentle yoga, foam rolling. It lowers your net load, but doesn't erase it. Think of it as offsetting, not cancelling." />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 20, background: "#F0EDED", borderRadius: 4, overflow: "hidden", position: "relative" }}>
                    <div style={{ width: `${Math.min(100, (todayRecovery / 5) * 100)}%`, height: "100%", background: "repeating-linear-gradient(135deg, #2A8A84, #2A8A84 4px, #3D9D97 4px, #3D9D97 8px)", borderRadius: 4 }} />
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: "#2A8A84" }}>−{todayRecovery.toFixed(1)}</span>
                </div>
              </div>
            )}
            <div style={{ borderTop: "1px solid #F0EDED", paddingTop: 8, marginTop: 4, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Total</span>
              <span style={{ fontFamily: MONO, fontSize: 18, fontWeight: 600 }}>{todayLoad.toFixed(1)}</span>
            </div>
          </>
        ) : (
          <p style={{ fontSize: 13, color: "#8F979D", margin: 0 }}>No check-in yet today.</p>
        )}
      </div>

      {/* 7-day chart */}
      <div style={cardStyle}>
        <span style={sectionLabel}>7-day load<InfoTooltip text="Your daily load visualised over the past week. Bars without real logged data are estimated from your baseline so the chart is never empty." /></span>
        <div style={{ display: "flex", gap: 10, marginBottom: 6 }}>
          {[["Training", "#2A8A84"], ["Life", "#C4953A"]].map(([l, c]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 8, height: 8, background: c, borderRadius: 2 }} />
              <span style={{ fontSize: 10, color: "#888" }}>{l}</span>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 4, background: "#D8CCAA", borderRadius: 2, opacity: 0.5 }} />
            <span style={{ fontSize: 10, color: "#888" }}>Estimated</span>
          </div>
        </div>
        <WeekChart entries={entries} />
      </div>

      {/* Symptoms */}
      <div style={cardStyle}>
        <span style={sectionLabel}>Symptom trends — 7 days<InfoTooltip text="Pain, fatigue, and brain fog tracked over the past week. Useful for spotting patterns — like symptoms rising after high-load days or improving after rest." /></span>
        <SymptomChart entries={entries} />
      </div>

      {/* Stats */}
      {realDays > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div style={{ ...cardStyle, textAlign: "center", marginBottom: 0 }}>
            <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 600 }}>{realDays}</div>
            <div style={{ fontSize: 11, color: "#8F979D" }}>Days logged</div>
          </div>
          <div style={{ ...cardStyle, textAlign: "center", marginBottom: 0 }}>
            <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 600 }}>{streak}</div>
            <div style={{ fontSize: 11, color: "#8F979D" }}>Day streak</div>
          </div>
        </div>
      )}

      {/* Check-in buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button onClick={onMorningLog} style={{
          width: "100%", padding: "14px 0", borderRadius: 10,
          background: hasMorning ? "#FFF" : "#1C2E33", color: hasMorning ? "#4A4A4A" : "#F7F9FA",
          border: hasMorning ? "1px solid #E2E7EA" : "none", fontFamily: FONTS, fontSize: 14, fontWeight: 600, cursor: "pointer"
        }}>
          {hasMorning ? "Edit morning check-in" : "☀ Morning check-in"}
        </button>
        <button onClick={onEveningLog} style={{
          width: "100%", padding: "14px 0", borderRadius: 10,
          background: hasEvening ? "#FFF" : (hasMorning ? "#1C2E33" : "#FFF"),
          color: hasEvening ? "#4A4A4A" : (hasMorning ? "#F7F9FA" : "#4A4A4A"),
          border: hasEvening ? "1px solid #E2E7EA" : (hasMorning ? "none" : "1px solid #E2E7EA"),
          fontFamily: FONTS, fontSize: 14, fontWeight: 600, cursor: "pointer"
        }}>
          {hasEvening ? "Edit evening log" : "☾ Evening log"}
        </button>
      </div>
    </div>
  );
}
