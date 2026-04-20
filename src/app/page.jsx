import Link from "next/link";
import LastRecipeCard from "./_components/LastRecipeCard";

const FEATURES = [
  {
    href: "/coach",
    icon: "🎯",
    title: "Shot coach",
    body: "Pick a subject, drop a location. Get f-number, shutter, ISO, camera mode and position tuned to your iPhone 16 Pro.",
    badge: "Live",
    badgeClass: "badge-leaf",
  },
  {
    href: "/plan",
    icon: "🗺️",
    title: "Plan a shoot",
    body: "Sun, moon, weather and a timeline across a trip. Roadmap — the coach already does today's recipe.",
    badge: "Soon",
    badgeClass: "badge-sun",
  },
  {
    href: "/critique",
    icon: "🔍",
    title: "Critique a photo",
    body: "Drop a JPEG — we read EXIF, compare it to the scene, and suggest what to try next time.",
    badge: "Soon",
    badgeClass: "badge-sun",
  },
  {
    href: "/conditions",
    icon: "🌌",
    title: "Tonight's conditions",
    body: "Milky Way visibility, moon phase, Bortle class, golden & blue hour at your location.",
    badge: "Later",
    badgeClass: "badge-clay",
  },
];

export default function HomePage() {
  return (
    <>
      <header className="hero">
        <div className="accent" style={{ fontSize: "1.4rem" }}>happy lens</div>
        <h1>Shoot with a plan. Leave with the photo.</h1>
        <p>
          A shot coach tuned to your iPhone 16 Pro. Tell happy lens what you want to shoot and where —
          it gives you lens, settings and position for the light you'll actually have.
        </p>
        <div style={{ marginTop: 24, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link className="btn btn-primary" href="/coach">🎯 Open Shot coach</Link>
          <Link className="btn btn-ghost" href="/plan">About the roadmap</Link>
        </div>
      </header>

      <LastRecipeCard />

      <section style={{ marginTop: 32 }}>
        <h2 className="page-title" style={{ fontSize: "1.4rem" }}>What you can do</h2>
        <p className="page-sub">Start with the coach — the rest is on the way.</p>

        <div className="card-grid">
          {FEATURES.map((f) => (
            <Link key={f.href} href={f.href} className="card feature-card">
              <div className="feature-head">
                <span className="feature-icon" aria-hidden>{f.icon}</span>
                <span className={`badge ${f.badgeClass}`}>{f.badge}</span>
              </div>
              <div className="card-title">{f.title}</div>
              <p className="feature-body">{f.body}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
