"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SUBJECT_PRESETS, getSubjectPreset, BW_CONTEXTS } from "@/data/subjects/presets";
import { PET_CONTEXTS } from "@/data/subjects/pet-contexts";
import { TIME_PRESETS, resolveTimePreset } from "@/lib/time-presets";
import { useT, useLocale } from "@/lib/i18n/LocaleProvider";
import { useGearStore } from "@/lib/gear-store";
import {
  Smartphone, Camera, Video, Settings, Zap, MapPin,
  Cat, Dog, PawPrint, CloudSun, Thermometer, Cloud, Wind, CloudRain,
  TriangleAlert, ThumbsUp, ThumbsDown, Copy, Check, WifiOff, FlaskConical,
  Plus, X, Sparkles, ChevronLeft, ChevronRight,
} from "lucide-react";
import { fileToDownscaledDataUrl } from "@/lib/image-decode";
import {
  ApertureIcon, ShutterIcon, IsoIcon, EvIcon, ModeDialIcon,
  FocusIcon, StabIcon, FlashOnIcon, FlashOffIcon,
  StyleSwatchIcon, CameraControlIcon, LockIcon,
  MacroIcon, NightIcon, LensRingIcon, SunCompassIcon,
} from "@/components/icons";

function GearKindIcon({ kind, ...props }) {
  const Icon = kind === "phone" ? Smartphone : kind === "dslr" ? Camera : Video;
  return <Icon {...props} />;
}

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
    dateTime: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
    notes: "",
  });
  const [useFlash, setUseFlash] = useState(false);
  const [petContext, setPetContext] = useState("portrait");
  const [animal, setAnimal] = useState("cat");
  const [bwContext, setBwContext] = useState("classic");
  const [locating, setLocating] = useState(false);
  const [timeHint, setTimeHint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [examples, setExamples] = useState([]);
  const [addingExamples, setAddingExamples] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [savingAi, setSavingAi] = useState(false);
  const [aiExample, setAiExample] = useState(null);
  const [viewer, setViewer] = useState(null);

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

  const loadExamples = async () => {
    try {
      const res = await fetch("/api/coach/examples");
      const data = await res.json();
      setExamples((data.examples || []).map((e) => ({ id: e.id, dataUrl: e.imageDataUrl })));
    } catch {}
  };

  useEffect(() => { loadExamples(); }, []);

  const addExamples = async (files) => {
    if (!files?.length) return;
    setAddingExamples(true); setError(null);
    try {
      for (const f of files) {
        const dataUrl = await fileToDownscaledDataUrl(f, 900, 0.75);
        const res = await fetch("/api/coach/examples", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Upload failed.");
      }
      await loadExamples();
    } catch (err) {
      setError(err.message);
    } finally { setAddingExamples(false); }
  };

  const deleteExample = async (id) => {
    setExamples(examples.filter((x) => x.id !== id));
    await fetch("/api/coach/examples", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  };

  const generateAi = async (spotId) => {
    setGeneratingAi(true); setError(null); setAiExample(null);
    try {
      const res = await fetch("/api/coach/examples/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spotId,
          gear: active,
          scene: {
            lat: scene.lat ? +scene.lat : null,
            lng: scene.lng ? +scene.lng : null,
            date: scene.dateTime,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "AI generation failed.");
      setAiExample(data);
    } catch (err) {
      setError(err.message);
    } finally { setGeneratingAi(false); }
  };

  const saveAiExample = async () => {
    if (!aiExample?.imageUrl) return;
    setSavingAi(true); setError(null);
    try {
      const blob = await (await fetch(aiExample.imageUrl)).blob();
      const file = new File([blob], "ai-example.png", { type: blob.type || "image/png" });
      const dataUrl = await fileToDownscaledDataUrl(file, 900, 0.75);
      const res = await fetch("/api/coach/examples", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Save failed.");
      await loadExamples();
      setAiExample(null);
    } catch (err) {
      setError(err.message);
    } finally { setSavingAi(false); }
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
      ...(subjectId === "bw" ? { bwContext } : {}),
    };
    const storageKey = offlineKey(payload);
    try {
      const res = await fetch("/api/coach/recipe", {
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
                <s.icon size={16} aria-hidden />
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
                    <c.icon size={15} aria-hidden />
                    <span>{t(`pets.context.${c.id}`)}</span>
                  </button>
                ))}
              </div>
              <div className="input-label" style={{ marginTop: 10 }}>{t("pets.animalLabel")}</div>
              <div className="chip-row" role="radiogroup" aria-label={t("pets.animalLabel")}>
                {[
                  { id: "cat", icon: Cat },
                  { id: "dog", icon: Dog },
                  { id: "other", icon: PawPrint },
                ].map((a) => (
                  <button key={a.id} type="button" role="radio" onClick={() => changeAnimal(a.id)}
                    className="chip chip-sm" aria-checked={animal === a.id} aria-pressed={animal === a.id}>
                    <a.icon size={15} aria-hidden />
                    <span>{t(`pets.animal.${a.id}`)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {subjectId === "engagement" && (
            <div className="pets-subpicker">
              <div className="input-label" style={{ marginTop: 10 }}>{t("engagement.tipsTitle")}</div>
              <ul className="subject-tips">
                {getSubjectPreset("engagement").tips.map((k) => (
                  <li key={k}>{t(`engagement.tip.${k}`)}</li>
                ))}
              </ul>
              <div className="input-label" style={{ marginTop: 10 }}>{t("engagement.examplesTitle")}</div>
              <label className="chip chip-sm engagement-add">
                <Plus size={15} aria-hidden />
                <span>{addingExamples ? t("engagement.examplesAdding") : t("engagement.examplesAdd")}</span>
                <input type="file" accept="image/*" multiple disabled={addingExamples}
                  onChange={(e) => { addExamples(e.target.files); e.target.value = ""; }}
                  style={{ display: "none" }} />
              </label>
              {examples.length === 0 ? (
                <p className="engagement-empty">{t("engagement.examplesEmpty")}</p>
              ) : (
                <div className="engagement-grid">
                  {examples.map((ex, i) => (
                    <div key={ex.id} className="engagement-thumb">
                      <button type="button" className="engagement-thumb-open"
                        onClick={() => setViewer({ urls: examples.map((e) => e.dataUrl), index: i })}
                        aria-label={t("engagement.view")}>
                        <img src={ex.dataUrl} alt={t("engagement.examplesTitle")} />
                      </button>
                      <button type="button" className="engagement-thumb-del" aria-label={t("engagement.delete")}
                        onClick={() => deleteExample(ex.id)}>
                        <X size={12} aria-hidden />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="input-label" style={{ marginTop: 14 }}>{t("engagement.ai.title")}</div>
              <div className="chip-row" role="listbox" aria-label={t("engagement.ai.title")}>
                {["hill", "road", "trees", "pasture"].map((s) => (
                  <button key={s} type="button" onClick={() => generateAi(s)}
                    className="chip chip-sm" disabled={generatingAi}
                    aria-pressed={aiExample?.spotId === s}>
                    <Sparkles size={14} aria-hidden />
                    <span>{t(`engagement.aiSpot.${s}`)}</span>
                  </button>
                ))}
              </div>
              {generatingAi && <p className="engagement-empty">{t("engagement.ai.generating")}</p>}
              {aiExample?.source === "stub" && <p className="engagement-empty">{t("engagement.ai.noKey")}</p>}
              {aiExample?.imageUrl && (
                <div className="ai-example" style={{ marginTop: 10 }}>
                  <button type="button" className="ai-example-open"
                    onClick={() => setViewer({ urls: [aiExample.imageUrl], index: 0 })}
                    aria-label={t("engagement.view")}>
                    <img src={aiExample.imageUrl} alt={t("engagement.ai.generated")} className="ai-example-img" />
                  </button>
                  <div className="ai-example-text">
                    <div className="ai-example-label">{t("engagement.ai.explainLabel")}</div>
                    <div className="ai-example-title">{t(`engagement.ai.explain.${aiExample.spotId}`).title}</div>
                    <ul className="ai-example-points">
                      {t(`engagement.ai.explain.${aiExample.spotId}`).points.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                    <button type="button" className="btn btn-primary btn-sm" onClick={saveAiExample} disabled={savingAi}>
                      {savingAi ? t("engagement.ai.saving") : t("engagement.ai.save")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {subjectId === "bw" && (
            <div className="pets-subpicker">
              <div className="input-label" style={{ marginTop: 10 }}>{t("bw.contextLabel")}</div>
              <div className="chip-row" role="listbox" aria-label={t("bw.contextLabel")}>
                {Object.values(BW_CONTEXTS).map((c) => (
                  <button key={c.id} type="button" onClick={() => setBwContext(c.id)}
                    className="chip chip-sm" aria-pressed={bwContext === c.id}>
                    <c.icon size={15} aria-hidden />
                    <span>{t(`bw.context.${c.id}`)}</span>
                  </button>
                ))}
              </div>
              <div className="input-label" style={{ marginTop: 10 }}>{t("engagement.tipsTitle")}</div>
              <ul className="subject-tips">
                {BW_CONTEXTS[bwContext].tips.map((k) => (
                  <li key={k}>{t(`bw.tip.${k}`)}</li>
                ))}
              </ul>
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
                  <p.icon size={16} aria-hidden />
                  <span>{t(`coach.timePreset.${p.id}`)}</span>
                </button>
              ))}
            </div>
            {timeHint && <p className={`full time-hint ${timeHint.kind}`}>{timeHint.text}</p>}
            <div className="full">
              <button type="button" className="locate-btn" onClick={useMyLocation} disabled={locating}>
                <MapPin size={16} aria-hidden />
                <span>{locating ? t("coach.locate.locating") : t("coach.locate.ready")}</span>
              </button>
              <a className="locate-btn" style={{ marginLeft: 8, textDecoration: "none" }}
                href={`/diagram?subject=${encodeURIComponent(subjectId)}&lat=${encodeURIComponent(scene.lat)}&lng=${encodeURIComponent(scene.lng)}&dateTime=${encodeURIComponent(scene.dateTime)}`}>
                <SunCompassIcon size={16} aria-hidden />
                <span>{t("coach.entryDiagram")}</span>
              </a>
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
                <GearKindIcon kind={g.kind} size={16} aria-hidden />
                <span>{g.label}</span>
              </button>
            ))}
            <a href="/gear" className="chip" aria-label={t("gear.manage")}>
              <Settings size={16} aria-hidden />
              <span>{t("gear.manage")}</span>
            </a>
          </div>
          <div className="gear-pill" style={{ marginTop: 10 }}>
            <span className="gear-icon" aria-hidden><GearKindIcon kind={active.kind} size={18} /></span>
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
                <Zap size={15} aria-hidden /> {t("coach.flash.use", active.flashes[0].label)}
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

      <PhotoViewer viewer={viewer} setViewer={setViewer} t={t} />
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
              {result.weather.label && <span className="sky-item"><CloudSun size={16} aria-hidden /> {result.weather.label}</span>}
              {result.weather.tempC != null && <span className="sky-item"><Thermometer size={16} aria-hidden /> {Math.round(result.weather.tempC)}°C</span>}
              {result.weather.cloudCoverPct != null && <span className="sky-item"><Cloud size={16} aria-hidden /> {result.weather.cloudCoverPct}%</span>}
              {result.weather.windKph != null && <span className="sky-item"><Wind size={16} aria-hidden /> {result.weather.windKph} km/h</span>}
              {result.weather.precipMm > 0 && <span className="sky-item"><CloudRain size={16} aria-hidden /> {result.weather.precipMm} mm</span>}
            </>)}
          </div>
        </div>
      )}
      <div className="recipe-grid">
        {result.recipes.map((r, i) => (
          <RecipeCard key={i} recipe={r} subjectId={subjectId} t={t} lensLabel={lensLabel} />
        ))}
      </div>
      {result.source && <SourceBadge source={result.source} t={t} />}
    </section>
  );
}

function RecipeCard({ recipe: r, subjectId, t, lensLabel }) {
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
      `${t("coach.recipe.position")}: ${r.position}`,
      `${t("coach.recipe.focus")}: ${r.focus}`,
      `${t("coach.recipe.stabilization")}: ${r.stabilization}`,
      r.flash?.use ? `${t("coach.recipe.flash")}: ${r.flash.notes}` : null,
      r.iphone?.format ? `${t("coach.recipe.iphone.format")}: ${r.iphone.format}` : null,
      r.iphone?.photographicStyle ? `${t("coach.recipe.iphone.style")}: ${r.iphone.photographicStyle}` : null,
      r.iphone?.cameraControlHint ? `${t("coach.recipe.iphone.cameraControl")}: ${r.iphone.cameraControlHint}` : null,
      r.iphone?.aeAfLockHint ? `${t("coach.recipe.iphone.aeAfLock")}: ${r.iphone.aeAfLockHint}` : null,
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
      <div className="recipe-head">
        <div className="card-title" style={{ margin: 0 }}>{r.label}</div>
        <span className="badge badge-sun">{r.cameraMode}</span>
      </div>
      <div className="recipe-stats">
        <Stat icon={<LensRingIcon lens={r.lens} title={t("coach.icons.lens")} />} label={t("coach.recipe.lens")} value={lensLabel(r.lens)} />
        <Stat icon={<ApertureIcon title={t("coach.icons.aperture")} />} label={t("coach.recipe.aperture")} value={`f/${r.fNumber}`} />
        <Stat icon={<ShutterIcon title={t("coach.icons.shutter")} />} label={t("coach.recipe.shutter")} value={r.shutter} />
        <Stat icon={<IsoIcon title={t("coach.icons.iso")} />} label={t("coach.recipe.iso")} value={r.iso} />
        <Stat icon={<EvIcon title={t("coach.icons.ev")} />} label={t("coach.recipe.ev")} value={r.ev > 0 ? `+${r.ev}` : r.ev} />
      </div>
      <p className="recipe-line"><strong>{t("coach.recipe.position")}.</strong> {r.position}</p>
      <p className="recipe-line"><strong><FocusIcon size={14} className="inline-icon" /> {t("coach.recipe.focus")}.</strong> {r.focus}</p>
      <p className="recipe-line"><strong><StabIcon size={14} className="inline-icon" /> {t("coach.recipe.stabilization")}.</strong> {r.stabilization}</p>
      {r.flash && (
        <p className="recipe-line">
          <strong>
            {r.flash.use
              ? <FlashOnIcon size={14} className="inline-icon flash-on" title={t("coach.icons.flashOn")} />
              : <FlashOffIcon size={14} className="inline-icon" title={t("coach.icons.flashOff")} />}
            {" "}{t("coach.recipe.flash")}.
          </strong>{" "}
          {r.flash.use ? <span className="flash-on">{r.flash.notes}</span> : <span style={{ color: "var(--text-muted)" }}>{r.flash.notes}</span>}
        </p>
      )}
      {r.iphone && <IphoneStrip iphone={r.iphone} t={t} />}
      <ul className="recipe-tips">
        {r.compositionTips.map((x, j) => <li key={j}>{x}</li>)}
      </ul>
      {r.warnings?.length > 0 && (
        <div className="recipe-warning">
          {r.warnings.map((w, j) => <div key={j} style={{ display: "flex", alignItems: "center", gap: 6 }}><TriangleAlert size={14} aria-hidden /> {w}</div>)}
        </div>
      )}
      <div className="recipe-actions">
        <div className="recipe-vote" role="group" aria-label="rate">
          <button type="button" className={`vote-btn ${vote === "up" ? "vote-on" : ""}`}
            onClick={() => rate("up")} aria-pressed={vote === "up"} aria-label={t("coach.recipe.voteUp")}><ThumbsUp size={16} /></button>
          <button type="button" className={`vote-btn ${vote === "down" ? "vote-on" : ""}`}
            onClick={() => rate("down")} aria-pressed={vote === "down"} aria-label={t("coach.recipe.voteDown")}><ThumbsDown size={16} /></button>
        </div>
        <button type="button" className="copy-btn" onClick={copy} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {copied ? <><Check size={14} aria-hidden /> {t("coach.recipe.copied")}</> : <><Copy size={14} aria-hidden /> {t("coach.recipe.copy")}</>}
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
            <StyleSwatchIcon style={iphone.photographicStyle} size={14} className="inline-icon" title={t("coach.recipe.iphone.style")} />
            {iphone.photographicStyle}
          </span>
        )}
        {iphone.frontCamera && (
          <span className="badge badge-sun">
            <LensRingIcon lens="truedepth" size={14} className="inline-icon" title={t("coach.recipe.iphone.selfie")} />
            {t("coach.recipe.iphone.selfie")}
          </span>
        )}
        {iphone.macroOverride && (
          <span className="badge badge-leaf">
            <MacroIcon size={14} className="inline-icon" title={t("coach.recipe.iphone.macro")} />
            {t("coach.recipe.iphone.macro")}
          </span>
        )}
      </div>
      {iphone.cameraControlHint && (
        <p className="recipe-line" style={{ margin: "8px 0 0" }}>
          <strong>
            <CameraControlIcon size={14} className="inline-icon" title={t("coach.recipe.iphone.cameraControl")} />
            {" "}{t("coach.recipe.iphone.cameraControl")}.
          </strong>{" "}{iphone.cameraControlHint}
        </p>
      )}
      {iphone.aeAfLockHint && (
        <p className="recipe-line" style={{ margin: "4px 0 0" }}>
          <strong>
            <LockIcon size={14} className="inline-icon" title={t("coach.recipe.iphone.aeAfLock")} />
            {" "}{t("coach.recipe.iphone.aeAfLock")}.
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
      <div className="recipe-stat-label">{label}</div>
      <div className="recipe-stat-value stat-with-icon">
        {icon ? <span className="recipe-stat-icon">{icon}</span> : null}
        <span>{value}</span>
      </div>
    </div>
  );
}

function SourceBadge({ source, t }) {
  const tone = source === "groq" || source === "cache" ? "leaf"
             : source === "offline" || source === "fallback" ? "clay"
             : "sun";
  const Icon = source === "groq" || source === "cache" ? Zap
             : source === "offline" ? WifiOff
             : source === "stub" ? FlaskConical
             : TriangleAlert;
  return (
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <span className={`badge badge-${tone}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon size={13} aria-hidden /> {t(`coach.source.${source}`)}</span>
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

function PhotoViewer({ viewer, setViewer, t }) {
  const urls = viewer?.urls || [];
  const index = viewer?.index || 0;
  const hasNav = urls.length > 1;
  const go = (i) => setViewer({ urls, index: (i + urls.length) % urls.length });

  useEffect(() => {
    if (!viewer) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") setViewer(null);
      else if (hasNav && e.key === "ArrowRight") go(index + 1);
      else if (hasNav && e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [viewer]);

  if (!viewer) return null;
  return (
    <div className="photo-viewer" role="dialog" aria-modal="true" onClick={() => setViewer(null)}>
      <button type="button" className="photo-viewer-close" aria-label={t("engagement.close")} onClick={() => setViewer(null)}>
        <X size={22} aria-hidden />
      </button>
      {hasNav && (
        <button type="button" className="photo-viewer-nav photo-viewer-prev" aria-label={t("engagement.prev")}
          onClick={(e) => { e.stopPropagation(); go(index - 1); }}>
          <ChevronLeft size={28} aria-hidden />
        </button>
      )}
      <img src={urls[index]} alt={t("engagement.examplesTitle")} className="photo-viewer-img" onClick={(e) => e.stopPropagation()} />
      {hasNav && (
        <button type="button" className="photo-viewer-nav photo-viewer-next" aria-label={t("engagement.next")}
          onClick={(e) => { e.stopPropagation(); go(index + 1); }}>
          <ChevronRight size={28} aria-hidden />
        </button>
      )}
    </div>
  );
}
