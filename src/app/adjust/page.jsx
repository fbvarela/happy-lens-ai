"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import exifr from "exifr";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { listHistory, pushHistory, clearHistory, slugify, updateSubjectBaseline, getSubjectBaseline, saveRecipe } from "@/lib/adjust-history";
import { getQuota, consumeUpload } from "@/lib/adjust-quota";
import { detectDeviceProfile } from "@/data/devices/iphone-profiles";
import { fileToDownscaledDataUrl } from "@/lib/image-decode";
import { useAuth } from "@/lib/auth/AuthProvider";
import RecipeCard, { recipeToText, recipeToShortcutsList } from "./_components/RecipeCard";

export default function AdjustPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const fileInput = useRef(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [exif, setExif] = useState(null);
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState(null);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(null);
  const [history, setHistory] = useState([]);
  const [quota, setQuota] = useState(null);
  const [serverQuota, setServerQuota] = useState(null);
  const { user } = useAuth();

  useEffect(() => { setHistory(listHistory()); setQuota(getQuota()); }, []);

  const refreshServerQuota = async () => {
    try {
      const r = await fetch("/api/adjust/quota", { cache: "no-store" });
      const d = await r.json();
      setServerQuota(d.authed ? d : null);
    } catch { setServerQuota(null); }
  };

  useEffect(() => {
    if (user) refreshServerQuota();
    else setServerQuota(null);
  }, [user]);

  const device = useMemo(() => detectDeviceProfile(exif), [exif]);
  const subjectSlug = useMemo(() => slugify(subject), [subject]);
  const subjectBaseline = useMemo(() => subjectSlug ? getSubjectBaseline(subjectSlug) : null, [subjectSlug]);
  const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

  const handleFile = async (f) => {
    if (!f || !f.type.startsWith("image/")) { setError("Please pick an image file."); return; }
    setError(null); setRecipe(null); setFile(f);
    try {
      const [dataUrl, meta] = await Promise.all([
        fileToDownscaledDataUrl(f),
        exifr.parse(f, { gps: true, tiff: true, exif: true, ifd0: true }).catch(() => null),
      ]);
      setPreviewUrl(dataUrl);
      setExif(meta || null);
    } catch (err) { setError(err.message || "Could not read image."); }
  };

  const submit = async () => {
    if (!previewUrl) return;
    if (!user) {
      if (!consumeUpload()) {
        setError(`Daily free limit reached (${getQuota().uploads.max}/day). Try again tomorrow.`);
        setQuota(getQuota());
        return;
      }
      setQuota(getQuota());
    }
    setLoading(true); setError(null); setRecipe(null);
    try {
      const res = await fetch("/api/adjust/recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: previewUrl, exif, subject: subject.trim() || null, locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Recipe failed.");
      setRecipe(data);
      const entry = {
        at: Date.now(),
        title: data.title,
        subject: subject.trim() || null,
        subjectSlug: subjectSlug || null,
        deviceProfile: data.deviceProfile,
        thumbnail: previewUrl,
        recipe: data,
      };
      setHistory(pushHistory(entry));
      if (user) refreshServerQuota();
      if (subjectSlug) {
        const baseline = updateSubjectBaseline(subjectSlug, subject.trim(), data);
        fetch("/api/adjust/subject", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subjectSlug, displayName: subject.trim(), baseline: baseline?.baseline ?? data }),
        }).catch(() => {});
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const reset = () => {
    setFile(null); setPreviewUrl(null); setExif(null); setSubject("");
    setRecipe(null); setError(null); setCopied(null);
  };

  const copy = async (kind, text) => {
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1500);
  };

  const saveAndShare = () => {
    if (!recipe) return;
    if (recipe.id) { router.push(`/adjust/r/${recipe.id}`); return; }
    const id = saveRecipe(recipe, previewUrl, subject.trim() || null);
    if (id) router.push(`/adjust/r/${id}`);
  };

  return (
    <>
      <h1 className="page-title">Critique & adjust a photo</h1>
      <p className="page-sub">Drop a photo — get a verdict and the exact iPhone 16 Pro Photos-app slider values to fix it.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        <Link href="/adjust/batch" className="btn btn-ghost">Batch mode</Link>
        <Link href="/adjust/subjects" className="btn btn-ghost">Subject baselines</Link>
        <span className="recipe-stat-label" style={{ marginLeft: "auto" }}>
          {serverQuota?.premium && "Premium · unlimited"}
          {serverQuota && !serverQuota.premium && `${serverQuota.remaining}/${serverQuota.max} uploads left today`}
          {!serverQuota && quota && `Free: ${quota.uploads.remaining}/${quota.uploads.max} uploads left today`}
        </span>
      </div>

      <div className="card coach-card" style={{ display: "grid", gap: 16 }}>
        {!previewUrl && (
          <div
            className={`dropzone ${dragging ? "dropzone-active" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
            onClick={() => fileInput.current?.click()}
            role="button"
            tabIndex={0}
          >
            <div style={{ fontSize: "2rem" }}>🎚️</div>
            <div style={{ fontWeight: 600, color: "var(--bark)" }}>Drop a photo here</div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>JPEG, HEIC, PNG. Best results from iPhone 16 Pro.</div>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif,image/*"
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
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className="badge badge-leaf">{device.label}</span>
              {subjectBaseline && (
                <span className="badge badge-sun">
                  Baseline: {subjectBaseline.displayName} ({subjectBaseline.sampleCount} sample{subjectBaseline.sampleCount === 1 ? "" : "s"})
                </span>
              )}
            </div>
            <label className="scene-field">
              <span className="input-label">Subject (optional)</span>
              <input className="input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. golden retriever in late-day sun" />
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn btn-primary" onClick={submit} disabled={loading}>
                {loading ? "Analyzing…" : "Critique & adjust"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={reset}>Reset</button>
            </div>
          </div>
        )}

        {error && <p className="field-error" style={{ margin: 0 }}>{error}</p>}
      </div>

      {recipe && (
        <section style={{ marginTop: 20, display: "grid", gap: 14 }}>
          <RecipeCard
            recipe={recipe}
            previewUrl={previewUrl}
            deviceProfile={recipe.deviceProfile}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-primary" onClick={() => copy("text", recipeToText(recipe))}>
              {copied === "text" ? "Copied!" : "Copy as text"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => copy("shortcuts", recipeToShortcutsList(recipe))}>
              {copied === "shortcuts" ? "Copied!" : "Copy for Shortcuts"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={saveAndShare}>Save & link</button>
            {isIOS && (
              <a className="btn btn-ghost" href="photos-redirect://" rel="noopener">Open in Photos</a>
            )}
            <button type="button" className="btn btn-ghost" onClick={reset}>New photo</button>
          </div>
        </section>
      )}

      {history.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <div className="recipe-head">
            <h2 className="card-title" style={{ margin: 0 }}>Recent</h2>
            <button type="button" className="btn btn-ghost" onClick={() => { clearHistory(); setHistory([]); }}>Clear</button>
          </div>
          <div className="card-grid" style={{ marginTop: 10 }}>
            {history.map((h, i) => (
              <button
                key={i}
                type="button"
                className="card"
                onClick={() => { setRecipe(h.recipe); setPreviewUrl(h.thumbnail); setSubject(h.subject || ""); }}
                style={{ textAlign: "left", cursor: "pointer", padding: 10 }}
              >
                <div className="preview-wrap" style={{ marginBottom: 8 }}>
                  <img src={h.thumbnail} alt="" className="preview-img" />
                </div>
                <div className="recipe-stat-value">{h.title}</div>
                <div className="recipe-stat-label">
                  {h.subject || "untagged"} · {new Date(h.at).toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
