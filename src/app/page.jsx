"use client";

import Link from "next/link";
import LastAdviceCard from "./_components/LastAdviceCard";
import { useT } from "@/lib/i18n/LocaleProvider";

const FEATURES = [
  { href: "/coach",      key: "coach",      icon: "🎯", badgeClass: "badge-leaf" },
  { href: "/plan",       key: "plan",       icon: "🗺️", badgeClass: "badge-sun" },
  { href: "/critique",   key: "critique",   icon: "🔍", badgeClass: "badge-sun" },
  { href: "/conditions", key: "conditions", icon: "🌌", badgeClass: "badge-clay" },
];

export default function HomePage() {
  const t = useT();
  return (
    <>
      <header className="hero">
        <div className="accent" style={{ fontSize: "1.4rem" }}>{t("home.kicker")}</div>
        <h1>{t("home.title")}</h1>
        <p>{t("home.body")}</p>
        <div style={{ marginTop: 24, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link className="btn btn-primary" href="/coach">{t("home.ctaCoach")}</Link>
          <Link className="btn btn-ghost" href="/plan">{t("home.ctaRoadmap")}</Link>
        </div>
      </header>

      <LastAdviceCard />

      <section style={{ marginTop: 32 }}>
        <h2 className="page-title" style={{ fontSize: "1.4rem" }}>{t("home.sectionTitle")}</h2>
        <p className="page-sub">{t("home.sectionSub")}</p>

        <div className="card-grid">
          {FEATURES.map((f) => (
            <Link key={f.href} href={f.href} className="card feature-card">
              <div className="feature-head">
                <span className="feature-icon" aria-hidden>{f.icon}</span>
                <span className={`badge ${f.badgeClass}`}>{t(`home.feature.${f.key}.badge`)}</span>
              </div>
              <div className="card-title">{t(`home.feature.${f.key}.title`)}</div>
              <p className="feature-body">{t(`home.feature.${f.key}.body`)}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
