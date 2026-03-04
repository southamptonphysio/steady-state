import { useState } from "react";
import { FONTS } from "../lib/constants.js";

export default function InfoTooltip({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ display: "inline-block", verticalAlign: "middle" }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        aria-label={open ? "Close explanation" : "What does this mean?"}
        style={{
          background: "none", border: "none",
          padding: "0 3px", margin: 0,
          cursor: "pointer",
          color: open ? "#2A8A84" : "#B8C2C6",
          fontSize: 14, lineHeight: 1,
          display: "inline-block", verticalAlign: "middle"
        }}
      >ⓘ</button>
      {open && (
        <span style={{
          display: "block",
          marginTop: 5,
          padding: "8px 10px",
          background: "#EEF4F5",
          borderRadius: 6,
          fontSize: 12,
          fontFamily: FONTS,
          fontWeight: 400,
          color: "#5A6870",
          lineHeight: 1.55,
          letterSpacing: 0,
          textTransform: "none",
          width: "min(320px, calc(100vw - 70px))"
        }}>
          {text}
        </span>
      )}
    </span>
  );
}
