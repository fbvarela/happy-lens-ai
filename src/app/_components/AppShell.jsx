"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Home, Target, Map, Compass, SlidersHorizontal, Camera, User, Sun, Moon, Focus } from "lucide-react";
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

function FieldToggle() {
  const t = useT();
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(document.documentElement.dataset.field === "on");
  }, []);

  const toggle = () => {
    const next = document.documentElement.dataset.field !== "on";
    document.documentElement.dataset.field = next ? "on" : "off";
    try { localStorage.setItem("hl.field", next ? "on" : "off"); } catch {}
    setOn(next);
  };

  return (
    <button
      type="button"
      className={`theme-toggle ${on ? "theme-on" : ""}`}
      onClick={toggle}
      aria-pressed={on}
      aria-label={t("field.toggle")}
      title={t("field.highContrast")}
    >
      <Focus size={15} aria-hidden />
      <span className="theme-toggle-text">{t("field.on")}</span>
    </button>
  );
}

const FONTSCALE_EVENT = "hl:fontscale";

function readFontScale() {
  const attr = typeof document !== "undefined" ? document.documentElement.dataset.fontScale : undefined;
  return attr === "s" || attr === "l" ? attr : "";
}

function TextScaleToggle() {
  const t = useT();
  const [scale, setScale] = useState("");

  // Two instances exist (sidebar + mobile bar, only one visible at a time).
  // Keep them in sync: re-read the source of truth (the <html> attribute) on
  // our own event, and on cross-tab `storage` changes.
  useEffect(() => {
    setScale(readFontScale());
    const sync = () => setScale(readFontScale());
    window.addEventListener(FONTSCALE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(FONTSCALE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const apply = (k) => {
    const next = readFontScale() === k ? "" : k;
    if (next) {
      document.documentElement.dataset.fontScale = next;
      try { localStorage.setItem("hl.fontScale", next); } catch {}
    } else {
      delete document.documentElement.dataset.fontScale;
      try { localStorage.removeItem("hl.fontScale"); } catch {}
    }
    window.dispatchEvent(new Event(FONTSCALE_EVENT));
  };

  return (
    <div className="textscale" role="group" aria-label={t("a11y.textSize")}>
      {["s", "m", "l"].map((k) => (
        <button
          key={k}
          type="button"
          className={`textscale-btn ${scale === k ? "textscale-on" : ""}`}
          aria-pressed={scale === k}
          aria-label={`${t("a11y.textSize")}: ${k.toUpperCase()}`}
          title={`${t("a11y.textSize")}: ${k.toUpperCase()}`}
          onClick={() => apply(k)}
        >
          {k.toUpperCase()}
        </button>
      ))}
    </div>
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
      <a href="#main-content" className="skip-link">{t("a11y.skipToContent")}</a>
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
            <FieldToggle />
          </div>
          <div className="sidebar-footer-row">
            <TextScaleToggle />
          </div>
          <span className="accent sidebar-signature">Happy Factory</span>
        </div>
      </nav>

      <header className="nav-mobile-bar">
        <span className="nav-mobile-logo">happy lens</span>
        <div className="nav-mobile-actions">
          <FieldToggle />
          <ThemeToggle />
          <TextScaleToggle />
          <LocaleSwitcher className="locale-switch-mobile" />
        </div>
      </header>

      <main className="app" id="main-content">
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
