export default function Logo() {
  return (
    <div className="logo-container">
      <svg
        width="42"
        height="42"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="logo-svg"
      >
        <defs>
          <linearGradient id="dpmGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
          <linearGradient id="dpmGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Stacked Polygon 1 (Background Layer) */}
        <polygon
          points="24,4 42,14 42,34 24,44 6,34 6,14"
          fill="url(#dpmGrad1)"
          opacity="0.25"
          filter="url(#neonGlow)"
        />

        {/* Stacked Polygon 2 (Middle Dynamic Ring) */}
        <path
          d="M24 8L38 16V32L24 40L10 32V16L24 8Z"
          stroke="url(#dpmGrad1)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Inner Diamond Core (Rebalance Balance Symbol) */}
        <polygon
          points="24,14 33,24 24,34 15,24"
          fill="url(#dpmGrad2)"
        />
        <circle cx="24" cy="24" r="3" fill="#ffffff" />
      </svg>

      <div className="logo-text-group">
        <span className="logo-title">DPM</span>
        <span className="logo-subtitle">DECENTRALIZED PORTFOLIO MANAGER</span>
      </div>
    </div>
  );
}
