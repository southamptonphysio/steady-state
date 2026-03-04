import { useState, useEffect, useCallback, useMemo } from "react";
import { storage } from "./lib/storage.js";
import { STORAGE_KEY, pageStyle } from "./lib/constants.js";
import {
  today, mergeEntry,
  calcTrainingLoad, calcLifeLoad, calcRecoveryCredit,
  getDailySignal, calcWeekSummary,
  getCurrentWeekDays, getPreviousWeekDays
} from "./lib/calculations.js";
import { generateSyntheticBaseline } from "./lib/synthetic.js";
import Onboarding from "./views/Onboarding.jsx";
import Dashboard from "./views/Dashboard.jsx";
import LogView from "./views/LogView.jsx";
import WeeklySummary from "./views/WeeklySummary.jsx";
import History from "./views/History.jsx";

export default function App() {
  const [appData, setAppData] = useState(null);
  const [view, setView] = useState("dashboard");
  const [selectedDate, setSelectedDate] = useState(today());
  const [currentEntry, setCurrentEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [summaryWeek, setSummaryWeek] = useState("current");

  useEffect(() => {
    const result = storage.get(STORAGE_KEY);
    if (result) setAppData(result);
    setLoading(false);
  }, []);

  const saveData = useCallback((newData) => {
    setAppData(newData);
    setSaving(true);
    storage.set(STORAGE_KEY, newData);
    setSaving(false);
  }, []);

  const handleOnboardingComplete = useCallback((oData) => {
    saveData({ onboarding: { ...oData, completed: true }, entries: generateSyntheticBaseline(oData) });
    setView("dashboard");
  }, [saveData]);

  const entries = appData?.entries || {};

  const startMorningLog = useCallback((date) => {
    setSelectedDate(date);
    const ex = entries[date]?.morning;
    setCurrentEntry({
      type: "morning",
      sleepQuality: ex?.sleepQuality ?? 5,
      sleepHours: ex?.sleepHours ?? 7,
      painLevel: ex?.painLevel ?? 3,
      fatigueLevel: ex?.fatigueLevel ?? 3
    });
    setView("log");
  }, [entries]);

  const startEveningLog = useCallback((date) => {
    setSelectedDate(date);
    const ex = entries[date]?.evening;
    setCurrentEntry({
      type: "evening",
      workIntensity: ex?.workIntensity ?? 5,
      stressLevel: ex?.stressLevel ?? 5,
      brainFog: ex?.brainFog ?? 2,
      mood: ex?.mood ?? 5,
      exercises: ex?.exercises ?? [],
      recovery: ex?.recovery ?? [],
      notes: ex?.notes ?? ""
    });
    setView("log");
  }, [entries]);

  const saveLog = useCallback(() => {
    const existing = entries[selectedDate] || {};
    const updated = currentEntry.type === "morning"
      ? {
          ...existing,
          synthetic: false,
          morning: {
            sleepQuality: currentEntry.sleepQuality,
            sleepHours: currentEntry.sleepHours,
            painLevel: currentEntry.painLevel,
            fatigueLevel: currentEntry.fatigueLevel,
            timestamp: new Date().toISOString()
          }
        }
      : {
          ...existing,
          synthetic: false,
          evening: {
            workIntensity: currentEntry.workIntensity,
            stressLevel: currentEntry.stressLevel,
            brainFog: currentEntry.brainFog,
            mood: currentEntry.mood,
            exercises: currentEntry.exercises,
            recovery: currentEntry.recovery,
            notes: currentEntry.notes,
            timestamp: new Date().toISOString()
          }
        };
    saveData({ ...appData, entries: { ...entries, [selectedDate]: updated } });
    setView("dashboard");
  }, [appData, entries, selectedDate, currentEntry, saveData]);

  const handleReset = useCallback(() => {
    if (confirm("Reset all data and restart onboarding?")) {
      storage.remove(STORAGE_KEY);
      setAppData(null);
      setView("dashboard");
    }
  }, []);

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
    let s = 0;
    const d = new Date();
    while (entries[d.toISOString().slice(0, 10)] && !entries[d.toISOString().slice(0, 10)].synthetic) {
      s++;
      d.setDate(d.getDate() - 1);
    }
    return s;
  }, [entries]);

  const realDays = useMemo(() => Object.values(entries).filter(e => !e.synthetic).length, [entries]);

  const weekDays = summaryWeek === "current" ? getCurrentWeekDays() : getPreviousWeekDays();
  const weekSummary = useMemo(() => calcWeekSummary(entries, weekDays), [entries, weekDays]);

  if (loading) {
    return <div style={{ ...pageStyle, display: "flex", alignItems: "center", justifyContent: "center" }}>Loading...</div>;
  }

  if (!appData?.onboarding?.completed) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  if (view === "log" && currentEntry) {
    return (
      <LogView
        currentEntry={currentEntry}
        setCurrentEntry={setCurrentEntry}
        selectedDate={selectedDate}
        onSave={saveLog}
        onBack={() => setView("dashboard")}
      />
    );
  }

  if (view === "summary") {
    return (
      <WeeklySummary
        weekSummary={weekSummary}
        weekDays={weekDays}
        signal={signal}
        summaryWeek={summaryWeek}
        setSummaryWeek={setSummaryWeek}
        onBack={() => setView("dashboard")}
      />
    );
  }

  if (view === "history") {
    return (
      <History
        entries={entries}
        onEditEntry={(date) => startMorningLog(date)}
        onReset={handleReset}
        onBack={() => setView("dashboard")}
      />
    );
  }

  return (
    <Dashboard
      entries={entries}
      signal={signal}
      saving={saving}
      hasMorning={hasMorning}
      hasEvening={hasEvening}
      todayTraining={todayTraining}
      todayLife={todayLife}
      todayRecovery={todayRecovery}
      todayLoad={todayLoad}
      realDays={realDays}
      streak={streak}
      onMorningLog={() => startMorningLog(today())}
      onEveningLog={() => startEveningLog(today())}
      onViewSummary={() => setView("summary")}
      onViewHistory={() => setView("history")}
    />
  );
}
