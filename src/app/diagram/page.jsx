"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MapPin, Smartphone, Camera as CameraIcon } from "lucide-react";
import { SUBJECT_PRESETS, getSubjectPreset } from "@/data/subjects/presets";
import { useGearStore } from "@/lib/gear-store";
import { useT, useLocale } from "@/lib/i18n/LocaleProvider";
import { dayWindows, hourlyWeather } from "@/lib/sun-day";
import { sunSnapshot } from "@/lib/sun";
import { weatherSnapshot } from "@/lib/weather";
import { calculateDof, recommendExposure } from "@/lib/exposure.mjs";

const SVG_SIZE = 300;
const SCENE_R = 100;
const PX_PER_M = 7;
const SUBJECT_H_M = 1.8;
const SHUTTERS = [30, 60, 125, 250, 500, 1000, 2000, 4000];

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
  const [weather, setWeather] = useState(null);
  const [weatherTimeline, setWeatherTimeline] = useState(null);
  const [scene, setScene] = useState({
    subjects: [{ dx: -32, dy: -14 }, { dx: 32, dy: -14 }],
    camera: { dx: 0, dy: 62 },
  });
  const [dragId, setDragId] = useState(null);
  const [fStop, setFStop] = useState(null);
  const [focalLength, setFocalLength] = useState(null);
  const [shutterIdx, setShutterIdx] = useState(2);
  const [exposureAuto, setExposureAuto] = useState(true);
  const [focusTarget, setFocusTarget] = useState("0");
  const [customFocusDistance, setCustomFocusDistance] = useState("5");
  const svgRef = useRef(null);
  const insetRef = useRef(null);

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
  const weatherHour = Math.floor(timeHour);

  useEffect(() => {
    if (lat == null || lng == null || !form.date) {
      setWeather(null);
      return;
    }
    let current = true;
    weatherSnapshot({
      lat,
      lng,
      date: `${form.date}T${String(weatherHour).padStart(2, "0")}:00`,
    }).then((next) => {
      if (current) setWeather(next);
    });
    return () => { current = false; };
  }, [lat, lng, form.date, weatherHour]);

  useEffect(() => {
    if (lat == null || lng == null || !form.date) {
      setWeatherTimeline(null);
      return;
    }
    let current = true;
    hourlyWeather({ lat, lng, date: `${form.date}T12:00:00Z` }).then((hours) => {
      if (current) setWeatherTimeline(hours);
    });
    return () => { current = false; };
  }, [lat, lng, form.date]);

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

  // Hour ticks on the scene rim at the sun's azimuth for each daylight hour.
  const hourTicks = useMemo(() => {
    if (lat == null || lng == null) return [];
    const ticks = [];
    for (let h = 3; h <= 23; h++) {
      const when = new Date(`${form.date}T${String(h).padStart(2, "0")}:00`);
      if (isNaN(when)) continue;
      const s = sunSnapshot({ lat, lng, date: when.toISOString() });
      const alt = s?.sun?.altitudeDeg;
      const az = s?.sun?.azimuthDeg;
      if (alt == null || alt <= 0 || az == null) continue;
      ticks.push({ h, az });
    }
    return ticks;
  }, [lat, lng, form.date]);

  const sunAlt = sun?.sun?.altitudeDeg;
  const sunAz = sun?.sun?.azimuthDeg;
  const cloudCoverPct = weather?.cloudCoverPct;
  const cloudy = cloudCoverPct != null && cloudCoverPct >= 60;

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
    updateDraggedPoint(local);
  };

  const updateDraggedPoint = (local) => {
    const dist = Math.hypot(local.dx, local.dy);
    if (dist > SCENE_R) { local.dx *= SCENE_R / dist; local.dy *= SCENE_R / dist; }
    setScene((s) => {
      if (dragId === "camera") return { ...s, camera: local };
      const i = Number(dragId.replace("s", ""));
      const subjects = s.subjects.map((sub, j) => (j === i ? local : sub));
      return { ...s, subjects };
    });
  };

  const onInsetPointerMove = (e) => {
    if (!dragId || !insetRef.current) return;
    const rect = insetRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) * 120) / rect.width;
    const y = ((e.clientY - rect.top) * 120) / rect.height;
    updateDraggedPoint({
      dx: insetAnchor.dx + (x - 60) / insetScale,
      dy: insetAnchor.dy + (y - 60) / insetScale,
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
  const cameraMode = gear.modes?.includes("Av") ? "Av" : gear.modes?.[0] || preset?.cameraMode;

  const fMin = lens?.fNumberMin ?? 1.8;
  const fMax = lens?.fNumberMax ?? 16;
  const fN = Math.min(Math.max(fStop ?? fMin, fMin), fMax);
  const focalMin = lens?.focalRangeMm?.[0] ?? lens?.focalLengthMm ?? lens?.focalEq ?? 26;
  const focalMax = lens?.focalRangeMm?.[1] ?? focalMin;
  const focalMm = Math.min(Math.max(focalLength ?? focalMin, focalMin), focalMax);
  const hasFocalSlider = focalMax > focalMin;
  const crop = gear.cropFactor || 1;
  const shutterDen = SHUTTERS[shutterIdx];
  const focusIndex = focusTarget === "custom" ? 0 : Number(focusTarget);
  const focusSubject = scene.subjects[focusIndex] || scene.subjects[0];
  const placedFocusDistance = focusSubject && scene.camera
    ? Math.hypot(focusSubject.dx - scene.camera.dx, focusSubject.dy - scene.camera.dy) / PX_PER_M
    : null;
  const customDistance = Number(customFocusDistance);
  const subjectDist = focusTarget === "custom"
    ? (customDistance >= 50 ? Infinity : customDistance)
    : placedFocusDistance;
  const coc = lens?.circleOfConfusionMm ?? gear.circleOfConfusionMm ?? 0.03 / crop;
  const subjectDistances = scene.subjects
    .map((s) => Math.hypot(s.dx - scene.camera.dx, s.dy - scene.camera.dy) / PX_PER_M)
    .filter((distance) => distance > 0.2);
  let exposureLightMode = null;
  if (sunAz != null && scene.subjects[0] && scene.camera) {
    const bearing = ((Math.atan2(scene.subjects[0].dx - scene.camera.dx, -(scene.subjects[0].dy - scene.camera.dy)) * 180) / Math.PI + 360) % 360;
    let rel = Math.abs(sunAz - bearing) % 360;
    if (rel > 180) rel = 360 - rel;
    exposureLightMode = rel <= 40 ? "backlit" : rel <= 115 ? "side" : "front";
  }
  const recommendation = recommendExposure({
    apertureMin: fMin,
    apertureMax: fMax,
    shutterFloorSec: preset?.shutterFloorSec,
    shutterOptions: SHUTTERS,
    isoMin: gear.iso?.min ?? 100,
    isoMax: gear.iso?.max ?? 6400,
    focalLengthMm: focalMm,
    cropFactor: crop,
    sunAltitudeDeg: sunAlt,
    cloudCoverPct: cloudCoverPct ?? 0,
    lightMode: exposureLightMode,
    focusDistanceM: subjectDist,
    subjectDistancesM: subjectDistances,
    circleOfConfusionMm: coc,
  });
  const autoFNumber = recommendation.aperture;
  const autoShutterDen = recommendation.shutterDenominator;
  const autoIso = recommendation.iso;
  const activeFNumber = exposureAuto ? autoFNumber : fN;
  const activeShutterDen = exposureAuto ? autoShutterDen : shutterDen;
  const activeIso = exposureAuto
    ? autoIso
    : Math.max(gear.iso?.min ?? 100, Math.min(gear.iso?.max ?? 6400,
        Math.round(100 * activeFNumber ** 2 * activeShutterDen / 2 ** recommendation.lightEv)));
  const needsTripod = activeShutterDen < focalMm * crop;
  const dof = exposureAuto ? recommendation.dof : calculateDof({
    focalLengthMm: focalMm,
    aperture: activeFNumber,
    focusDistanceM: subjectDist,
    circleOfConfusionMm: coc,
  });

  // Visual focus assistant: flag subjects outside the active focus range and
  // suggest the smallest concrete correction.
  const focusIssues = [];
  if (dof && scene.subjects.length > 1 && subjectDist) {
    scene.subjects.forEach((subject, i) => {
      if (i === focusIndex) return;
      const distance = Math.hypot(subject.dx - scene.camera.dx, subject.dy - scene.camera.dy) / PX_PER_M;
      if (!(distance > 0.2)) return;
      const outside = distance < dof.near || (dof.far !== Infinity && distance > dof.far);
      if (!outside) return;
      let neededAperture = null;
      for (let candidate = fMin; candidate <= fMax; candidate += 0.1) {
        const candidateDof = calculateDof({ focalLengthMm: focalMm, aperture: candidate, focusDistanceM: subjectDist, circleOfConfusionMm: coc });
        if (candidateDof && candidateDof.near <= distance && (candidateDof.far === Infinity || candidateDof.far >= distance)) {
          neededAperture = +candidate.toFixed(1);
          break;
        }
      }
      const suggestion = neededAperture != null && neededAperture > activeFNumber + 0.001
        ? { kind: "stop-down", value: neededAperture }
        : hasFocalSlider && focalMm > focalMin
          ? { kind: "wider-focal" }
          : { kind: "reposition" };
      focusIssues.push({ index: i, distance, suggestion });
    });
  }

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
    lightMode = rel <= 40 ? "backlit" : rel <= 115 ? "side" : "front";
  }

  const shadowEnd = (sx, sy) => {
    if (sunAlt == null || sunAlt <= 0) return null;
    const antiAz = (sunAz + 180) * (Math.PI / 180);
    const L = Math.min((SUBJECT_H_M / Math.tan(sunAlt * (Math.PI / 180))) * PX_PER_M, 40);
    return { x: sx + Math.sin(antiAz) * L, y: sy - Math.cos(antiAz) * L };
  };

  // Shadow wedge for any scene point (subject or photographer).
  const shadowWedge = (sx, sy) => {
    const end = shadowEnd(sx, sy);
    if (!end) return null;
    const dx = end.x - sx, dy = end.y - sy;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len, py = dx / len;
    const w0 = 2, w1 = 4.5;
    return (
      <polygon
        points={`${sx + px * w0},${sy + py * w0} ${end.x + px * w1},${end.y + py * w1} ${end.x - px * w1},${end.y - py * w1} ${sx - px * w0},${sy - py * w0}`}
        fill={cloudy ? "rgba(0,0,0,0.07)" : "rgba(0,0,0,0.18)"}
      />
    );
  };

  // Camera view cone from the active lens field of view, aimed at the first subject.
  const fovCone = (cx, cy) => {
    const target = displaySubjects[focusIndex] || displaySubjects[0];
    if (!target || !scene.camera) return null;
    const focal = lens?.focalRangeEq ? (lens.focalRangeEq[0] + lens.focalRangeEq[1]) / 2
      : lens?.focalRangeMm ? ((lens.focalRangeMm[0] + lens.focalRangeMm[1]) / 2) * (gear.cropFactor || 1)
      : 28;
    const half = Math.atan(18 / focal);
    const bearing = Math.atan2(target.dx - displayCamera.dx, -(target.dy - displayCamera.dy));
    const L = 34;
    const pt = (r, a) => ({ x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) });
    const p1 = pt(L, bearing - half);
    const p2 = pt(L, bearing + half);
    const nearPx = dof ? dof.near * PX_PER_M : null;
    const farPx = dof ? Math.min((dof.far ?? 500) * PX_PER_M, SCENE_R) : null;
    const hyperfocalPx = dof ? dof.hyperfocal * PX_PER_M : null;
    return (
      <g pointerEvents="none">
        <path d={`M ${cx} ${cy} L ${p1.x} ${p1.y} A ${L} ${L} 0 0 1 ${p2.x} ${p2.y} Z`}
          fill="var(--clay)" opacity="0.06" stroke="var(--clay)" strokeOpacity="0.2" strokeWidth="0.75" strokeDasharray="3 3" />
        {nearPx != null && farPx != null && nearPx < SCENE_R && farPx > nearPx && (() => {
          const n1 = pt(nearPx, bearing - half), n2 = pt(nearPx, bearing + half);
          const f1 = pt(farPx, bearing - half), f2 = pt(farPx, bearing + half);
          return (
            <path d={`M ${n1.x} ${n1.y} A ${nearPx} ${nearPx} 0 0 1 ${n2.x} ${n2.y} L ${f2.x} ${f2.y} A ${farPx} ${farPx} 0 0 0 ${f1.x} ${f1.y} Z`}
              fill="var(--leaf)" opacity="0.1" stroke="var(--leaf)" strokeOpacity="0.3" strokeWidth="0.75" />
          );
        })()}
        {hyperfocalPx != null && hyperfocalPx > 0 && hyperfocalPx < SCENE_R && (() => {
          const h1 = pt(hyperfocalPx, bearing - half), h2 = pt(hyperfocalPx, bearing + half);
          return <path d={`M ${h1.x} ${h1.y} A ${hyperfocalPx} ${hyperfocalPx} 0 0 1 ${h2.x} ${h2.y}`}
            fill="none" stroke="var(--sun)" strokeOpacity="0.7" strokeWidth="1" strokeDasharray="2 2" />;
        })()}
      </g>
    );
  };

  const timeStr = `${String(Math.floor(timeHour)).padStart(2, "0")}:${String(Math.round((timeHour % 1) * 60)).padStart(2, "0")}`;
  const sunAzStr = sunAz != null ? `${Math.round(sunAz)}°` : "—";
  const sunAltStr = sunAlt != null ? `${Math.round(sunAlt)}°` : "—";

  const sunRimPos = sunAz != null
    ? { x: center.x + SCENE_R * Math.sin((sunAz * Math.PI) / 180), y: center.y - SCENE_R * Math.cos((sunAz * Math.PI) / 180) }
    : null;

  // Keep rendered markers at their real positions; only labels are offset.
  const focusPoint = focusSubject || scene.subjects[0];
  const focusPixelDistance = focusPoint && scene.camera
    ? Math.hypot(focusPoint.dx - scene.camera.dx, focusPoint.dy - scene.camera.dy)
    : Infinity;
  const displayCamera = scene.camera;
  const displaySubjects = scene.subjects;
  const closePlacement = focusPixelDistance < 18;
  const insetScale = 4;
  const insetAnchor = focusPoint && scene.camera
    ? { dx: (focusPoint.dx + scene.camera.dx) / 2, dy: (focusPoint.dy + scene.camera.dy) / 2 }
    : { dx: 0, dy: 0 };
  const insetPoint = (point) => ({
    x: 60 + (point.dx - insetAnchor.dx) * insetScale,
    y: 60 + (point.dy - insetAnchor.dy) * insetScale,
  });
  const dragHitRadius = 18;

  return (
    <>
      <h1 className="page-title">{t("diagram.title")}</h1>

      <div className="card coach-card diagram-controls-card" style={{ display: "grid", gap: 16 }}>
        <div className="coach-section">
          <div className="coach-step-title"><span className="step-num">1</span> {t("diagram.form.scene")}</div>
          <div className="scene-grid diagram-scene-grid">
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
            <form className="scene-field full diagram-place-field" onSubmit={searchPlace} style={{ display: "grid", gap: 6 }}>
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
                onChange={(e) => setTimeHour(+e.target.value)} aria-label={t("diagram.form.time")} aria-valuetext={timeStr}
                style={{ width: "100%", height: 44, accentColor: "var(--sun)" }} />
              <div className="time-hint ok">
                {t("diagram.form.sun", { alt: sunAltStr, az: sunAzStr })}
              </div>
            </label>
            <div className="full diagram-scene-actions">
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
          <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} aria-label={t("diagram.form.subject")}>
            {SUBJECT_PRESETS.map((s) => <option key={s.id} value={s.id}>{t(`subject.${s.id}`)}</option>)}
          </select>
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

      <div className="diagram-row" style={{ marginTop: 18 }}>
        <div className="diagram-wrap" style={{ maxWidth: 520 }}>
        <svg ref={svgRef} viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          onPointerMove={onPointerMove} onPointerUp={onPointerUp}
          style={{ width: "100%", height: "auto", touchAction: "none", background: showAerial ? "transparent" : "var(--cream)", borderRadius: 8, border: "1.5px solid var(--line)", display: "block" }}>
          {aerial && aerial.tiles.map((tile, i) => (
            <image key={i} href={tile.url} x={tile.x} y={tile.y} width={256} height={256} />
          ))}
          {!aerial && <circle cx={center.x} cy={center.y} r={SCENE_R} fill="none" stroke="var(--line)" strokeWidth="1" strokeDasharray="3 5" opacity="0.8" />}

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

          {/* hour ticks on the rim at the sun's azimuth for each daylight hour */}
          {hourTicks.map(({ h, az }) => {
            const rad = (az * Math.PI) / 180;
            return (
              <g key={h}>
                <line x1={center.x + (SCENE_R - 3) * Math.sin(rad)} y1={center.y - (SCENE_R - 3) * Math.cos(rad)}
                  x2={center.x + (SCENE_R + 3) * Math.sin(rad)} y2={center.y - (SCENE_R + 3) * Math.cos(rad)}
                  stroke="var(--sun)" strokeWidth="1" opacity="0.45" />
                {h % 6 === 0 && (
                  <text x={center.x + (SCENE_R - 12) * Math.sin(rad)} y={center.y - (SCENE_R - 12) * Math.cos(rad) + 3}
                    textAnchor="middle" fontSize="8" fill="var(--text-muted)" opacity="0.8">{h}</text>
                )}
              </g>
            );
          })}

          {/* light direction line + sun marker */}
          {sunRimPos && sunAlt != null && (
            <>
                <line x1={center.x} y1={center.y} x2={sunRimPos.x} y2={sunRimPos.y}
                stroke={sunAlt > 0 ? "var(--sun)" : "var(--clay)"} strokeWidth="1" opacity={cloudy ? 0.2 : 0.4} strokeDasharray="2 3" />
              <g transform={`translate(${sunRimPos.x},${sunRimPos.y})`} style={{ pointerEvents: "none" }}>
                <circle r={8} fill="none" stroke={sunAlt > 0 ? "var(--sun)" : "var(--clay)"} strokeWidth="1" opacity="0.65" />
                <circle r={4} fill={sunAlt > 0 ? "var(--sun)" : "var(--clay)"} opacity={cloudy ? 0.55 : sunAlt > 0 ? 0.95 : 0.6} />
              </g>
            </>
          )}

          {scene.camera && scene.subjects.map((sub, i) => {
            const cx = center.x + displayCamera.dx;
            const cy = center.y + displayCamera.dy;
            const displaySubject = displaySubjects[i];
            const sx = center.x + displaySubject.dx;
            const sy = center.y + displaySubject.dy;
            const distance = Math.hypot(sub.dx - scene.camera.dx, sub.dy - scene.camera.dy) / PX_PER_M;
            const length = Math.hypot(sx - cx, sy - cy) || 1;
            const offset = (i - (scene.subjects.length - 1) / 2) * 70;
            const labelX = (cx + sx) / 2 - ((sy - cy) / length) * offset;
            const labelY = (cy + sy) / 2 + ((sx - cx) / length) * offset;
            return (
              <g key={`distance-${i}`} pointerEvents="none">
                <line x1={cx} y1={cy} x2={sx} y2={sy} stroke="var(--text-muted)" strokeWidth="0.7" strokeDasharray="2 3" opacity="0.45" />
                <rect x={labelX - 31} y={labelY - 8} width="62" height="12" rx="3" fill="var(--surface)" opacity="0.92" />
                <text x={labelX} y={labelY + 1} textAnchor="middle" fontSize="7.5" fill="var(--text-muted)" opacity="0.95">
                  {t("diagram.distance", { subject: i + 1, distance: distance.toFixed(1) })}
                </text>
              </g>
            );
          })}

          {scene.subjects.map((sub, i) => {
            const displaySubject = displaySubjects[i];
            const sx = center.x + displaySubject.dx;
            const sy = center.y + displaySubject.dy;
            const issue = focusIssues.find((item) => item.index === i);
            return (
              <g key={i}>
                {shadowWedge(sx, sy)}
                <g transform={`translate(${sx},${sy})`}>
                  {issue && <circle r={9} fill="none" stroke="var(--clay)" strokeWidth="1.5" strokeDasharray="3 2" />}
                  <circle r={5} fill="var(--leaf)" stroke="#fff" strokeWidth="1.5" />
                  <text y={20} textAnchor="middle" fontSize="10" fill="var(--text)" fontWeight="600">{i + 1}</text>
                  <circle r={dragHitRadius} fill="transparent" style={{ cursor: "grab" }} onPointerDown={(e) => onPointerDown(e, `s${i}`)} />
                </g>
              </g>
            );
          })}

          {scene.camera && (() => {
            const cx = center.x + displayCamera.dx;
            const cy = center.y + displayCamera.dy;
            return (
              <>
                {fovCone(cx, cy)}
                {shadowWedge(cx, cy)}
                <g transform={`translate(${cx},${cy})`}>
                  <circle r={5} fill="var(--clay)" stroke="#fff" strokeWidth="1.5" />
                  <text y={20} textAnchor="middle" fontSize="10" fill="var(--text)" fontWeight="600">{t("diagram.legend.camera").slice(0, 1)}</text>
                  <circle r={dragHitRadius} fill="transparent" style={{ cursor: "grab" }} onPointerDown={(e) => onPointerDown(e, "camera")} />
                </g>
              </>
            );
          })()}
        </svg>

        {closePlacement && (
          <div className="diagram-inset-wrap">
            <span className="diagram-inset-title">{t("diagram.camera.closePlacement")}</span>
            <svg ref={insetRef} className="diagram-inset" viewBox="0 0 120 120"
              onPointerMove={onInsetPointerMove} onPointerUp={onPointerUp}>
              {(() => {
                const camera = insetPoint(scene.camera);
                const subject = insetPoint(focusPoint);
                return (
                  <>
                    <line x1={camera.x} y1={camera.y} x2={subject.x} y2={subject.y}
                      stroke="var(--text-muted)" strokeWidth="1" strokeDasharray="2 2" />
                    <circle cx={subject.x} cy={subject.y} r={5} fill="var(--leaf)" stroke="#fff" strokeWidth="1.5" />
                    <text x={subject.x} y={subject.y - 8} textAnchor="middle" fontSize="9" fill="var(--text)">{focusIndex + 1}</text>
                    <circle cx={subject.x} cy={subject.y} r={9} fill="transparent"
                      onPointerDown={(e) => onPointerDown(e, `s${focusIndex}`)} />
                    <circle cx={camera.x} cy={camera.y} r={5} fill="var(--clay)" stroke="#fff" strokeWidth="1.5" />
                    <text x={camera.x} y={camera.y + 15} textAnchor="middle" fontSize="9" fill="var(--text)">{t("diagram.legend.camera").slice(0, 1)}</text>
                    <circle cx={camera.x} cy={camera.y} r={9} fill="transparent"
                      onPointerDown={(e) => onPointerDown(e, "camera")} />
                  </>
                );
              })()}
            </svg>
          </div>
        )}

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
        <div className="diagram-key" aria-label={t("diagram.legend.key")}>
          <strong>{t("diagram.legend.key")}</strong>
          <span><i className="diagram-key-swatch shadow" />{t("diagram.legend.shadow")}</span>
          <span><i className="diagram-key-swatch visor" />{t("diagram.legend.visor")}</span>
          <span><i className="diagram-key-swatch dof" />{t("diagram.legend.dof")}</span>
          <span><i className="diagram-key-swatch distance" />{t("diagram.legend.distance")}</span>
          <span><i className="diagram-key-swatch light" />{t("diagram.legend.light")}</span>
          <span><i className="diagram-key-swatch boundary" />{t("diagram.legend.boundary")}</span>
        </div>
        {dof && (
          <div className="diagram-dof">
            <span>{t("diagram.camera.dof")}: {dof.near.toFixed(1)}–{dof.far == null ? "∞" : dof.far.toFixed(1)} m</span>
            <span>· {focalMm.toFixed(1)} mm · c {coc.toFixed(3)} · H {dof.hyperfocal.toFixed(1)} m · EV {recommendation.lightEv.toFixed(1)}</span>
            {needsTripod && <span>· {t("diagram.camera.tripod")}</span>}
          </div>
        )}
        {focusIssues.length > 0 && (
          <div className="diagram-focus-note">
            {focusIssues.map((issue) => (
              <span key={issue.index}>
                {t("diagram.focus.outside", { subject: issue.index + 1 })}
                {" — "}
                {issue.suggestion.kind === "stop-down" && t("diagram.focus.stopDown", { f: issue.suggestion.value })}
                {issue.suggestion.kind === "wider-focal" && t("diagram.focus.widerFocal")}
                {issue.suggestion.kind === "reposition" && t("diagram.focus.reposition")}
              </span>
            ))}
          </div>
        )}
        {weatherTimeline ? (
          <div className="diagram-weather-timeline">
            <strong>{t("diagram.weather.timeline")}</strong>
            <div className="diagram-weather-hours">
              {weatherTimeline.map((hour) => {
                const local = new Date(`${hour.time}Z`);
                const localHour = local.getHours();
                return (
                  <button key={hour.time} type="button" className={localHour === weatherHour ? "selected" : ""}
                    onClick={() => setTimeHour(localHour)} title={`${localHour}:00 · ${hour.cloudCoverPct ?? "—"}%`}>
                    <span>{String(localHour).padStart(2, "0")}:00</span>
                    <small>{hour.cloudCoverPct ?? "—"}%</small>
                    <small>{hour.tempC != null ? `${Math.round(hour.tempC)}°` : "—"}</small>
                    <small>{hour.windKph != null ? `${hour.windKph} km/h` : "—"}</small>
                    <small>{hour.precipMm > 0 ? t("diagram.weather.rain") : t("diagram.weather.dry")}</small>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="field-error" style={{ marginTop: 8 }}>{t("diagram.weather.unavailable")}</p>
        )}
        </div>

        <div className="diagram-info">
          {sunAlt != null && sunAlt <= 0 && (
            <p className="field-error" style={{ margin: 0 }}>{t("diagram.sunBelow")}</p>
          )}

          <section className="card-grid">
            {lightMode && (
          <div className="card diagram-light-card">
            <div className="recipe-head">
              <div className="card-title" style={{ margin: 0 }}>{t(`diagram.light.${lightMode}.title`)}</div>
              <span className={`badge ${lightMode === "front" ? "badge-sun" : lightMode === "side" ? "badge-leaf" : "badge-clay"}`}>
                {t(`diagram.light.${lightMode}.label`)}
              </span>
            </div>
            <p className="recipe-line" style={{ margin: 0 }}>{t(`diagram.light.${lightMode}.advice`)}</p>
            {weather && <p className="recipe-line" style={{ margin: "8px 0 0", color: "var(--text-muted)" }}>
              {t(cloudy ? "diagram.weather.cloudy" : "diagram.weather.sunny", { cloud: cloudCoverPct })}
            </p>}
          </div>
            )}

          <div className="card diagram-camera-card">
            <div className="recipe-head">
              <div className="card-title" style={{ margin: 0 }}>{t("diagram.camera.title")}</div>
              <button type="button" className="chip chip-sm" aria-pressed={exposureAuto} onClick={() => setExposureAuto(true)}>
                {t("diagram.camera.auto")}
              </button>
            </div>
            <div className="recipe-stats">
              <div>
                <div className="recipe-stat-label">{t("coach.recipe.lens")}</div>
                <div className="recipe-stat-value">{lens ? lens.label : "—"}</div>
              </div>
              <div>
                <div className="recipe-stat-label">{t("coach.recipe.aperture")}</div>
                <div className="recipe-stat-value">{activeFNumber != null ? `f/${activeFNumber.toFixed(1)}` : "—"}</div>
              </div>
              <div>
                <div className="recipe-stat-label">{t("coach.recipe.shutter")}</div>
                <div className="recipe-stat-value">1/{activeShutterDen}s</div>
              </div>
              <div>
                <div className="recipe-stat-label">{t("coach.recipe.iso")}</div>
                <div className="recipe-stat-value">{activeIso}</div>
              </div>
              <div>
                <div className="recipe-stat-label">{t("coach.recipe.mode")}</div>
                <div className="recipe-stat-value">{cameraMode ?? "—"}</div>
              </div>
              <div>
                <div className="recipe-stat-label">{t("coach.recipe.ev")}</div>
                <div className="recipe-stat-value">{lightMode ? t(`diagram.light.${lightMode}.ev`) : "—"}</div>
              </div>
            </div>
            <div className="scene-grid" style={{ marginTop: 12 }}>
              <label className="scene-field diagram-focus-field">
                <span className="input-label">{t("diagram.camera.focus")}</span>
                <select className="input" value={focusTarget} onChange={(e) => setFocusTarget(e.target.value)}>
                  <option value="0">{t("diagram.camera.subject1")}</option>
                  <option value="1">{t("diagram.camera.subject2")}</option>
                  <option value="custom">{t("diagram.camera.custom")}</option>
                </select>
              </label>
              {focusTarget === "custom" && (
                <label className="scene-field diagram-focus-distance-field">
                  <span className="input-label">{t("diagram.camera.focusDistance")} · {customDistance >= 50 ? "∞" : `${customFocusDistance} m`}</span>
                  <input type="range" min="0.5" max="50" step="0.1" value={customFocusDistance}
                    onChange={(e) => setCustomFocusDistance(e.target.value)} aria-label={t("diagram.camera.focusDistance")} aria-valuetext={`${customDistance >= 50 ? "∞" : `${customDistance} m`}`}
                    style={{ width: "100%", height: 36, accentColor: "var(--clay)" }} />
                </label>
              )}
              {hasFocalSlider && (
                <label className="scene-field diagram-focal-field">
                  <span className="input-label">{t("diagram.camera.focalLength")} · {focalMm.toFixed(0)} mm</span>
                  <input type="range" min={focalMin} max={focalMax} step="1" value={focalMm}
                    onChange={(e) => setFocalLength(+e.target.value)} aria-label={t("diagram.camera.focalLength")} aria-valuetext={`${focalMm.toFixed(0)} mm`}
                    style={{ width: "100%", height: 36, accentColor: "var(--clay)" }} />
                </label>
              )}
              <label className="scene-field diagram-aperture-field">
                <span className="input-label">{t("coach.recipe.aperture")} · f/{activeFNumber.toFixed(1)}</span>
                <input type="range" min={fMin} max={fMax} step="0.1"
                  value={exposureAuto ? autoFNumber : fN}
                  onChange={(e) => { setExposureAuto(false); setFStop(+e.target.value); }} aria-label={t("coach.recipe.aperture")} aria-valuetext={`f/${activeFNumber.toFixed(1)}`}
                  style={{ width: "100%", height: 36, accentColor: "var(--clay)" }} />
              </label>
              <label className="scene-field diagram-shutter-field">
                <span className="input-label">{t("coach.recipe.shutter")} · 1/{activeShutterDen}</span>
                <input type="range" min={0} max={SHUTTERS.length - 1} step={1}
                  value={exposureAuto ? SHUTTERS.indexOf(autoShutterDen) : shutterIdx}
                  onChange={(e) => { setExposureAuto(false); setShutterIdx(+e.target.value); }} aria-label={t("coach.recipe.shutter")} aria-valuetext={`1/${activeShutterDen} s`}
                  style={{ width: "100%", height: 36, accentColor: "var(--clay)" }} />
              </label>
            </div>
            <p className="recipe-line" style={{ margin: "12px 0 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              {t("diagram.camera.hint")}
            </p>
            <details className="diagram-explanations">
              <summary>{t("diagram.explanations.title")}</summary>
              <ul>
                {recommendation.reasons.map((reason) => (
                  <li key={reason}>{t(`diagram.explanations.${reason}`)}</li>
                ))}
                {recommendation.warnings.map((warning) => (
                  <li key={warning} className="diagram-explanations-warning">{t(`diagram.explanations.${warning}`)}</li>
                ))}
                {recommendation.reasons.length === 0 && recommendation.warnings.length === 0 && (
                  <li>{t("diagram.explanations.balanced")}</li>
                )}
              </ul>
            </details>
          </div>
          </section>
        </div>
      </div>
    </>
  );
}
