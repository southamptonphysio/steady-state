export const storage = {
  get: (key) => {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  },
  set: (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {}
  },
  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};
