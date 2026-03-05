import { supabase } from "./supabase.js";
import { STORAGE_KEY } from "./constants.js";

let _userId = null;

// ── Supabase helpers ──────────────────────────────────────────────────────────

async function syncToSupabase(userId, data) {
  if (!userId || !data) return;

  // Upsert onboarding into profiles
  const { error: profileErr } = await supabase
    .from("profiles")
    .upsert({ id: userId, onboarding: data.onboarding ?? null, updated_at: new Date().toISOString() });
  if (profileErr) console.error("[storage] profile sync:", profileErr.message);

  // Batch-upsert entries (max 50 per request to stay under limits)
  const rows = Object.entries(data.entries ?? {}).map(([date, entry]) => ({
    user_id: userId,
    date,
    morning: entry.morning ?? null,
    evening: entry.evening ?? null,
    synthetic: entry.synthetic ?? true,
    updated_at: new Date().toISOString()
  }));

  for (let i = 0; i < rows.length; i += 50) {
    const { error } = await supabase
      .from("entries")
      .upsert(rows.slice(i, i + 50), { onConflict: "user_id,date" });
    if (error) console.error("[storage] entries sync:", error.message);
  }
}

async function loadFromSupabase(userId) {
  const [profileRes, entriesRes] = await Promise.all([
    supabase.from("profiles").select("onboarding").eq("id", userId).single(),
    supabase.from("entries").select("date,morning,evening,synthetic").eq("user_id", userId)
  ]);

  // PGRST116 = no rows found — fine for a brand-new user
  if (profileRes.error && profileRes.error.code !== "PGRST116") throw profileRes.error;
  if (entriesRes.error) throw entriesRes.error;

  const onboarding = profileRes.data?.onboarding ?? null;
  const entries = {};
  for (const row of entriesRes.data ?? []) {
    entries[row.date] = {
      morning: row.morning,
      evening: row.evening,
      synthetic: row.synthetic
    };
  }

  if (!onboarding && Object.keys(entries).length === 0) return null;
  return { onboarding, entries };
}

// ── Public API ────────────────────────────────────────────────────────────────

export const storage = {
  /** Call this whenever the auth user changes. */
  setUser(user) {
    _userId = user?.id ?? null;
  },

  /** Synchronous read from localStorage (instant, used for first paint). */
  get(key) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  },

  /**
   * Write to localStorage immediately (so the UI never waits),
   * then fire-and-forget sync to Supabase if a user is logged in.
   */
  set(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
    if (_userId) syncToSupabase(_userId, data).catch(console.error);
  },

  remove(key) {
    try { localStorage.removeItem(key); } catch {}
  },

  /**
   * Load the user's data from Supabase, update the localStorage cache,
   * and return the merged data. Returns null if nothing exists yet.
   */
  async syncFromSupabase(userId) {
    try {
      const remote = await loadFromSupabase(userId);
      if (!remote) return null;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(remote)); } catch {}
      return remote;
    } catch (err) {
      console.error("[storage] syncFromSupabase failed:", err.message);
      return null;
    }
  },

  /**
   * For beta users who have localStorage data but no Supabase account yet:
   * push their existing local data up to Supabase on first login.
   */
  async migrateToSupabase(userId) {
    const local = this.get(STORAGE_KEY);
    if (!local?.onboarding?.completed) return false;
    try {
      await syncToSupabase(userId, local);
      return true;
    } catch (err) {
      console.error("[storage] migration failed:", err.message);
      return false;
    }
  }
};
