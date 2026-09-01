/**
 * SkeletonLoader — Pulse-wave placeholders for loading states.
 * Usage:
 *   <Skeleton variant="text" width="60%" />
 *   <Skeleton variant="title" />
 *   <Skeleton variant="card" height={80} />
 *   <SkeletonAssetGrid />
 *   <SkeletonMetricRow />
 */

export function Skeleton({ variant = "text", width = "100%", height, style = {} }) {
  const heights = { text: 14, title: 32, card: 72 };
  const h = height ?? heights[variant] ?? 14;

  return (
    <div
      className={`skeleton skeleton-${variant}`}
      style={{ width, height: h, ...style }}
      aria-hidden="true"
    />
  );
}

/** 5-column asset grid skeleton (matches the real asset grid) */
export function SkeletonAssetGrid({ count = 5 }) {
  return (
    <div className="asset-grid" style={{ marginTop: "20px" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{ height: 52, borderRadius: 10 }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

/** 3 PnL badge skeletons */
export function SkeletonMetricRow() {
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      {[130, 130, 130].map((w, i) => (
        <div
          key={i}
          className="skeleton"
          style={{ width: w, height: 52, borderRadius: 10 }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

/** Table rows skeleton */
export function SkeletonTableRows({ rows = 4, cols = 7 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, ri) => (
        <tr key={ri}>
          {Array.from({ length: cols }).map((_, ci) => (
            <td key={ci} style={{ padding: "11px 14px" }}>
              <div
                className="skeleton"
                style={{ height: 12, width: ci === 0 ? "80px" : "60px", borderRadius: 4 }}
                aria-hidden="true"
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Full card skeleton */
export function SkeletonCard({ rows = 3 }) {
  return (
    <div className="card" aria-hidden="true">
      <Skeleton variant="text" width="35%" style={{ marginBottom: 16 }} />
      <Skeleton variant="title" width="55%" style={{ marginBottom: 20 }} />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="text" width={`${90 - i * 15}%`} style={{ marginBottom: 10 }} />
      ))}
    </div>
  );
}
