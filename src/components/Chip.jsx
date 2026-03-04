import { FONTS } from "../lib/constants.js";

export default function Chip({ label, selected, onClick, color = "#2A8A84" }) {
  return (
    <button onClick={onClick} style={{
      fontFamily: FONTS, fontSize: 13, fontWeight: 500, padding: "8px 16px", borderRadius: 20,
      border: selected ? `2px solid ${color}` : "1.5px solid #DDD",
      background: selected ? `${color}12` : "#FFF", color: selected ? color : "#666",
      cursor: "pointer", transition: "all 0.2s"
    }}>
      {label}
    </button>
  );
}
