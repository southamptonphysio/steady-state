import { FONTS, MONO, EXERCISE_TYPES } from "../lib/constants.js";
import { clamp } from "../lib/calculations.js";

export default function ExerciseEntry({ exercise, onUpdate, onRemove }) {
  return (
    <div style={{ background: "#F5F8F9", border: "1px solid #E2E7EA", borderRadius: 8, padding: 14, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <select
          value={exercise.type}
          onChange={e => onUpdate({ ...exercise, type: e.target.value })}
          style={{ fontFamily: FONTS, fontSize: 13, padding: "6px 10px", border: "1px solid #DDD", borderRadius: 6, background: "#FFF", color: "#4A4A4A", outline: "none", flex: 1, marginRight: 8 }}
        >
          {EXERCISE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={onRemove} style={{ background: "none", border: "none", color: "#B5534A", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "2px 6px" }}>×</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={{ fontFamily: FONTS, fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Duration (min)</label>
          <input
            type="number" min={0} max={300} value={exercise.duration}
            onChange={e => onUpdate({ ...exercise, duration: parseInt(e.target.value) || 0 })}
            style={{ width: "100%", fontFamily: MONO, fontSize: 14, padding: "6px 10px", border: "1px solid #DDD", borderRadius: 6, background: "#FFF", color: "#4A4A4A", outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <div>
          <label style={{ fontFamily: FONTS, fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>RPE (1-10)</label>
          <input
            type="number" min={1} max={10} value={exercise.rpe}
            onChange={e => onUpdate({ ...exercise, rpe: clamp(parseInt(e.target.value) || 1, 1, 10) })}
            style={{ width: "100%", fontFamily: MONO, fontSize: 14, padding: "6px 10px", border: "1px solid #DDD", borderRadius: 6, background: "#FFF", color: "#4A4A4A", outline: "none", boxSizing: "border-box" }}
          />
        </div>
      </div>
    </div>
  );
}
