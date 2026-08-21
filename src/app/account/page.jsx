"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function AccountPage() {
  const { user, loading, signOut, testLogin } = useAuth();
  const [email, setEmail] = useState("test@happyfactory.app");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const onSignIn = async () => {
    setBusy(true); setError(null);
    try { await testLogin(email); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  if (loading) return <p className="page-sub">Loading…</p>;

  return (
    <>
      <h1 className="page-title">Account</h1>
      {user ? (
        <div className="card" style={{ display: "grid", gap: 10 }}>
          <div className="recipe-stat-label">Signed in as</div>
          <div className="recipe-stat-value">{user.email}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={signOut}>Sign out</button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ display: "grid", gap: 10 }}>
          <p className="recipe-line">Sign in to sync recipes across devices, share permalinks, and track quota server-side.</p>
          <label className="scene-field">
            <span className="input-label">Email (test login — preview &amp; localhost only)</span>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </label>
          <div>
            <button type="button" className="btn btn-primary" onClick={onSignIn} disabled={busy}>
              {busy ? "Signing in…" : "Test sign in"}
            </button>
          </div>
          {error && <p className="field-error">{error}</p>}
        </div>
      )}
    </>
  );
}
