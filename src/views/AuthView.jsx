import { useState } from "react";
import { FONTS, SERIF, cardStyle, pageStyle } from "../lib/constants.js";
import { supabase } from "../lib/supabase.js";

const INPUT = {
  width: "100%", fontFamily: FONTS, fontSize: 14,
  padding: "11px 14px", border: "1.5px solid #E2E7EA",
  borderRadius: 8, background: "#FFF", color: "#1C2E33",
  outline: "none", boxSizing: "border-box"
};

const BTN_PRIMARY = {
  width: "100%", padding: "13px 0", borderRadius: 10,
  border: "none", background: "#1C2E33", color: "#F7F9FA",
  fontFamily: FONTS, fontSize: 14, fontWeight: 600,
  cursor: "pointer", marginTop: 10
};

const BTN_LINK = {
  background: "none", border: "none", fontFamily: FONTS,
  fontSize: 13, cursor: "pointer", padding: 0
};

function friendlyError(msg = "") {
  if (msg.includes("Invalid login credentials")) return "Wrong email or password. Try again, or reset your password below.";
  if (msg.includes("already registered") || msg.includes("User already registered")) return "There's already an account with that email. Log in instead.";
  if (msg.includes("Email not confirmed")) return "You need to confirm your email first — check your inbox.";
  if (msg.includes("Password should be at least")) return "Password needs to be at least 6 characters.";
  if (msg.includes("Unable to validate email") || msg.includes("invalid email")) return "That doesn't look like a valid email address.";
  if (msg.includes("For security purposes")) return "Too many attempts. Wait a minute and try again.";
  return msg || "Something went wrong. Please try again.";
}

export default function AuthView({ onSuccess }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const switchMode = (m) => { setMode(m); setError(""); setSuccess(""); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onSuccess(data.user);

      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          onSuccess(data.user);
        } else {
          setSuccess("Almost there — check your email for a confirmation link, then come back and log in.");
        }

      } else if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
        setSuccess("Link sent. Check your email — it should arrive in under a minute.");

      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        setSuccess("Reset link sent. Check your email.");
      }
    } catch (err) {
      setError(friendlyError(err.message));
    } finally {
      setLoading(false);
    }
  };

  const titles = { login: "Welcome back", signup: "Get started", magic: "Sign in without a password", forgot: "Reset your password" };
  const ctaLabels = { login: "Log in", signup: "Create account", magic: "Send me a login link", forgot: "Send reset link" };

  return (
    <div style={{ ...pageStyle, display: "flex", flexDirection: "column", padding: "0 20px 80px" }}>
      <div style={{ paddingTop: 72, paddingBottom: 28, textAlign: "center" }}>
        <h1 style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 500, color: "#1C2E33", margin: 0 }}>SteadyState</h1>
        <p style={{ fontSize: 13, color: "#8F979D", margin: "6px 0 0", lineHeight: 1.5 }}>
          Know when to push. Know when to rest.
        </p>
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 500, color: "#1C2E33", margin: "0 0 18px" }}>
          {titles[mode]}
        </h2>

        <form onSubmit={handleSubmit}>
          <input
            type="email" required placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ ...INPUT, marginBottom: 10 }}
            autoComplete="email" autoCapitalize="none" autoCorrect="off"
          />

          {(mode === "login" || mode === "signup") && (
            <input
              type="password" required placeholder="Password" value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ ...INPUT, marginBottom: 4 }}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          )}

          {error && (
            <p style={{ fontSize: 13, color: "#B5534A", margin: "10px 0 0", lineHeight: 1.45 }}>{error}</p>
          )}
          {success && (
            <p style={{ fontSize: 13, color: "#2A8A84", margin: "10px 0 0", lineHeight: 1.5, padding: "10px 12px", background: "#2A8A8410", borderRadius: 6 }}>
              {success}
            </p>
          )}

          {!success && (
            <button type="submit" disabled={loading} style={{ ...BTN_PRIMARY, opacity: loading ? 0.65 : 1 }}>
              {loading ? "…" : ctaLabels[mode]}
            </button>
          )}
        </form>
      </div>

      <div style={{ marginTop: 20, textAlign: "center", display: "flex", flexDirection: "column", gap: 12 }}>
        {mode === "login" && (
          <>
            <p style={{ margin: 0, fontSize: 13, color: "#888" }}>
              New here?{" "}
              <button onClick={() => switchMode("signup")} style={{ ...BTN_LINK, color: "#2A8A84", textDecoration: "underline" }}>
                Get started
              </button>
            </p>
            <p style={{ margin: 0, fontSize: 13, color: "#8F979D" }}>
              <button onClick={() => switchMode("forgot")} style={{ ...BTN_LINK, color: "#8F979D" }}>
                Forgot password?
              </button>
              {" · "}
              <button onClick={() => switchMode("magic")} style={{ ...BTN_LINK, color: "#8F979D" }}>
                Send me a login link
              </button>
            </p>
          </>
        )}
        {mode === "signup" && (
          <p style={{ margin: 0, fontSize: 13, color: "#888" }}>
            Already have an account?{" "}
            <button onClick={() => switchMode("login")} style={{ ...BTN_LINK, color: "#2A8A84", textDecoration: "underline" }}>
              Log in
            </button>
          </p>
        )}
        {(mode === "magic" || mode === "forgot") && (
          <p style={{ margin: 0, fontSize: 13, color: "#8F979D" }}>
            <button onClick={() => switchMode("login")} style={{ ...BTN_LINK, color: "#8F979D" }}>
              ← Back to log in
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
