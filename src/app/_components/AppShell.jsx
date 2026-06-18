"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Target, Map, SlidersHorizontal, Camera, User } from "lucide-react";
import { useT, useLocale } from "@/lib/i18n/LocaleProvider";

const NAV = [
  { href: "/",         key: "home",     Icon: Home },
  { href: "/coach",    key: "coach",    Icon: Target },
  { href: "/plan",     key: "plan",     Icon: Map },
  { href: "/adjust",   key: "adjust",   Icon: SlidersHorizontal },
  { href: "/gear",     key: "gear",     Icon: Camera },
  { href: "/account",  key: "account",  Icon: User },
];

function isActive(pathname, href) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function LocaleSwitcher({ className = "" }) {
  const { locale, setLocale, t } = useLocale();
  return (
    <div className={`locale-switch ${className}`} role="group" aria-label={t("locale.label")}>
      <button
        type="button"
        className={`locale-btn ${locale === "en" ? "locale-on" : ""}`}
        aria-pressed={locale === "en"}
        onClick={() => setLocale("en")}
      >EN</button>
      <button
        type="button"
        className={`locale-btn ${locale === "es" ? "locale-on" : ""}`}
        aria-pressed={locale === "es"}
        onClick={() => setLocale("es")}
      >ES</button>
    </div>
  );
}

export default function AppShell({ children }) {
  const pathname = usePathname() || "/";
  const t = useT();
  return (
    <>
      <nav className="sidebar-nav" aria-label="Primary">
        <div className="sidebar-logo">happy lens</div>
        <div className="sidebar-section">Shoot</div>
        <div className="sidebar-items">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sideitem ${isActive(pathname, item.href) ? "active" : ""}`}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
            >
              <item.Icon size={18} aria-hidden />
              <span>{t(`nav.${item.key}`)}</span>
            </Link>
          ))}
        </div>
        <div className="sidebar-footer">
          <LocaleSwitcher />
          <span className="accent" style={{ fontSize: "0.95rem", display: "block", marginTop: 10 }}>Happy Factory</span>
        </div>
      </nav>

      <header className="nav-mobile-bar">
        <span className="nav-mobile-logo">happy lens</span>
        <LocaleSwitcher className="locale-switch-mobile" />
      </header>

      <main className="app">
        <div className="page">{children}</div>
      </main>

      <nav className="bottom-nav" aria-label="Primary mobile">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`bottom-nav-item ${isActive(pathname, item.href) ? "active" : ""}`}
            aria-current={isActive(pathname, item.href) ? "page" : undefined}
          >
            <span className="bottom-nav-item-icon" aria-hidden><item.Icon size={20} /></span>
            <span>{t(`nav.${item.key}`)}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
