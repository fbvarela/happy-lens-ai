"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/",         label: "Home",      icon: "🏠" },
  { href: "/coach",    label: "Coach",     icon: "🎯" },
  { href: "/plan",     label: "Plan",      icon: "🗺️" },
  { href: "/critique", label: "Critique",  icon: "🔍" },
];

function isActive(pathname, href) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AppShell({ children }) {
  const pathname = usePathname() || "/";
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
              <span aria-hidden>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
        <div className="sidebar-footer">
          <span className="accent" style={{ fontSize: "0.95rem" }}>Happy Factory</span>
        </div>
      </nav>

      <header className="nav-mobile-bar" aria-hidden>
        <span className="nav-mobile-logo">happy lens</span>
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
            <span className="bottom-nav-item-icon" aria-hidden>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
