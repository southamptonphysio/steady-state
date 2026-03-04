// ── Date helpers ──────────────────────────────────────────────────────
export const today = () => new Date().toISOString().slice(0, 10);

export const dayLabel = (iso) => {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
};

export const shortDay = (iso) => {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "short" });
};

export const fullDay = (iso) => {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
};

export const nDaysAgo = (n) => {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
};

export const last7Days = () => nDaysAgo(7);
export const last28Days = () => nDaysAgo(28);

export const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));
export const vary = (base, pct = 0.18) =>
  Math.round(clamp(base * (1 + (Math.random() * 2 - 1) * pct), 0, 10) * 10) / 10;

// ── Current week helpers ──────────────────────────────────────────────
export function getCurrentWeekDays() {
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

export function getPreviousWeekDays() {
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

// ── Entry normalisation ───────────────────────────────────────────────
export function mergeEntry(entry) {
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

// ── Load calculations ─────────────────────────────────────────────────
export function calcTrainingLoad(entry) {
  const m = entry?.exercises ? entry : mergeEntry(entry);
  if (!m || !m.exercises || m.exercises.length === 0) return 0;
  return m.exercises.reduce((sum, ex) => sum + (ex.duration * ex.rpe) / 10, 0);
}

export function calcLifeLoad(entry) {
  const m = entry?.workIntensity !== undefined ? entry : mergeEntry(entry);
  if (!m) return 0;
  return Math.max(0, (10 - (m.sleepQuality || 5)) * 1.5) + (m.stressLevel || 5) * 1.2 + (m.workIntensity || 5) * 1.0;
}

export function calcTotalLoad(entry) {
  const m = mergeEntry(entry);
  const recovery = calcRecoveryCredit(m);
  return Math.max(0, calcTrainingLoad(m) + calcLifeLoad(m) - recovery);
}

export function calcRecoveryCredit(entry) {
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

export function calcSymptomScore(entry) {
  const m = mergeEntry(entry);
  if (!m) return 0;
  return ((m.painLevel || 0) + (m.fatigueLevel || 0) + (m.brainFog || 0)) / 3;
}

export function getAcuteChronicRatio(entries) {
  const acuteAvg = last7Days().reduce((s, d) => s + calcTotalLoad(entries[d]), 0) / 7;
  const chronicAvg = last28Days().reduce((s, d) => s + calcTotalLoad(entries[d]), 0) / 28;
  if (chronicAvg === 0) return { ratio: 1.0, acute: acuteAvg, chronic: chronicAvg };
  return { ratio: acuteAvg / chronicAvg, acute: acuteAvg, chronic: chronicAvg };
}

// ── Readiness score ───────────────────────────────────────────────────
export function calcReadiness(entries, dateStr) {
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

// ── Unified daily signal ──────────────────────────────────────────────
export function getDailySignal(entries) {
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

// ── Weekly summary ────────────────────────────────────────────────────
export function calcWeekSummary(entries, weekDays) {
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

export function generateWeekExport(summary, acr) {
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
