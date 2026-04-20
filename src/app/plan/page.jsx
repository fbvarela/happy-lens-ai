"use client";

import Link from "next/link";
import { useState } from "react";
import { useT, useLocale } from "@/lib/i18n/LocaleProvider";

function todayDateLocal() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

function fmtTime(iso, locale) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString(locale === "es" ? "es-ES" : "en-GB", {
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
  } catch { return "—"; }
}

export default function PlanPage() {
  const t = useT();
  const { locale } = useLocale();
  const [form, setForm] = useState({ lat: "", lng: "", date: todayDateLocal(), notes: "" });
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState(null);

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, lat: pos.coords.latitude.toFixed(4), lng: pos.coords.longitude.toFixed(4) }));
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 10000, maximumAge: 60000 },
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null); setPlan(null);
    try {
      const res = await fetch("/api/plan/day", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: +form.lat, lng: +form.lng,
          date: new Date(`${form.date}T12:00:00Z`).toISOString(),
          notes: form.notes, locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed.");
      setPlan(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="page-title">{t("plan.title")}</h1>
      <p className="page-sub">{t("plan.sub")}</p>

      <form onSubmit={submit} className="card coach-card coach-form">
        <div className="coach-section">
          <div className="coach-step-title"><span className="step-num">1</span> {t("plan.form.location")}</div>
          <div className="scene-grid">
            <label className="scene-field">
              <span className="input-label">{t("plan.form.latitude")}</span>
              <input className="input" inputMode="decimal" autoComplete="off"
                value={form.lat}
                onChange={(e) => setForm({ ...form, lat: e.target.value })}
                placeholder="40.4168" required />
            </label>
            <label className="scene-field">
              <span className="input-label">{t("plan.form.longitude")}</span>
              <input className="input" inputMode="decimal" autoComplete="off"
                value={form.lng}
                onChange={(e) => setForm({ ...form, lng: e.target.value })}
                placeholder="-3.7038" required />
            </label>
            <div className="full">
              <button type="button" className="locate-btn" onClick={useMyLocation} disabled={locating}>
                <span aria-hidden>📍</span>
                <span>{locating ? t("plan.form.locating") : t("plan.form.locate")}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="coach-section">
          <div className="coach-step-title"><span className="step-num">2</span> {t("plan.form.date")}</div>
          <div className="scene-grid">
            <label className="scene-field full">
              <span className="input-label">{t("plan.form.date")}</span>
              <input type="date" className="input"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required />
            </label>
            <label className="scene-field full">
              <span className="input-label">{t("plan.form.notes")}</span>
              <input className="input"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder={t("plan.form.notesPlaceholder")} />
            </label>
          </div>
        </div>

        <button type="submit" className="btn btn-primary coach-submit" disabled={loading}>
          {loading ? t("plan.form.loading") : t("plan.form.submit")}
        </button>
        {error && <p className="field-error" style={{ margin: 0 }}>{error}</p>}
      </form>

      {plan && <PlanResults plan={plan} t={t} locale={locale} form={form} />}
    </>
  );
}

function PlanResults({ plan, t, locale, form }) {
  return (
    <section style={{ marginTop: 20, display: "grid", gap: 14 }}>
      {plan.summary && (
        <div className="card">
          <p className="recipe-line" style={{ margin: 0 }}>{plan.summary}</p>
        </div>
      )}

      {plan.windows && <TimelineCard windows={plan.windows} t={t} locale={locale} />}
      {plan.weather && <WeatherStrip hours={plan.weather} t={t} locale={locale} />}

      {plan.slots?.length > 0 && (
        <div>
          <h2 className="card-title" style={{ fontSize: "1.1rem", marginBottom: 12 }}>{t("plan.slots.title")}</h2>
          <div className="recipe-grid">
            {plan.slots.map((slot, i) => (
              <SlotCard key={i} slot={slot} t={t} locale={locale} form={form} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function TimelineCard({ windows, t, locale }) {
  const rows = [
    ["plan.timeline.sunrise",    windows.sun.sunrise,        "🌅"],
    ["plan.timeline.goldenMorn", windows.sun.goldenHourMorn, "✨"],
    ["plan.timeline.noon",       windows.sun.solarNoon,      "☀️"],
    ["plan.timeline.goldenEve",  windows.sun.goldenHourEve,  "🌇"],
    ["plan.timeline.sunset",     windows.sun.sunset,         "🌄"],
    ["plan.timeline.blue",       windows.sun.blueHourStart,  "🌆"],
    ["plan.timeline.astroStart", windows.sun.astroDarkStart, "🌌"],
  ].filter(([, v]) => !!v);
  const moonRows = [
    ["plan.timeline.moonRise", windows.moon.rise, "🌙"],
    ["plan.timeline.moonSet",  windows.moon.set,  "🌑"],
  ].filter(([, v]) => !!v);
  return (
    <div className="card">
      <div className="card-title">{t("plan.timeline.title")}</div>
      <ul className="timeline">
        {rows.map(([k, v, icon]) => (
          <li key={k} className="timeline-row">
            <span className="timeline-icon" aria-hidden>{icon}</span>
            <span className="timeline-label">{t(k)}</span>
            <span className="timeline-value">{fmtTime(v, locale)}</span>
          </li>
        ))}
        {moonRows.map(([k, v, icon]) => (
          <li key={k} className="timeline-row">
            <span className="timeline-icon" aria-hidden>{icon}</span>
            <span className="timeline-label">{t(k)}</span>
            <span className="timeline-value">{fmtTime(v, locale)}</span>
          </li>
        ))}
        <li className="timeline-row">
          <span className="timeline-icon" aria-hidden>🌙</span>
          <span className="timeline-label">{t("plan.timeline.moon")}</span>
          <span className="timeline-value">{Math.round(windows.moon.fraction * 100)}%</span>
        </li>
      </ul>
    </div>
  );
}

function WeatherStrip({ hours, t, locale }) {
  const keyHours = [7, 11, 15, 19, 22]
    .map((h) => hours.find((x) => new Date(x.time).getUTCHours() === h))
    .filter(Boolean);
  if (!keyHours.length) return null;
  return (
    <div className="card">
      <div className="card-title">{t("plan.weather.title")}</div>
      <div className="weather-strip">
        {keyHours.map((h) => (
          <div key={h.time} className="weather-col">
            <div className="weather-time">{fmtTime(h.time, locale)}</div>
            <div className="weather-temp">{h.tempC != null ? `${Math.round(h.tempC)}°` : "—"}</div>
            <div className="weather-meta">☁️ {h.cloudCoverPct ?? "—"}%</div>
            <div className="weather-meta">💨 {h.windKph ?? "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlotCard({ slot, t, locale, form }) {
  const dt = new Date(slot.time);
  const pad = (n) => String(n).padStart(2, "0");
  const localDT = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  const coachUrl = `/coach?subject=${slot.subjectId}&lat=${form.lat}&lng=${form.lng}&dateTime=${encodeURIComponent(localDT)}`;
  return (
    <article className="card">
      <div className="recipe-head">
        <div className="card-title" style={{ margin: 0 }}>{fmtTime(slot.time, locale)} · {t(`subject.${slot.subjectId}`)}</div>
        <span className="badge badge-sun">{slot.cameraMode}</span>
      </div>
      <p className="recipe-line"><strong>{slot.headline}</strong></p>
      <p className="recipe-line" style={{ color: "var(--text-muted)" }}>{slot.rationale}</p>
      <div className="recipe-stats" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div>
          <div className="recipe-stat-label">{t("coach.recipe.lens")}</div>
          <div className="recipe-stat-value">{t(`lens.${slot.lens}`)}</div>
        </div>
        <div>
          <div className="recipe-stat-label">{t("coach.recipe.mode")}</div>
          <div className="recipe-stat-value">{slot.cameraMode}</div>
        </div>
      </div>
      <Link href={coachUrl} className="btn btn-sun">{t("plan.slots.openInCoach")}</Link>
    </article>
  );
}
