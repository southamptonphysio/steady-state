import { useState, useEffect, useCallback, useMemo } from "react";

const STORAGE_KEY = "steadystate-v3";

// ── helpers ──────────────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10);
const dayLabel = (iso) => {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
};
const shortDay = (iso) => {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "short" });
};
const fullDay = (iso) => {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
};
const nDaysAgo = (n) => {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
};
const last7Days = () => nDaysAgo(7);
const last28Days = () => nDaysAgo(28);
const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));
const vary = (base, pct = 0.18) => Math.round(clamp(base * (1 + (Math.random() * 2 - 1) * pct), 0, 10) * 10) / 10;

// ── Current week helpers ─────────────────────────────────────────────
function getCurrentWeekDays() {
  const d = new Date();
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    days.push(dd.toISOString().slice(0, 10));
  }
  return days;
}

function getPreviousWeekDays() {
  const d = new Date();
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const thisMonday = new Date(d);
  thisMonday.setDate(d.getDate() + mondayOffset);
  const prevMonday = new Date(thisMonday);
  prevMonday.setDate(thisMonday.getDate() - 7);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(prevMonday);
    dd.setDate(prevMonday.getDate() + i);
    days.push(dd.toISOString().slice(0, 10));
  }
  return days;
}

// ── load calculations ────────────────────────────────────────────────
function mergeEntry(entry) {
  if (!entry) return null;
  return {
    sleepQuality: entry.morning?.sleepQuality ?? entry.sleepQuality ?? 5,
    sleepHours: entry.morning?.sleepHours ?? entry.sleepHours ?? 7,
    painLevel: entry.morning?.painLevel ?? entry.painLevel ?? 0,
    fatigueLevel: entry.morning?.fatigueLevel ?? entry.fatigueLevel ?? 0,
    brainFog: entry.evening?.brainFog ?? entry.brainFog ?? 0,
    workIntensity: entry.evening?.workIntensity ?? entry.workIntensity ?? 5,
    stressLevel: entry.evening?.stressLevel ?? entry.stressLevel ?? 5,
    exercises: entry.evening?.exercises ?? entry.exercises ?? [],
    recovery: entry.evening?.recovery ?? entry.recovery ?? [],
    mood: entry.evening?.mood ?? entry.mood ?? 5,
    notes: entry.evening?.notes ?? entry.notes ?? "",
    synthetic: entry.synthetic || false,
    hasMorning: !!entry.morning,
    hasEvening: !!entry.evening
  };
}

function calcTrainingLoad(entry) {
  const m = entry?.exercises ? entry : mergeEntry(entry);
  if (!m || !m.exercises || m.exercises.length === 0) return 0;
  return m.exercises.reduce((sum, ex) => sum + (ex.duration * ex.rpe) / 10, 0);
}

function calcLifeLoad(entry) {
  const m = entry?.workIntensity !== undefined ? entry : mergeEntry(entry);
  if (!m) return 0;
  return Math.max(0, (10 - (m.sleepQuality || 5)) * 1.5) + (m.stressLevel || 5) * 1.2 + (m.workIntensity || 5) * 1.0;
}

function calcTotalLoad(entry) {
  const m = mergeEntry(entry);
  const recovery = calcRecoveryCredit(m);
  return Math.max(0, calcTrainingLoad(m) + calcLifeLoad(m) - recovery);
}

function calcRecoveryCredit(entry) {
  const m = entry?.recovery ? entry : mergeEntry(entry);
  if (!m || !m.recovery || m.recovery.length === 0) return 0;
  const raw = m.recovery.reduce((sum, r) => {
    // Effectiveness scales with duration but with diminishing returns
    const base = Math.min(r.duration, 45) * 0.12;
    return sum + base;
  }, 0);
  // Cap at 5 — meaningful but can't erase a bad day
  return Math.min(5, raw);
}

function calcSymptomScore(entry) {
  const m = mergeEntry(entry);
  if (!m) return 0;
  return ((m.painLevel || 0) + (m.fatigueLevel || 0) + (m.brainFog || 0)) / 3;
}

function getAcuteChronicRatio(entries) {
  const acuteAvg = last7Days().reduce((s, d) => s + calcTotalLoad(entries[d]), 0) / 7;
  const chronicAvg = last28Days().reduce((s, d) => s + calcTotalLoad(entries[d]), 0) / 28;
  if (chronicAvg === 0) return { ratio: 1.0, acute: acuteAvg, chronic: chronicAvg };
  return { ratio: acuteAvg / chronicAvg, acute: acuteAvg, chronic: chronicAvg };
}

// ── readiness score ──────────────────────────────────────────────────
function calcReadiness(entries, dateStr) {
  const todayEntry = entries[dateStr];
  if (!todayEntry?.morning) return null;
  const m = todayEntry.morning;
  const sleepScore = ((m.sleepQuality || 5) / 10) * 30;
  const symptomAvg = ((10 - (m.painLevel || 0)) + (10 - (m.fatigueLevel || 0))) / 2;
  const symptomScore = (symptomAvg / 10) * 30;
  const yesterday = new Date(dateStr + "T12:00:00");
  yesterday.setDate(yesterday.getDate() - 1);
  const yLoad = calcTotalLoad(entries[yesterday.toISOString().slice(0, 10)]);
  const chronicAvg = last28Days().reduce((s, d) => s + calcTotalLoad(entries[d]), 0) / 28;
  const loadRatio = chronicAvg > 0 ? clamp(1 - ((yLoad - chronicAvg) / chronicAvg), 0, 1) : 0.5;
  const loadScore = loadRatio * 20;
  const recent3 = [];
  for (let i = 1; i <= 3; i++) {
    const dd = new Date(dateStr + "T12:00:00");
    dd.setDate(dd.getDate() - i);
    recent3.push(calcSymptomScore(entries[dd.toISOString().slice(0, 10)]));
  }
  const trendAvg = recent3.length > 0 ? recent3.reduce((a, b) => a + b, 0) / recent3.length : 5;
  const trendScore = ((10 - trendAvg) / 10) * 20;
  const total = clamp(Math.round(sleepScore + symptomScore + loadScore + trendScore), 1, 100);
  return { score: clamp(Math.round(total / 10), 1, 10), total };
}

// ── unified daily signal ─────────────────────────────────────────────
function getDailySignal(entries) {
  const acr = getAcuteChronicRatio(entries);
  const readiness = calcReadiness(entries, today());
  const todaySymptoms = calcSymptomScore(entries[today()]);

  // Base zone from ACWR
  let zone, baseAdvice;
  if (acr.ratio < 0.8) {
    zone = "UNDERDOING";
    baseAdvice = "You're below your established baseline. If you're feeling stable, get a session in — even a moderate one. Doing less than usual for too long makes you more sensitive, not less.";
  } else if (acr.ratio <= 1.15 && todaySymptoms <= 5) {
    zone = "STEADY STATE";
    baseAdvice = "Load is matching your capacity. This is where you want to be. If you've been here 2+ weeks with stable symptoms, you could cautiously add around 10%.";
  } else if (acr.ratio <= 1.3) {
    zone = "AMBER";
    baseAdvice = "Your recent load is running above your rolling average. Not necessarily a problem — but keep today lighter and prioritise recovery. Watch how symptoms respond over 24-48 hours.";
  } else {
    zone = "RED";
    baseAdvice = "You've spiked well above your chronic load. Scale back to maintenance only — gentle movement, sleep, stress management. The goal is getting back to baseline, not pushing through.";
  }

  // Readiness modifies the signal
  let readinessModifier = null;
  if (readiness) {
    if (readiness.score <= 3 && zone !== "RED") {
      readinessModifier = "Your readiness is low this morning. Regardless of what the load numbers say, listen to your body — lighter activity or rest today.";
    } else if (readiness.score <= 5 && (zone === "STEADY STATE" || zone === "UNDERDOING")) {
      readinessModifier = "Readiness is moderate. You've got capacity on paper but your body's telling a different story — take it easier today.";
    } else if (readiness.score >= 8 && zone === "UNDERDOING") {
      readinessModifier = "You're feeling good and you're below baseline. Today's a great day for a solid session — use it.";
    } else if (readiness.score >= 7 && zone === "STEADY STATE") {
      readinessModifier = "Feeling fresh and load is on track. Good conditions to push slightly if you're looking to progress.";
    }
  }

  const zoneStyles = {
    UNDERDOING: { color: "#5B8FB9", bg: "rgba(91,143,185,0.06)", icon: "↓", label: "Below baseline" },
    "STEADY STATE": { color: "#2A8A84", bg: "rgba(42,138,132,0.06)", icon: "●", label: "In the sweet spot" },
    AMBER: { color: "#C4953A", bg: "rgba(196,149,58,0.06)", icon: "▲", label: "Approaching threshold" },
    RED: { color: "#B5534A", bg: "rgba(181,83,74,0.06)", icon: "⚠", label: "Flare risk — pull back" }
  };

  return {
    zone, acr, readiness, ...zoneStyles[zone],
    advice: baseAdvice, readinessModifier
  };
}

// ── weekly summary ───────────────────────────────────────────────────
function calcWeekSummary(entries, weekDays) {
  let totalTraining = 0, totalLife = 0, totalRecovery = 0, symptomSum = 0, sessionsCount = 0, daysLogged = 0;
  let painSum = 0, fatigueSum = 0, fogSum = 0, sleepSum = 0, sleepDays = 0;

  weekDays.forEach(d => {
    const e = entries[d];
    if (!e || e.synthetic) return;
    daysLogged++;
    const m = mergeEntry(e);
    totalTraining += calcTrainingLoad(m);
    totalLife += calcLifeLoad(m);
    totalRecovery += calcRecoveryCredit(m);
    symptomSum += calcSymptomScore(e);
    painSum += m.painLevel || 0;
    fatigueSum += m.fatigueLevel || 0;
    fogSum += m.brainFog || 0;
    if (m.sleepQuality) { sleepSum += m.sleepQuality; sleepDays++; }
    if (m.exercises) sessionsCount += m.exercises.length;
  });

  const totalLoad = Math.max(0, totalTraining + totalLife - totalRecovery);
  return {
    weekDays, daysLogged, totalLoad, totalTraining, totalLife, totalRecovery,
    avgSymptoms: daysLogged > 0 ? symptomSum / daysLogged : 0,
    avgPain: daysLogged > 0 ? painSum / daysLogged : 0,
    avgFatigue: daysLogged > 0 ? fatigueSum / daysLogged : 0,
    avgFog: daysLogged > 0 ? fogSum / daysLogged : 0,
    avgSleep: sleepDays > 0 ? sleepSum / sleepDays : 0,
    sessions: sessionsCount,
    avgDailyLoad: daysLogged > 0 ? totalLoad / daysLogged : 0
  };
}

function generateWeekExport(summary, acr) {
  const start = dayLabel(summary.weekDays[0]);
  const end = dayLabel(summary.weekDays[6]);
  return `STEADYSTATE — WEEKLY SUMMARY
${start} – ${end}
${"─".repeat(36)}

LOAD
  Total weekly load:    ${summary.totalLoad.toFixed(1)}
  Avg daily load:       ${summary.avgDailyLoad.toFixed(1)}
  Training load:        ${summary.totalTraining.toFixed(1)}
  Life load:            ${summary.totalLife.toFixed(1)}
  Recovery credit:     -${summary.totalRecovery.toFixed(1)}
  Training sessions:    ${summary.sessions}

ACUTE:CHRONIC RATIO
  Current ratio:        ${acr.ratio.toFixed(2)}
  7-day avg (acute):    ${acr.acute.toFixed(1)}
  28-day avg (chronic): ${acr.chronic.toFixed(1)}

SYMPTOMS (avg /10)
  Pain:                 ${summary.avgPain.toFixed(1)}
  Fatigue:              ${summary.avgFatigue.toFixed(1)}
  Brain fog:            ${summary.avgFog.toFixed(1)}

SLEEP
  Avg quality:          ${summary.avgSleep.toFixed(1)}/10

Days logged: ${summary.daysLogged}/7
`;
}

// ── synthetic baseline ───────────────────────────────────────────────
function generateSyntheticBaseline(onboarding) {
  const entries = {};
  const stabilityMultiplier = onboarding.stability === "worse" ? 1.25 : onboarding.stability === "better" ? 0.85 : 1.0;
  const sessionsPerWeek = onboarding.sessionsPerWeek || 3;
  const avgDuration = onboarding.avgDuration || 40;
  const avgRPE = onboarding.avgRPE || 5;
  const trainingDayMap = [1, 3, 5, 0, 2, 4, 6];

  for (let i = 28; i >= 1; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dow = d.getDay();
    const isTraining = trainingDayMap.slice(0, sessionsPerWeek).includes(dow);
    const exercises = isTraining ? [{
      type: onboarding.exerciseTypes?.[0] || "Gym — Strength",
      duration: Math.round(vary(avgDuration, 0.15)),
      rpe: Math.round(clamp(vary(avgRPE, 0.15), 1, 10))
    }] : [];

    const bp = (v) => Math.round(clamp(vary(v * stabilityMultiplier), 0, 10));
    entries[key] = {
      synthetic: true,
      morning: {
        sleepQuality: Math.round(clamp(vary(onboarding.typicalSleepQuality || 6), 1, 10)),
        sleepHours: Math.round(clamp(vary(onboarding.typicalSleep || 7, 0.1), 4, 11) * 2) / 2,
        painLevel: bp(onboarding.typicalPain || 3),
        fatigueLevel: bp(onboarding.typicalFatigue || 3),
      },
      evening: {
        workIntensity: Math.round(clamp(vary(onboarding.typicalWork || 5), 1, 10)),
        stressLevel: Math.round(clamp(vary(onboarding.typicalStress || 5), 1, 10)),
        brainFog: bp(onboarding.typicalBrainFog || 2),
        mood: Math.round(clamp(vary(6, 0.2), 1, 10)),
        exercises, notes: ""
      }
    };
  }
  return entries;
}

// ── constants ────────────────────────────────────────────────────────
const EXERCISE_TYPES = [
  "Gym — Strength", "Gym — Conditioning", "Running", "Walking",
  "Cycling", "Swimming", "Yoga / Pilates", "Sports", "Physio Exercises", "Other"
];
const RECOVERY_TYPES = [
  "Gentle yoga", "Breathwork", "Meditation", "Foam rolling / massage",
  "Gentle walk", "Stretching", "Cold / heat therapy", "Nap"
];
const CONDITIONS = [
  { id: "chronic_pain", label: "Chronic pain" },
  { id: "cfs", label: "Chronic fatigue (ME/CFS)" },
  { id: "fibro", label: "Fibromyalgia" },
  { id: "hypermobility", label: "Hypermobility / EDS" },
  { id: "autoimmune", label: "Autoimmune condition" },
  { id: "other", label: "Other" }
];
const FONTS = `'DM Sans', sans-serif`;
const MONO = `'IBM Plex Mono', monospace`;
const SERIF = `'Fraunces', serif`;
const FONT_LINK = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Fraunces:opsz,wght@9..144,300;9..144,500;9..144,700&display=swap";

// ═══════════════════════════════════════════════════════════════════════
//  SHARED UI
// ═══════════════════════════════════════════════════════════════════════
function FontLoader() { return <link href={FONT_LINK} rel="stylesheet" />; }

function SliderInput({ label, value, onChange, min = 0, max = 10, lowLabel, highLabel, color = "#2A8A84", step = 1 }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontFamily: FONTS, fontSize: 13, fontWeight: 500, color: "#4A4A4A" }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 600, color, background: `${color}15`, padding: "1px 8px", borderRadius: 4 }}>{value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", height: 6, borderRadius: 3, appearance: "none", background: `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, #E2E7EA ${pct}%, #E2E7EA 100%)`, outline: "none", cursor: "pointer" }} />
      {(lowLabel || highLabel) && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
          <span style={{ fontFamily: FONTS, fontSize: 11, color: "#999" }}>{lowLabel}</span>
          <span style={{ fontFamily: FONTS, fontSize: 11, color: "#999" }}>{highLabel}</span>
        </div>
      )}
    </div>
  );
}

function MiniBar({ value, max = 30, color = "#2A8A84", height = 20 }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ width: "100%", height, background: "#F0EDED", borderRadius: 4, overflow: "hidden", position: "relative" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.5s ease" }} />
      <span style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", fontFamily: MONO, fontSize: 11, fontWeight: 600, color: "#4A4A4A" }}>{value.toFixed(1)}</span>
    </div>
  );
}

function Chip({ label, selected, onClick, color = "#2A8A84" }) {
  return (
    <button onClick={onClick} style={{
      fontFamily: FONTS, fontSize: 13, fontWeight: 500, padding: "8px 16px", borderRadius: 20,
      border: selected ? `2px solid ${color}` : "1.5px solid #DDD",
      background: selected ? `${color}12` : "#FFF", color: selected ? color : "#666",
      cursor: "pointer", transition: "all 0.2s"
    }}>{label}</button>
  );
}

function RecoveryEntry({ activity, onUpdate, onRemove }) {
  return (
    <div style={{ background: "#F2F9F8", border: "1px solid #C0DDD9", borderRadius: 8, padding: 14, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <select value={activity.type} onChange={e => onUpdate({ ...activity, type: e.target.value })}
          style={{ fontFamily: FONTS, fontSize: 13, padding: "6px 10px", border: "1px solid #C0DDD9", borderRadius: 6, background: "#FFF", color: "#4A4A4A", outline: "none", flex: 1, marginRight: 8 }}>
          {RECOVERY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={onRemove} style={{ background: "none", border: "none", color: "#B5534A", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "2px 6px" }}>×</button>
      </div>
      <div>
        <label style={{ fontFamily: FONTS, fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Duration (min)</label>
        <input type="number" min={0} max={120} value={activity.duration}
          onChange={e => onUpdate({ ...activity, duration: parseInt(e.target.value) || 0 })}
          style={{ width: 100, fontFamily: MONO, fontSize: 14, padding: "6px 10px", border: "1px solid #C0DDD9", borderRadius: 6, background: "#FFF", color: "#4A4A4A", outline: "none", boxSizing: "border-box" }} />
      </div>
    </div>
  );
}

function ExerciseEntry({ exercise, onUpdate, onRemove }) {
  return (
    <div style={{ background: "#F5F8F9", border: "1px solid #E2E7EA", borderRadius: 8, padding: 14, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <select value={exercise.type} onChange={e => onUpdate({ ...exercise, type: e.target.value })}
          style={{ fontFamily: FONTS, fontSize: 13, padding: "6px 10px", border: "1px solid #DDD", borderRadius: 6, background: "#FFF", color: "#4A4A4A", outline: "none", flex: 1, marginRight: 8 }}>
          {EXERCISE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={onRemove} style={{ background: "none", border: "none", color: "#B5534A", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "2px 6px" }}>×</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={{ fontFamily: FONTS, fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Duration (min)</label>
          <input type="number" min={0} max={300} value={exercise.duration}
            onChange={e => onUpdate({ ...exercise, duration: parseInt(e.target.value) || 0 })}
            style={{ width: "100%", fontFamily: MONO, fontSize: 14, padding: "6px 10px", border: "1px solid #DDD", borderRadius: 6, background: "#FFF", color: "#4A4A4A", outline: "none", boxSizing: "border-box" }} />
        </div>
        <div>
          <label style={{ fontFamily: FONTS, fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>RPE (1-10)</label>
          <input type="number" min={1} max={10} value={exercise.rpe}
            onChange={e => onUpdate({ ...exercise, rpe: clamp(parseInt(e.target.value) || 1, 1, 10) })}
            style={{ width: "100%", fontFamily: MONO, fontSize: 14, padding: "6px 10px", border: "1px solid #DDD", borderRadius: 6, background: "#FFF", color: "#4A4A4A", outline: "none", boxSizing: "border-box" }} />
        </div>
      </div>
    </div>
  );
}

function WeekChart({ entries }) {
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
            <span style={{ fontFamily: FONTS, fontSize: 10, color: isToday ? "#4A4A4A" : "#AAA", fontWeight: isToday ? 700 : 400, marginTop: 2 }}>{shortDay(d)}</span>
          </div>
        );
      })}
    </div>
  );
}

function SymptomChart({ entries }) {
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
        {points.map((p, i) => <text key={i} x={px + (i / 6) * (w - px * 2)} y={h + 14} textAnchor="middle" fontSize="8" fill="#AAA" fontFamily={FONTS}>{p.day}</text>)}
        {[0, 5, 10].map(v => <line key={v} x1={px} x2={w - px} y1={h - 4 - (v / 10) * (h - 12)} y2={h - 4 - (v / 10) * (h - 12)} stroke="#F0EDED" strokeWidth={0.5} />)}
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

// Card + label styles used everywhere
const cardStyle = { background: "#FFFFFF", border: "1px solid #E5EAED", borderRadius: 12, padding: 18, marginBottom: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" };
const sectionLabel = { fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8F979D", marginBottom: 10, display: "block" };
const pageStyle = { minHeight: "100vh", background: "#F7F9FA", fontFamily: FONTS, color: "#4A4A4A", maxWidth: 480, margin: "0 auto", padding: "0 16px 100px" };

// ═══════════════════════════════════════════════════════════════════════
//  ONBOARDING (unchanged logic, condensed)
// ═══════════════════════════════════════════════════════════════════════
function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    conditions: [], stability: "stable", sessionsPerWeek: 3, avgDuration: 40, avgRPE: 5,
    exerciseTypes: ["Gym — Strength"], typicalSleep: 7, typicalSleepQuality: 6,
    typicalWork: 5, typicalStress: 5, typicalPain: 3, typicalFatigue: 3, typicalBrainFog: 2
  });
  const u = (k, v) => setData(p => ({ ...p, [k]: v }));
  const toggleList = (k, id) => setData(p => ({ ...p, [k]: p[k].includes(id) ? p[k].filter(c => c !== id) : [...p[k], id] }));

  const steps = [
    () => (
      <>
        <div style={{ paddingTop: 60, paddingBottom: 20, textAlign: "center" }}>
          <h1 style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 500, color: "#1C2E33", margin: 0 }}>SteadyState</h1>
          <p style={{ fontSize: 14, color: "#888", margin: "8px 0 0", lineHeight: 1.6 }}>
            Track training load, life stress and symptoms<br />in one place. Know when to push and when to ease off.
          </p>
        </div>
        <div style={{ ...cardStyle, marginTop: 12 }}>
          <p style={{ fontSize: 14, lineHeight: 1.65, color: "#555", margin: 0 }}>Most fitness apps push you to do more. Most pacing apps assume you can barely function. This sits in between — for people who train but need to manage their total load to stay well. We'll take a couple of minutes to understand your typical patterns so the monitoring works from day one.</p>
        </div>
        <div style={{ textAlign: "center", marginTop: 8 }}><p style={{ fontFamily: MONO, fontSize: 11, color: "#8F979D" }}>About 2 minutes</p></div>
      </>
    ),
    () => (
      <>
        <div style={{ paddingTop: 32, paddingBottom: 8 }}>
          <span style={sectionLabel}>Step 1 of 4</span>
          <h2 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, color: "#1C2E33", margin: "4px 0 0" }}>About your condition</h2>
        </div>
        <div style={cardStyle}>
          <span style={sectionLabel}>What are you managing?</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{CONDITIONS.map(c => <Chip key={c.id} label={c.label} selected={data.conditions.includes(c.id)} onClick={() => toggleList("conditions", c.id)} />)}</div>
        </div>
        <div style={cardStyle}>
          <span style={sectionLabel}>Over the past month, have your symptoms been...</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { id: "stable", label: "Roughly stable", desc: "Normal ups and downs" },
              { id: "better", label: "Better than usual", desc: "A good patch — less symptoms than typical" },
              { id: "worse", label: "Worse than usual", desc: "Flaring or more limited than your norm" }
            ].map(opt => (
              <button key={opt.id} onClick={() => u("stability", opt.id)} style={{
                display: "flex", flexDirection: "column", alignItems: "flex-start", padding: "12px 16px", borderRadius: 10,
                border: data.stability === opt.id ? "2px solid #2A8A84" : "1.5px solid #E2E7EA",
                background: data.stability === opt.id ? "#2A8A8408" : "#FFF", textAlign: "left", cursor: "pointer"
              }}>
                <span style={{ fontFamily: FONTS, fontSize: 14, fontWeight: 600, color: "#1C2E33" }}>{opt.label}</span>
                <span style={{ fontFamily: FONTS, fontSize: 12, color: "#888", marginTop: 2 }}>{opt.desc}</span>
              </button>
            ))}
          </div>
          {data.stability === "worse" && (
            <div style={{ marginTop: 12, padding: "10px 14px", background: "#C4953A10", border: "1px solid #C4953A30", borderRadius: 8 }}>
              <p style={{ fontSize: 12, color: "#8A7033", margin: 0, lineHeight: 1.5 }}>We'll set your baseline to reflect your <em>typical</em> capacity — not where you are right now. You may start in the underdoing zone. That's expected. It gives you a realistic target to build back to.</p>
            </div>
          )}
        </div>
      </>
    ),
    () => (
      <>
        <div style={{ paddingTop: 32, paddingBottom: 8 }}>
          <span style={sectionLabel}>Step 2 of 4</span>
          <h2 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, color: "#1C2E33", margin: "4px 0 0" }}>Your typical training</h2>
          <p style={{ fontSize: 13, color: "#888", marginTop: 4 }}>Think about a normal week, not your best or worst.</p>
        </div>
        <div style={cardStyle}>
          <SliderInput label="Sessions per week" value={data.sessionsPerWeek} onChange={v => u("sessionsPerWeek", v)} min={0} max={7} lowLabel="None" highLabel="Daily" />
          <SliderInput label="Typical session length (min)" value={data.avgDuration} onChange={v => u("avgDuration", v)} min={10} max={120} step={5} lowLabel="10 min" highLabel="2 hours" />
          <SliderInput label="Typical effort (RPE)" value={data.avgRPE} onChange={v => u("avgRPE", v)} min={1} max={10} lowLabel="Easy" highLabel="Maximum" />
        </div>
        <div style={cardStyle}>
          <span style={sectionLabel}>What do you usually do?</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{EXERCISE_TYPES.map(t => <Chip key={t} label={t} selected={data.exerciseTypes.includes(t)} onClick={() => toggleList("exerciseTypes", t)} />)}</div>
        </div>
      </>
    ),
    () => (
      <>
        <div style={{ paddingTop: 32, paddingBottom: 8 }}>
          <span style={sectionLabel}>Step 3 of 4</span>
          <h2 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, color: "#1C2E33", margin: "4px 0 0" }}>Life load & symptoms</h2>
          <p style={{ fontSize: 13, color: "#888", marginTop: 4 }}>Your typical levels on an average day.</p>
        </div>
        <div style={cardStyle}>
          <span style={sectionLabel}>Sleep</span>
          <SliderInput label="Typical sleep hours" value={data.typicalSleep} onChange={v => u("typicalSleep", v)} min={4} max={11} step={0.5} lowLabel="4h" highLabel="11h" />
          <SliderInput label="Typical sleep quality" value={data.typicalSleepQuality} onChange={v => u("typicalSleepQuality", v)} lowLabel="Poor" highLabel="Restorative" />
        </div>
        <div style={cardStyle}>
          <span style={sectionLabel}>Work & stress</span>
          <SliderInput label="Typical work intensity" value={data.typicalWork} onChange={v => u("typicalWork", v)} lowLabel="Light" highLabel="Demanding" color="#C4953A" />
          <SliderInput label="Typical stress level" value={data.typicalStress} onChange={v => u("typicalStress", v)} lowLabel="Calm" highLabel="High" color="#C4953A" />
        </div>
        <div style={cardStyle}>
          <span style={sectionLabel}>Typical symptom levels</span>
          <SliderInput label="Pain" value={data.typicalPain} onChange={v => u("typicalPain", v)} lowLabel="None" highLabel="Severe" color="#B5534A" />
          <SliderInput label="Fatigue" value={data.typicalFatigue} onChange={v => u("typicalFatigue", v)} lowLabel="Energised" highLabel="Exhausted" color="#B5534A" />
          <SliderInput label="Brain fog" value={data.typicalBrainFog} onChange={v => u("typicalBrainFog", v)} lowLabel="Clear" highLabel="Dense" color="#B5534A" />
        </div>
      </>
    ),
    () => {
      const se = generateSyntheticBaseline(data);
      const sc = Object.values(se).reduce((s, e) => s + calcTotalLoad(e), 0) / 28;
      return (
        <>
          <div style={{ paddingTop: 32, paddingBottom: 8 }}>
            <span style={sectionLabel}>Step 4 of 4</span>
            <h2 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, color: "#1C2E33", margin: "4px 0 0" }}>Your baseline</h2>
          </div>
          <div style={cardStyle}>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "#555", margin: "0 0 16px" }}>Based on what you've told us, here's your estimated daily load profile:</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div style={{ background: "#F0F5F6", borderRadius: 8, padding: 12, textAlign: "center" }}>
                <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600, color: "#2A8A84" }}>{sc.toFixed(1)}</div>
                <div style={{ fontSize: 11, color: "#8F979D", marginTop: 2 }}>Avg daily load</div>
              </div>
              <div style={{ background: "#F0F5F6", borderRadius: 8, padding: 12, textAlign: "center" }}>
                <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600 }}>{data.sessionsPerWeek}</div>
                <div style={{ fontSize: 11, color: "#8F979D", marginTop: 2 }}>Sessions / week</div>
              </div>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.55, color: "#777", margin: 0 }}>We've seeded 28 days of estimated data so your acute:chronic ratio works immediately. As you log real days, synthetic data will naturally age out.</p>
          </div>
        </>
      );
    }
  ];

  return (
    <div style={{ ...pageStyle, padding: "0 20px 120px" }}>
      <FontLoader />
      {steps[step]()}
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        {step > 0 && <button onClick={() => setStep(s => s - 1)} style={{ flex: 1, padding: "13px 0", borderRadius: 10, border: "1px solid #E2E7EA", background: "#FFF", color: "#4A4A4A", fontFamily: FONTS, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Back</button>}
        <button onClick={() => step < steps.length - 1 ? setStep(s => s + 1) : onComplete(data)} style={{ flex: step === 0 ? 1 : 2, padding: "13px 0", borderRadius: 10, border: "none", background: "#1C2E33", color: "#F7F9FA", fontFamily: FONTS, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          {step === 0 ? "Get started" : step === steps.length - 1 ? "Start tracking" : "Continue"}
        </button>
      </div>
      <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 16 }}>
        {steps.map((_, i) => <div key={i} style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 3, background: i <= step ? "#1C2E33" : "#DDD", transition: "all 0.3s" }} />)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════════════════════════════════
export default function SteadyState() {
  const [appData, setAppData] = useState(null);
  const [view, setView] = useState("dashboard");
  const [selectedDate, setSelectedDate] = useState(today());
  const [currentEntry, setCurrentEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [summaryWeek, setSummaryWeek] = useState("current");

  useEffect(() => {
    (async () => {
      try {
        const result = await window.storage.get(STORAGE_KEY);
        if (result?.value) setAppData(JSON.parse(result.value));
      } catch (e) {}
      setLoading(false);
    })();
  }, []);

  const saveData = useCallback(async (newData) => {
    setAppData(newData);
    setSaving(true);
    try { await window.storage.set(STORAGE_KEY, JSON.stringify(newData)); } catch (e) {}
    setSaving(false);
  }, []);

  const handleOnboardingComplete = useCallback(async (oData) => {
    await saveData({ onboarding: { ...oData, completed: true }, entries: generateSyntheticBaseline(oData) });
    setView("dashboard");
  }, [saveData]);

  const entries = appData?.entries || {};

  const startMorningLog = useCallback((date) => {
    setSelectedDate(date);
    const ex = entries[date]?.morning;
    setCurrentEntry({ type: "morning", sleepQuality: ex?.sleepQuality ?? 5, sleepHours: ex?.sleepHours ?? 7, painLevel: ex?.painLevel ?? 3, fatigueLevel: ex?.fatigueLevel ?? 3 });
    setView("log");
  }, [entries]);

  const startEveningLog = useCallback((date) => {
    setSelectedDate(date);
    const ex = entries[date]?.evening;
    setCurrentEntry({ type: "evening", workIntensity: ex?.workIntensity ?? 5, stressLevel: ex?.stressLevel ?? 5, brainFog: ex?.brainFog ?? 2, mood: ex?.mood ?? 5, exercises: ex?.exercises ?? [], recovery: ex?.recovery ?? [], notes: ex?.notes ?? "" });
    setView("log");
  }, [entries]);

  const saveLog = useCallback(async () => {
    const existing = entries[selectedDate] || {};
    const updated = currentEntry.type === "morning"
      ? { ...existing, synthetic: false, morning: { sleepQuality: currentEntry.sleepQuality, sleepHours: currentEntry.sleepHours, painLevel: currentEntry.painLevel, fatigueLevel: currentEntry.fatigueLevel, timestamp: new Date().toISOString() } }
      : { ...existing, synthetic: false, evening: { workIntensity: currentEntry.workIntensity, stressLevel: currentEntry.stressLevel, brainFog: currentEntry.brainFog, mood: currentEntry.mood, exercises: currentEntry.exercises, recovery: currentEntry.recovery, notes: currentEntry.notes, timestamp: new Date().toISOString() } };
    await saveData({ ...appData, entries: { ...entries, [selectedDate]: updated } });
    setView("dashboard");
  }, [appData, entries, selectedDate, currentEntry, saveData]);

  const signal = useMemo(() => getDailySignal(entries), [entries]);
  const todayEntry = entries[today()];
  const todayMerged = mergeEntry(todayEntry);
  const todayTraining = calcTrainingLoad(todayMerged);
  const todayLife = calcLifeLoad(todayMerged);
  const todayRecovery = calcRecoveryCredit(todayMerged);
  const todayLoad = Math.max(0, todayTraining + todayLife - todayRecovery);
  const hasMorning = !!todayEntry?.morning;
  const hasEvening = !!todayEntry?.evening;

  const streak = useMemo(() => {
    let s = 0; const d = new Date();
    while (entries[d.toISOString().slice(0, 10)] && !entries[d.toISOString().slice(0, 10)].synthetic) { s++; d.setDate(d.getDate() - 1); }
    return s;
  }, [entries]);
  const realDays = useMemo(() => Object.values(entries).filter(e => !e.synthetic).length, [entries]);

  const weekDays = summaryWeek === "current" ? getCurrentWeekDays() : getPreviousWeekDays();
  const weekSummary = useMemo(() => calcWeekSummary(entries, weekDays), [entries, weekDays]);

  if (loading) return <div style={{ ...pageStyle, display: "flex", alignItems: "center", justifyContent: "center" }}><FontLoader />Loading...</div>;
  if (!appData?.onboarding?.completed) return <Onboarding onComplete={handleOnboardingComplete} />;

  // ═══════════════════════════════════════════════════════════════════
  //  DASHBOARD
  // ═══════════════════════════════════════════════════════════════════
  if (view === "dashboard") {
    return (
      <div style={pageStyle}>
        <FontLoader />
        <div style={{ paddingTop: 24, paddingBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h1 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 500, color: "#1C2E33", margin: 0 }}>SteadyState</h1>
              <p style={{ fontSize: 12, color: "#8F979D", margin: "2px 0 0" }}>{dayLabel(today())}{saving && " · Saving..."}</p>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              <button onClick={() => setView("summary")} style={{ fontFamily: FONTS, fontSize: 12, fontWeight: 500, padding: "6px 12px", borderRadius: 8, border: "1px solid #E2E7EA", background: "#FFF", color: "#4A4A4A", cursor: "pointer" }}>Week</button>
              <button onClick={() => setView("history")} style={{ fontFamily: FONTS, fontSize: 12, fontWeight: 500, padding: "6px 12px", borderRadius: 8, border: "1px solid #E2E7EA", background: "#FFF", color: "#4A4A4A", cursor: "pointer" }}>History</button>
            </div>
          </div>
        </div>

        {/* ── UNIFIED DAILY SIGNAL ── */}
        <div style={{ ...cardStyle, background: signal.bg, border: `1px solid ${signal.color}25`, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${signal.color}18`, border: `2px solid ${signal.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{signal.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: signal.color, letterSpacing: "0.08em", textTransform: "uppercase" }}>{signal.zone}</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#1C2E33", marginTop: 1 }}>{signal.label}</div>
            </div>
            {signal.readiness && (
              <div style={{ textAlign: "center", flexShrink: 0 }}>
                <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 600, color: signal.readiness.score >= 7 ? "#2A8A84" : signal.readiness.score >= 4 ? "#C4953A" : "#B5534A", lineHeight: 1 }}>{signal.readiness.score}</div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: "#8F979D", letterSpacing: "0.05em" }}>READY</div>
              </div>
            )}
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.55, color: "#5A5A5A", margin: 0 }}>{signal.advice}</p>
          {signal.readinessModifier && (
            <p style={{ fontSize: 12, lineHeight: 1.5, color: signal.color, margin: "8px 0 0", padding: "8px 12px", background: `${signal.color}08`, borderRadius: 6 }}>{signal.readinessModifier}</p>
          )}
        </div>

        {/* ACWR */}
        <div style={cardStyle}>
          <span style={sectionLabel}>Acute : Chronic Ratio</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
            <span style={{ fontFamily: MONO, fontSize: 32, fontWeight: 600, color: signal.color, lineHeight: 1 }}>{signal.acr.ratio.toFixed(2)}</span>
            <span style={{ fontSize: 12, color: "#8F979D" }}>target 0.80 – 1.15</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><span style={{ fontSize: 11, color: "#888" }}>7-day avg</span><div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 600, marginTop: 2 }}>{signal.acr.acute.toFixed(1)}</div></div>
            <div><span style={{ fontSize: 11, color: "#888" }}>28-day avg</span><div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 600, marginTop: 2 }}>{signal.acr.chronic.toFixed(1)}</div></div>
          </div>
        </div>

        {/* Today's load */}
        <div style={cardStyle}>
          <span style={sectionLabel}>Today's load</span>
          {(hasMorning || hasEvening) ? (
            <>
              <div style={{ marginBottom: 8 }}><div style={{ fontSize: 12, color: "#2A8A84", marginBottom: 4 }}>Training</div><MiniBar value={todayTraining} max={Math.max(30, (todayTraining + todayLife) * 1.3)} color="#2A8A84" /></div>
              <div style={{ marginBottom: 8 }}><div style={{ fontSize: 12, color: "#C4953A", marginBottom: 4 }}>Life</div><MiniBar value={todayLife} max={Math.max(30, (todayTraining + todayLife) * 1.3)} color="#C4953A" /></div>
              {todayRecovery > 0 && (
                <div style={{ marginBottom: 8 }}><div style={{ fontSize: 12, color: "#2A8A84", marginBottom: 4 }}>Recovery credit</div>
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
          ) : <p style={{ fontSize: 13, color: "#8F979D", margin: 0 }}>No check-in yet today.</p>}
        </div>

        {/* 7-day chart */}
        <div style={cardStyle}>
          <span style={sectionLabel}>7-day load</span>
          <div style={{ display: "flex", gap: 10, marginBottom: 6 }}>
            {[["Training", "#2A8A84"], ["Life", "#C4953A"]].map(([l, c]) => <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 8, background: c, borderRadius: 2 }} /><span style={{ fontSize: 10, color: "#888" }}>{l}</span></div>)}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 4, background: "#D8CCAA", borderRadius: 2, opacity: 0.5 }} /><span style={{ fontSize: 10, color: "#888" }}>Estimated</span></div>
          </div>
          <WeekChart entries={entries} />
        </div>

        {/* Symptoms */}
        <div style={cardStyle}>
          <span style={sectionLabel}>Symptom trends — 7 days</span>
          <SymptomChart entries={entries} />
        </div>

        {/* Stats */}
        {realDays > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div style={{ ...cardStyle, textAlign: "center", marginBottom: 0 }}><div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 600 }}>{realDays}</div><div style={{ fontSize: 11, color: "#8F979D" }}>Days logged</div></div>
            <div style={{ ...cardStyle, textAlign: "center", marginBottom: 0 }}><div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 600 }}>{streak}</div><div style={{ fontSize: 11, color: "#8F979D" }}>Day streak</div></div>
          </div>
        )}

        {/* Check-in buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={() => startMorningLog(today())} style={{
            width: "100%", padding: "14px 0", borderRadius: 10,
            background: hasMorning ? "#FFF" : "#1C2E33", color: hasMorning ? "#4A4A4A" : "#F7F9FA",
            border: hasMorning ? "1px solid #E2E7EA" : "none", fontFamily: FONTS, fontSize: 14, fontWeight: 600, cursor: "pointer"
          }}>{hasMorning ? "Edit morning check-in" : "☀ Morning check-in"}</button>
          <button onClick={() => startEveningLog(today())} style={{
            width: "100%", padding: "14px 0", borderRadius: 10,
            background: hasEvening ? "#FFF" : (hasMorning ? "#1C2E33" : "#FFF"), color: hasEvening ? "#4A4A4A" : (hasMorning ? "#F7F9FA" : "#4A4A4A"),
            border: hasEvening ? "1px solid #E2E7EA" : (hasMorning ? "none" : "1px solid #E2E7EA"),
            fontFamily: FONTS, fontSize: 14, fontWeight: 600, cursor: "pointer"
          }}>{hasEvening ? "Edit evening log" : "☾ Evening log"}</button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  //  LOG VIEW
  // ═══════════════════════════════════════════════════════════════════
  if (view === "log" && currentEntry) {
    const isMorning = currentEntry.type === "morning";
    return (
      <div style={pageStyle}>
        <FontLoader />
        <div style={{ paddingTop: 24, paddingBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button onClick={() => setView("dashboard")} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: FONTS, fontSize: 13, color: "#8F979D", padding: 0 }}>← Back</button>
            <span style={{ fontFamily: MONO, fontSize: 11, color: "#8F979D" }}>{dayLabel(selectedDate)}</span>
          </div>
          <h2 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, color: "#1C2E33", margin: "10px 0 0" }}>{isMorning ? "Morning check-in" : "Evening log"}</h2>
          {isMorning && <p style={{ fontSize: 12, color: "#8F979D", margin: "4px 0 0" }}>Quick — under 30 seconds</p>}
        </div>

        {isMorning ? (
          <>
            <div style={cardStyle}>
              <span style={sectionLabel}>Last night's sleep</span>
              <SliderInput label="Sleep quality" value={currentEntry.sleepQuality} onChange={v => setCurrentEntry(p => ({ ...p, sleepQuality: v }))} lowLabel="Terrible" highLabel="Restorative" />
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#4A4A4A" }}>Sleep hours</span>
                  <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 600, color: "#2A8A84", background: "#2A8A8415", padding: "1px 8px", borderRadius: 4 }}>{currentEntry.sleepHours}h</span>
                </div>
                <input type="range" min={3} max={12} step={0.5} value={currentEntry.sleepHours}
                  onChange={e => setCurrentEntry(p => ({ ...p, sleepHours: parseFloat(e.target.value) }))}
                  style={{ width: "100%", height: 6, borderRadius: 3, appearance: "none", background: `linear-gradient(to right, #2A8A84 0%, #2A8A84 ${((currentEntry.sleepHours - 3) / 9) * 100}%, #E2E7EA ${((currentEntry.sleepHours - 3) / 9) * 100}%, #E2E7EA 100%)`, outline: "none", cursor: "pointer" }} />
              </div>
            </div>
            <div style={cardStyle}>
              <span style={sectionLabel}>How are you feeling right now?</span>
              <SliderInput label="Pain level" value={currentEntry.painLevel} onChange={v => setCurrentEntry(p => ({ ...p, painLevel: v }))} lowLabel="None" highLabel="Severe" color="#B5534A" />
              <SliderInput label="Fatigue" value={currentEntry.fatigueLevel} onChange={v => setCurrentEntry(p => ({ ...p, fatigueLevel: v }))} lowLabel="Energised" highLabel="Exhausted" color="#B5534A" />
            </div>
          </>
        ) : (
          <>
            <div style={cardStyle}>
              <span style={sectionLabel}>Work & stress today</span>
              <SliderInput label="Work intensity" value={currentEntry.workIntensity} onChange={v => setCurrentEntry(p => ({ ...p, workIntensity: v }))} lowLabel="Light" highLabel="Demanding" color="#C4953A" />
              <SliderInput label="Overall stress" value={currentEntry.stressLevel} onChange={v => setCurrentEntry(p => ({ ...p, stressLevel: v }))} lowLabel="Calm" highLabel="Overwhelmed" color="#C4953A" />
              <SliderInput label="Brain fog" value={currentEntry.brainFog} onChange={v => setCurrentEntry(p => ({ ...p, brainFog: v }))} lowLabel="Clear" highLabel="Dense" color="#5B8FB9" />
              <SliderInput label="Mood" value={currentEntry.mood} onChange={v => setCurrentEntry(p => ({ ...p, mood: v }))} lowLabel="Low" highLabel="Great" color="#5B8FB9" />
            </div>
            <div style={cardStyle}>
              <span style={sectionLabel}>Training</span>
              {currentEntry.exercises.map((ex, i) => (
                <ExerciseEntry key={i} exercise={ex}
                  onUpdate={u => { const exs = [...currentEntry.exercises]; exs[i] = u; setCurrentEntry(p => ({ ...p, exercises: exs })); }}
                  onRemove={() => setCurrentEntry(p => ({ ...p, exercises: p.exercises.filter((_, j) => j !== i) }))} />
              ))}
              <button onClick={() => setCurrentEntry(p => ({ ...p, exercises: [...p.exercises, { type: "Gym — Strength", duration: 30, rpe: 5 }] }))}
                style={{ width: "100%", padding: "10px 0", borderRadius: 8, border: "1px dashed #CBD3D7", background: "none", fontFamily: FONTS, fontSize: 13, fontWeight: 500, color: "#8F979D", cursor: "pointer" }}>+ Add exercise</button>
            </div>
            <div style={cardStyle}>
              <span style={sectionLabel}>Recovery</span>
              <p style={{ fontSize: 12, color: "#8F979D", margin: "0 0 12px", lineHeight: 1.5 }}>Restorative work reduces your overall load. Breathwork, gentle yoga, foam rolling — anything that genuinely helps you downregulate.</p>
              {currentEntry.recovery.map((r, i) => (
                <RecoveryEntry key={i} activity={r}
                  onUpdate={u => { const rs = [...currentEntry.recovery]; rs[i] = u; setCurrentEntry(p => ({ ...p, recovery: rs })); }}
                  onRemove={() => setCurrentEntry(p => ({ ...p, recovery: p.recovery.filter((_, j) => j !== i) }))} />
              ))}
              <button onClick={() => setCurrentEntry(p => ({ ...p, recovery: [...p.recovery, { type: "Breathwork", duration: 10 }] }))}
                style={{ width: "100%", padding: "10px 0", borderRadius: 8, border: "1px dashed #A3D5D1", background: "none", fontFamily: FONTS, fontSize: 13, fontWeight: 500, color: "#5BABA5", cursor: "pointer" }}>+ Add recovery activity</button>
              {currentEntry.recovery.length > 0 && (
                <div style={{ marginTop: 10, padding: "8px 12px", background: "#2A8A8408", borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#2A8A84" }}>Recovery credit</span>
                  <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 600, color: "#2A8A84" }}>
                    −{calcRecoveryCredit({ recovery: currentEntry.recovery }).toFixed(1)}
                  </span>
                </div>
              )}
            </div>
            <div style={cardStyle}>
              <span style={sectionLabel}>Notes</span>
              <textarea value={currentEntry.notes} onChange={e => setCurrentEntry(p => ({ ...p, notes: e.target.value }))}
                placeholder="Anything worth noting today..." rows={3}
                style={{ width: "100%", fontFamily: FONTS, fontSize: 13, padding: "10px 12px", border: "1px solid #E2E7EA", borderRadius: 8, background: "#F5F8F9", color: "#4A4A4A", outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.5 }} />
            </div>
          </>
        )}
        <button onClick={saveLog} style={{ width: "100%", padding: "14px 0", borderRadius: 10, background: "#1C2E33", color: "#F7F9FA", border: "none", fontFamily: FONTS, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 20 }}>
          {isMorning ? "Save & see readiness" : "Save evening log"}
        </button>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  //  WEEKLY SUMMARY
  // ═══════════════════════════════════════════════════════════════════
  if (view === "summary") {
    const ws = weekSummary;
    const start = dayLabel(weekDays[0]);
    const end = dayLabel(weekDays[6]);
    const exportText = generateWeekExport(ws, signal.acr);

    return (
      <div style={pageStyle}>
        <FontLoader />
        <div style={{ paddingTop: 24, paddingBottom: 12 }}>
          <button onClick={() => setView("dashboard")} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: FONTS, fontSize: 13, color: "#8F979D", padding: 0 }}>← Dashboard</button>
          <h2 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, color: "#1C2E33", margin: "10px 0 0" }}>Weekly summary</h2>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            {["current", "previous"].map(w => (
              <button key={w} onClick={() => setSummaryWeek(w)} style={{
                fontFamily: FONTS, fontSize: 12, fontWeight: 500, padding: "6px 14px", borderRadius: 20,
                border: summaryWeek === w ? "2px solid #2A8A84" : "1.5px solid #DDD",
                background: summaryWeek === w ? "#2A8A8412" : "#FFF", color: summaryWeek === w ? "#2A8A84" : "#666", cursor: "pointer"
              }}>{w === "current" ? "This week" : "Last week"}</button>
            ))}
          </div>
        </div>

        <div style={{ ...cardStyle, textAlign: "center", padding: 10 }}>
          <span style={{ fontFamily: MONO, fontSize: 11, color: "#8F979D" }}>{start} — {end}</span>
        </div>

        {ws.daysLogged === 0 ? (
          <div style={{ ...cardStyle, textAlign: "center" }}><p style={{ fontSize: 13, color: "#8F979D" }}>No data logged for this week yet.</p></div>
        ) : (
          <>
            {/* Load overview */}
            <div style={cardStyle}>
              <span style={sectionLabel}>Load overview</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center", marginBottom: 12 }}>
                <div><div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 600 }}>{ws.totalLoad.toFixed(0)}</div><div style={{ fontSize: 10, color: "#8F979D" }}>Net load</div></div>
                <div><div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 600, color: "#2A8A84" }}>{ws.totalTraining.toFixed(0)}</div><div style={{ fontSize: 10, color: "#8F979D" }}>Training</div></div>
                <div><div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 600, color: "#C4953A" }}>{ws.totalLife.toFixed(0)}</div><div style={{ fontSize: 10, color: "#8F979D" }}>Life</div></div>
              </div>
              {ws.totalRecovery > 0 && (
                <div style={{ textAlign: "center", marginBottom: 12, padding: "8px 0", background: "#2A8A8408", borderRadius: 8 }}>
                  <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 600, color: "#2A8A84" }}>−{ws.totalRecovery.toFixed(1)}</span>
                  <span style={{ fontSize: 11, color: "#2A8A84", marginLeft: 6 }}>recovery credit this week</span>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, textAlign: "center" }}>
                <div style={{ background: "#F0F5F6", borderRadius: 8, padding: 10 }}><div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 600 }}>{ws.avgDailyLoad.toFixed(1)}</div><div style={{ fontSize: 10, color: "#8F979D" }}>Avg daily load</div></div>
                <div style={{ background: "#F0F5F6", borderRadius: 8, padding: 10 }}><div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 600 }}>{ws.sessions}</div><div style={{ fontSize: 10, color: "#8F979D" }}>Sessions</div></div>
              </div>
            </div>

            {/* Symptoms */}
            <div style={cardStyle}>
              <span style={sectionLabel}>Average symptoms</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center" }}>
                <div><div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 600, color: "#B5534A" }}>{ws.avgPain.toFixed(1)}</div><div style={{ fontSize: 10, color: "#8F979D" }}>Pain</div></div>
                <div><div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 600, color: "#C4953A" }}>{ws.avgFatigue.toFixed(1)}</div><div style={{ fontSize: 10, color: "#8F979D" }}>Fatigue</div></div>
                <div><div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 600, color: "#5B8FB9" }}>{ws.avgFog.toFixed(1)}</div><div style={{ fontSize: 10, color: "#8F979D" }}>Brain fog</div></div>
              </div>
            </div>

            {/* Sleep */}
            <div style={cardStyle}>
              <span style={sectionLabel}>Sleep</span>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 600 }}>{ws.avgSleep.toFixed(1)}<span style={{ fontSize: 12, color: "#8F979D" }}>/10</span></div>
                <div style={{ fontSize: 11, color: "#8F979D", marginTop: 2 }}>Average quality</div>
              </div>
            </div>

            {/* ACWR context */}
            <div style={cardStyle}>
              <span style={sectionLabel}>Load ratio</span>
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

  // ═══════════════════════════════════════════════════════════════════
  //  HISTORY
  // ═══════════════════════════════════════════════════════════════════
  if (view === "history") {
    const sorted = Object.keys(entries).filter(k => !entries[k].synthetic).sort((a, b) => b.localeCompare(a));
    return (
      <div style={pageStyle}>
        <FontLoader />
        <div style={{ paddingTop: 24, paddingBottom: 12 }}>
          <button onClick={() => setView("dashboard")} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: FONTS, fontSize: 13, color: "#8F979D", padding: 0 }}>← Dashboard</button>
          <h2 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, color: "#1C2E33", margin: "10px 0 0" }}>History</h2>
        </div>
        {sorted.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: "center" }}><p style={{ fontSize: 13, color: "#8F979D" }}>No entries yet.</p></div>
        ) : sorted.map(date => {
          const e = entries[date]; const m = mergeEntry(e);
          const training = calcTrainingLoad(m); const life = calcLifeLoad(m); const total = training + life;
          const rd = calcReadiness(entries, date);
          return (
            <div key={date} style={{ ...cardStyle, cursor: "pointer" }} onClick={() => startMorningLog(date)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#1C2E33" }}>{dayLabel(date)}</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {rd && <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: rd.score >= 7 ? "#2A8A84" : rd.score >= 4 ? "#C4953A" : "#B5534A" }}>R:{rd.score}</span>}
                  <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600 }}>{total.toFixed(1)}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#888" }}>
                <span style={{ color: "#2A8A84" }}>Train {training.toFixed(1)}</span>
                <span style={{ color: "#C4953A" }}>Life {life.toFixed(1)}</span>
                <span style={{ color: "#B5534A" }}>Sx {calcSymptomScore(e).toFixed(1)}</span>
                <span>{e.morning ? "☀" : ""}{e.evening ? " ☾" : ""}</span>
              </div>
              {m.exercises?.length > 0 && <div style={{ marginTop: 5, fontSize: 11, color: "#8F979D" }}>{m.exercises.map(e => e.type).join(" · ")}</div>}
              {m.recovery?.length > 0 && <div style={{ marginTop: 3, fontSize: 11, color: "#5BABA5" }}>Recovery: {m.recovery.map(r => r.type).join(" · ")}</div>}
            </div>
          );
        })}
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <button onClick={async () => {
            if (confirm("Reset all data and restart onboarding?")) {
              try { await window.storage.delete(STORAGE_KEY); } catch (e) {}
              setAppData(null); setView("dashboard");
            }
          }} style={{ background: "none", border: "none", fontFamily: FONTS, fontSize: 12, color: "#C9C4BD", cursor: "pointer", textDecoration: "underline" }}>Reset all data</button>
        </div>
      </div>
    );
  }
  return null;
}
