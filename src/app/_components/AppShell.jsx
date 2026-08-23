"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Home, Target, Map, Compass, SlidersHorizontal, Camera, User, Sun, Moon } from "lucide-react";
import { useT, useLocale } from "@/lib/i18n/LocaleProvider";
import { useTheme } from "@/lib/theme/ThemeProvider";

const NAV = [
  { href: "/",         key: "home",     Icon: Home },
  { href: "/coach",    key: "coach",    Icon: Target },
  { href: "/plan",     key: "plan",     Icon: Map },
  { href: "/diagram",  key: "diagram",  Icon: Compass },
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

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const t = useT();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={dark ? t("theme.toLight") : t("theme.toDark")}
      title={dark ? t("theme.toLight") : t("theme.toDark")}
    >
      {dark ? <Sun size={15} aria-hidden /> : <Moon size={15} aria-hidden />}
      <span className="theme-toggle-text">{dark ? t("theme.light") : t("theme.dark")}</span>
    </button>
  );
}

export default function AppShell({ children }) {
  const pathname = usePathname() || "/";
  const t = useT();

  // A service worker from a previous production build can keep controlling the
  // page during `next dev` (PWA registration is dev-disabled, but an already
  // registered SW persists). A stale SW mixes old/new bundles → hydration
  // mismatch + flicker. Kill it outside production.
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      }).catch(() => {});
    }
  }, []);

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
          <div className="sidebar-footer-row">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
          <span className="accent sidebar-signature">Happy Factory</span>
        </div>
      </nav>

      <header className="nav-mobile-bar">
        <span className="nav-mobile-logo">happy lens</span>
        <div className="nav-mobile-actions">
          <ThemeToggle />
          <LocaleSwitcher className="locale-switch-mobile" />
        </div>
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
