"use client";

import { useT, useLocale } from "@/lib/i18n/LocaleProvider";
import { DICTIONARIES } from "@/lib/i18n/dictionaries";

export default function OfflinePage() {
  const t = useT();
  const { locale } = useLocale();
  const works = DICTIONARIES[locale]?.offline?.works || DICTIONARIES.en.offline.works;
  return (
    <>
      <h1 className="page-title">{t("offline.title")}</h1>
      <p className="page-sub">{t("offline.sub")}</p>

      <div className="card" style={{ display: "grid", gap: 14 }}>
        <div>
          <div className="card-title">{t("offline.worksTitle")}</div>
          <ul style={{ margin: 0, paddingLeft: 20, color: "var(--text-muted)", lineHeight: 1.6 }}>
            {works.map((it, i) => <li key={i}>{it}</li>)}
          </ul>
        </div>
        <div>
          <a className="btn btn-primary" href="/coach">{t("offline.back")}</a>
        </div>
      </div>
    </>
  );
}
