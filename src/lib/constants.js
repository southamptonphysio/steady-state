export const STORAGE_KEY = "steadystate-v3";

export const EXERCISE_TYPES = [
  "Gym — Strength", "Gym — Conditioning", "Running", "Walking",
  "Cycling", "Swimming", "Yoga / Pilates", "Sports", "Physio Exercises", "Other"
];

export const RECOVERY_TYPES = [
  "Gentle yoga", "Breathwork", "Meditation", "Foam rolling / massage",
  "Gentle walk", "Stretching", "Cold / heat therapy", "Nap"
];

export const CONDITIONS = [
  { id: "chronic_pain", label: "Chronic pain" },
  { id: "cfs", label: "Chronic fatigue (ME/CFS)" },
  { id: "fibro", label: "Fibromyalgia" },
  { id: "hypermobility", label: "Hypermobility / EDS" },
  { id: "autoimmune", label: "Autoimmune condition" },
  { id: "other", label: "Other" }
];

export const FONTS = `'DM Sans', sans-serif`;
export const MONO = `'IBM Plex Mono', monospace`;
export const SERIF = `'Fraunces', serif`;

export const cardStyle = {
  background: "#FFFFFF",
  border: "1px solid #E5EAED",
  borderRadius: 12,
  padding: 18,
  marginBottom: 14,
  boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
};

export const sectionLabel = {
  fontFamily: `'IBM Plex Mono', monospace`,
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#8F979D",
  marginBottom: 10,
  display: "block"
};

export const pageStyle = {
  minHeight: "100vh",
  background: "#F7F9FA",
  fontFamily: `'DM Sans', sans-serif`,
  color: "#4A4A4A",
  maxWidth: 480,
  margin: "0 auto",
  padding: "0 16px 100px"
};
