import Link from "next/link";

export default function PlanPage() {
  return (
    <>
      <h1 className="page-title">Plan a shoot</h1>
      <p className="page-sub">
        The full planner (location search, tides, weather windows, multi-shot timeline) is next on the roadmap.
        In the meantime the <strong>Shot coach</strong> already does the hard part — turning a subject + place + time
        into concrete settings and a position, tuned to your iPhone 16 Pro.
      </p>

      <div className="card" style={{ display: "grid", gap: 14 }}>
        <div>
          <div className="card-title">Start with the coach</div>
          <p style={{ margin: 0, color: "var(--text-muted)" }}>
            Pick a subject, drop a location and time. Get lens, f-number, shutter, ISO, camera mode and where to stand —
            grounded in real sun position and weather for that hour.
          </p>
        </div>
        <div>
          <Link className="btn btn-primary" href="/coach">Open Shot coach →</Link>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title">Coming to /plan</div>
        <ul style={{ margin: 0, paddingLeft: 20, color: "var(--text-muted)" }}>
          <li>Location search (not just lat/lng) with named spots</li>
          <li>Sunrise/sunset, blue & golden hour windows, moon phase</li>
          <li>Tide tables for coastal shoots</li>
          <li>Multi-shot timeline across a trip</li>
          <li>Gear profiles beyond the iPhone 16 Pro</li>
        </ul>
      </div>
    </>
  );
}
