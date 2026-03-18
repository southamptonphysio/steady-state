import { useState, useRef, useEffect } from "react";
import { FONTS } from "../lib/constants.js";

/**
 * Combobox — tap-to-open dropdown with filter-as-you-type.
 * Custom (unmatched) values are accepted and committed as-is.
 */
export default function Combobox({ value, onChange, options = [], placeholder = "Choose or type…", borderColor = "#DDD", style = {} }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  // Keep query in sync when value changes externally (e.g. reset)
  useEffect(() => { setQuery(value || ""); }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [open]);

  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));

  const select = (opt) => {
    setQuery(opt);
    onChange(opt);
    setOpen(false);
  };

  const handleBlur = () => {
    // Commit whatever is typed (custom value OK)
    setTimeout(() => {
      if (wrapRef.current && document.activeElement && wrapRef.current.contains(document.activeElement)) return;
      onChange(query);
      setOpen(false);
    }, 120);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", flex: 1, marginRight: 8, ...style }}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onBlur={handleBlur}
        style={{
          width: "100%",
          fontFamily: FONTS,
          fontSize: 13,
          padding: "8px 32px 8px 10px",
          border: `1px solid ${borderColor}`,
          borderRadius: 6,
          background: "#FFF",
          color: "#4A4A4A",
          outline: "none",
          boxSizing: "border-box",
          cursor: "text",
        }}
      />
      {/* Chevron toggle */}
      <span
        onMouseDown={e => { e.preventDefault(); if (open) { setOpen(false); } else { inputRef.current?.focus(); setOpen(true); } }}
        style={{ position: "absolute", right: 8, top: "50%", transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`, transition: "transform 0.15s", color: "#AAA", fontSize: 11, cursor: "pointer", userSelect: "none", lineHeight: 1 }}
      >▼</span>

      {open && (filtered.length > 0 || query.length > 0) && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          zIndex: 1000,
          background: "#FFF",
          border: `1px solid ${borderColor}`,
          borderTop: "none",
          borderRadius: "0 0 8px 8px",
          maxHeight: 220,
          overflowY: "auto",
          boxShadow: "0 4px 12px rgba(0,0,0,0.10)",
        }}>
          {/* Custom value option when query doesn't exactly match any option */}
          {query.length > 0 && !options.some(o => o.toLowerCase() === query.toLowerCase()) && (
            <div
              onMouseDown={e => { e.preventDefault(); select(query); }}
              onTouchStart={e => { e.preventDefault(); select(query); }}
              style={{ padding: "10px 12px", fontFamily: FONTS, fontSize: 13, color: "#5A5A5A", borderBottom: filtered.length > 0 ? "1px solid #F0EDED" : "none", cursor: "pointer", fontStyle: "italic" }}
            >
              Use "{query}"
            </div>
          )}
          {filtered.map(opt => (
            <div
              key={opt}
              onMouseDown={e => { e.preventDefault(); select(opt); }}
              onTouchStart={e => { e.preventDefault(); select(opt); }}
              style={{
                padding: "10px 12px",
                fontFamily: FONTS,
                fontSize: 13,
                color: opt === value ? "#2A8A84" : "#4A4A4A",
                fontWeight: opt === value ? 600 : 400,
                cursor: "pointer",
                borderBottom: "1px solid #F8F8F8",
                background: opt === value ? "#2A8A8408" : "transparent",
              }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
