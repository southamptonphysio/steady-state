import { clamp, vary } from "./calculations.js";

export function generateSyntheticBaseline(onboarding) {
  const entries = {};
  const stabilityMultiplier =
    onboarding.stability === "worse"  ? 1.25 :
    onboarding.stability === "better" ? 0.85 : 1.0;
  const sessionsPerWeek = onboarding.sessionsPerWeek || 3;
  const avgDuration     = onboarding.avgDuration     || 40;
  const avgRPE          = onboarding.avgRPE          || 5;
  const trainingDayMap  = [1, 3, 5, 0, 2, 4, 6];

  // Support new field names with fallbacks to old names
  const typicalMental    = onboarding.typicalMentalDemand   ?? onboarding.typicalWork   ?? 5;
  const typicalEmot      = onboarding.typicalEmotionalLoad  ?? onboarding.typicalStress ?? 5;
  const typicalPhysical  = onboarding.typicalPhysicalDemand ?? 3;
  const selectedSymptoms = onboarding.selectedSymptoms ?? ["pain", "fatigue", "brain_fog"];
  const typicalSymptoms  = onboarding.typicalSymptoms ?? {
    pain:      onboarding.typicalPain     ?? 3,
    fatigue:   onboarding.typicalFatigue  ?? 3,
    brain_fog: onboarding.typicalBrainFog ?? 2
  };

  const bp = (v) => Math.round(clamp(vary(v * stabilityMultiplier), 0, 10));

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

    const morningSymptoms = Object.fromEntries(
      selectedSymptoms.map(id => [id, bp(typicalSymptoms[id] ?? 3)])
    );

    entries[key] = {
      synthetic: true,
      morning: {
        sleepQuality: Math.round(clamp(vary(onboarding.typicalSleepQuality || 6), 1, 10)),
        sleepHours:   Math.round(clamp(vary(onboarding.typicalSleep || 7, 0.1), 4, 11) * 2) / 2,
        symptoms: morningSymptoms,
        prs: Math.round(clamp(vary(6, 0.2), 1, 10))
      },
      evening: {
        mentalDemand:   Math.round(clamp(vary(typicalMental),   1, 10)),
        emotionalLoad:  Math.round(clamp(vary(typicalEmot),     1, 10)),
        physicalDemand: Math.round(clamp(vary(typicalPhysical), 1, 10)),
        mood:           Math.round(clamp(vary(6, 0.2), 1, 10)),
        exercises,
        recovery: [],
        notes: ""
      }
    };
  }
  return entries;
}
