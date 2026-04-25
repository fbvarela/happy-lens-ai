"use client";

import { useMemo } from "react";

const LABELS = {
  exposure: "Exposure", brilliance: "Brilliance", highlights: "Highlights", shadows: "Shadows",
  contrast: "Contrast", brightness: "Brightness", blackPoint: "Black Point",
  saturation: "Saturation", vibrance: "Vibrance", warmth: "Warmth", tint: "Tint",
  sharpness: "Sharpness", definition: "Definition", noiseReduction: "Noise Reduction", vignette: "Vignette",
};

const PATH_LABELS = {
  "photographicstyle.preset": "Photographic Style",
  "photographicstyle.tone": "Style Tone",
  "photographicstyle.color": "Style Color",
  "depth.fstop": "Depth Control",
  "depth.portraitlighting": "Portrait Lighting",
  "depth.lightingintensity": "Lighting Intensity",
};

function normalizeSliderLabel(raw) {
  if (!raw) return "";
  const s = String(raw).trim();
  const lower = s.toLowerCase();
  if (PATH_LABELS[lower]) return PATH_LABELS[lower];
  const tail = lower.includes(".") ? lower.split(".").pop() : lower;
  if (LABELS[tail]) return LABELS[tail];
  const camelHit = Object.keys(LABELS).find((k) => k.toLowerCase() === tail.replace(/[^a-z]/g, ""));
  if (camelHit) return LABELS[camelHit];
  return s.replace(/^./, (c) => c.toUpperCase());
}
const signed = (v) => v > 0 ? `+${v}` : `${v}`;
const fmt = (v, d) => Number(v).toFixed(d);

export function recipeToText(r) {
  const lines = [r.title, "", r.diagnosis, "", "Photographic Style:"];
  lines.push(`  ${r.photographicStyle.preset}` + (r.photographicStyle.tone != null ? `  Tone ${fmt(r.photographicStyle.tone, 1)}` : "") + (r.photographicStyle.color != null ? `  Color ${fmt(r.photographicStyle.color, 1)}` : ""));
  lines.push("", "Light:");
  for (const [k, v] of Object.entries(r.light)) if (v) lines.push(`  ${LABELS[k] || k}: ${signed(v)}`);
  lines.push("", "Color:");
  for (const [k, v] of Object.entries(r.color)) if (v) lines.push(`  ${LABELS[k] || k}: ${signed(v)}`);
  lines.push("", "Detail:");
  for (const [k, v] of Object.entries(r.detail)) if (v) lines.push(`  ${LABELS[k] || k}: ${signed(v)}`);
  if (r.depth) {
    lines.push("", "Depth:");
    if (r.depth.fStop) lines.push(`  Depth Control: f/${r.depth.fStop}`);
    if (r.depth.portraitLighting) lines.push(`  Portrait Lighting: ${r.depth.portraitLighting}` + (r.depth.lightingIntensity ? ` (${r.depth.lightingIntensity})` : ""));
  }
  return lines.join("\n");
}

export function recipeToShortcutsList(r) {
  const items = [];
  items.push(`Photographic Style → ${r.photographicStyle.preset}`);
  if (r.photographicStyle.tone != null) items.push(`Style Tone → ${fmt(r.photographicStyle.tone, 1)}`);
  if (r.photographicStyle.color != null) items.push(`Style Color → ${fmt(r.photographicStyle.color, 1)}`);
  for (const [k, v] of Object.entries(r.light)) if (v) items.push(`${LABELS[k]} → ${signed(v)}`);
  for (const [k, v] of Object.entries(r.color)) if (v) items.push(`${LABELS[k]} → ${signed(v)}`);
  for (const [k, v] of Object.entries(r.detail)) if (v) items.push(`${LABELS[k]} → ${signed(v)}`);
  if (r.depth?.fStop) items.push(`Depth Control → f/${r.depth.fStop}`);
  if (r.depth?.portraitLighting) items.push(`Portrait Lighting → ${r.depth.portraitLighting}`);
  return items.join("\n");
}

function buildCssFilter(r) {
  const exposureF = 1 + (r.light.exposure || 0) / 200;
  const brightnessF = exposureF * (1 + (r.light.brightness || 0) / 200);
  const contrastF = 1 + (r.light.contrast || 0) / 150;
  const saturateF = 1 + ((r.color.saturation || 0) + (r.color.vibrance || 0) * 0.6) / 150;
  const hueDeg = -(r.color.tint || 0) * 0.2;
  const sepiaF = Math.max(0, (r.color.warmth || 0) / 200);
  return `brightness(${brightnessF.toFixed(3)}) contrast(${contrastF.toFixed(3)}) saturate(${saturateF.toFixed(3)}) sepia(${sepiaF.toFixed(3)}) hue-rotate(${hueDeg.toFixed(1)}deg)`;
}

export default function RecipeCard({ recipe, previewUrl, deviceProfile, deviceWarnings }) {
  const cssFilter = useMemo(() => recipe ? buildCssFilter(recipe) : null, [recipe]);
  if (!recipe) return null;
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {recipe.verdict && (
        <div className="card">
          <div className="recipe-head">
            <div className="card-title" style={{ margin: 0 }}>{recipe.verdict.headline}</div>
            <span className={`badge ${recipe.verdict.score >= 4 ? "badge-leaf" : recipe.verdict.score >= 3 ? "badge-sun" : "badge-clay"}`}>
              {"★".repeat(recipe.verdict.score)}{"☆".repeat(5 - recipe.verdict.score)}
            </span>
          </div>
          {recipe.strengths?.length > 0 && (
            <>
              <div className="recipe-stat-label" style={{ marginTop: 10 }}>Working</div>
              <ul className="recipe-tips">
                {recipe.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </>
          )}
          {recipe.issues?.length > 0 && (
            <>
              <div className="recipe-stat-label" style={{ marginTop: 10 }}>To fix</div>
              <ul className="recipe-tips">
                {recipe.issues.map((it, i) => (
                  <li key={i}><strong style={{ textTransform: "capitalize" }}>{it.area}.</strong> {it.observation}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="card">
        <div className="recipe-head">
          <div className="card-title" style={{ margin: 0 }}>{recipe.title}</div>
          <span className="badge badge-leaf">{deviceProfile === "iphone-16-pro" ? "iPhone 16 Pro" : (deviceProfile || "Generic")}</span>
        </div>
        <p className="recipe-line" style={{ marginTop: 6 }}>{recipe.diagnosis}</p>

        {previewUrl && cssFilter && (
          <div className="card-grid" style={{ marginTop: 12 }}>
            <Tile label="Original">
              <img src={previewUrl} alt="original" className="preview-img" />
            </Tile>
            <Tile label="Simulated">
              <img src={previewUrl} alt="simulated" className="preview-img" style={{ filter: cssFilter }} />
            </Tile>
          </div>
        )}
        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 6 }}>
          Simulated preview only — final result depends on the Photos app render.
        </div>
      </div>

      <div className="card">
        <div className="recipe-stat-label">Photographic Style</div>
        <div className="recipe-stat-value">
          {recipe.photographicStyle.preset}
          {recipe.photographicStyle.tone != null && <> · Tone <strong>{fmt(recipe.photographicStyle.tone, 1)}</strong></>}
          {recipe.photographicStyle.color != null && <> · Color <strong>{fmt(recipe.photographicStyle.color, 1)}</strong></>}
        </div>
        <p className="recipe-line" style={{ marginTop: 6 }}>{recipe.photographicStyle.why}</p>
      </div>

      <SliderGroup title="Light" obj={recipe.light} />
      <SliderGroup title="Color" obj={recipe.color} />
      <SliderGroup title="Detail" obj={recipe.detail} />

      {recipe.depth && (
        <div className="card">
          <div className="recipe-stat-label">Depth</div>
          <div className="recipe-stats">
            {recipe.depth.fStop && <Stat label="Depth Control" value={`f/${recipe.depth.fStop}`} />}
            {recipe.depth.portraitLighting && <Stat label="Portrait Lighting" value={recipe.depth.portraitLighting} />}
            {recipe.depth.lightingIntensity != null && <Stat label="Lighting Intensity" value={recipe.depth.lightingIntensity} />}
          </div>
        </div>
      )}

      {recipe.reasons?.length > 0 && (
        <div className="card">
          <div className="recipe-stat-label">Why these moves</div>
          <ul className="recipe-tips">
            {recipe.reasons.map((r, i) => (
              <li key={i}><strong>{normalizeSliderLabel(r.slider)}.</strong> {r.why}</li>
            ))}
          </ul>
        </div>
      )}

      {(recipe.warnings?.length || deviceWarnings?.length) > 0 && (
        <div className="card">
          <div className="recipe-warning">
            {(recipe.warnings || []).map((w, i) => <div key={`r${i}`}>⚠ {w}</div>)}
            {(deviceWarnings || []).map((w, i) => <div key={`d${i}`}>⚠ {w}</div>)}
          </div>
        </div>
      )}
    </div>
  );
}

function Tile({ label, children }) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div className="recipe-stat-label">{label}</div>
      <div className="preview-wrap">{children}</div>
    </div>
  );
}

function SliderGroup({ title, obj }) {
  const rows = Object.entries(obj).filter(([, v]) => v !== 0 && v != null);
  if (!rows.length) return (
    <div className="card">
      <div className="recipe-stat-label">{title}</div>
      <div style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>No changes recommended.</div>
    </div>
  );
  return (
    <div className="card">
      <div className="recipe-stat-label">{title}</div>
      <div className="recipe-stats" style={{ marginTop: 4 }}>
        {rows.map(([k, v]) => <Stat key={k} label={LABELS[k] || k} value={signed(v)} />)}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="recipe-stat-label">{label}</div>
      <div className="recipe-stat-value">{value}</div>
    </div>
  );
}
