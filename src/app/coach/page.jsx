"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SUBJECT_PRESETS, getSubjectPreset } from "@/data/subjects/presets";
import { PET_CONTEXTS } from "@/data/subjects/pet-contexts";
import { TIME_PRESETS, resolveTimePreset } from "@/lib/time-presets";
import { useT, useLocale } from "@/lib/i18n/LocaleProvider";
import { useGearStore } from "@/lib/gear-store";
import {
  ApertureIcon, ShutterIcon, IsoIcon, EvIcon, ModeDialIcon,
  FocusIcon, StabIcon, FlashOnIcon, FlashOffIcon,
  StyleSwatchIcon, CameraControlIcon, LockIcon,
  MacroIcon, NightIcon, LensRingIcon, SunCompassIcon,
} from "@/components/icons";

export default function CoachPage() {
  return (
    <Suspense fallback={null}>
      <CoachPageInner />
    </Suspense>
  );
}

function CoachPageInner() {
  const t = useT();
  const { locale } = useLocale();
  const params = useSearchParams();
  const gearStore = useGearStore();
  const [subjectId, setSubjectId] = useState("portrait");
  const [scene, setScene] = useState({
    lat: "",
    lng: "",
    dateTime: new Date().toISOString().slice(0, 16),
    notes: "",
  });
  const [useFlash, setUseFlash] = useState(false);
  const [petContext, setPetContext] = useState("portrait");
  const [animal, setAnimal] = useState("cat");
  const [locating, setLocating] = useState(false);
  const [timeHint, setTimeHint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const active = gearStore.active;
  const hasFlash = (active?.flashes?.length || 0) > 0;

  useEffect(() => {
    const qSubject = params.get("subject");
    const qLat = params.get("lat");
    const qLng = params.get("lng");
    const qDt = params.get("dateTime");
    if (qSubject && SUBJECT_PRESETS.some((s) => s.id === qSubject)) setSubjectId(qSubject);
    if (qLat || qLng || qDt) {
      setScene((s) => ({
        ...s,
        lat: qLat ?? s.lat,
        lng: qLng ?? s.lng,
        dateTime: qDt ?? s.dateTime,
      }));
    }
  }, [params]);

  useEffect(() => { if (!hasFlash) setUseFlash(false); }, [hasFlash]);

  useEffect(() => {
    try {
      const savedAnimal = localStorage.getItem("hl.coach.pet.animal.v1");
      if (savedAnimal && ["cat", "dog", "other"].includes(savedAnimal)) setAnimal(savedAnimal);
    } catch {}
  }, []);

  const changeAnimal = (a) => {
    setAnimal(a);
    try { localStorage.setItem("hl.coach.pet.animal.v1", a); } catch {}
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) { setError(t("coach.locate.unavailable")); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setScene((s) => ({ ...s, lat: pos.coords.latitude.toFixed(4), lng: pos.coords.longitude.toFixed(4) }));
        setLocating(false);
      },
      (err) => { setError(err.message); setLocating(false); },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null); setResult(null);
    const payload = {
      subjectId,
      gearId: active.id,
      gear: active,
      useFlash: useFlash && hasFlash,
      locale,
      scene: {
        lat: scene.lat ? +scene.lat : null,
        lng: scene.lng ? +scene.lng : null,
        dateTime: scene.dateTime ? new Date(scene.dateTime).toISOString() : null,
        notes: scene.notes,
      },
      ...(subjectId === "pets" ? { petContext, animal } : {}),
    };
    const storageKey = offlineKey(payload);
    try {
      const res = await fetch("/api/coach/advice", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.code === "scene-incompatible") throw new Error(`Scene: ${data.error}`);
        throw new Error(data?.error || "Request failed.");
      }
      setResult(data);
      try { localStorage.setItem(storageKey, JSON.stringify(data)); } catch {}
    } catch (err) {
      const offline = readOffline(storageKey);
      if (offline) { setResult({ ...offline, source: "offline" }); setError(null); }
      else setError(err.message);
    } finally { setLoading(false); }
  };

  const lensLabel = (id) => {
    const builtin = active.lenses.find((l) => l.id === id);
    if (builtin?.label) return builtin.label;
    const translated = t(`lens.${id}`);
    return translated !== `lens.${id}` ? translated : id;
  };

  return (
    <>
      <h1 className="page-title">{t("coach.title")}</h1>
      <p className="page-sub">{t("coach.sub")}</p>

      <form onSubmit={submit} className="card coach-card coach-form">
        <div className="coach-section">
          <div className="coach-step-title">
            <span className="step-num">1</span> {t("coach.step.subject")}
          </div>
          <div className="chip-row" role="listbox" aria-label={t("coach.step.subject")}>
            {SUBJECT_PRESETS.map((s) => (
              <button key={s.id} type="button" onClick={() => setSubjectId(s.id)}
                className="chip" aria-pressed={subjectId === s.id}>
                <span aria-hidden>{s.icon}</span>
                <span>{t(`subject.${s.id}`)}</span>
              </button>
            ))}
          </div>
          {subjectId === "pets" && (
            <div className="pets-subpicker">
              <div className="input-label" style={{ marginTop: 10 }}>{t("pets.contextLabel")}</div>
              <div className="chip-row" role="listbox" aria-label={t("pets.contextLabel")}>
                {Object.values(PET_CONTEXTS).map((c) => (
                  <button key={c.id} type="button" onClick={() => setPetContext(c.id)}
                    className="chip chip-sm" aria-pressed={petContext === c.id}>
                    <span aria-hidden>{c.icon}</span>
                    <span>{t(`pets.context.${c.id}`)}</span>
                  </button>
                ))}
              </div>
              <div className="input-label" style={{ marginTop: 10 }}>{t("pets.animalLabel")}</div>
              <div className="chip-row" role="radiogroup" aria-label={t("pets.animalLabel")}>
                {[
                  { id: "cat", icon: "🐈" },
                  { id: "dog", icon: "🐕" },
                  { id: "other", icon: "🐾" },
                ].map((a) => (
                  <button key={a.id} type="button" role="radio" onClick={() => changeAnimal(a.id)}
                    className="chip chip-sm" aria-checked={animal === a.id} aria-pressed={animal === a.id}>
                    <span aria-hidden>{a.icon}</span>
                    <span>{t(`pets.animal.${a.id}`)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="coach-section">
          <div className="coach-step-title">
            <span className="step-num">2</span> {t("coach.step.scene")}
          </div>
          <div className="scene-grid">
            <label className="scene-field">
              <span className="input-label">{t("coach.field.latitude")}</span>
              <input className="input" inputMode="decimal" autoComplete="off"
                value={scene.lat}
                onChange={(e) => setScene({ ...scene, lat: e.target.value })}
                placeholder="40.4168" />
            </label>
            <label className="scene-field">
              <span className="input-label">{t("coach.field.longitude")}</span>
              <input className="input" inputMode="decimal" autoComplete="off"
                value={scene.lng}
                onChange={(e) => setScene({ ...scene, lng: e.target.value })}
                placeholder="-3.7038" />
            </label>
            <label className="scene-field full">
              <span className="input-label">{t("coach.field.dateTime")}</span>
              <input type="datetime-local" className="input"
                value={scene.dateTime}
                onChange={(e) => { setScene({ ...scene, dateTime: e.target.value }); setTimeHint(null); }} />
            </label>
            <div className="full time-presets">
              {TIME_PRESETS().map((p) => (
                <button key={p.id} type="button" className="chip"
                  onClick={() => {
                    const r = resolveTimePreset(p.id, {
                      lat: scene.lat ? +scene.lat : null,
                      lng: scene.lng ? +scene.lng : null,
                    });
                    if (r.error) { setTimeHint({ kind: "error", text: t("coach.timePreset.needCoords") }); return; }
                    setScene((s) => ({ ...s, dateTime: r.dateTime }));
                    setTimeHint({ kind: "ok", text: t("coach.timePreset.setTo", t(`coach.timePreset.${p.id}`)) });
                  }}>
                  <span aria-hidden>{p.icon}</span>
                  <span>{t(`coach.timePreset.${p.id}`)}</span>
                </button>
              ))}
            </div>
            {timeHint && <p className={`full time-hint ${timeHint.kind}`}>{timeHint.text}</p>}
            <div className="full">
              <button type="button" className="locate-btn" onClick={useMyLocation} disabled={locating}>
                <span aria-hidden>📍</span>
                <span>{locating ? t("coach.locate.locating") : t("coach.locate.ready")}</span>
              </button>
            </div>
            <label className="scene-field full">
              <span className="input-label">{t("coach.field.notes")}</span>
              <input className="input"
                value={scene.notes}
                onChange={(e) => setScene({ ...scene, notes: e.target.value })}
                placeholder={t("coach.placeholder.notes")} />
            </label>
          </div>
        </div>

        <div className="coach-section">
          <div className="coach-step-title">
            <span className="step-num">3</span> {t("coach.step.gear")}
          </div>
          <div className="chip-row">
            {gearStore.all.map((g) => (
              <button key={g.id} type="button" onClick={() => gearStore.setActiveId(g.id)}
                className="chip" aria-pressed={g.id === active.id}>
                <span aria-hidden>{g.kind === "phone" ? "📱" : g.kind === "dslr" ? "📷" : "🎥"}</span>
                <span>{g.label}</span>
              </button>
            ))}
            <a href="/gear" className="chip" aria-label={t("gear.manage")}>
              <span aria-hidden>⚙️</span>
              <span>{t("gear.manage")}</span>
            </a>
          </div>
          <div className="gear-pill" style={{ marginTop: 10 }}>
            <span className="gear-icon" aria-hidden>{active.kind === "phone" ? "📱" : "📷"}</span>
            <div className="gear-text">
              <span className="gear-label">{active.label}</span>
              <span className="gear-meta">
                {active.lenses.map((l) => l.label).join(" · ")}
              </span>
            </div>
          </div>
          {hasFlash && (
            <label className="flash-toggle">
              <input type="checkbox" checked={useFlash} onChange={(e) => setUseFlash(e.target.checked)} />
              <span className="flash-toggle-label">
                <span aria-hidden>⚡</span> {t("coach.flash.use", active.flashes[0].label)}
              </span>
            </label>
          )}
        </div>

        <button type="submit" className="btn btn-primary coach-submit" disabled={loading}>
          {loading ? t("coach.submit.loading") : t("coach.submit.idle")}
        </button>
        {error && !error.startsWith("Scene:") && <p className="field-error" style={{ margin: 0 }}>{error}</p>}
      </form>

      {error?.startsWith("Scene:") && (
        <div className="card scene-block">
          <div className="card-title">{t("coach.sceneBlock.title")}</div>
          <p style={{ margin: 0, color: "var(--text-muted)" }}>{error.replace(/^Scene:\s*/, "")}</p>
          <p style={{ marginTop: 10, marginBottom: 0, fontSize: 13, color: "var(--text-muted)" }}>
            {t("coach.sceneBlock.hint")}
          </p>
        </div>
      )}

      {result && <Results result={result} subjectId={subjectId} t={t} lensLabel={lensLabel} />}
    </>
  );
}

function Results({ result, subjectId, t, lensLabel }) {
  return (
    <section style={{ marginTop: 20, display: "grid", gap: 14 }}>
      {(result.sky || result.weather) && (
        <div className="card">
          <div className="card-title">{t("coach.sky.title")}</div>
          <div className="sky-row">
            {result.sky && (<>
              <span className="sky-item">
                <SunCompassIcon azimuthDeg={result.sky.sun.azimuthDeg} size={22} title={t("coach.icons.sunPosition")} />
                alt {result.sky.sun.altitudeDeg}° · az {result.sky.sun.azimuthDeg}°
              </span>
              <span className="sky-item">
                <NightIcon size={16} className="inline-icon" title={t("coach.icons.night")} />
                moon {Math.round(result.sky.moon.fraction * 100)}%
              </span>
            </>)}
            {result.weather && (<>
              {result.weather.label && <span>⛅ {result.weather.label}</span>}
              {result.weather.tempC != null && <span>🌡 {Math.round(result.weather.tempC)}°C</span>}
              {result.weather.cloudCoverPct != null && <span>☁️ {result.weather.cloudCoverPct}%</span>}
              {result.weather.windKph != null && <span>💨 {result.weather.windKph} km/h</span>}
              {result.weather.precipMm > 0 && <span>🌧 {result.weather.precipMm} mm</span>}
            </>)}
          </div>
        </div>
      )}
      <div className="advice-grid">
        {result.advice.map((a, i) => (
          <AdviceCard key={i} advice={a} subjectId={subjectId} t={t} lensLabel={lensLabel} />
        ))}
      </div>
      {result.source && <SourceBadge source={result.source} t={t} />}
    </section>
  );
}

function AdviceCard({ advice: r, subjectId, t, lensLabel }) {
  const feedbackKey = `hl.coach.fb.${subjectId}.${r.label}`;
  const [vote, setVote] = useState(() => {
    if (typeof window === "undefined") return null;
    try { return localStorage.getItem(feedbackKey); } catch { return null; }
  });
  const [copied, setCopied] = useState(false);

  const rate = (v) => {
    const next = vote === v ? null : v;
    setVote(next);
    try {
      if (next) localStorage.setItem(feedbackKey, next);
      else localStorage.removeItem(feedbackKey);
    } catch {}
  };

  const copy = async () => {
    const text = [
      `${r.label} — ${r.cameraMode}`,
      `${lensLabel(r.lens)} · f/${r.fNumber} · ${r.shutter} · ISO ${r.iso} · EV ${r.ev > 0 ? "+" : ""}${r.ev}`,
      `${t("coach.advice.position")}: ${r.position}`,
      `${t("coach.advice.focus")}: ${r.focus}`,
      `${t("coach.advice.stabilization")}: ${r.stabilization}`,
      r.flash?.use ? `${t("coach.advice.flash")}: ${r.flash.notes}` : null,
      r.iphone?.format ? `${t("coach.advice.iphone.format")}: ${r.iphone.format}` : null,
      r.iphone?.photographicStyle ? `${t("coach.advice.iphone.style")}: ${r.iphone.photographicStyle}` : null,
      r.iphone?.cameraControlHint ? `${t("coach.advice.iphone.cameraControl")}: ${r.iphone.cameraControlHint}` : null,
      r.iphone?.aeAfLockHint ? `${t("coach.advice.iphone.aeAfLock")}: ${r.iphone.aeAfLockHint}` : null,
      ...r.compositionTips.map((x) => `• ${x}`),
    ].filter(Boolean).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <article className="card">
      <div className="advice-head">
        <div className="card-title" style={{ margin: 0 }}>{r.label}</div>
        <span className="badge badge-sun">{r.cameraMode}</span>
      </div>
      <div className="advice-stats">
        <Stat icon={<LensRingIcon lens={r.lens} title={t("coach.icons.lens")} />} label={t("coach.advice.lens")} value={lensLabel(r.lens)} />
        <Stat icon={<ApertureIcon title={t("coach.icons.aperture")} />} label={t("coach.advice.aperture")} value={`f/${r.fNumber}`} />
        <Stat icon={<ShutterIcon title={t("coach.icons.shutter")} />} label={t("coach.advice.shutter")} value={r.shutter} />
        <Stat icon={<IsoIcon title={t("coach.icons.iso")} />} label={t("coach.advice.iso")} value={r.iso} />
        <Stat icon={<EvIcon title={t("coach.icons.ev")} />} label={t("coach.advice.ev")} value={r.ev > 0 ? `+${r.ev}` : r.ev} />
      </div>
      <p className="advice-line"><strong>{t("coach.advice.position")}.</strong> {r.position}</p>
      <p className="advice-line"><strong><FocusIcon size={14} className="inline-icon" /> {t("coach.advice.focus")}.</strong> {r.focus}</p>
      <p className="advice-line"><strong><StabIcon size={14} className="inline-icon" /> {t("coach.advice.stabilization")}.</strong> {r.stabilization}</p>
      {r.flash && (
        <p className="advice-line">
          <strong>
            {r.flash.use
              ? <FlashOnIcon size={14} className="inline-icon flash-on" title={t("coach.icons.flashOn")} />
              : <FlashOffIcon size={14} className="inline-icon" title={t("coach.icons.flashOff")} />}
            {" "}{t("coach.advice.flash")}.
          </strong>{" "}
          {r.flash.use ? <span className="flash-on">{r.flash.notes}</span> : <span style={{ color: "var(--text-muted)" }}>{r.flash.notes}</span>}
        </p>
      )}
      {r.iphone && <IphoneStrip iphone={r.iphone} t={t} />}
      <ul className="advice-tips">
        {r.compositionTips.map((x, j) => <li key={j}>{x}</li>)}
      </ul>
      {r.warnings?.length > 0 && (
        <div className="advice-warning">
          {r.warnings.map((w, j) => <div key={j}>⚠️ {w}</div>)}
        </div>
      )}
      <div className="advice-actions">
        <div className="advice-vote" role="group" aria-label="rate">
          <button type="button" className={`vote-btn ${vote === "up" ? "vote-on" : ""}`}
            onClick={() => rate("up")} aria-pressed={vote === "up"} aria-label={t("coach.advice.voteUp")}>👍</button>
          <button type="button" className={`vote-btn ${vote === "down" ? "vote-on" : ""}`}
            onClick={() => rate("down")} aria-pressed={vote === "down"} aria-label={t("coach.advice.voteDown")}>👎</button>
        </div>
        <button type="button" className="copy-btn" onClick={copy}>
          {copied ? t("coach.advice.copied") : `📋 ${t("coach.advice.copy")}`}
        </button>
      </div>
    </article>
  );
}

function IphoneStrip({ iphone, t }) {
  return (
    <div className="iphone-strip">
      <div className="iphone-chips">
        {iphone.format && (
          <span className="badge badge-leaf">
            <FormatGlyph format={iphone.format} />
            {iphone.format}
          </span>
        )}
        {iphone.photographicStyle && (
          <span className="badge badge-sun">
            <StyleSwatchIcon style={iphone.photographicStyle} size={14} className="inline-icon" title={t("coach.advice.iphone.style")} />
            {iphone.photographicStyle}
          </span>
        )}
        {iphone.frontCamera && (
          <span className="badge badge-sun">
            <LensRingIcon lens="truedepth" size={14} className="inline-icon" title={t("coach.advice.iphone.selfie")} />
            {t("coach.advice.iphone.selfie")}
          </span>
        )}
        {iphone.macroOverride && (
          <span className="badge badge-leaf">
            <MacroIcon size={14} className="inline-icon" title={t("coach.advice.iphone.macro")} />
            {t("coach.advice.iphone.macro")}
          </span>
        )}
      </div>
      {iphone.cameraControlHint && (
        <p className="advice-line" style={{ margin: "8px 0 0" }}>
          <strong>
            <CameraControlIcon size={14} className="inline-icon" title={t("coach.advice.iphone.cameraControl")} />
            {" "}{t("coach.advice.iphone.cameraControl")}.
          </strong>{" "}{iphone.cameraControlHint}
        </p>
      )}
      {iphone.aeAfLockHint && (
        <p className="advice-line" style={{ margin: "4px 0 0" }}>
          <strong>
            <LockIcon size={14} className="inline-icon" title={t("coach.advice.iphone.aeAfLock")} />
            {" "}{t("coach.advice.iphone.aeAfLock")}.
          </strong>{" "}{iphone.aeAfLockHint}
        </p>
      )}
    </div>
  );
}

function FormatGlyph({ format }) {
  if (format === "ProRAW-48" || format === "ProRAW-12") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" className="inline-icon" aria-hidden>
        <rect x="4" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <text x="11" y="15" textAnchor="middle" fontSize="7" fontWeight="700" fill="currentColor">RAW</text>
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" className="inline-icon" aria-hidden>
      <path d="M6 3 L14 3 L19 8 L19 21 L6 21 Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M14 3 L14 8 L19 8" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="advice-stat-label">{label}</div>
      <div className="advice-stat-value stat-with-icon">
        {icon ? <span className="advice-stat-icon">{icon}</span> : null}
        <span>{value}</span>
      </div>
    </div>
  );
}

function SourceBadge({ source, t }) {
  const tone = source === "groq" || source === "cache" ? "leaf"
             : source === "offline" || source === "fallback" ? "clay"
             : "sun";
  const icon = source === "groq" || source === "cache" ? "⚡"
             : source === "offline" ? "📴"
             : source === "stub" ? "🧪"
             : "⚠️";
  return (
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <span className={`badge badge-${tone}`}>{icon} {t(`coach.source.${source}`)}</span>
    </div>
  );
}

function offlineKey({ subjectId, gearId, scene, useFlash }) {
  const lat = scene?.lat != null ? Math.round(scene.lat * 100) / 100 : "x";
  const lng = scene?.lng != null ? Math.round(scene.lng * 100) / 100 : "x";
  const hour = scene?.dateTime ? new Date(scene.dateTime).toISOString().slice(0, 13) : "x";
  return `hl.coach.${gearId}.${subjectId}.${lat}.${lng}.${hour}.f${useFlash ? 1 : 0}`;
}

function readOffline(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
