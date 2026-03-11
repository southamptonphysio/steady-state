import { useState } from "react";
import { FONTS, MONO, SERIF, SYMPTOM_OPTIONS, cardStyle, sectionLabel, pageStyle } from "../lib/constants.js";
import { today, dayLabel, mergeEntry } from "../lib/calculations.js";
import WeekChart from "../components/WeekChart.jsx";
import SymptomChart from "../components/SymptomChart.jsx";
import InfoTooltip from "../components/InfoTooltip.jsx";

// ── Readiness semicircle arc ──────────────────────────────────────────────────
// 48 × 28 px SVG; left = bad, right = good, dot marks the score.
function ReadinessArc({ score }) {
  const r = 20, cx = 24, cy = 24;
  const perim = Math.PI * r; // π × 20 ≈ 62.83
  const redEnd   = perim * 0.30; // scores 1–3
  const amberEnd = perim * 0.60; // scores 4–6
  const path = `M ${cx - r},${cy} A ${r},${r} 0 0 1 ${cx + r},${cy}`;
  const angleDeg = 180 - ((score - 1) / 9) * 180;
  const angleRad = (angleDeg * Math.PI) / 180;
  const mx = cx + r * Math.cos(angleRad);
  const my = cy - r * Math.sin(angleRad);
  const color = score >= 7 ? "#2A8A84" : score >= 4 ? "#C4953A" : "#B5534A";
  return (
    <svg viewBox="0 0 48 28" width="52" height="30" style={{ display: "block", overflow: "visible" }}>
      <path d={path} fill="none" stroke="#E5EAED" strokeWidth="5" strokeLinecap="round" />
      <path d={path} fill="none" stroke="#B5534A" strokeWidth="5"
        strokeDasharray={`${redEnd} ${perim + 10}`} strokeDashoffset="0" strokeLinecap="butt" />
      <path d={path} fill="none" stroke="#C4953A" strokeWidth="5"
        strokeDasharray={`${amberEnd - redEnd} ${perim + 10}`} strokeDashoffset={`${-redEnd}`} strokeLinecap="butt" />
      <path d={path} fill="none" stroke="#2A8A84" strokeWidth="5"
        strokeDasharray={`${perim - amberEnd} ${perim + 10}`} strokeDashoffset={`${-amberEnd}`} strokeLinecap="butt" />
      <circle cx={mx} cy={my} r="3.5" fill="white" stroke={color} strokeWidth="2.5" />
    </svg>
  );
}

export default function Dashboard({
  entries, signal, saving,
  hasMorning, hasEvening,
  todayTraining, todayLife, todayRecovery, todayLoad,
  realDays, streak,
  onMorningLog, onEveningLog,
  onViewSummary, onViewHistory,
  selectedSymptoms
}) {
  const [loadExpanded, setLoadExpanded] = useState(false);
  const [acrExpanded,  setAcrExpanded]  = useState(false);
  const [expandedDelta, setExpandedDelta] = useState(null); // symptom id or null

  const hasCheckIn = hasMorning || hasEvening;
  const todayMerged = mergeEntry(entries[today()]);
  const hasDelta = !!(todayMerged?.morningSymptoms && todayMerged?.eveningSymptoms);

  // Stacked bar segments
  const gross = hasCheckIn ? todayTraining + todayLife : 0;
  const netLife   = Math.max(0, todayLife - todayRecovery);
  const recCapped = Math.min(todayRecovery, todayLife);
  const trainPct   = gross > 0 ? (todayTraining / gross) * 100 : 0;
  const lifeNetPct = gross > 0 ? (netLife / gross) * 100 : 0;
  const recPct     = gross > 0 ? (recCapped / gross) * 100 : 0;

  return (
    <div style={pageStyle}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{ paddingTop: 24, paddingBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 500, color: "#1C2E33", margin: 0 }}>SteadyState</h1>
            <p style={{ fontSize: 12, color: "#8F979D", margin: "2px 0 0" }}>
              {dayLabel(today())}{saving && " · Saving…"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <button type="button" onClick={onViewSummary} style={{ fontFamily: FONTS, fontSize: 12, fontWeight: 500, padding: "6px 12px", borderRadius: 8, border: "1px solid #E2E7EA", background: "#FFF", color: "#4A4A4A", cursor: "pointer" }}>Week</button>
            <button type="button" onClick={onViewHistory} style={{ fontFamily: FONTS, fontSize: 12, fontWeight: 500, padding: "6px 12px", borderRadius: 8, border: "1px solid #E2E7EA", background: "#FFF", color: "#4A4A4A", cursor: "pointer" }}>History</button>
          </div>
        </div>
      </div>

      {/* ── Zone card — hero ────────────────────────────────────────── */}
      <div style={{ ...cardStyle, background: signal.bg, border: `1px solid ${signal.color}28`, padding: "20px 18px 18px", position: "relative" }}>
        {/* ACWR ratio pill — top right */}
        <div style={{ position: "absolute", top: 14, right: 16, background: `${signal.color}14`, borderRadius: 20, padding: "2px 9px", display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: signal.color }}>{signal.acr.ratio.toFixed(2)}</span>
          <span style={{ fontFamily: MONO, fontSize: 9, color: signal.color, opacity: 0.65 }}>ACWR</span>
        </div>

        {/* Zone label row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14, paddingRight: 72 }}>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: `${signal.color}18`, border: `2px solid ${signal.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0, marginTop: 2 }}>
            {signal.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: signal.color, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>{signal.zone}</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#1C2E33", lineHeight: 1.3 }}>{signal.label}</div>
          </div>
          {/* Readiness arc — or morning prompt */}
          {signal.readiness ? (
            <div style={{ flexShrink: 0, textAlign: "center" }}>
              <ReadinessArc score={signal.readiness.score} />
              <div style={{ fontFamily: MONO, fontSize: 9, color: "#8F979D", marginTop: 1, letterSpacing: "0.05em" }}>
                {signal.readiness.score}/10 READY
                <InfoTooltip text="Readiness score (1–10). Weighs your sleep quality, morning symptoms, and recent load history. A higher score means your body is better prepared to handle more today." />
              </div>
            </div>
          ) : (
            <button type="button" onClick={onMorningLog} style={{ flexShrink: 0, background: `${signal.color}10`, border: `1px solid ${signal.color}35`, borderRadius: 8, padding: "7px 10px", fontFamily: FONTS, fontSize: 11, color: signal.color, cursor: "pointer", textAlign: "center", lineHeight: 1.4 }}>
              Log morning<br />for readiness
            </button>
          )}
        </div>

        {/* Advice */}
        <p style={{ fontSize: 14, lineHeight: 1.65, color: "#5A5A5A", margin: 0 }}>{signal.advice}</p>

        {/* Readiness modifier */}
        {signal.readinessModifier && (
          <p style={{ fontSize: 13, lineHeight: 1.55, color: signal.color, margin: "12px 0 0", padding: "10px 12px", background: `${signal.color}10`, borderRadius: 8, fontWeight: 500 }}>
            {signal.readinessModifier}
          </p>
        )}
      </div>

      {/* ── Today's load — stacked bar ──────────────────────────────── */}
      <div
        style={{ ...cardStyle, cursor: hasCheckIn ? "pointer" : "default", userSelect: "none" }}
        onClick={() => hasCheckIn && setLoadExpanded(v => !v)}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: hasCheckIn ? 10 : 0 }}>
          <span style={sectionLabel}>
            Today's load
            <InfoTooltip text="Your combined stress score for today — training, life demands and symptoms added together. Recovery activities subtract from it." />
          </span>
          {hasCheckIn && <span style={{ fontSize: 11, color: "#B0B8BC", marginTop: -10 }}>{loadExpanded ? "▾" : "▸"}</span>}
        </div>

        {hasCheckIn ? (
          <>
            {/* Stacked bar */}
            <div style={{ display: "flex", height: 28, borderRadius: 14, overflow: "hidden", background: "#F0F5F6" }}>
              {trainPct > 0 && <div style={{ width: `${trainPct}%`, background: "#2A8A84", flexShrink: 0 }} />}
              {lifeNetPct > 0 && <div style={{ width: `${lifeNetPct}%`, background: "#C4953A", flexShrink: 0 }} />}
              {recPct > 0 && (
                <div style={{ width: `${recPct}%`, flexShrink: 0, background: "repeating-linear-gradient(135deg, #2A8A84 0px, #2A8A84 3px, #3DA39D 3px, #3DA39D 6px)" }} />
              )}
            </div>
            {/* Net total */}
            <div style={{ textAlign: "center", marginTop: 7 }}>
              <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 600, color: "#1C2E33" }}>{todayLoad.toFixed(1)}</span>
            </div>
            {/* Expanded breakdown */}
            {loadExpanded && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #F0EDED" }}>
                {[
                  { label: "Training",    value: todayTraining,   color: "#2A8A84", tooltip: "Load from exercise — duration × effort (RPE)." },
                  { label: "Life",        value: todayLife,        color: "#C4953A", tooltip: "Load from mental, emotional and physical demands outside exercise." },
                  ...(recCapped > 0 ? [{ label: "Recovery", value: -recCapped, color: "#2A8A84", prefix: "−", tooltip: "Credit earned through restorative activities." }] : []),
                  { label: "Net total",   value: todayLoad,        color: "#1C2E33", bold: true },
                ].map(({ label, value, color, tooltip, bold, prefix }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 6 }}>
                    <span style={{ fontSize: 13, color: bold ? "#1C2E33" : "#888", fontWeight: bold ? 600 : 400 }}>
                      {label}{tooltip && <InfoTooltip text={tooltip} />}
                    </span>
                    <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: bold ? 700 : 500, color }}>
                      {prefix ?? ""}{Math.abs(value).toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p style={{ fontSize: 13, color: "#8F979D", margin: 0 }}>No check-in yet today.</p>
        )}
      </div>

      {/* ── ACWR detail — collapsible ───────────────────────────────── */}
      <div
        style={{ ...cardStyle, cursor: "pointer", userSelect: "none" }}
        onClick={() => setAcrExpanded(v => !v)}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8F979D" }}>
            Acute : Chronic Ratio
            <InfoTooltip text="Your 7-day average load divided by your 28-day average. Below 0.8 means you're doing less than usual. Above 1.15 means you've ramped up quickly. Sweet spot: 0.80–1.15." />
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: signal.color, background: `${signal.color}12`, padding: "2px 9px", borderRadius: 12 }}>
              {signal.acr.ratio.toFixed(2)}
            </span>
            <span style={{ fontSize: 11, color: "#B0B8BC" }}>{acrExpanded ? "▾" : "▸"}</span>
          </div>
        </div>

        {acrExpanded && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #F0EDED", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, textAlign: "center" }}>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 600 }}>{signal.acr.acute.toFixed(1)}</div>
              <div style={{ fontSize: 10, color: "#8F979D", marginTop: 2 }}>7-day avg</div>
            </div>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 600 }}>{signal.acr.chronic.toFixed(1)}</div>
              <div style={{ fontSize: 10, color: "#8F979D", marginTop: 2 }}>28-day avg</div>
            </div>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: "#8F979D" }}>0.80–1.15</div>
              <div style={{ fontSize: 10, color: "#8F979D", marginTop: 2 }}>target</div>
            </div>
          </div>
        )}
      </div>

      {/* ── 7-day load chart ────────────────────────────────────────── */}
      <div style={cardStyle}>
        <span style={sectionLabel}>
          7-day load
          <InfoTooltip text="Your daily load over the past week. Bars without real logged data are estimated from your baseline. The dashed line marks your 28-day chronic average." />
        </span>
        <div style={{ display: "flex", gap: 10, marginBottom: 6 }}>
          {[["Training", "#2A8A84", 8], ["Life", "#C4953A", 8], ["Estimated", "#D8CCAA", 4]].map(([l, c, h]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 8, height: h, background: c, borderRadius: 2, opacity: l === "Estimated" ? 0.55 : 1 }} />
              <span style={{ fontSize: 10, color: "#888" }}>{l}</span>
            </div>
          ))}
        </div>
        <WeekChart entries={entries} chronicLoad={signal.acr.chronic} />
      </div>

      {/* ── Symptom trends + Today's cost ───────────────────────────── */}
      <div style={cardStyle}>
        <span style={sectionLabel}>
          Symptom trends — 7 days
          <InfoTooltip text="Your key symptoms tracked over the past week. Useful for spotting patterns — like symptoms rising after high-load days or improving after rest." />
        </span>
        <SymptomChart entries={entries} selectedSymptoms={selectedSymptoms} />

        {hasDelta && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #F0EDED" }}>
            <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8F979D", marginBottom: 8 }}>
              Today's cost
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {selectedSymptoms.map(id => {
                const opt = SYMPTOM_OPTIONS.find(s => s.id === id);
                const morning = todayMerged.morningSymptoms[id] ?? 0;
                const evening = todayMerged.eveningSymptoms[id] ?? 0;
                const delta = evening - morning;
                const isOpen = expandedDelta === id;

                let arrow, arrowColor;
                if (delta >= 3)        { arrow = "▲"; arrowColor = "#B5534A"; }
                else if (delta >= 1)   { arrow = "▲"; arrowColor = "#C4953A"; }
                else if (delta <= -1)  { arrow = "▼"; arrowColor = "#2A8A84"; }
                else                   { arrow = "—"; arrowColor = "#B0B8BC"; }

                return (
                  <button
                    key={id} type="button"
                    onClick={() => setExpandedDelta(isOpen ? null : id)}
                    style={{ background: isOpen ? "#F0F5F6" : "#F7F9FA", border: "1px solid #E5EAED", borderRadius: 8, padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <span style={{ fontFamily: FONTS, fontSize: 11, fontWeight: 500, color: "#4A4A4A" }}>{opt?.label ?? id}</span>
                    <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: arrowColor }}>{arrow}</span>
                    {isOpen && (
                      <span style={{ fontFamily: MONO, fontSize: 10, color: "#8F979D" }}>{morning} → {evening}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Stats — quiet single line ────────────────────────────────── */}
      {realDays > 0 && (
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <span style={{ fontFamily: MONO, fontSize: 11, color: "#C0C8CC" }}>
            {realDays} days logged · {streak} day streak
          </span>
        </div>
      )}

      {/* ── Check-in buttons — state-aware ──────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {hasMorning ? (
          <button type="button" onClick={onMorningLog} style={{ width: "100%", padding: "10px 0", borderRadius: 10, background: "#F0F5F6", color: "#4A4A4A", border: "none", fontFamily: FONTS, fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <span style={{ color: "#2A8A84" }}>✓</span> Edit morning check-in
          </button>
        ) : (
          <button type="button" onClick={onMorningLog} style={{ width: "100%", padding: "14px 0", borderRadius: 10, background: "#1C2E33", color: "#F7F9FA", border: "none", fontFamily: FONTS, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            ☀ Morning check-in
          </button>
        )}

        {hasEvening ? (
          <button type="button" onClick={onEveningLog} style={{ width: "100%", padding: "10px 0", borderRadius: 10, background: "#F0F5F6", color: "#4A4A4A", border: "none", fontFamily: FONTS, fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <span style={{ color: "#2A8A84" }}>✓</span> Edit evening log
          </button>
        ) : hasMorning ? (
          <button type="button" onClick={onEveningLog} style={{ width: "100%", padding: "14px 0", borderRadius: 10, background: "#1C2E33", color: "#F7F9FA", border: "none", fontFamily: FONTS, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            ☾ Evening log
          </button>
        ) : (
          <button type="button" onClick={onEveningLog} style={{ width: "100%", padding: "14px 0", borderRadius: 10, background: "#FFF", color: "#8F979D", border: "1px solid #E2E7EA", fontFamily: FONTS, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
            ☾ Evening log
          </button>
        )}
      </div>

    </div>
  );
}
