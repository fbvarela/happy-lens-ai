"use client";

import { useRef, useState } from "react";
import exifr from "exifr";
import { useT, useLocale } from "@/lib/i18n/LocaleProvider";

const MAX_PREVIEW_PX = 1600;

async function fileToDownscaledDataUrl(file) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const el = new Image();
      el.onload = () => res(el);
      el.onerror = rej;
      el.src = objectUrl;
    });
    const scale = Math.min(1, MAX_PREVIEW_PX / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function CritiquePage() {
  const t = useT();
  const { locale } = useLocale();
  const fileInput = useRef(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [exif, setExif] = useState(null);
  const [intent, setIntent] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = async (f) => {
    if (!f || !f.type.startsWith("image/")) {
      setError(t("critique.errors.pickImage"));
      return;
    }
    setError(null);
    setResult(null);
    setFile(f);
    try {
      const [dataUrl, meta] = await Promise.all([
        fileToDownscaledDataUrl(f),
        exifr.parse(f, { gps: true, tiff: true, exif: true, ifd0: true }).catch(() => null),
      ]);
      setPreviewUrl(dataUrl);
      setExif(meta || null);
    } catch (err) {
      setError(err.message || t("critique.errors.cantRead"));
    }
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const submit = async () => {
    if (!previewUrl) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/coach/critique", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: previewUrl, exif, intent: intent.trim() || null, locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || t("critique.errors.failed"));
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null); setPreviewUrl(null); setExif(null);
    setIntent(""); setResult(null); setError(null);
  };

  return (
    <>
      <h1 className="page-title">{t("critique.title")}</h1>
      <p className="page-sub">{t("critique.sub")}</p>

      <div className="card coach-card" style={{ display: "grid", gap: 16 }}>
        {!previewUrl && (
          <div
            className={`dropzone ${dragging ? "dropzone-active" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInput.current?.click()}
            role="button"
            tabIndex={0}
          >
            <div style={{ fontSize: "2rem" }}>📷</div>
            <div style={{ fontWeight: 600, color: "var(--bark)" }}>{t("critique.dropzone.title")}</div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>{t("critique.dropzone.hint")}</div>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/heic,image/png,image/*"
              onChange={(e) => handleFile(e.target.files?.[0])}
              style={{ display: "none" }}
            />
          </div>
        )}

        {previewUrl && (
          <div style={{ display: "grid", gap: 12 }}>
            <div className="preview-wrap">
              <img src={previewUrl} alt={file?.name || "preview"} className="preview-img" />
            </div>
            {exif && <ExifSummary exif={exif} t={t} />}
            <label className="scene-field">
              <span className="input-label">{t("critique.intent.label")}</span>
              <input className="input"
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                placeholder={t("critique.intent.placeholder")} />
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn btn-primary" onClick={submit} disabled={loading}>
                {loading ? t("critique.submit.loading") : t("critique.submit.idle")}
              </button>
              <button type="button" className="btn btn-ghost" onClick={reset}>{t("critique.reset")}</button>
            </div>
          </div>
        )}

        {error && <p className="field-error" style={{ margin: 0 }}>{error}</p>}
      </div>

      {result && <CritiqueResult result={result} t={t} />}
    </>
  );
}

function ExifSummary({ exif, t }) {
  const items = [
    exif.Make && exif.Model ? { label: t("critique.exif.camera"), value: `${exif.Make} ${exif.Model}` } : null,
    exif.LensModel ? { label: t("critique.exif.lens"), value: exif.LensModel } : null,
    exif.FocalLength != null ? { label: t("critique.exif.focal"), value: `${exif.FocalLength} mm${exif.FocalLengthIn35mmFormat ? ` (${exif.FocalLengthIn35mmFormat} eq)` : ""}` } : null,
    exif.FNumber != null ? { label: t("critique.exif.aperture"), value: `f/${exif.FNumber}` } : null,
    exif.ExposureTime != null ? { label: t("critique.exif.shutter"), value: exif.ExposureTime >= 1 ? `${exif.ExposureTime}s` : `1/${Math.round(1 / exif.ExposureTime)}s` } : null,
    exif.ISO != null ? { label: t("critique.exif.iso"), value: exif.ISO } : null,
    exif.ExposureCompensation != null ? { label: t("critique.exif.ev"), value: exif.ExposureCompensation } : null,
    exif.DateTimeOriginal ? { label: t("critique.exif.taken"), value: new Date(exif.DateTimeOriginal).toLocaleString() } : null,
  ].filter(Boolean);
  if (!items.length) return <div className="advice-warning">{t("critique.exif.noExif")}</div>;
  return (
    <div className="advice-stats">
      {items.map((it) => (
        <div key={it.label}>
          <div className="advice-stat-label">{it.label}</div>
          <div className="advice-stat-value">{it.value}</div>
        </div>
      ))}
    </div>
  );
}

function CritiqueResult({ result, t }) {
  const score = result.verdict?.score ?? 0;
  return (
    <section style={{ marginTop: 20, display: "grid", gap: 14 }}>
      <div className="card">
        <div className="advice-head">
          <div className="card-title" style={{ margin: 0 }}>{result.verdict.headline}</div>
          <span className={`badge ${score >= 4 ? "badge-leaf" : score >= 3 ? "badge-sun" : "badge-clay"}`}>
            {"★".repeat(score)}{"☆".repeat(5 - score)}
          </span>
        </div>
        {result.strengths?.length > 0 && (
          <>
            <div className="advice-stat-label" style={{ marginTop: 6 }}>{t("critique.result.strengths")}</div>
            <ul className="advice-tips">
              {result.strengths.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </>
        )}
        {result.issues?.length > 0 && (
          <>
            <div className="advice-stat-label" style={{ marginTop: 14 }}>{t("critique.result.issues")}</div>
            <ul className="advice-tips">
              {result.issues.map((it, i) => (
                <li key={i}><strong style={{ textTransform: "capitalize" }}>{it.area}.</strong> {it.observation}</li>
              ))}
            </ul>
          </>
        )}
        {result.tryNext?.length > 0 && (
          <>
            <div className="advice-stat-label" style={{ marginTop: 14 }}>{t("critique.result.tryNext")}</div>
            <ul className="advice-tips">
              {result.tryNext.map((x, i) => <li key={i}>{x}</li>)}
            </ul>
          </>
        )}
        {result.adviceTweaks && hasAnyTweak(result.adviceTweaks) && (
          <div style={{ marginTop: 14 }}>
            <div className="advice-stat-label">{t("critique.result.tweaks")}</div>
            <div className="advice-stats" style={{ marginTop: 4 }}>
              {result.adviceTweaks.lens && <Stat label={t("coach.advice.lens")} value={result.adviceTweaks.lens} />}
              {result.adviceTweaks.fNumber != null && <Stat label={t("coach.advice.aperture")} value={`f/${result.adviceTweaks.fNumber}`} />}
              {result.adviceTweaks.shutter && <Stat label={t("coach.advice.shutter")} value={result.adviceTweaks.shutter} />}
              {result.adviceTweaks.iso != null && <Stat label={t("coach.advice.iso")} value={result.adviceTweaks.iso} />}
              {result.adviceTweaks.ev != null && <Stat label={t("coach.advice.ev")} value={result.adviceTweaks.ev > 0 ? `+${result.adviceTweaks.ev}` : result.adviceTweaks.ev} />}
            </div>
            {result.adviceTweaks.note && <p className="advice-line" style={{ marginTop: 8 }}>{result.adviceTweaks.note}</p>}
          </div>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="advice-stat-label">{label}</div>
      <div className="advice-stat-value">{value}</div>
    </div>
  );
}

function hasAnyTweak(t) {
  return t.lens || t.fNumber != null || t.shutter || t.iso != null || t.ev != null || t.note;
}
