import { useState } from "react";
import { FONTS, MONO, SERIF, CONDITIONS, EXERCISE_TYPES, cardStyle, sectionLabel, pageStyle } from "../lib/constants.js";
import { calcTotalLoad } from "../lib/calculations.js";
import { generateSyntheticBaseline } from "../lib/synthetic.js";
import SliderInput from "../components/SliderInput.jsx";
import Chip from "../components/Chip.jsx";

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    conditions: [], stability: "stable", sessionsPerWeek: 3, avgDuration: 40, avgRPE: 5,
    exerciseTypes: ["Gym — Strength"], typicalSleep: 7, typicalSleepQuality: 6,
    typicalWork: 5, typicalStress: 5, typicalPain: 3, typicalFatigue: 3, typicalBrainFog: 2
  });
  const u = (k, v) => setData(p => ({ ...p, [k]: v }));
  const toggleList = (k, id) => setData(p => ({
    ...p,
    [k]: p[k].includes(id) ? p[k].filter(c => c !== id) : [...p[k], id]
  }));

  const steps = [
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
            Most fitness apps push you to do more. Most pacing apps assume you can barely function. This sits in between — for people who train but need to manage their total load to stay well. We'll take a couple of minutes to understand your typical patterns so the monitoring works from day one.
          </p>
        </div>
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <p style={{ fontFamily: MONO, fontSize: 11, color: "#8F979D" }}>About 2 minutes</p>
        </div>
      </>
    ),
    () => (
      <>
        <div style={{ paddingTop: 32, paddingBottom: 8 }}>
          <span style={sectionLabel}>Step 1 of 4</span>
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
              { id: "stable", label: "Roughly stable", desc: "Normal ups and downs" },
              { id: "better", label: "Better than usual", desc: "A good patch — less symptoms than typical" },
              { id: "worse", label: "Worse than usual", desc: "Flaring or more limited than your norm" }
            ].map(opt => (
              <button key={opt.id} onClick={() => u("stability", opt.id)} style={{
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
                We'll set your baseline to reflect your <em>typical</em> capacity — not where you are right now. You may start in the underdoing zone. That's expected. It gives you a realistic target to build back to.
              </p>
            </div>
          )}
        </div>
      </>
    ),
    () => (
      <>
        <div style={{ paddingTop: 32, paddingBottom: 8 }}>
          <span style={sectionLabel}>Step 2 of 4</span>
          <h2 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, color: "#1C2E33", margin: "4px 0 0" }}>Your typical training</h2>
          <p style={{ fontSize: 13, color: "#888", marginTop: 4 }}>Think about a normal week, not your best or worst.</p>
        </div>
        <div style={cardStyle}>
          <SliderInput label="Sessions per week" value={data.sessionsPerWeek} onChange={v => u("sessionsPerWeek", v)} min={0} max={7} lowLabel="None" highLabel="Daily"
            tooltip="Count your typical weeks, not your best weeks. Be honest — this calibrates your baseline." />
          <SliderInput label="Typical session length (min)" value={data.avgDuration} onChange={v => u("avgDuration", v)} min={10} max={120} step={5} lowLabel="10 min" highLabel="2 hours" />
          <SliderInput label="Typical effort (RPE)" value={data.avgRPE} onChange={v => u("avgRPE", v)} min={1} max={10} lowLabel="Easy" highLabel="Maximum"
            tooltip="Rate of Perceived Exertion — how hard your sessions feel. 1 = very easy walk. 5 = comfortably hard. 8+ = tough, hard to sustain. Think about your usual sessions, not your hardest." />
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
    () => (
      <>
        <div style={{ paddingTop: 32, paddingBottom: 8 }}>
          <span style={sectionLabel}>Step 3 of 4</span>
          <h2 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, color: "#1C2E33", margin: "4px 0 0" }}>Life load & symptoms</h2>
          <p style={{ fontSize: 13, color: "#888", marginTop: 4 }}>Your typical levels on an average day.</p>
        </div>
        <div style={cardStyle}>
          <span style={sectionLabel}>Sleep</span>
          <SliderInput label="Typical sleep hours" value={data.typicalSleep} onChange={v => u("typicalSleep", v)} min={4} max={11} step={0.5} lowLabel="4h" highLabel="11h" />
          <SliderInput label="Typical sleep quality" value={data.typicalSleepQuality} onChange={v => u("typicalSleepQuality", v)} lowLabel="Poor" highLabel="Restorative"
            tooltip="Think about your usual sleep, not your best nights. Low = often unrefreshed, wake frequently. High = generally sleep well and wake feeling rested." />
        </div>
        <div style={cardStyle}>
          <span style={sectionLabel}>Work & stress</span>
          <SliderInput label="Typical work intensity" value={data.typicalWork} onChange={v => u("typicalWork", v)} lowLabel="Light" highLabel="Demanding" color="#C4953A"
            tooltip="Your most common workday, not your busiest. Desk work counts. Physically demanding jobs count more. Low = light tasks, easy pace. High = long hours, high demands." />
          <SliderInput label="Typical stress level" value={data.typicalStress} onChange={v => u("typicalStress", v)} lowLabel="Calm" highLabel="High" color="#C4953A"
            tooltip="Your background stress on a normal week — work pressure, personal life, health worries. Low = generally calm. High = regularly stretched thin or overwhelmed." />
        </div>
        <div style={cardStyle}>
          <span style={sectionLabel}>Typical symptom levels</span>
          <SliderInput label="Pain" value={data.typicalPain} onChange={v => u("typicalPain", v)} lowLabel="None" highLabel="Severe" color="#B5534A"
            tooltip="Your typical pain on an average day, at rest. Low (1–2) = minimal background discomfort. High (8–10) = significant pain affecting how you move or function." />
          <SliderInput label="Fatigue" value={data.typicalFatigue} onChange={v => u("typicalFatigue", v)} lowLabel="Energised" highLabel="Exhausted" color="#B5534A"
            tooltip="Physical tiredness on a normal day, not sleepiness. Low = generally have energy to do things. High (8–10) = heavy limbs, even light tasks feel disproportionately hard." />
          <SliderInput label="Brain fog" value={data.typicalBrainFog} onChange={v => u("typicalBrainFog", v)} lowLabel="Clear" highLabel="Dense" color="#B5534A"
            tooltip="Typical difficulty concentrating or thinking clearly. Low (1–2) = generally sharp. High (8–10) = regularly struggling to follow conversations or retain information." />
        </div>
      </>
    ),
    () => {
      const se = generateSyntheticBaseline(data);
      const sc = Object.values(se).reduce((s, e) => s + calcTotalLoad(e), 0) / 28;
      return (
        <>
          <div style={{ paddingTop: 32, paddingBottom: 8 }}>
            <span style={sectionLabel}>Step 4 of 4</span>
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
            <p style={{ fontSize: 13, lineHeight: 1.55, color: "#777", margin: 0 }}>
              We've seeded 28 days of estimated data so your acute:chronic ratio works immediately. As you log real days, synthetic data will naturally age out.
            </p>
          </div>
        </>
      );
    }
  ];

  return (
    <div style={{ ...pageStyle, padding: "0 20px 120px" }}>
      {steps[step]()}
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} style={{ flex: 1, padding: "13px 0", borderRadius: 10, border: "1px solid #E2E7EA", background: "#FFF", color: "#4A4A4A", fontFamily: FONTS, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Back
          </button>
        )}
        <button
          onClick={() => step < steps.length - 1 ? setStep(s => s + 1) : onComplete(data)}
          style={{ flex: step === 0 ? 1 : 2, padding: "13px 0", borderRadius: 10, border: "none", background: "#1C2E33", color: "#F7F9FA", fontFamily: FONTS, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
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
