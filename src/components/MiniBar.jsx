import { MONO } from "../lib/constants.js";

export default function MiniBar({ value, max = 30, color = "#2A8A84", height = 20 }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ width: "100%", height, background: "#F0EDED", borderRadius: 4, overflow: "hidden", position: "relative" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.5s ease" }} />
      <span style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", fontFamily: MONO, fontSize: 11, fontWeight: 600, color: "#4A4A4A" }}>
        {value.toFixed(1)}
      </span>
    </div>
  );
}
