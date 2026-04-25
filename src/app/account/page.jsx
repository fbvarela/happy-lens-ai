"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isPremium } from "@/lib/tier";

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
          <div className="recipe-stat-label" style={{ marginTop: 6 }}>Plan</div>
          <div>
            <span className={`badge ${isPremium(user.plan) ? "badge-leaf" : "badge-sun"}`}>{user.plan}</span>
          </div>
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

      <section style={{ marginTop: 20 }}>
        <h2 className="card-title">Plans</h2>
        <div className="card-grid" style={{ marginTop: 10 }}>
          <div className="card">
            <div className="recipe-head">
              <div className="card-title" style={{ margin: 0 }}>Free</div>
              <span className="badge badge-sun">Current</span>
            </div>
            <ul className="recipe-tips">
              <li>5 recipes / day</li>
              <li>Last 10 in history</li>
              <li>Standard Photographic Styles</li>
            </ul>
          </div>
          <div className="card">
            <div className="recipe-head">
              <div className="card-title" style={{ margin: 0 }}>Premium</div>
              <span className="badge badge-leaf">$9.99/mo</span>
            </div>
            <ul className="recipe-tips">
              <li>Unlimited recipes</li>
              <li>Custom Photographic Style tuning</li>
              <li>Subject memory + batch (up to 12)</li>
              <li>Cross-device permalinks</li>
            </ul>
            <p className="recipe-line" style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Stripe checkout coming soon.</p>
          </div>
          <div className="card">
            <div className="recipe-head">
              <div className="card-title" style={{ margin: 0 }}>Bundle</div>
              <span className="badge badge-leaf">$19.99/mo</span>
            </div>
            <ul className="recipe-tips">
              <li>Premium across every Happy Factory app</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
