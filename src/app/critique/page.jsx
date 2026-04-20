export default function CritiquePage() {
  return (
    <>
      <h1 className="page-title">Critique a photo</h1>
      <p className="page-sub">Placeholder — drop a photo, read EXIF, get AI feedback.</p>
      <div className="card">
        <div className="card-title">Coming next</div>
        <ul style={{ margin: 0, paddingLeft: 20, color: "var(--text-muted)" }}>
          <li>Drag-and-drop upload (JPEG / HEIC / RAW)</li>
          <li>EXIF parse: camera, lens, ISO, shutter, aperture, GPS, time</li>
          <li>Vision model compares intent vs. result — composition, light, focus</li>
          <li>"Try next time" action list</li>
        </ul>
      </div>
    </>
  );
}
