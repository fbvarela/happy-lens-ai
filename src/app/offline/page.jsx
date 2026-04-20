export const metadata = {
  title: "Offline — Happy Lens",
};

export default function OfflinePage() {
  return (
    <>
      <h1 className="page-title">You're offline</h1>
      <p className="page-sub">
        No network — but the coach still works on recipes you've already generated.
      </p>

      <div className="card" style={{ display: "grid", gap: 14 }}>
        <div>
          <div className="card-title">What still works</div>
          <ul style={{ margin: 0, paddingLeft: 20, color: "var(--text-muted)", lineHeight: 1.6 }}>
            <li>The last recipe you saved for this location + subject + hour</li>
            <li>👍 / 👎 votes and Copy on recipes you've already loaded</li>
          </ul>
        </div>
        <div>
          <a className="btn btn-primary" href="/coach">Back to Shot coach</a>
        </div>
      </div>
    </>
  );
}
