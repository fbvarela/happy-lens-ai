"use client";

import Link from "next/link";
import { useT, useLocale } from "@/lib/i18n/LocaleProvider";
import { DICTIONARIES } from "@/lib/i18n/dictionaries";

export default function PlanPage() {
  const t = useT();
  const { locale } = useLocale();
  const items = DICTIONARIES[locale]?.plan?.roadmap?.items || DICTIONARIES.en.plan.roadmap.items;
  return (
    <>
      <h1 className="page-title">{t("plan.title")}</h1>
      <p className="page-sub">{t("plan.sub")}</p>

      <div className="card" style={{ display: "grid", gap: 14 }}>
        <div>
          <div className="card-title">{t("plan.cta.title")}</div>
          <p style={{ margin: 0, color: "var(--text-muted)" }}>{t("plan.cta.body")}</p>
        </div>
        <div>
          <Link className="btn btn-primary" href="/coach">{t("plan.cta.button")}</Link>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title">{t("plan.roadmap.title")}</div>
        <ul style={{ margin: 0, paddingLeft: 20, color: "var(--text-muted)", lineHeight: 1.6 }}>
          {items.map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      </div>
    </>
  );
}
