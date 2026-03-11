import { useState } from "react";
import { FONTS, MONO, EXERCISE_TYPES } from "../lib/constants.js";
import { clamp } from "../lib/calculations.js";
import InfoTooltip from "./InfoTooltip.jsx";

export default function ExerciseEntry({ exercise, onUpdate, onRemove }) {
  // Local string state lets the user clear & retype without the controlled
  // input fighting them. Values are committed (and clamped) on blur.
  const [durStr, setDurStr] = useState(String(exercise.duration));
  const [rpeStr, setRpeStr] = useState(String(exercise.rpe));

  const commitDuration = () => {
    const val = Math.max(0, Math.min(300, parseInt(durStr) || 0));
    setDurStr(String(val));
    onUpdate({ ...exercise, duration: val });
  };

  const commitRpe = () => {
    const val = clamp(parseInt(rpeStr) || 5, 1, 10);
    setRpeStr(String(val));
    onUpdate({ ...exercise, rpe: val });
  };

  return (
    <div style={{ background: "#F5F8F9", border: "1px solid #E2E7EA", borderRadius: 8, padding: 14, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <input
          list="exercise-types-list"
          value={exercise.type}
          onChange={e => onUpdate({ ...exercise, type: e.target.value })}
          placeholder="Type or choose exercise…"
          style={{ fontFamily: FONTS, fontSize: 13, padding: "6px 10px", border: "1px solid #DDD", borderRadius: 6, background: "#FFF", color: "#4A4A4A", outline: "none", flex: 1, marginRight: 8 }}
        />
        <datalist id="exercise-types-list">
          {EXERCISE_TYPES.map(t => <option key={t} value={t} />)}
        </datalist>
        <button type="button" onClick={onRemove} style={{ background: "none", border: "none", color: "#B5534A", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "2px 6px" }}>×</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={{ fontFamily: FONTS, fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Duration (min)</label>
          <input
            type="number" min={0} max={300}
            value={durStr}
            onChange={e => setDurStr(e.target.value)}
            onBlur={commitDuration}
            style={{ width: "100%", fontFamily: MONO, fontSize: 14, padding: "6px 10px", border: "1px solid #DDD", borderRadius: 6, background: "#FFF", color: "#4A4A4A", outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <div>
          <label style={{ fontFamily: FONTS, fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>RPE (1–10)<InfoTooltip text="Rate of Perceived Exertion — how hard the session felt. 1 = barely trying. 5 = comfortably hard. 7–8 = hard but sustainable. 10 = absolute maximum." /></label>
          <input
            type="number" min={1} max={10}
            value={rpeStr}
            onChange={e => setRpeStr(e.target.value)}
            onBlur={commitRpe}
            style={{ width: "100%", fontFamily: MONO, fontSize: 14, padding: "6px 10px", border: "1px solid #DDD", borderRadius: 6, background: "#FFF", color: "#4A4A4A", outline: "none", boxSizing: "border-box" }}
          />
        </div>
      </div>
    </div>
  );
}
