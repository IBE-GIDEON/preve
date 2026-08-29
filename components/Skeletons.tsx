// Loading skeletons that mirror the app's real content layouts, so pages fill
// in place instead of flashing "Loading…" text. Reuses the .skeleton-* styles
// in globals.css.

function SkeletonCard() {
  return (
    <div
      className="skeleton-card"
      style={{ border: "1px solid var(--input-border)", borderRadius: 16, padding: "1.25rem" }}
      aria-hidden="true"
    >
      <div className="skeleton-line short" />
      <div className="skeleton-line" />
      <div className="skeleton-line" style={{ width: "60%" }} />
    </div>
  );
}

/** Matches the .collections-grid card layout (collections + saved previews). */
export function CollectionsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="collections-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/** Matches the .connect-grid / .connect-card layout on the Accounts page. */
export function ConnectGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="connect-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <section key={i} className="connect-card" aria-hidden="true">
          <div className="connect-card-main" style={{ alignItems: "center" }}>
            <span
              className="skeleton-media"
              style={{ width: 40, height: 40, borderRadius: 8, aspectRatio: "auto", flexShrink: 0 }}
            />
            <div style={{ flex: 1, display: "grid", gap: "0.5rem" }}>
              <div className="skeleton-line" style={{ width: "55%" }} />
              <div className="skeleton-line short" />
            </div>
          </div>
        </section>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/** Matches the vertical .collection-item list of saved posts. */
export function SavedListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="collection-item" aria-hidden="true">
          <span className="skeleton-line" style={{ width: 54, height: 12, flexShrink: 0 }} />
          <div style={{ minWidth: 0, flex: 1, display: "grid", gap: "0.4rem" }}>
            <div className="skeleton-line" style={{ width: "80%" }} />
            <div className="skeleton-line short" style={{ height: 10 }} />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
