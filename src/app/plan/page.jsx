export default function PlanPage() {
  return (
    <>
      <h1 className="page-title">Plan a shoot</h1>
      <p className="page-sub">Placeholder — the planner form and AI shot list will live here.</p>
      <div className="card">
        <div className="card-title">Coming next</div>
        <ul style={{ margin: 0, paddingLeft: 20, color: "var(--text-muted)" }}>
          <li>Subject picker (wildlife, milky way, macro, street, portrait, landscape)</li>
          <li>Location input → sunrise/sunset, moon phase, tide, weather</li>
          <li>Gear-aware settings (shutter, aperture, ISO, focal length)</li>
          <li>AI-generated shot list w/ timing windows</li>
        </ul>
      </div>
    </>
  );
}
