import { useState } from "react";
import { FONTS, MONO, SERIF, CONDITIONS, EXERCISE_TYPES, SYMPTOM_OPTIONS, cardStyle, sectionLabel, pageStyle } from "../lib/constants.js";
import { calcTotalLoad } from "../lib/calculations.js";
import { generateSyntheticBaseline } from "../lib/synthetic.js";
import SliderInput from "../components/SliderInput.jsx";
import Chip from "../components/Chip.jsx";

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    conditions: [],
    stability: "stable",
    selectedSymptoms: ["pain", "fatigue", "brain_fog"],
    sessionsPerWeek: 3,
    avgDuration: 40,
    avgRPE: 5,
    exerciseTypes: ["Gym — Strength"],
    typicalSleep: 7,
    typicalSleepQuality: 6,
    typicalMentalDemand: 5,
    typicalEmotionalLoad: 5,
    typicalPhysicalDemand: 3,
    typicalSymptoms: { pain: 3, fatigue: 3, brain_fog: 2 }
  });

  const u = (k, v) => setData(p => ({ ...p, [k]: v }));
  const toggleList = (k, id) => setData(p => ({
    ...p,
    [k]: p[k].includes(id) ? p[k].filter(c => c !== id) : [...p[k], id]
  }));
  const toggleSymptom = (id) => setData(p => {
    const cur = p.selectedSymptoms;
    if (cur.includes(id)) return { ...p, selectedSymptoms: cur.filter(s => s !== id) };
    if (cur.length >= 3) return p;
    return {
      ...p,
      selectedSymptoms: [...cur, id],
      typicalSymptoms: { ...p.typicalSymptoms, [id]: p.typicalSymptoms[id] ?? 3 }
    };
  });

  const steps = [
    // 0 — Welcome
    () => (
      <>
        <div style={{ paddingTop: 60, paddingBottom: 20, textAlign: "center" }}>
          <h1 style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 500, color: "#1C2E33", margin: 0 }}>SteadyState</h1>
          <p style={{ fontSize: 14, color: "#888", margin: "8px 0 0", lineHeight: 1.6 }}>
            Track training load, life stress and symptoms<br />in one place. Know when to push and when to ease off.
          </p>
        </div>
        <div style={{ ...cardStyle, marginTop: 12 }}>
          <p style={{ fontSize: 14, lineHeight: 1.65, color: "#555", margin: 0 }}>
            Most fitness apps push you to do more. Most pacing apps assume you can barely function. This sits in between — for people who train but need to manage their total load to stay well. We'll take a few minutes to understand your typical patterns so the monitoring works from day one.
          </p>
        </div>
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <p style={{ fontFamily: MONO, fontSize: 11, color: "#8F979D" }}>About 3 minutes</p>
        </div>
      </>
    ),

    // 1 — Condition + stability (Step 1 of 5)
    () => (
      <>
        <div style={{ paddingTop: 32, paddingBottom: 8 }}>
          <span style={sectionLabel}>Step 1 of 5</span>
          <h2 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, color: "#1C2E33", margin: "4px 0 0" }}>About your condition</h2>
        </div>
        <div style={cardStyle}>
          <span style={sectionLabel}>What are you managing?</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {CONDITIONS.map(c => (
              <Chip key={c.id} label={c.label} selected={data.conditions.includes(c.id)} onClick={() => toggleList("conditions", c.id)} />
            ))}
          </div>
        </div>
        <div style={cardStyle}>
          <span style={sectionLabel}>Over the past month, have your symptoms been...</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { id: "stable", label: "Roughly stable",    desc: "Normal ups and downs" },
              { id: "better", label: "Better than usual", desc: "A good patch — less symptoms than typical" },
              { id: "worse",  label: "Worse than usual",  desc: "Flaring or more limited than your norm" }
            ].map(opt => (
              <button key={opt.id} type="button" onClick={() => u("stability", opt.id)} style={{
                display: "flex", flexDirection: "column", alignItems: "flex-start", padding: "12px 16px", borderRadius: 10,
                border: data.stability === opt.id ? "2px solid #2A8A84" : "1.5px solid #E2E7EA",
                background: data.stability === opt.id ? "#2A8A8408" : "#FFF", textAlign: "left", cursor: "pointer"
              }}>
                <span style={{ fontFamily: FONTS, fontSize: 14, fontWeight: 600, color: "#1C2E33" }}>{opt.label}</span>
                <span style={{ fontFamily: FONTS, fontSize: 12, color: "#888", marginTop: 2 }}>{opt.desc}</span>
              </button>
            ))}
          </div>
          {data.stability === "worse" && (
            <div style={{ marginTop: 12, padding: "10px 14px", background: "#C4953A10", border: "1px solid #C4953A30", borderRadius: 8 }}>
              <p style={{ fontSize: 12, color: "#8A7033", margin: 0, lineHeight: 1.5 }}>
                We'll set your baseline to reflect your <em>typical</em> capacity — not where you are right now. You may start in the underdoing zone. That's expected.
              </p>
            </div>
          )}
        </div>
      </>
    ),

    // 2 — Symptom picker (Step 2 of 5)
    () => {
      const count = data.selectedSymptoms.length;
      const atMax = count >= 3;
      return (
        <>
          <div style={{ paddingTop: 32, paddingBottom: 8 }}>
            <span style={sectionLabel}>Step 2 of 5</span>
            <h2 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, color: "#1C2E33", margin: "4px 0 0" }}>Your key symptoms</h2>
            <p style={{ fontSize: 13, color: "#888", marginTop: 4 }}>Pick up to three symptoms that affect you most. These become your daily tracking items.</p>
          </div>
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: 13, color: atMax ? "#C4953A" : "#555" }}>
                {atMax ? "Maximum reached — deselect to change" : "Select 1–3"}
              </span>
              <span style={{
                fontFamily: MONO, fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 12,
                background: count >= 1 ? "#2A8A8415" : "#F0F4F5",
                color: count >= 1 ? "#2A8A84" : "#8F979D"
              }}>{count} selected</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SYMPTOM_OPTIONS.map(opt => {
                const selected = data.selectedSymptoms.includes(opt.id);
                const disabled = !selected && atMax;
                return (
                  <button key={opt.id} type="button" onClick={() => !disabled && toggleSymptom(opt.id)} style={{
                    display: "flex", flexDirection: "column", alignItems: "flex-start", padding: "12px 14px", borderRadius: 10,
                    border: selected ? "2px solid #2A8A84" : "1.5px solid #E2E7EA",
                    background: selected ? "#2A8A8408" : disabled ? "#FAFBFC" : "#FFF",
                    textAlign: "left", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.45 : 1
                  }}>
                    <span style={{ fontFamily: FONTS, fontSize: 14, fontWeight: 600, color: "#1C2E33" }}>{opt.label}</span>
                    <span style={{ fontFamily: FONTS, fontSize: 12, color: "#888", marginTop: 2, lineHeight: 1.45 }}>{opt.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      );
    },

    // 3 — Training patterns (Step 3 of 5)
    () => (
      <>
        <div style={{ paddingTop: 32, paddingBottom: 8 }}>
          <span style={sectionLabel}>Step 3 of 5</span>
          <h2 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, color: "#1C2E33", margin: "4px 0 0" }}>Your typical training</h2>
          <p style={{ fontSize: 13, color: "#888", marginTop: 4 }}>Think about a normal week, not your best or worst.</p>
        </div>
        <div style={cardStyle}>
          <SliderInput label="Sessions per week" value={data.sessionsPerWeek} onChange={v => u("sessionsPerWeek", v)} min={0} max={7} lowLabel="None" highLabel="Daily"
            tooltip="Count your typical weeks, not your best weeks. This calibrates your baseline." />
          <SliderInput label="Typical session length (min)" value={data.avgDuration} onChange={v => u("avgDuration", v)} min={10} max={120} step={5} lowLabel="10 min" highLabel="2 hours" />
          <SliderInput label="Typical effort (RPE)" value={data.avgRPE} onChange={v => u("avgRPE", v)} min={1} max={10} lowLabel="Easy" highLabel="Maximum"
            tooltip="1 = very easy. 5 = comfortably hard. 8+ = tough. Think about your usual sessions." />
        </div>
        <div style={cardStyle}>
          <span style={sectionLabel}>What do you usually do?</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {EXERCISE_TYPES.map(t => (
              <Chip key={t} label={t} selected={data.exerciseTypes.includes(t)} onClick={() => toggleList("exerciseTypes", t)} />
            ))}
          </div>
        </div>
      </>
    ),

    // 4 — Life baselines (Step 4 of 5)
    () => (
      <>
        <div style={{ paddingTop: 32, paddingBottom: 8 }}>
          <span style={sectionLabel}>Step 4 of 5</span>
          <h2 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, color: "#1C2E33", margin: "4px 0 0" }}>Life load & symptoms</h2>
          <p style={{ fontSize: 13, color: "#888", marginTop: 4 }}>Your typical levels on an average day.</p>
        </div>
        <div style={cardStyle}>
          <span style={sectionLabel}>Sleep</span>
          <SliderInput label="Typical sleep hours" value={data.typicalSleep} onChange={v => u("typicalSleep", v)} min={4} max={11} step={0.5} lowLabel="4h" highLabel="11h" />
          <SliderInput label="Typical sleep quality" value={data.typicalSleepQuality} onChange={v => u("typicalSleepQuality", v)} lowLabel="Poor" highLabel="Restorative"
            tooltip="Your usual sleep quality, not your best nights." />
        </div>
        <div style={cardStyle}>
          <span style={sectionLabel}>Typical daily demands</span>
          <SliderInput label="Mental demand" value={data.typicalMentalDemand} onChange={v => u("typicalMentalDemand", v)} lowLabel="Undemanding" highLabel="Exhausting" color="#C4953A"
            tooltip="All cognitive load — work, admin, planning, decisions. A demanding workday scores high." />
          <SliderInput label="Emotional load" value={data.typicalEmotionalLoad} onChange={v => u("typicalEmotionalLoad", v)} lowLabel="Light" highLabel="Heavy" color="#C4953A"
            tooltip="Arguments, worry, grief, health anxiety, caring for others. Managing a chronic condition counts too." />
          <SliderInput label="Physical demand (outside exercise)" value={data.typicalPhysicalDemand} onChange={v => u("typicalPhysicalDemand", v)} lowLabel="Sedentary" highLabel="Very physical" color="#C4953A"
            tooltip="Childcare, housework, being on your feet, commuting. Physical load outside your training log." />
        </div>
        <div style={cardStyle}>
          <span style={sectionLabel}>Typical symptom levels</span>
          <p style={{ fontSize: 12, color: "#8F979D", margin: "0 0 14px", lineHeight: 1.5 }}>
            Your chosen symptoms on an average day, at rest.
          </p>
          {data.selectedSymptoms.map(id => {
            const opt = SYMPTOM_OPTIONS.find(s => s.id === id);
            if (!opt) return null;
            return (
              <SliderInput
                key={id}
                label={`Typical ${opt.label.toLowerCase()}`}
                value={data.typicalSymptoms[id] ?? 3}
                onChange={v => u("typicalSymptoms", { ...data.typicalSymptoms, [id]: v })}
                lowLabel={opt.lowLabel}
                highLabel={opt.highLabel}
                color="#B5534A"
                tooltip={opt.description}
              />
            );
          })}
        </div>
      </>
    ),

    // 5 — Baseline preview (Step 5 of 5)
    () => {
      const se = generateSyntheticBaseline(data);
      const sc = Object.values(se).reduce((s, e) => s + calcTotalLoad(e), 0) / 28;
      return (
        <>
          <div style={{ paddingTop: 32, paddingBottom: 8 }}>
            <span style={sectionLabel}>Step 5 of 5</span>
            <h2 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, color: "#1C2E33", margin: "4px 0 0" }}>Your baseline</h2>
          </div>
          <div style={cardStyle}>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "#555", margin: "0 0 16px" }}>
              Based on what you've told us, here's your estimated daily load profile:
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div style={{ background: "#F0F5F6", borderRadius: 8, padding: 12, textAlign: "center" }}>
                <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600, color: "#2A8A84" }}>{sc.toFixed(1)}</div>
                <div style={{ fontSize: 11, color: "#8F979D", marginTop: 2 }}>Avg daily load</div>
              </div>
              <div style={{ background: "#F0F5F6", borderRadius: 8, padding: 12, textAlign: "center" }}>
                <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600 }}>{data.sessionsPerWeek}</div>
                <div style={{ fontSize: 11, color: "#8F979D", marginTop: 2 }}>Sessions / week</div>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8F979D", marginBottom: 6 }}>Tracking</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {data.selectedSymptoms.map(id => {
                  const opt = SYMPTOM_OPTIONS.find(s => s.id === id);
                  return (
                    <span key={id} style={{ fontSize: 12, background: "#2A8A8412", color: "#2A8A84", padding: "3px 10px", borderRadius: 12, fontFamily: FONTS }}>
                      {opt?.label ?? id}
                    </span>
                  );
                })}
              </div>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.55, color: "#777", margin: 0 }}>
              We've seeded 28 days of estimated data so your acute:chronic ratio works immediately. As you log real days, synthetic data will naturally age out.
            </p>
          </div>
        </>
      );
    }
  ];

  const canContinue = step !== 2 || data.selectedSymptoms.length >= 1;

  return (
    <div style={{ ...pageStyle, padding: "0 20px 120px" }}>
      {steps[step]()}
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        {step > 0 && (
          <button type="button" onClick={() => setStep(s => s - 1)} style={{ flex: 1, padding: "13px 0", borderRadius: 10, border: "1px solid #E2E7EA", background: "#FFF", color: "#4A4A4A", fontFamily: FONTS, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Back
          </button>
        )}
        <button
          type="button"
          disabled={!canContinue}
          onClick={() => step < steps.length - 1 ? setStep(s => s + 1) : onComplete(data)}
          style={{ flex: step === 0 ? 1 : 2, padding: "13px 0", borderRadius: 10, border: "none", background: canContinue ? "#1C2E33" : "#B0BAC0", color: "#F7F9FA", fontFamily: FONTS, fontSize: 14, fontWeight: 600, cursor: canContinue ? "pointer" : "default" }}
        >
          {step === 0 ? "Get started" : step === steps.length - 1 ? "Start tracking" : "Continue"}
        </button>
      </div>
      <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 16 }}>
        {steps.map((_, i) => (
          <div key={i} style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 3, background: i <= step ? "#1C2E33" : "#DDD", transition: "all 0.3s" }} />
        ))}
      </div>
    </div>
  );
}
