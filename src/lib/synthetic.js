import { clamp, vary } from "./calculations.js";

export function generateSyntheticBaseline(onboarding) {
  const entries = {};
  const stabilityMultiplier =
    onboarding.stability === "worse" ? 1.25 :
    onboarding.stability === "better" ? 0.85 : 1.0;
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
        exercises,
        notes: ""
      }
    };
  }
  return entries;
}
