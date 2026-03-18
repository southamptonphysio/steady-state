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

// nDaysAgo returns days in chronological order (oldest first — required for EWMA)
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
// Handles both old flat format (painLevel/fatigueLevel/brainFog/workIntensity/stressLevel)
// and new nested format (symptoms obj, mentalDemand/emotionalLoad/physicalDemand).
export function mergeEntry(entry) {
  if (!entry) return null;
  const morning = entry.morning || {};
  const evening = entry.evening || {};

  // Normalise morning symptoms: new format is morning.symptoms{id: val},
  // old format is morning.painLevel + morning.fatigueLevel + evening.brainFog
  let morningSymptoms = morning.symptoms ?? null;
  if (!morningSymptoms && (morning.painLevel !== undefined || morning.fatigueLevel !== undefined)) {
    morningSymptoms = {
      pain: morning.painLevel ?? 0,
      fatigue: morning.fatigueLevel ?? 0,
      brain_fog: evening.brainFog ?? 0   // brainFog was stored in evening in old format
    };
  }

  const eveningSymptoms = evening.symptoms ?? null;

  // Normalise life load: new format has mentalDemand/emotionalLoad/physicalDemand,
  // old format has workIntensity/stressLevel (brainFog already handled above)
  const mentalDemand  = evening.mentalDemand  ?? evening.workIntensity ?? 5;
  const emotionalLoad = evening.emotionalLoad ?? evening.stressLevel   ?? 5;
  const physicalDemand = evening.physicalDemand ?? 3; // default 3 for old entries

  return {
    sleepQuality: morning.sleepQuality ?? 5,
    sleepHours:   morning.sleepHours   ?? 7,
    prs:          morning.prs          ?? null,
    morningSymptoms,
    eveningSymptoms,
    // Life load (new names, backward-compat aliases)
    mentalDemand,
    emotionalLoad,
    physicalDemand,
    workIntensity: mentalDemand,   // alias for old consumers
    stressLevel:   emotionalLoad,  // alias for old consumers
    // Legacy flat symptom fields (for any code still referencing them directly)
    painLevel:    morningSymptoms?.pain      ?? 0,
    fatigueLevel: morningSymptoms?.fatigue   ?? 0,
    brainFog:     morningSymptoms?.brain_fog ?? 0,
    // Training / recovery
    exercises: evening.exercises ?? [],
    recovery:  evening.recovery  ?? [],
    mood:      evening.mood      ?? 5,
    notes:     evening.notes     ?? "",
    synthetic:  entry.synthetic || false,
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

// New formula: emotional × 1.0, mental × 0.8, physical × 0.6
// Handles both old (workIntensity/stressLevel) and new field names via mergeEntry.
export function calcLifeLoad(entry) {
  const m = (entry?.mentalDemand  !== undefined ||
             entry?.emotionalLoad !== undefined ||
             entry?.workIntensity !== undefined)
    ? entry : mergeEntry(entry);
  if (!m) return 0;
  const mental    = m.mentalDemand  ?? m.workIntensity ?? 5;
  const emotional = m.emotionalLoad ?? m.stressLevel   ?? 5;
  const physical  = m.physicalDemand ?? 3;
  return Math.max(0, (10 - (m.sleepQuality || 5)) * 1.5)
       + emotional  * 1.0
       + mental     * 0.8
       + physical   * 0.6;
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
    const base = Math.min(r.duration, 45) * 0.12;
    return sum + base;
  }, 0);
  return Math.min(5, raw);
}

// ── Symptom score ─────────────────────────────────────────────────────
// selectedSymptoms: optional array of symptom ids; falls back to old format.
export function calcSymptomScore(entry, selectedSymptoms) {
  const m = mergeEntry(entry);
  if (!m) return 0;
  if (m.morningSymptoms) {
    const ids = selectedSymptoms?.length > 0 ? selectedSymptoms : Object.keys(m.morningSymptoms);
    if (ids.length === 0) return 0;
    const vals = ids.map(id => m.morningSymptoms[id] ?? 0);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }
  // Old format fallback
  return ((m.painLevel || 0) + (m.fatigueLevel || 0) + (m.brainFog || 0)) / 3;
}

// ── Recent mean load for imputation ──────────────────────────────────
// Returns mean total load from real (non-synthetic) entries in the last `window` days.
// Used as imputed value for days with no entry in EWMA calculations.
export function calcRecentMeanLoad(entries, window = 14) {
  const dayList = nDaysAgo(window);
  const realLoads = dayList
    .map(d => entries[d])
    .filter(e => e && !e.synthetic)
    .map(e => calcTotalLoad(e));
  if (realLoads.length === 0) return 0;
  return realLoads.reduce((a, b) => a + b, 0) / realLoads.length;
}

// ── EWMA (Exponentially Weighted Moving Average) ──────────────────────
// Processes days oldest-first so recent days have highest weight.
// lambda = 2 / (N + 1): acute (7d) → 0.25, chronic (28d) → ~0.069
// imputedLoad: fallback for days with no entry (uses recent mean to avoid zero bias).
export function calcEWMA(entries, days, lambda, imputedLoad = 0) {
  const dayList = nDaysAgo(days);
  const getLoad = d => {
    const e = entries[d];
    return e ? calcTotalLoad(e) : imputedLoad;
  };
  let ewma = getLoad(dayList[0]);
  for (let i = 1; i < dayList.length; i++) {
    ewma = getLoad(dayList[i]) * lambda + ewma * (1 - lambda);
  }
  return ewma;
}

// ── ACWR (EWMA-based) ─────────────────────────────────────────────────
export function getAcuteChronicRatio(entries) {
  const acuteLambda   = 2 / (7  + 1);  // 0.25
  const chronicLambda = 2 / (28 + 1);  // ~0.069
  const imputed = calcRecentMeanLoad(entries, 14);
  const acute   = calcEWMA(entries, 7,  acuteLambda,  imputed);
  const chronic = calcEWMA(entries, 28, chronicLambda, imputed);
  if (chronic === 0) return { ratio: 1.0, acute, chronic };
  return { ratio: acute / chronic, acute, chronic };
}

// ── Readiness score ───────────────────────────────────────────────────
// Weights: sleep 20%, symptoms 25%, PRS 25%, load context 15%, trend 15%
export function calcReadiness(entries, dateStr, selectedSymptoms = ["pain", "fatigue", "brain_fog"]) {
  const todayEntry = entries[dateStr];
  if (!todayEntry?.morning) return null;
  const m = todayEntry.morning;

  // Sleep: 20%
  const sleepScore = ((m.sleepQuality || 5) / 10) * 20;

  // Symptoms: 25%
  let symptomAvg;
  if (m.symptoms) {
    const vals = selectedSymptoms.map(id => m.symptoms[id] ?? 5);
    symptomAvg = vals.reduce((a, b) => a + b, 0) / vals.length;
  } else {
    symptomAvg = ((m.painLevel || 0) + (m.fatigueLevel || 0)) / 2;
  }
  const symptomScore = ((10 - symptomAvg) / 10) * 25;

  // PRS: 25% — falls back to sleep quality estimate for old entries without PRS
  const effectivePrs = m.prs != null ? m.prs : (m.sleepQuality || 5);
  const prsScore = (effectivePrs / 10) * 25;

  // Yesterday's load vs chronic baseline: 15%
  const yesterday = new Date(dateStr + "T12:00:00");
  yesterday.setDate(yesterday.getDate() - 1);
  const yLoad = calcTotalLoad(entries[yesterday.toISOString().slice(0, 10)]);
  const chronic = calcEWMA(entries, 28, 2 / 29);
  const loadRatio = chronic > 0 ? clamp(1 - ((yLoad - chronic) / chronic), 0, 1) : 0.5;
  const loadScore = loadRatio * 15;

  // 3-day symptom trend: 15%
  const recent3 = [];
  for (let i = 1; i <= 3; i++) {
    const dd = new Date(dateStr + "T12:00:00");
    dd.setDate(dd.getDate() - i);
    const dayEntry = entries[dd.toISOString().slice(0, 10)];
    if (dayEntry?.morning) {
      const dm = dayEntry.morning;
      let avg;
      if (dm.symptoms) {
        const vals = selectedSymptoms.map(id => dm.symptoms[id] ?? 5);
        avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      } else {
        avg = ((dm.painLevel || 0) + (dm.fatigueLevel || 0)) / 2;
      }
      recent3.push(avg);
    }
  }
  const trendAvg = recent3.length > 0 ? recent3.reduce((a, b) => a + b, 0) / recent3.length : 5;
  const trendScore = ((10 - trendAvg) / 10) * 15;

  const total = clamp(Math.round(sleepScore + symptomScore + prsScore + loadScore + trendScore), 1, 100);
  return { score: clamp(Math.round(total / 10), 1, 10), total };
}

// ── PEM trigger detection (48–72 h lookback) ─────────────────────────
function checkPEMTrigger(entries, dateStr) {
  const chronic = calcEWMA(entries, 28, 2 / 29);
  const threshold = chronic * 1.3;
  for (let daysAgo = 2; daysAgo <= 3; daysAgo++) {
    const dd = new Date(dateStr + "T12:00:00");
    dd.setDate(dd.getDate() - daysAgo);
    const key = dd.toISOString().slice(0, 10);
    const load = calcTotalLoad(entries[key]);
    if (load > threshold) return { daysAgo, load, date: key };
  }
  return null;
}

// ── Data-driven zone advice ───────────────────────────────────────────
function getZoneAdvice(entries, zone, readiness, selectedSymptoms) {
  const chronic = calcEWMA(entries, 28, 2 / 29);

  // Count consecutive days that fall in roughly the same zone.
  // Uses daily load / chronic as a single-day proxy for ACWR zone (approximate).
  let consecutiveDaysInZone = 0;
  for (let i = 1; i <= 60; i++) {
    const dd = new Date();
    dd.setDate(dd.getDate() - i);
    const key = dd.toISOString().slice(0, 10);
    const entry = entries[key];
    if (!entry) break;
    const ratio = chronic > 0 ? calcTotalLoad(entry) / chronic : 1;
    const dayZone = ratio < 0.65 ? "UNDERDOING"
      : ratio <= 1.2 ? "STEADY STATE"
      : ratio <= 1.45 ? "AMBER"
      : "RED";
    if (dayZone === zone) consecutiveDaysInZone++;
    else break;
  }

  // Symptom trend: recent 3 days vs the 3 before that
  let symptomTrend = "stable";
  const recent = [], older = [];
  for (let i = 1; i <= 6; i++) {
    const dd = new Date();
    dd.setDate(dd.getDate() - i);
    const val = calcSymptomScore(entries[dd.toISOString().slice(0, 10)], selectedSymptoms);
    if (i <= 3) recent.push(val); else older.push(val);
  }
  if (recent.length >= 2 && older.length >= 2) {
    const rAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const oAvg = older.reduce((a, b) => a + b, 0) / older.length;
    if (rAvg > oAvg + 0.5) symptomTrend = "worsening";
    else if (rAvg < oAvg - 0.5) symptomTrend = "improving";
  }

  if (zone === "STEADY STATE") {
    if (consecutiveDaysInZone >= 14 && symptomTrend !== "worsening")
      return `You've been in the sweet spot for ${consecutiveDaysInZone} days and your symptoms have been ${symptomTrend}. Conditions are good to add around 10% this week if you want to progress.`;
    if (consecutiveDaysInZone >= 7 && symptomTrend === "stable")
      return `${consecutiveDaysInZone} days in the sweet spot with stable symptoms. Keep building consistency here — a few more days and you'll have a solid platform to progress from.`;
    if (symptomTrend === "worsening")
      return `Load is in the sweet spot but your symptoms are trending up over the past few days. Hold here — don't add load while symptoms are climbing, even if the ratio looks fine.`;
    return `Load is matching your capacity. Keep doing what you're doing.`;
  }
  if (zone === "UNDERDOING") {
    if (consecutiveDaysInZone >= 7)
      return `You've been below baseline for ${consecutiveDaysInZone} days. If symptoms allow, gradually bring activity back up — prolonged underloading increases sensitivity over time.`;
    if (symptomTrend === "improving")
      return `Below baseline but symptoms are improving. Your body may be recovering from a recent spike. When you feel ready, a moderate session would help rebuild your chronic load.`;
    return `You're below your established baseline. If you're feeling stable, get a session in — even a moderate one.`;
  }
  if (zone === "AMBER") {
    if (consecutiveDaysInZone >= 3)
      return `You've been above your rolling average for ${consecutiveDaysInZone} days now. Prioritise recovery — lighter sessions, more restorative activity, protect your sleep.`;
    return `Your recent load is running above your rolling average. Not necessarily a problem — but keep today lighter and see how symptoms respond over the next 24–48 hours.`;
  }
  if (zone === "RED") {
    if (consecutiveDaysInZone >= 2)
      return `You've been in the red for ${consecutiveDaysInZone} days. This is where flares start. Scale back to the minimum — gentle movement only. Focus on sleep and stress reduction until your ratio drops.`;
    return `You've spiked well above your chronic load. Scale back to maintenance only — gentle movement, sleep, stress management. The goal is getting back to baseline, not pushing through.`;
  }
  return `Load is matching your capacity. Keep doing what you're doing.`;
}

// ── Unified daily signal ──────────────────────────────────────────────
export function getDailySignal(entries, selectedSymptoms = ["pain", "fatigue", "brain_fog"]) {
  const acr = getAcuteChronicRatio(entries);
  const readiness = calcReadiness(entries, today(), selectedSymptoms);
  const todaySymptoms = calcSymptomScore(entries[today()], selectedSymptoms);

  let zone;
  if (acr.ratio < 0.8) {
    zone = "UNDERDOING";
  } else if (acr.ratio <= 1.15 && todaySymptoms <= 5) {
    zone = "STEADY STATE";
  } else if (acr.ratio <= 1.3) {
    zone = "AMBER";
  } else {
    zone = "RED";
  }

  const baseAdvice = getZoneAdvice(entries, zone, readiness, selectedSymptoms);

  // PEM lookback: check 48–72 h back when readiness is low
  let pemTrigger = null;
  if (readiness && readiness.score <= 4) {
    pemTrigger = checkPEMTrigger(entries, today());
  }

  // Build unified advice: merge zone advice + readiness modifier into one paragraph
  let advice = baseAdvice;
  if (pemTrigger) {
    const pemNote = pemTrigger.daysAgo === 2
      ? `Your readiness is low and you had a high-load day 2 days ago — this may be a delayed post-exertional response. If this is a pattern, plan lighter days 48 hours after bigger efforts.`
      : `Low readiness may be linked to elevated load 3 days ago. Post-exertional malaise typically peaks 24–72 hours after the triggering activity.`;
    advice = `${baseAdvice} ${pemNote}`;
  } else if (readiness) {
    if (readiness.score <= 3 && zone !== "RED") {
      advice = `${baseAdvice} Your readiness is low this morning — listen to your body regardless of load numbers. Lighter activity or rest today.`;
    } else if (readiness.score <= 5 && (zone === "STEADY STATE" || zone === "UNDERDOING")) {
      advice = `${baseAdvice} Readiness is moderate — you've got capacity on paper but your body is telling a different story. Take it easier today.`;
    } else if (readiness.score >= 8 && zone === "UNDERDOING") {
      advice = `${baseAdvice} You're feeling good and you're below baseline — today's a great day for a solid session.`;
    } else if (readiness.score >= 7 && zone === "STEADY STATE") {
      advice = `${baseAdvice} Feeling fresh and load is on track — good conditions to push slightly if you're looking to progress.`;
    }
  }

  const zoneStyles = {
    UNDERDOING:     { color: "#5B8FB9", bg: "rgba(91,143,185,0.06)",  icon: "↓", label: "Below baseline" },
    "STEADY STATE": { color: "#2A8A84", bg: "rgba(42,138,132,0.06)",  icon: "●", label: "In the sweet spot" },
    AMBER:          { color: "#C4953A", bg: "rgba(196,149,58,0.06)",  icon: "▲", label: "Approaching threshold" },
    RED:            { color: "#B5534A", bg: "rgba(181,83,74,0.06)",   icon: "⚠", label: "Flare risk — pull back" }
  };

  return { zone, acr, readiness, ...zoneStyles[zone], advice };
}

// ── Weekly summary ────────────────────────────────────────────────────
export function calcWeekSummary(entries, weekDays, selectedSymptoms = ["pain", "fatigue", "brain_fog"]) {
  let totalTraining = 0, totalLife = 0, totalRecovery = 0;
  let sessionsCount = 0, daysLogged = 0;
  let sleepSum = 0, sleepDays = 0;

  const symptomSums = Object.fromEntries(selectedSymptoms.map(id => [id, 0]));
  let symptomDays = 0;
  const deltaSums = Object.fromEntries(selectedSymptoms.map(id => [id, 0]));
  let deltaDays = 0;

  weekDays.forEach(d => {
    const e = entries[d];
    if (!e || e.synthetic) return;
    daysLogged++;
    const m = mergeEntry(e);
    totalTraining += calcTrainingLoad(m);
    totalLife += calcLifeLoad(m);
    totalRecovery += calcRecoveryCredit(m);
    if (m.sleepQuality) { sleepSum += m.sleepQuality; sleepDays++; }
    if (m.exercises) sessionsCount += m.exercises.length;

    // Morning symptom sums
    if (m.morningSymptoms) {
      selectedSymptoms.forEach(id => { symptomSums[id] += m.morningSymptoms[id] ?? 0; });
      symptomDays++;
      // Morning-to-evening delta
      if (m.eveningSymptoms) {
        selectedSymptoms.forEach(id => {
          deltaSums[id] += (m.eveningSymptoms[id] ?? 0) - (m.morningSymptoms[id] ?? 0);
        });
        deltaDays++;
      }
    }
  });

  const totalLoad = Math.max(0, totalTraining + totalLife - totalRecovery);
  const symptomAverages = Object.fromEntries(
    selectedSymptoms.map(id => [id, symptomDays > 0 ? symptomSums[id] / symptomDays : 0])
  );
  const deltaAverages = deltaDays > 0
    ? Object.fromEntries(selectedSymptoms.map(id => [id, deltaSums[id] / deltaDays]))
    : null;

  return {
    weekDays, daysLogged, totalLoad, totalTraining, totalLife, totalRecovery,
    avgSleep: sleepDays > 0 ? sleepSum / sleepDays : 0,
    sessions: sessionsCount,
    avgDailyLoad: daysLogged > 0 ? totalLoad / daysLogged : 0,
    symptomAverages,
    deltaAverages,
    // Legacy aliases so old call sites don't break
    avgPain:    symptomAverages.pain      ?? 0,
    avgFatigue: symptomAverages.fatigue   ?? 0,
    avgFog:     symptomAverages.brain_fog ?? 0,
    avgSymptoms: symptomDays > 0
      ? Object.values(symptomSums).reduce((a, b) => a + b, 0) / (symptomDays * selectedSymptoms.length)
      : 0
  };
}

export function generateWeekExport(summary, acr, selectedSymptoms = ["pain", "fatigue", "brain_fog"], symptomOptions = []) {
  const start = dayLabel(summary.weekDays[0]);
  const end   = dayLabel(summary.weekDays[6]);

  const getLabel = (id) => {
    const opt = symptomOptions.find(s => s.id === id);
    return opt ? opt.label : id;
  };

  const symptomLines = selectedSymptoms.map(id => {
    const avg = (summary.symptomAverages?.[id] ?? 0).toFixed(1);
    const delta = summary.deltaAverages?.[id];
    const deltaStr = delta != null
      ? `  (avg Δ ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}/day)`
      : "";
    return `  ${getLabel(id).padEnd(24)}${avg}${deltaStr}`;
  }).join("\n");

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

ACUTE:CHRONIC RATIO (EWMA)
  Current ratio:        ${acr.ratio.toFixed(2)}
  7-day EWMA (acute):   ${acr.acute.toFixed(1)}
  28-day EWMA (chronic):${acr.chronic.toFixed(1)}

SYMPTOMS (avg morning /10)
${symptomLines}

SLEEP
  Avg quality:          ${summary.avgSleep.toFixed(1)}/10

Days logged: ${summary.daysLogged}/7
`;
}
