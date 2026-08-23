"use client";

import Link from "next/link";
import { Target, Map, Search, Stars } from "lucide-react";
import LastRecipeCard from "./_components/LastRecipeCard";
import { useT } from "@/lib/i18n/LocaleProvider";

const FEATURES = [
  { href: "/coach",      key: "coach",      Icon: Target, badgeClass: "badge-leaf" },
  { href: "/plan",       key: "plan",       Icon: Map,    badgeClass: "badge-sun" },
  { href: "/critique",   key: "critique",   Icon: Search, badgeClass: "badge-sun" },
  { href: "/conditions", key: "conditions", Icon: Stars,  badgeClass: "badge-clay" },
];

export default function HomePage() {
  const t = useT();
  return (
    <div className="home-layout">
      <div className="home-main">
        <header className="hero">
        <div className="accent">{t("home.kicker")}</div>
        <h1 className="text-balance">{t("home.title")}</h1>
        <p className="text-pretty">{t("home.body")}</p>
        <div className="hero-actions">
          <Link className="btn btn-primary" href="/coach"><Target size={15} aria-hidden /> {t("home.ctaCoach")}</Link>
          <Link className="btn btn-ghost" href="/plan">{t("home.ctaRoadmap")}</Link>
        </div>
        </header>

        <LastRecipeCard />
      </div>

      <section className="home-section home-aside">
        <h2 className="page-title home-section-title">{t("home.sectionTitle")}</h2>
        <p className="page-sub">{t("home.sectionSub")}</p>

        <div className="card-grid">
          {FEATURES.map((f) => (
            <Link key={f.href} href={f.href} className="card feature-card">
              <div className="feature-head">
                <span className="feature-icon" aria-hidden><f.Icon size={20} /></span>
                <span className={`badge ${f.badgeClass}`}>{t(`home.feature.${f.key}.badge`)}</span>
              </div>
              <div className="card-title">{t(`home.feature.${f.key}.title`)}</div>
              <p className="feature-body">{t(`home.feature.${f.key}.body`)}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
