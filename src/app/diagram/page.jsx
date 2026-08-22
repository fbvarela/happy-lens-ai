"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MapPin, Smartphone, Camera as CameraIcon } from "lucide-react";
import { SUBJECT_PRESETS, getSubjectPreset } from "@/data/subjects/presets";
import { useGearStore } from "@/lib/gear-store";
import { useT, useLocale } from "@/lib/i18n/LocaleProvider";
import { dayWindows } from "@/lib/sun-day";
import { sunSnapshot } from "@/lib/sun";

const SVG_SIZE = 300;
const SCENE_R = 100;
const PX_PER_M = 7;
const SUBJECT_H_M = 1.8;

export default function DiagramPage() {
  return (
    <Suspense fallback={null}>
      <DiagramInner />
    </Suspense>
  );
}

function todayLocal() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

function DiagramInner() {
  const t = useT();
  const { locale } = useLocale();
  const params = useSearchParams();
  const gearStore = useGearStore();
  const gear = gearStore.active;

  const [subjectId, setSubjectId] = useState("portrait");
  const [form, setForm] = useState({ lat: "", lng: "", date: todayLocal() });
  const [timeHour, setTimeHour] = useState(() => new Date().getHours() + new Date().getMinutes() / 60);
  const [showAerial, setShowAerial] = useState(false);
  const [locating, setLocating] = useState(false);
  const [place, setPlace] = useState("");
  const [locateError, setLocateError] = useState(null);
  const [scene, setScene] = useState({
    subjects: [{ dx: -32, dy: -14 }, { dx: 32, dy: -14 }],
    camera: { dx: 0, dy: 62 },
  });
  const [dragId, setDragId] = useState(null);
  const svgRef = useRef(null);

  useEffect(() => {
    const qS = params.get("subject");
    const qLat = params.get("lat");
    const qLng = params.get("lng");
    const qDt = params.get("dateTime");
    if (qS && SUBJECT_PRESETS.some((s) => s.id === qS)) setSubjectId(qS);
    if (qLat) setForm((f) => ({ ...f, lat: qLat }));
    if (qLng) setForm((f) => ({ ...f, lng: qLng }));
    if (qDt) {
      const d = new Date(qDt);
      if (!isNaN(d)) {
        setForm((f) => ({
          ...f,
          date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        }));
      }
    }
    // Run once on mount only — the current hour stays the default; re-running
    // on every render was resetting the time slider back to the deep-linked hour.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lat = form.lat ? +form.lat : null;
  const lng = form.lng ? +form.lng : null;
  const dateISO = new Date(`${form.date}T12:00:00Z`).toISOString();

  const aerial = useMemo(() => {
    if (!showAerial || lat == null || lng == null) return null;
    const z = 19;
    const n = 2 ** z;
    const xt = ((lng + 180) / 360) * n;
    const latRad = (lat * Math.PI) / 180;
    const yt = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
    const tx = Math.floor(xt), ty = Math.floor(yt);
    const fx = xt - tx, fy = yt - ty;
    // Composite a 3×3 tile block so the location is always centered and the
    // scene circle never gets clipped by the SVG edge (a single tile can leave
    // the location near a corner → the old "skewed" cut-off diagram).
    const baseX = SVG_SIZE / 2 - fx * 256;
    const baseY = SVG_SIZE / 2 - fy * 256;
    const tiles = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        tiles.push({
          url: `https://tile.openstreetmap.org/${z}/${tx + dx}/${ty + dy}.png`,
          x: baseX + dx * 256,
          y: baseY + dy * 256,
        });
      }
    }
    return { tiles, center: { x: SVG_SIZE / 2, y: SVG_SIZE / 2 } };
  }, [showAerial, lat, lng]);

  const center = aerial ? aerial.center : { x: SVG_SIZE / 2, y: SVG_SIZE / 2 };

  const sun = useMemo(() => {
    if (lat == null || lng == null) return null;
    const hh = String(Math.floor(timeHour)).padStart(2, "0");
    const mm = String(Math.round((timeHour % 1) * 60)).padStart(2, "0");
    const when = new Date(`${form.date}T${hh}:${mm}`);
    if (isNaN(when)) return null;
    return sunSnapshot({ lat, lng, date: when.toISOString() });
  }, [lat, lng, form.date, timeHour]);

  const windows = useMemo(() => {
    if (lat == null || lng == null) return null;
    return dayWindows({ lat, lng, date: dateISO });
  }, [lat, lng, dateISO]);

  const sunAlt = sun?.sun?.altitudeDeg;
  const sunAz = sun?.sun?.azimuthDeg;

  const svgPoint = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) * SVG_SIZE) / rect.width, y: ((e.clientY - rect.top) * SVG_SIZE) / rect.height };
  };

  const onPointerDown = (e, id) => {
    e.preventDefault();
    setDragId(id);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!dragId) return;
    const p = svgPoint(e);
    const local = { dx: p.x - center.x, dy: p.y - center.y };
    const dist = Math.hypot(local.dx, local.dy);
    if (dist > SCENE_R) { local.dx *= SCENE_R / dist; local.dy *= SCENE_R / dist; }
    setScene((s) => {
      if (dragId === "camera") return { ...s, camera: local };
      const i = Number(dragId.replace("s", ""));
      const subjects = s.subjects.map((sub, j) => (j === i ? local : sub));
      return { ...s, subjects };
    });
  };

  const onPointerUp = () => setDragId(null);

  const useMyLocation = () => {
    if (!navigator.geolocation) { setLocateError(t("coach.locate.unavailable")); return; }
    setLocating(true); setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, lat: pos.coords.latitude.toFixed(4), lng: pos.coords.longitude.toFixed(4) }));
        setLocating(false);
      },
      (err) => { setLocating(false); setLocateError(err.message || t("coach.locate.unavailable")); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  };

  const searchPlace = async (e) => {
    e.preventDefault();
    const q = place.trim();
    if (!q) return;
    setLocateError(null);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`, {
        headers: { Accept: "application/json" },
      });
      const data = await res.json();
      if (data?.[0]?.lat && data?.[0]?.lon) {
        setForm((f) => ({ ...f, lat: data[0].lat, lng: data[0].lon }));
      } else {
        setLocateError(t("diagram.form.noPlace"));
      }
    } catch {
      setLocateError(t("diagram.form.noPlace"));
    }
  };

  // Camera params from the subject preset + active gear. The preset's
  // preferredLens ids are phone-lens ids; fall back to the gear's own lens
  // when the preset lens isn't available (e.g. Pentax K-5 + 18-55).
  const preset = getSubjectPreset(subjectId);
  const lensId = preset?.preferredLens?.[0];
  const lens = gear.lenses.find((l) => l.id === lensId) || gear.lenses[0];
  const fNumber = lens?.fNumberFixed ?? lens?.fNumberMin ?? null;
  const fNumberTele = lens?.apertureAtTele ?? null;
  const shutter = preset?.shutterFloorSec ? `1/${Math.round(1 / preset.shutterFloorSec)}s` : null;

  // Light mode relative to camera→subject bearing vs sun azimuth.
  let lightMode = null;
  if (sunAz != null && scene.subjects[0] && scene.camera) {
    const sdx = scene.subjects[0].dx - scene.camera.dx;
    const sdy = scene.subjects[0].dy - scene.camera.dy;
    const bearing = ((Math.atan2(sdx, -sdy) * 180) / Math.PI + 360) % 360;
    let rel = Math.abs(sunAz - bearing) % 360;
    if (rel > 180) rel = 360 - rel;
    // rel = angular gap between sun and the camera→subject line.
    // 0 = sun behind subject (backlit), 180 = sun behind camera (front-lit).
    lightMode = rel <= 40 ? "backlit" : rel <= 75 ? "rim" : rel <= 115 ? "side" : "front";
  }

  const shadowEnd = (sx, sy) => {
    if (sunAlt == null || sunAlt <= 0) return null;
    const antiAz = (sunAz + 180) * (Math.PI / 180);
    const L = Math.min((SUBJECT_H_M / Math.tan(sunAlt * (Math.PI / 180))) * PX_PER_M, 90);
    return { x: sx + Math.sin(antiAz) * L, y: sy - Math.cos(antiAz) * L };
  };

  // Shadow wedge for any scene point (subject or photographer).
  const shadowWedge = (sx, sy) => {
    const end = shadowEnd(sx, sy);
    if (!end) return null;
    const dx = end.x - sx, dy = end.y - sy;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len, py = dx / len;
    const w0 = 2.5, w1 = 7;
    return (
      <polygon
        points={`${sx + px * w0},${sy + py * w0} ${end.x + px * w1},${end.y + py * w1} ${end.x - px * w1},${end.y - py * w1} ${sx - px * w0},${sy - py * w0}`}
        fill="rgba(0,0,0,0.18)"
      />
    );
  };

  const timeStr = `${String(Math.floor(timeHour)).padStart(2, "0")}:${String(Math.round((timeHour % 1) * 60)).padStart(2, "0")}`;
  const sunAzStr = sunAz != null ? `${Math.round(sunAz)}°` : "—";
  const sunAltStr = sunAlt != null ? `${Math.round(sunAlt)}°` : "—";

  const sunRimPos = sunAz != null
    ? { x: center.x + SCENE_R * Math.sin((sunAz * Math.PI) / 180), y: center.y - SCENE_R * Math.cos((sunAz * Math.PI) / 180) }
    : null;

  return (
    <>
      <h1 className="page-title">{t("diagram.title")}</h1>
      <p className="page-sub">{t("diagram.sub")}</p>

      <div className="card coach-card" style={{ display: "grid", gap: 16 }}>
        <div className="coach-section">
          <div className="coach-step-title"><span className="step-num">1</span> {t("diagram.form.scene")}</div>
          <div className="scene-grid">
            <label className="scene-field">
              <span className="input-label">{t("coach.field.latitude")}</span>
              <input className="input" inputMode="decimal" autoComplete="off" value={form.lat}
                onChange={(e) => setForm({ ...form, lat: e.target.value })} placeholder="40.4168" />
            </label>
            <label className="scene-field">
              <span className="input-label">{t("coach.field.longitude")}</span>
              <input className="input" inputMode="decimal" autoComplete="off" value={form.lng}
                onChange={(e) => setForm({ ...form, lng: e.target.value })} placeholder="-3.7038" />
            </label>
            <form className="scene-field full" onSubmit={searchPlace} style={{ display: "grid", gap: 6 }}>
              <span className="input-label">{t("diagram.form.searchPlace")}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <input className="input" value={place} onChange={(e) => setPlace(e.target.value)}
                  placeholder={t("diagram.form.placePlaceholder")} />
                <button type="submit" className="btn btn-ghost btn-sm">{t("diagram.form.search")}</button>
              </div>
              {locateError && <span className="field-error">{locateError}</span>}
            </form>
            <label className="scene-field">
              <span className="input-label">{t("diagram.form.date")}</span>
              <input type="date" className="input" value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </label>
            <label className="scene-field">
              <span className="input-label">{t("diagram.form.time")} · {timeStr}</span>
              <input type="range" min="0" max="24" step="0.25" value={timeHour}
                onChange={(e) => setTimeHour(+e.target.value)} style={{ width: "100%", height: 44, accentColor: "var(--sun)" }} />
              <div className="time-hint ok">
                {t("diagram.form.sun", { alt: sunAltStr, az: sunAzStr })}
              </div>
            </label>
            <div className="full">
              <button type="button" className="locate-btn" onClick={useMyLocation} disabled={locating}>
                <MapPin size={16} aria-hidden />
                <span>{locating ? t("coach.locate.locating") : t("coach.locate.ready")}</span>
              </button>
              <label className="flash-toggle" style={{ marginTop: 10 }}>
                <input type="checkbox" checked={showAerial} onChange={(e) => setShowAerial(e.target.checked)} />
                <span className="flash-toggle-label">{t("diagram.form.aerial")}</span>
              </label>
            </div>
          </div>
        </div>

        <div className="coach-section">
          <div className="coach-step-title"><span className="step-num">2</span> {t("diagram.form.subject")}</div>
          <div className="chip-row">
            {SUBJECT_PRESETS.map((s) => (
              <button key={s.id} type="button" className="chip" aria-pressed={subjectId === s.id}
                onClick={() => setSubjectId(s.id)}>
                <s.icon size={15} aria-hidden />
                <span>{t(`subject.${s.id}`)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="coach-section">
          <div className="coach-step-title"><span className="step-num">3</span> {t("coach.step.gear")}</div>
          <div className="chip-row">
            <span className="chip" aria-disabled="true">
              {gear.kind === "phone" ? <Smartphone size={15} aria-hidden /> : <CameraIcon size={15} aria-hidden />}
              <span>{gear.label}</span>
            </span>
            <a href="/gear" className="chip" aria-label={t("gear.manage")}>
              <CameraIcon size={15} aria-hidden />
              <span>{t("gear.manage")}</span>
            </a>
          </div>
        </div>
      </div>

      <div className="diagram-wrap" style={{ marginTop: 18 }}>
        <svg ref={svgRef} viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          onPointerMove={onPointerMove} onPointerUp={onPointerUp}
          style={{ width: "100%", height: "auto", touchAction: "none", background: showAerial ? "transparent" : "var(--cream)", borderRadius: 8, border: "1.5px solid var(--line)", display: "block" }}>
          {aerial && aerial.tiles.map((tile, i) => (
            <image key={i} href={tile.url} x={tile.x} y={tile.y} width={256} height={256} />
          ))}
          {!aerial && <circle cx={center.x} cy={center.y} r={SCENE_R} fill="none" stroke="var(--line)" strokeWidth="1.5" strokeDasharray="4 3" />}

          {/* day path arc (sunrise → sunset, through south) + cardinal points */}
          <path d={`M ${center.x + SCENE_R} ${center.y} A ${SCENE_R} ${SCENE_R} 0 0 1 ${center.x - SCENE_R} ${center.y}`}
            fill="none" stroke="var(--text-muted)" strokeWidth="1" strokeDasharray="2 4" opacity="0.5" />
          {[["N", 0], ["E", 90], ["S", 180], ["W", 270]].map(([label, deg]) => {
            const rad = (deg * Math.PI) / 180;
            const x = center.x + SCENE_R * Math.sin(rad);
            const y = center.y - SCENE_R * Math.cos(rad);
            return (
              <text key={label} x={x} y={y + (deg === 180 ? 14 : 4)} textAnchor="middle" fontSize="10" fill="var(--text-muted)" fontWeight="700">{label}</text>
            );
          })}

          {/* light direction line + sun marker */}
          {sunRimPos && sunAlt != null && (
            <>
              <line x1={center.x} y1={center.y} x2={sunRimPos.x} y2={sunRimPos.y}
                stroke={sunAlt > 0 ? "var(--sun)" : "var(--clay)"} strokeWidth="1" opacity="0.4" strokeDasharray="2 3" />
              <g transform={`translate(${sunRimPos.x},${sunRimPos.y})`} style={{ pointerEvents: "none" }}>
                <circle r={11} fill={sunAlt > 0 ? "var(--sun)" : "var(--clay)"} opacity={sunAlt > 0 ? 0.95 : 0.6} />
                {sunAlt > 0 && [0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                  <line key={a} x1={0} y1={-15} x2={0} y2={-21} transform={`rotate(${a})`} stroke="#e8a020" strokeWidth="2.5" strokeLinecap="round" />
                ))}
                <circle r={4} fill="#7a4d00" />
              </g>
            </>
          )}

          {scene.subjects.map((sub, i) => {
            const sx = center.x + sub.dx;
            const sy = center.y + sub.dy;
            return (
              <g key={i}>
                {shadowWedge(sx, sy)}
                <g transform={`translate(${sx},${sy})`}>
                  <circle r={9} fill="var(--leaf)" opacity="0.25" />
                  <circle r={5} fill="var(--leaf)" stroke="#fff" strokeWidth="1.5" />
                  <text y={22} textAnchor="middle" fontSize="11" fill="var(--text)" fontWeight="600">{i + 1}</text>
                  <circle r={18} fill="transparent" style={{ cursor: "grab" }} onPointerDown={(e) => onPointerDown(e, `s${i}`)} />
                </g>
              </g>
            );
          })}

          {scene.camera && (() => {
            const cx = center.x + scene.camera.dx;
            const cy = center.y + scene.camera.dy;
            return (
              <>
                {shadowWedge(cx, cy)}
                <g transform={`translate(${cx},${cy})`}>
                  <circle r={9} fill="var(--clay)" opacity="0.25" />
                  <circle r={5} fill="var(--clay)" stroke="#fff" strokeWidth="1.5" />
                  <text y={22} textAnchor="middle" fontSize="11" fill="var(--text)" fontWeight="600">{t("diagram.legend.camera").slice(0, 1)}</text>
                  <circle r={18} fill="transparent" style={{ cursor: "grab" }} onPointerDown={(e) => onPointerDown(e, "camera")} />
                </g>
              </>
            );
          })}
        </svg>

        <div className="diagram-legend" style={{ marginTop: 10, display: "flex", gap: 14, flexWrap: "wrap", fontSize: "0.82rem", color: "var(--text-muted)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--leaf)", display: "inline-block" }} />
            {t("diagram.legend.subjects")}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--clay)", display: "inline-block" }} />
            {t("diagram.legend.camera")}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--sun)", display: "inline-block" }} />
            {t("diagram.legend.sun")}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, width: "100%" }}>
            {t("diagram.form.drag")}
          </span>
        </div>
      </div>

      {sunAlt != null && sunAlt <= 0 && (
        <p className="field-error" style={{ marginTop: 10 }}>{t("diagram.sunBelow")}</p>
      )}

      {lightMode && preset && (
        <section style={{ marginTop: 18, display: "grid", gap: 12 }}>
          <div className="card">
            <div className="recipe-head">
              <div className="card-title" style={{ margin: 0 }}>{t(`diagram.light.${lightMode}.title`)}</div>
              <span className={`badge ${lightMode === "front" ? "badge-sun" : lightMode === "side" ? "badge-leaf" : "badge-clay"}`}>
                {t(`diagram.light.${lightMode}.label`)}
              </span>
            </div>
            <p className="recipe-line" style={{ margin: 0 }}>{t(`diagram.light.${lightMode}.advice`)}</p>
          </div>

          <div className="card">
            <div className="card-title">{t("diagram.camera.title")}</div>
            <div className="recipe-stats" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
              <div>
                <div className="recipe-stat-label">{t("coach.recipe.lens")}</div>
                <div className="recipe-stat-value">{lens ? lens.label : "—"}</div>
              </div>
              <div>
                <div className="recipe-stat-label">{t("coach.recipe.aperture")}</div>
                <div className="recipe-stat-value">{fNumber != null ? `f/${fNumber}${fNumberTele != null && fNumberTele !== fNumber ? `–${fNumberTele}` : ""}` : "—"}</div>
              </div>
              <div>
                <div className="recipe-stat-label">{t("coach.recipe.shutter")}</div>
                <div className="recipe-stat-value">{shutter || "—"}</div>
              </div>
              <div>
                <div className="recipe-stat-label">{t("coach.recipe.iso")}</div>
                <div className="recipe-stat-value">{preset?.isoCeiling ?? "—"}</div>
              </div>
              <div>
                <div className="recipe-stat-label">{t("coach.recipe.mode")}</div>
                <div className="recipe-stat-value">{preset?.cameraMode ?? "—"}</div>
              </div>
              <div>
                <div className="recipe-stat-label">{t("coach.recipe.ev")}</div>
                <div className="recipe-stat-value">{t(`diagram.light.${lightMode}.ev`)}</div>
              </div>
            </div>
            <p className="recipe-line" style={{ margin: "12px 0 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              {t("diagram.camera.hint")}
            </p>
          </div>
        </section>
      )}
    </>
  );
}