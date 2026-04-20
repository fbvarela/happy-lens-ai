import Link from "next/link";

const FEATURES = [
  {
    href: "/plan",
    icon: "🗺️",
    title: "Plan a shoot",
    body: "Pick a subject + location + date. Get sun/moon/weather, gear checklist, and an AI shot list tuned to your kit.",
    badge: "Core",
  },
  {
    href: "/critique",
    icon: "🔍",
    title: "Critique a photo",
    body: "Drop a RAW/JPEG. We read the EXIF, compare it to the scene, and an AI coach suggests what to try next time.",
    badge: "AI",
  },
  {
    href: "/gear",
    icon: "📷",
    title: "My gear",
    body: "Store bodies, lenses, filters. Plans adapt to the focal lengths and apertures you actually own.",
    badge: "Soon",
  },
  {
    href: "/conditions",
    icon: "🌌",
    title: "Tonight's conditions",
    body: "Milky Way visibility, Moon phase, Bortle class at your location, golden & blue hour, aurora Kp index.",
    badge: "Soon",
  },
];

export default function HomePage() {
  return (
    <>
      <header className="hero">
        <div className="accent" style={{ fontSize: "1.4rem" }}>happy lens</div>
        <h1>Shoot with a plan. Leave with the photo.</h1>
        <p>
          Photo-trip planner and shot coach. Tell HappyLens what you want to shoot and where —
          it builds the plan, tracks the light, and reviews the result.
        </p>
        <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link className="btn btn-primary" href="/plan">Plan a shoot</Link>
          <Link className="btn btn-sun" href="/critique">Critique a photo</Link>
        </div>
      </header>

      <section style={{ marginTop: 32 }}>
        <h2 className="page-title">What you can do</h2>
        <p className="page-sub">Four modules, one idea: help you come home with the photo you pictured.</p>

        <div className="card-grid">
          {FEATURES.map((f) => (
            <Link key={f.href} href={f.href} className="card" style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: "1.6rem" }}>{f.icon}</span>
                <span className={`badge ${f.badge === "Core" ? "badge-leaf" : f.badge === "AI" ? "badge-sun" : "badge-clay"}`}>
                  {f.badge}
                </span>
              </div>
              <div className="card-title">{f.title}</div>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.92rem" }}>{f.body}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
