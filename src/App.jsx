import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "./lib/supabase.js";
import { storage } from "./lib/storage.js";
import { STORAGE_KEY, pageStyle } from "./lib/constants.js";
import {
  today, mergeEntry,
  calcTrainingLoad, calcLifeLoad, calcRecoveryCredit,
  getDailySignal, calcWeekSummary,
  getCurrentWeekDays, getPreviousWeekDays
} from "./lib/calculations.js";
import { generateSyntheticBaseline } from "./lib/synthetic.js";
import AuthView from "./views/AuthView.jsx";
import Onboarding from "./views/Onboarding.jsx";
import Dashboard from "./views/Dashboard.jsx";
import LogView from "./views/LogView.jsx";
import WeeklySummary from "./views/WeeklySummary.jsx";
import History from "./views/History.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [appData, setAppData] = useState(null);
  const [view, setView] = useState("dashboard");
  const [selectedDate, setSelectedDate] = useState(today());
  const [currentEntry, setCurrentEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [summaryWeek, setSummaryWeek] = useState("current");

  // ── Load data: localStorage first (instant), then Supabase (authoritative) ──
  const loadUserData = useCallback(async (u) => {
    storage.setUser(u);

    // Show cached data immediately so there's no blank flash
    const cached = storage.get(STORAGE_KEY);
    if (cached) setAppData(cached);

    // Then pull from Supabase and update
    const remote = await storage.syncFromSupabase(u.id);
    if (remote) setAppData(remote);

    setLoading(false);
  }, []);

  // ── Auth bootstrap ────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        loadUserData(u);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (!u) {
        storage.setUser(null);
        setAppData(null);
        setView("dashboard");
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUserData]);

  // ── Called by AuthView after successful login/signup ──────────────────────
  const handleAuthSuccess = useCallback(async (u) => {
    setLoading(true);
    setUser(u);

    // Migrate pre-auth localStorage data for existing beta users
    const hadLocal = storage.get(STORAGE_KEY);
    if (hadLocal?.onboarding?.completed) {
      await storage.migrateToSupabase(u.id);
    }

    await loadUserData(u);
  }, [loadUserData]);

  // ── Persistence ───────────────────────────────────────────────────────────
  const saveData = useCallback((newData) => {
    setAppData(newData);
    setSaving(true);
    storage.set(STORAGE_KEY, newData); // writes localStorage + fires Supabase sync
    setSaving(false);
  }, []);

  const handleOnboardingComplete = useCallback((oData) => {
    saveData({ onboarding: { ...oData, completed: true }, entries: generateSyntheticBaseline(oData) });
    setView("dashboard");
  }, [saveData]);

  // ── Logging ───────────────────────────────────────────────────────────────
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

  // ── Account ───────────────────────────────────────────────────────────────
  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    storage.remove(STORAGE_KEY);
    // onAuthStateChange handles clearing user + appData
  }, []);

  const handleReset = useCallback(() => {
    if (confirm("Reset all data and restart onboarding?")) {
      storage.remove(STORAGE_KEY);
      setAppData(null);
      setView("dashboard");
    }
  }, []);

  // ── Derived state ─────────────────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ ...pageStyle, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <span style={{ fontSize: 13, color: "#8F979D" }}>Loading…</span>
      </div>
    );
  }

  if (!user) {
    return <AuthView onSuccess={handleAuthSuccess} />;
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
        onLogout={handleLogout}
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
