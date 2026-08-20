"use client";

import { useState } from "react";
import {
  MapPin, Stars, Moon, Cloud, Sunset, CloudMoon, Sparkles,
} from "lucide-react";
import { useT, useLocale } from "@/lib/i18n/LocaleProvider";
import { dayWindows, hourlyWeather } from "@/lib/sun-day";

function todayNoonISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  const day = new Date(d.getTime() - tz).toISOString().slice(0, 10);
  return new Date(`${day}T12:00:00Z`).toISOString();
}

function fmtTime(iso, locale) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString(locale === "es" ? "es-ES" : "en-GB", {
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
  } catch { return "—"; }
}

function moonPhaseName(phase, t) {
  const keys = ["new", "waxCrescent", "firstQuarter", "waxGibbous", "full", "wanGibbous", "lastQuarter", "wanCrescent"];
  const idx = Math.floor(((phase + 1 / 16) % 1) * 8);
  return t(`conditions.moonPhase.${keys[idx]}`);
}

export default function ConditionsPage() {
  const t = useT();
  const { locale } = useLocale();
  const [form, setForm] = useState({ lat: "", lng: "" });
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm({ lat: pos.coords.latitude.toFixed(4), lng: pos.coords.longitude.toFixed(4) });
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 10000, maximumAge: 60000 },
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null); setData(null);
    const lat = +form.lat, lng = +form.lng;
    if (!isFinite(lat) || !isFinite(lng)) { setError(t("conditions.errors.coords")); setLoading(false); return; }
    try {
      const date = todayNoonISO();
      const windows = dayWindows({ lat, lng, date });
      const hours = await hourlyWeather({ lat, lng, date });
      if (!windows) throw new Error(t("conditions.errors.coords"));
      setData({ windows, hours });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="page-title">{t("conditions.title")}</h1>
      <p className="page-sub">{t("conditions.sub")}</p>

      <form onSubmit={submit} className="card coach-card coach-form">
        <div className="coach-section">
          <div className="coach-step-title"><span className="step-num">1</span> {t("conditions.form.location")}</div>
          <div className="scene-grid">
            <label className="scene-field">
              <span className="input-label">{t("conditions.form.latitude")}</span>
              <input className="input" inputMode="decimal" autoComplete="off"
                value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })}
                placeholder="40.4168" required />
            </label>
            <label className="scene-field">
              <span className="input-label">{t("conditions.form.longitude")}</span>
              <input className="input" inputMode="decimal" autoComplete="off"
                value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })}
                placeholder="-3.7038" required />
            </label>
            <div className="full">
              <button type="button" className="locate-btn" onClick={useMyLocation} disabled={locating}>
                <MapPin size={16} aria-hidden />
                <span>{locating ? t("conditions.form.locating") : t("conditions.form.locate")}</span>
              </button>
            </div>
          </div>
        </div>
        <button type="submit" className="btn btn-primary coach-submit" disabled={loading}>
          {loading ? t("conditions.form.loading") : t("conditions.form.submit")}
        </button>
        {error && <p className="field-error" style={{ margin: 0 }}>{error}</p>}
      </form>

      {data && <Results data={data} t={t} locale={locale} />}
    </>
  );
}

function astroVerdict(windows, hours) {
  const dark = windows.sun.astroDarkStart;
  if (!dark) return { level: "bad", key: "noDark" };
  const frac = windows.moon.fraction ?? 0;
  let avgCloud = null;
  if (hours?.length) {
    const sunset = windows.sun.sunset;
    const night = hours.filter((h) => !sunset || h.time >= sunset);
    const vals = night.map((h) => h.cloudCoverPct).filter((v) => v != null);
    if (vals.length) avgCloud = vals.reduce((a, b) => a + b, 0) / vals.length;
  }
  if (avgCloud != null && avgCloud > 60) return { level: "bad", key: "clouds" };
  if (frac > 0.6) return { level: "poor", key: "brightMoon" };
  if (frac > 0.3) return { level: "fair", key: "someMoon" };
  return { level: "good", key: "clear" };
}

function Results({ data, t, locale }) {
  const { windows, hours } = data;
  const verdict = astroVerdict(windows, hours);
  const badge = verdict.level === "good" ? "badge-leaf" : verdict.level === "fair" ? "badge-sun" : "badge-clay";
  return (
    <section style={{ marginTop: 20, display: "grid", gap: 14 }}>
      <div className="card">
        <div className="recipe-head">
          <div className="card-title" style={{ margin: 0 }}>{t("conditions.verdict.title")}</div>
          <span className={`badge ${badge}`}>{t(`conditions.verdict.level.${verdict.level}`)}</span>
        </div>
        <p className="recipe-line" style={{ margin: 0 }}>{t(`conditions.verdict.key.${verdict.key}`)}</p>
      </div>

      <TimelineCard windows={windows} t={t} locale={locale} />
      <MoonCard windows={windows} t={t} locale={locale} />
      {hours && <CloudsCard windows={windows} hours={hours} t={t} locale={locale} />}
    </section>
  );
}

function TimelineCard({ windows, t, locale }) {
  const rows = [
    ["conditions.timeline.goldenEve", windows.sun.goldenHourEve, Sparkles],
    ["conditions.timeline.sunset", windows.sun.sunset, Sunset],
    ["conditions.timeline.blue", windows.sun.blueHourStart, CloudMoon],
    ["conditions.timeline.astroStart", windows.sun.astroDarkStart, Stars],
    ["conditions.timeline.astroEnd", windows.sun.astroDarkEnd, Stars],
  ].filter(([, v]) => !!v);
  if (!rows.length) return null;
  return (
    <div className="card">
      <div className="card-title">{t("conditions.timeline.title")}</div>
      <ul className="timeline">
        {rows.map(([k, v, Icon]) => (
          <li key={k} className="timeline-row">
            <span className="timeline-icon" aria-hidden><Icon size={18} /></span>
            <span className="timeline-label">{t(k)}</span>
            <span className="timeline-value">{fmtTime(v, locale)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MoonCard({ windows, t, locale }) {
  const m = windows.moon;
  return (
    <div className="card">
      <div className="card-title">{t("conditions.moon.title")}</div>
      <div className="recipe-stats" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div>
          <div className="recipe-stat-label">{t("conditions.moon.phase")}</div>
          <div className="recipe-stat-value" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Moon size={16} aria-hidden /> {moonPhaseName(m.phase, t)}
          </div>
        </div>
        <div>
          <div className="recipe-stat-label">{t("conditions.moon.illumination")}</div>
          <div className="recipe-stat-value">{Math.round(m.fraction * 100)}%</div>
        </div>
        <div>
          <div className="recipe-stat-label">{t("conditions.moon.rise")}</div>
          <div className="recipe-stat-value">{fmtTime(m.rise, locale)}</div>
        </div>
        <div>
          <div className="recipe-stat-label">{t("conditions.moon.set")}</div>
          <div className="recipe-stat-value">{fmtTime(m.set, locale)}</div>
        </div>
      </div>
    </div>
  );
}

function CloudsCard({ windows, hours, t, locale }) {
  const sunset = windows.sun.sunset;
  const night = hours.filter((h) => !sunset || h.time >= sunset).slice(0, 8);
  if (!night.length) return null;
  return (
    <div className="card">
      <div className="card-title">{t("conditions.clouds.title")}</div>
      <div className="weather-strip">
        {night.map((h) => (
          <div key={h.time} className="weather-col">
            <div className="weather-time">{fmtTime(h.time, locale)}</div>
            <div className="weather-meta" style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
              <Cloud size={13} aria-hidden /> {h.cloudCoverPct ?? "—"}%
            </div>
            {h.tempC != null && <div className="weather-temp">{Math.round(h.tempC)}°</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
