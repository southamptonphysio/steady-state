import { FONTS, MONO, RECOVERY_TYPES } from "../lib/constants.js";

export default function RecoveryEntry({ activity, onUpdate, onRemove }) {
  return (
    <div style={{ background: "#F2F9F8", border: "1px solid #C0DDD9", borderRadius: 8, padding: 14, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <select
          value={activity.type}
          onChange={e => onUpdate({ ...activity, type: e.target.value })}
          style={{ fontFamily: FONTS, fontSize: 13, padding: "6px 10px", border: "1px solid #C0DDD9", borderRadius: 6, background: "#FFF", color: "#4A4A4A", outline: "none", flex: 1, marginRight: 8 }}
        >
          {RECOVERY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={onRemove} style={{ background: "none", border: "none", color: "#B5534A", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "2px 6px" }}>×</button>
      </div>
      <div>
        <label style={{ fontFamily: FONTS, fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Duration (min)</label>
        <input
          type="number" min={0} max={120} value={activity.duration}
          onChange={e => onUpdate({ ...activity, duration: parseInt(e.target.value) || 0 })}
          style={{ width: 100, fontFamily: MONO, fontSize: 14, padding: "6px 10px", border: "1px solid #C0DDD9", borderRadius: 6, background: "#FFF", color: "#4A4A4A", outline: "none", boxSizing: "border-box" }}
        />
      </div>
    </div>
  );
}
