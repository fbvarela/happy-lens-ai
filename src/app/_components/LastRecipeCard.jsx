"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IPHONE_16_PRO } from "@/data/gear/iphone-16-pro";
import { SUBJECT_PRESETS } from "@/data/subjects/presets";

function findLastRecipe() {
  if (typeof window === "undefined") return null;
  let best = null;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith("hl.coach.iphone-16-pro.")) continue;
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const v = JSON.parse(raw);
      if (!v?.recipes?.length) continue;
      const parts = k.split(".");
      if (parts.length < 7) continue;
      const subjectId = parts[3];
      const hour = parts[parts.length - 1];
      const ts = Date.parse(`${hour}:00:00Z`);
      if (!best || ts > best.ts) best = { ts, subjectId, value: v };
    }
  } catch {}
  return best;
}

export default function LastRecipeCard() {
  const [state, setState] = useState(null);
  useEffect(() => { setState(findLastRecipe()); }, []);
  if (!state) return null;
  const subject = SUBJECT_PRESETS.find((s) => s.id === state.subjectId);
  const r = state.value.recipes[0];
  const lens = IPHONE_16_PRO.lenses.find((l) => l.id === r.lens);
  return (
    <section style={{ marginTop: 28 }}>
      <div className="card last-recipe">
        <div className="recipe-head">
          <div className="card-title" style={{ margin: 0 }}>
            Last recipe — {subject?.label || state.subjectId}
          </div>
          <span className="badge badge-leaf">Saved</span>
        </div>
        <div className="recipe-stats">
          <div><div className="recipe-stat-label">Lens</div><div className="recipe-stat-value">{lens?.label || r.lens}</div></div>
          <div><div className="recipe-stat-label">Aperture</div><div className="recipe-stat-value">f/{r.fNumber}</div></div>
          <div><div className="recipe-stat-label">Shutter</div><div className="recipe-stat-value">{r.shutter}</div></div>
          <div><div className="recipe-stat-label">ISO</div><div className="recipe-stat-value">{r.iso}</div></div>
          <div><div className="recipe-stat-label">Mode</div><div className="recipe-stat-value">{r.cameraMode}</div></div>
        </div>
        <Link href="/coach" className="btn btn-sun">Open coach →</Link>
      </div>
    </section>
  );
}
