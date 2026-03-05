import { FONTS, MONO } from "../lib/constants.js";
import InfoTooltip from "./InfoTooltip.jsx";

export default function SliderInput({
  label, value, onChange, min = 0, max = 10,
  lowLabel, highLabel, color = "#2A8A84", step = 1, tooltip
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <span style={{ fontFamily: FONTS, fontSize: 13, fontWeight: 500, color: "#4A4A4A" }}>
          {label}{tooltip && <InfoTooltip text={tooltip} />}
        </span>
        <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 600, color, background: `${color}15`, padding: "1px 8px", borderRadius: 4, flexShrink: 0, marginLeft: 8 }}>{value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{
          width: "100%", height: 6, borderRadius: 3, appearance: "none",
          background: `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, #E2E7EA ${pct}%, #E2E7EA 100%)`,
          outline: "none", cursor: "pointer"
        }}
      />
      {(lowLabel || highLabel) && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
          <span style={{ fontFamily: FONTS, fontSize: 11, color: "#999" }}>{lowLabel}</span>
          <span style={{ fontFamily: FONTS, fontSize: 11, color: "#999" }}>{highLabel}</span>
        </div>
      )}
    </div>
  );
}
