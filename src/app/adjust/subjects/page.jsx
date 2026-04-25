"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listSubjects, deleteSubjectBaseline, renameSubjectBaseline } from "@/lib/adjust-history";
import { useAuth } from "@/lib/auth/AuthProvider";

const LABELS = {
  exposure: "Exposure", brilliance: "Brilliance", highlights: "Highlights", shadows: "Shadows",
  contrast: "Contrast", brightness: "Brightness", blackPoint: "Black Point",
  saturation: "Saturation", vibrance: "Vibrance", warmth: "Warmth", tint: "Tint",
  sharpness: "Sharpness", definition: "Definition", noiseReduction: "Noise Reduction", vignette: "Vignette",
};
const signed = (v) => v > 0 ? `+${v}` : `${v}`;

export default function SubjectsPage() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState({});
  const [source, setSource] = useState("local");

  const refresh = async () => {
    if (user) {
      try {
        const r = await fetch("/api/adjust/subject", { cache: "no-store" });
        const d = await r.json();
        if (Array.isArray(d.subjects) && d.subjects.length) {
          const map = {};
          for (const row of d.subjects) {
            map[row.subjectSlug] = {
              displayName: row.displayName,
              sampleCount: row.sampleCount,
              baseline: row.baselineRecipeJson,
              updatedAt: row.updatedAt ? new Date(row.updatedAt).getTime() : Date.now(),
            };
          }
          setSubjects(map);
          setSource("server");
          return;
        }
      } catch {}
    }
    setSubjects(listSubjects());
    setSource("local");
  };

  useEffect(() => { refresh(); }, [user]);

  const onRename = async (slug, current) => {
    const next = window.prompt("Display name:", current);
    if (!next || next === current) return;
    renameSubjectBaseline(slug, next);
    if (user) {
      await fetch("/api/adjust/subject", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectSlug: slug, displayName: next }),
      }).catch(() => {});
    }
    refresh();
  };

  const onDelete = async (slug) => {
    if (!window.confirm("Delete this subject baseline?")) return;
    deleteSubjectBaseline(slug);
    if (user) {
      await fetch("/api/adjust/subject", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectSlug: slug }),
      }).catch(() => {});
    }
    refresh();
  };

  const slugs = Object.keys(subjects);

  return (
    <>
      <h1 className="page-title">Subject baselines</h1>
      <p className="page-sub">Each tagged subject builds a running average across the Light, Color and Detail sliders. Use them as a starting point for a consistent look.</p>
      <div style={{ marginBottom: 12 }}>
        <span className={`badge ${source === "server" ? "badge-leaf" : "badge-sun"}`}>
          {source === "server" ? "Synced across devices" : "On this device only"}
        </span>
      </div>

      {slugs.length === 0 && (
        <div className="card">
          <p className="recipe-line">No subjects yet. Tag a subject when you upload a photo on <Link href="/adjust" className="link">Adjust</Link> and it'll show up here.</p>
        </div>
      )}

      {slugs.length > 0 && (
        <div className="card-grid">
          {slugs.map((slug) => {
            const s = subjects[slug];
            const r = s.baseline;
            const rows = [
              ...Object.entries(r.light || {}),
              ...Object.entries(r.color || {}),
              ...Object.entries(r.detail || {}),
            ].filter(([, v]) => v !== 0 && v != null);
            return (
              <div key={slug} className="card">
                <div className="recipe-head">
                  <div className="card-title" style={{ margin: 0 }}>{s.displayName}</div>
                  <span className="badge badge-sun">{s.sampleCount} sample{s.sampleCount === 1 ? "" : "s"}</span>
                </div>
                <div className="recipe-stat-label" style={{ marginTop: 6 }}>
                  Style: <strong>{r.photographicStyle?.preset || "Standard"}</strong>
                </div>
                {rows.length > 0 ? (
                  <div className="recipe-stats" style={{ marginTop: 8 }}>
                    {rows.slice(0, 8).map(([k, v]) => (
                      <div key={k} style={{ minWidth: 0 }}>
                        <div className="recipe-stat-label">{LABELS[k] || k}</div>
                        <div className="recipe-stat-value">{signed(v)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="recipe-line" style={{ marginTop: 6, color: "var(--text-muted)" }}>All sliders at 0.</p>
                )}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => onRename(slug, s.displayName)}>Rename</button>
                  <button type="button" className="btn btn-ghost" onClick={() => onDelete(slug)}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
