// Shown instantly on every navigation within the dashboard while the next
// page's server render + data load. The sidebar/nav stay put (they live in
// the layout); only this content area swaps to a skeleton — so switching pages
// feels immediate instead of frozen. One file here covers every child route
// that doesn't define its own loading.tsx.
export default function DashboardLoading() {
  return (
    <div className="dashboard-content-area">
      <main className="dashboard-main" style={{ paddingTop: "2rem", alignItems: "center" }}>
        <div style={{ width: "100%", maxWidth: "640px", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* header / search-bar placeholder */}
          <div className="skeleton-line" style={{ height: "48px", borderRadius: "9999px" }} aria-hidden="true" />

          {/* a few content cards */}
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="skeleton-card"
              style={{
                border: "1px solid var(--input-border)",
                borderRadius: "12px",
                padding: "1.25rem",
              }}
              aria-hidden="true"
            >
              <div className="skeleton-line short" />
              <div className="skeleton-line" />
              <div className="skeleton-line" style={{ width: "78%" }} />
            </div>
          ))}
          <span className="sr-only">Loading…</span>
        </div>
      </main>
    </div>
  );
}
