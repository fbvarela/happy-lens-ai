"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IPHONE_16_PRO } from "@/data/gear/iphone-16-pro";
import { useT } from "@/lib/i18n/LocaleProvider";

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
  const t = useT();
  const [state, setState] = useState(null);
  useEffect(() => { setState(findLastRecipe()); }, []);
  if (!state) return null;
  const r = state.value.recipes[0];
  const subjectLabel = t(`subject.${state.subjectId}`);
  const lensLabel = t(`lens.${r.lens}`);
  return (
    <section className="home-section">
      <div className="card last-recipe">
        <div className="recipe-head">
          <div className="card-title" style={{ margin: 0 }}>
            {t("home.last.title", subjectLabel)}
          </div>
          <span className="badge badge-leaf">{t("home.last.saved")}</span>
        </div>
        <div className="recipe-stats">
          <div><div className="recipe-stat-label">{t("coach.recipe.lens")}</div><div className="recipe-stat-value">{lensLabel}</div></div>
          <div><div className="recipe-stat-label">{t("coach.recipe.aperture")}</div><div className="recipe-stat-value">f/{r.fNumber}</div></div>
          <div><div className="recipe-stat-label">{t("coach.recipe.shutter")}</div><div className="recipe-stat-value">{r.shutter}</div></div>
          <div><div className="recipe-stat-label">{t("coach.recipe.iso")}</div><div className="recipe-stat-value">{r.iso}</div></div>
          <div><div className="recipe-stat-label">{t("coach.recipe.mode")}</div><div className="recipe-stat-value">{r.cameraMode}</div></div>
        </div>
        <Link href="/coach" className="btn btn-sun">{t("home.last.open")}</Link>
      </div>
    </section>
  );
}
