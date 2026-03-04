import { FONTS, MONO, SERIF, cardStyle, sectionLabel, pageStyle } from "../lib/constants.js";
import { dayLabel, calcRecoveryCredit } from "../lib/calculations.js";
import SliderInput from "../components/SliderInput.jsx";
import ExerciseEntry from "../components/ExerciseEntry.jsx";
import RecoveryEntry from "../components/RecoveryEntry.jsx";

export default function LogView({ currentEntry, setCurrentEntry, selectedDate, onSave, onBack }) {
  const isMorning = currentEntry.type === "morning";

  return (
    <div style={pageStyle}>
      <div style={{ paddingTop: 24, paddingBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: FONTS, fontSize: 13, color: "#8F979D", padding: 0 }}>← Back</button>
          <span style={{ fontFamily: MONO, fontSize: 11, color: "#8F979D" }}>{dayLabel(selectedDate)}</span>
        </div>
        <h2 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, color: "#1C2E33", margin: "10px 0 0" }}>
          {isMorning ? "Morning check-in" : "Evening log"}
        </h2>
        {isMorning && <p style={{ fontSize: 12, color: "#8F979D", margin: "4px 0 0" }}>Quick — under 30 seconds</p>}
      </div>

      {isMorning ? (
        <>
          <div style={cardStyle}>
            <span style={sectionLabel}>Last night's sleep</span>
            <SliderInput
              label="Sleep quality" value={currentEntry.sleepQuality}
              onChange={v => setCurrentEntry(p => ({ ...p, sleepQuality: v }))}
              lowLabel="Terrible" highLabel="Restorative"
            />
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#4A4A4A" }}>Sleep hours</span>
                <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 600, color: "#2A8A84", background: "#2A8A8415", padding: "1px 8px", borderRadius: 4 }}>
                  {currentEntry.sleepHours}h
                </span>
              </div>
              <input
                type="range" min={3} max={12} step={0.5} value={currentEntry.sleepHours}
                onChange={e => setCurrentEntry(p => ({ ...p, sleepHours: parseFloat(e.target.value) }))}
                style={{ width: "100%", height: 6, borderRadius: 3, appearance: "none", background: `linear-gradient(to right, #2A8A84 0%, #2A8A84 ${((currentEntry.sleepHours - 3) / 9) * 100}%, #E2E7EA ${((currentEntry.sleepHours - 3) / 9) * 100}%, #E2E7EA 100%)`, outline: "none", cursor: "pointer" }}
              />
            </div>
          </div>
          <div style={cardStyle}>
            <span style={sectionLabel}>How are you feeling right now?</span>
            <SliderInput
              label="Pain level" value={currentEntry.painLevel}
              onChange={v => setCurrentEntry(p => ({ ...p, painLevel: v }))}
              lowLabel="None" highLabel="Severe" color="#B5534A"
            />
            <SliderInput
              label="Fatigue" value={currentEntry.fatigueLevel}
              onChange={v => setCurrentEntry(p => ({ ...p, fatigueLevel: v }))}
              lowLabel="Energised" highLabel="Exhausted" color="#B5534A"
            />
          </div>
        </>
      ) : (
        <>
          <div style={cardStyle}>
            <span style={sectionLabel}>Work & stress today</span>
            <SliderInput label="Work intensity" value={currentEntry.workIntensity} onChange={v => setCurrentEntry(p => ({ ...p, workIntensity: v }))} lowLabel="Light" highLabel="Demanding" color="#C4953A" />
            <SliderInput label="Overall stress" value={currentEntry.stressLevel} onChange={v => setCurrentEntry(p => ({ ...p, stressLevel: v }))} lowLabel="Calm" highLabel="Overwhelmed" color="#C4953A" />
            <SliderInput label="Brain fog" value={currentEntry.brainFog} onChange={v => setCurrentEntry(p => ({ ...p, brainFog: v }))} lowLabel="Clear" highLabel="Dense" color="#5B8FB9" />
            <SliderInput label="Mood" value={currentEntry.mood} onChange={v => setCurrentEntry(p => ({ ...p, mood: v }))} lowLabel="Low" highLabel="Great" color="#5B8FB9" />
          </div>
          <div style={cardStyle}>
            <span style={sectionLabel}>Training</span>
            {currentEntry.exercises.map((ex, i) => (
              <ExerciseEntry
                key={i} exercise={ex}
                onUpdate={u => {
                  const exs = [...currentEntry.exercises]; exs[i] = u;
                  setCurrentEntry(p => ({ ...p, exercises: exs }));
                }}
                onRemove={() => setCurrentEntry(p => ({ ...p, exercises: p.exercises.filter((_, j) => j !== i) }))}
              />
            ))}
            <button
              onClick={() => setCurrentEntry(p => ({ ...p, exercises: [...p.exercises, { type: "Gym — Strength", duration: 30, rpe: 5 }] }))}
              style={{ width: "100%", padding: "10px 0", borderRadius: 8, border: "1px dashed #CBD3D7", background: "none", fontFamily: FONTS, fontSize: 13, fontWeight: 500, color: "#8F979D", cursor: "pointer" }}
            >
              + Add exercise
            </button>
          </div>
          <div style={cardStyle}>
            <span style={sectionLabel}>Recovery</span>
            <p style={{ fontSize: 12, color: "#8F979D", margin: "0 0 12px", lineHeight: 1.5 }}>
              Restorative work reduces your overall load. Breathwork, gentle yoga, foam rolling — anything that genuinely helps you downregulate.
            </p>
            {currentEntry.recovery.map((r, i) => (
              <RecoveryEntry
                key={i} activity={r}
                onUpdate={u => {
                  const rs = [...currentEntry.recovery]; rs[i] = u;
                  setCurrentEntry(p => ({ ...p, recovery: rs }));
                }}
                onRemove={() => setCurrentEntry(p => ({ ...p, recovery: p.recovery.filter((_, j) => j !== i) }))}
              />
            ))}
            <button
              onClick={() => setCurrentEntry(p => ({ ...p, recovery: [...p.recovery, { type: "Breathwork", duration: 10 }] }))}
              style={{ width: "100%", padding: "10px 0", borderRadius: 8, border: "1px dashed #A3D5D1", background: "none", fontFamily: FONTS, fontSize: 13, fontWeight: 500, color: "#5BABA5", cursor: "pointer" }}
            >
              + Add recovery activity
            </button>
            {currentEntry.recovery.length > 0 && (
              <div style={{ marginTop: 10, padding: "8px 12px", background: "#2A8A8408", borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#2A8A84" }}>Recovery credit</span>
                <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 600, color: "#2A8A84" }}>
                  −{calcRecoveryCredit({ recovery: currentEntry.recovery }).toFixed(1)}
                </span>
              </div>
            )}
          </div>
          <div style={cardStyle}>
            <span style={sectionLabel}>Notes</span>
            <textarea
              value={currentEntry.notes}
              onChange={e => setCurrentEntry(p => ({ ...p, notes: e.target.value }))}
              placeholder="Anything worth noting today..." rows={3}
              style={{ width: "100%", fontFamily: FONTS, fontSize: 13, padding: "10px 12px", border: "1px solid #E2E7EA", borderRadius: 8, background: "#F5F8F9", color: "#4A4A4A", outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.5 }}
            />
          </div>
        </>
      )}
      <button
        onClick={onSave}
        style={{ width: "100%", padding: "14px 0", borderRadius: 10, background: "#1C2E33", color: "#F7F9FA", border: "none", fontFamily: FONTS, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 20 }}
      >
        {isMorning ? "Save & see readiness" : "Save evening log"}
      </button>
    </div>
  );
}
