"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IPHONE_16_PRO } from "@/data/gear/iphone-16-pro";
import { useT } from "@/lib/i18n/LocaleProvider";

function findLastAdvice() {
  if (typeof window === "undefined") return null;
  let best = null;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith("hl.coach.iphone-16-pro.")) continue;
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const v = JSON.parse(raw);
      if (!v?.advice?.length) continue;
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

export default function LastAdviceCard() {
  const t = useT();
  const [state, setState] = useState(null);
  useEffect(() => { setState(findLastAdvice()); }, []);
  if (!state) return null;
  const r = state.value.advice[0];
  const subjectLabel = t(`subject.${state.subjectId}`);
  const lensLabel = t(`lens.${r.lens}`);
  return (
    <section style={{ marginTop: 28 }}>
      <div className="card last-advice">
        <div className="advice-head">
          <div className="card-title" style={{ margin: 0 }}>
            {t("home.last.title", subjectLabel)}
          </div>
          <span className="badge badge-leaf">{t("home.last.saved")}</span>
        </div>
        <div className="advice-stats">
          <div><div className="advice-stat-label">{t("coach.advice.lens")}</div><div className="advice-stat-value">{lensLabel}</div></div>
          <div><div className="advice-stat-label">{t("coach.advice.aperture")}</div><div className="advice-stat-value">f/{r.fNumber}</div></div>
          <div><div className="advice-stat-label">{t("coach.advice.shutter")}</div><div className="advice-stat-value">{r.shutter}</div></div>
          <div><div className="advice-stat-label">{t("coach.advice.iso")}</div><div className="advice-stat-value">{r.iso}</div></div>
          <div><div className="advice-stat-label">{t("coach.advice.mode")}</div><div className="advice-stat-value">{r.cameraMode}</div></div>
        </div>
        <Link href="/coach" className="btn btn-sun">{t("home.last.open")}</Link>
      </div>
    </section>
  );
}
