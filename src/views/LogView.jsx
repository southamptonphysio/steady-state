import { FONTS, MONO, SERIF, cardStyle, sectionLabel, pageStyle, SYMPTOM_OPTIONS } from "../lib/constants.js";
import { dayLabel, calcRecoveryCredit } from "../lib/calculations.js";
import SliderInput from "../components/SliderInput.jsx";
import ExerciseEntry from "../components/ExerciseEntry.jsx";
import RecoveryEntry from "../components/RecoveryEntry.jsx";
import InfoTooltip from "../components/InfoTooltip.jsx";

const SYMPTOM_COLORS = ["#B5534A", "#C4953A", "#5B8FB9"];

export default function LogView({ currentEntry, setCurrentEntry, selectedDate, onSave, onBack, selectedSymptoms = ["pain", "fatigue", "brain_fog"] }) {
  const isMorning = currentEntry.type === "morning";

  const symptomOpts = selectedSymptoms.map(id => SYMPTOM_OPTIONS.find(s => s.id === id)).filter(Boolean);

  const setSymptom = (id, v) =>
    setCurrentEntry(p => ({ ...p, symptoms: { ...p.symptoms, [id]: v } }));

  return (
    <div style={pageStyle}>
      <div style={{ paddingTop: 24, paddingBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button type="button" onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: FONTS, fontSize: 13, color: "#8F979D", padding: "4px 0" }}>← Back</button>
          <span style={{ fontFamily: MONO, fontSize: 11, color: "#8F979D" }}>{dayLabel(selectedDate)}</span>
        </div>
        <h2 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, color: "#1C2E33", margin: "10px 0 0" }}>
          {isMorning ? "Morning check-in" : "Evening log"}
        </h2>
        {isMorning && <p style={{ fontSize: 12, color: "#8F979D", margin: "4px 0 0" }}>Quick — under 30 seconds</p>}
      </div>

      {isMorning ? (
        <>
          {/* Sleep */}
          <div style={cardStyle}>
            <span style={sectionLabel}>Last night's sleep<InfoTooltip text="Poor sleep is one of the strongest signals we track — it adds to your life load and pulls your readiness score down. Honest answers here matter more than you might think." /></span>
            <SliderInput
              label="Sleep quality" value={currentEntry.sleepQuality}
              onChange={v => setCurrentEntry(p => ({ ...p, sleepQuality: v }))}
              lowLabel="Terrible" highLabel="Restorative"
              tooltip="Low (1–3) = woke repeatedly, felt unrefreshed, groggy in the morning. High (8–10) = fell asleep easily, slept through, woke up actually rested."
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

          {/* Morning symptoms */}
          <div style={cardStyle}>
            <span style={sectionLabel}>How are you feeling right now?<InfoTooltip text="Morning symptoms before any activity give us your clearest baseline. Rate how you actually feel, not how you hope to feel later." /></span>
            {symptomOpts.map((s, i) => (
              <SliderInput
                key={s.id}
                label={s.label}
                value={currentEntry.symptoms?.[s.id] ?? 3}
                onChange={v => setSymptom(s.id, v)}
                lowLabel={s.lowLabel} highLabel={s.highLabel}
                color={SYMPTOM_COLORS[i] ?? "#B5534A"}
                tooltip={s.description}
              />
            ))}
          </div>

          {/* PRS */}
          <div style={cardStyle}>
            <span style={sectionLabel}>Perceived Recovery Status (PRS)<InfoTooltip text="How recovered do you feel overall right now? This is your gut-level sense of readiness, separate from any individual symptom. Low = you don't feel ready for demand. High = you feel genuinely fresh and ready." /></span>
            <SliderInput
              label="Recovery status" value={currentEntry.prs ?? 5}
              onChange={v => setCurrentEntry(p => ({ ...p, prs: v }))}
              lowLabel="Not recovered" highLabel="Fully recovered"
              tooltip="1–3: Not ready — pushing today risks payback. 4–6: Partly there — moderate activity only. 7–10: Ready to go — good day to train or do more."
            />
          </div>
        </>
      ) : (
        <>
          {/* Today's demands */}
          <div style={cardStyle}>
            <span style={sectionLabel}>Today's demands<InfoTooltip text="Life load isn't just exercise. Mental effort, emotional strain, and physical non-exercise demands all count. A busy, stressful day without any training can still push you into high load." /></span>
            <SliderInput
              label="Mental demand" value={currentEntry.mentalDemand}
              onChange={v => setCurrentEntry(p => ({ ...p, mentalDemand: v }))}
              lowLabel="Low" highLabel="Intense" color="#C4953A"
              tooltip="Cognitive effort today — deep focus work, complex decisions, learning, problem-solving. Low = light admin or rest day. High = mentally exhausting, hard to switch off."
            />
            <SliderInput
              label="Emotional load" value={currentEntry.emotionalLoad}
              onChange={v => setCurrentEntry(p => ({ ...p, emotionalLoad: v }))}
              lowLabel="Calm" highLabel="Overwhelming" color="#C4953A"
              tooltip="Emotional demands today — difficult conversations, worry, conflict, grief, caregiving. Low = calm, settled. High = emotionally drained or stretched thin."
            />
            <SliderInput
              label="Physical demand (non-exercise)" value={currentEntry.physicalDemand}
              onChange={v => setCurrentEntry(p => ({ ...p, physicalDemand: v }))}
              lowLabel="Sedentary" highLabel="Very active" color="#C4953A"
              tooltip="Physical activity outside structured exercise — walking, standing, manual work, childcare, housework. Low = mostly sitting. High = on your feet all day."
            />
          </div>

          {/* Training */}
          <div style={cardStyle}>
            <span style={sectionLabel}>Training<InfoTooltip text="Log what you actually did. Duration and RPE together calculate your training load score — it's not just about time, effort matters too." /></span>
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
              type="button"
              onClick={() => setCurrentEntry(p => ({ ...p, exercises: [...p.exercises, { type: "Gym — Strength", duration: 30, rpe: 5 }] }))}
              style={{ width: "100%", padding: "10px 0", borderRadius: 8, border: "1px dashed #CBD3D7", background: "none", fontFamily: FONTS, fontSize: 13, fontWeight: 500, color: "#8F979D", cursor: "pointer" }}
            >
              + Add exercise
            </button>
          </div>

          {/* Recovery */}
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
              type="button"
              onClick={() => setCurrentEntry(p => ({ ...p, recovery: [...p.recovery, { type: "Breathwork", duration: 10 }] }))}
              style={{ width: "100%", padding: "10px 0", borderRadius: 8, border: "1px dashed #A3D5D1", background: "none", fontFamily: FONTS, fontSize: 13, fontWeight: 500, color: "#5BABA5", cursor: "pointer" }}
            >
              + Add recovery activity
            </button>
            {currentEntry.recovery.length > 0 && (
              <div style={{ marginTop: 10, padding: "8px 12px", background: "#2A8A8408", borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#2A8A84" }}>Recovery credit<InfoTooltip text="The amount this subtracts from your total load today. Longer, more effective recovery activities earn more credit." /></span>
                <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 600, color: "#2A8A84" }}>
                  −{calcRecoveryCredit({ recovery: currentEntry.recovery }).toFixed(1)}
                </span>
              </div>
            )}
          </div>

          {/* End of day */}
          <div style={cardStyle}>
            <span style={sectionLabel}>End of day<InfoTooltip text="Mood and evening symptoms help us track whether your load is affecting how you feel as the day progresses. Evening symptoms are compared with this morning's to show your daily delta." /></span>
            <SliderInput
              label="Mood" value={currentEntry.mood}
              onChange={v => setCurrentEntry(p => ({ ...p, mood: v }))}
              lowLabel="Low" highLabel="Great" color="#5B8FB9"
              tooltip="How you're feeling emotionally today. Low = down, flat, or irritable. High = positive, grounded, generally okay. Neither extreme is wrong — just be honest."
            />
            {symptomOpts.map((s, i) => (
              <SliderInput
                key={s.id}
                label={`${s.label} (now)`}
                value={currentEntry.symptoms?.[s.id] ?? 3}
                onChange={v => setSymptom(s.id, v)}
                lowLabel={s.lowLabel} highLabel={s.highLabel}
                color={SYMPTOM_COLORS[i] ?? "#B5534A"}
                tooltip={`${s.description} — compare with this morning to see how the day affected you.`}
              />
            ))}
          </div>

          {/* Notes */}
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
        type="button"
        onClick={onSave}
        style={{ width: "100%", padding: "14px 0", borderRadius: 10, background: "#1C2E33", color: "#F7F9FA", border: "none", fontFamily: FONTS, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 20 }}
      >
        {isMorning ? "Save & see readiness" : "Save evening log"}
      </button>
    </div>
  );
}
