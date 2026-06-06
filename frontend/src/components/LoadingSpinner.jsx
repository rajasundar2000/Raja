export default function LoadingSpinner({ size = 'md', text = '', fullPage = false }) {
  const dims = {
    sm: { outer: 20, inner: 14, border: 2 },
    md: { outer: 36, inner: 26, border: 3 },
    lg: { outer: 56, inner: 42, border: 4 },
  }

  const d = dims[size] ?? dims.md

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      {/* Gradient ring using SVG so we can stroke with a gradient */}
      <div
        className="animate-spin"
        style={{ width: d.outer, height: d.outer }}
      >
        <svg
          viewBox="0 0 36 36"
          width={d.outer}
          height={d.outer}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="spin-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>
          {/* Track */}
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke="rgba(99,102,241,0.15)"
            strokeWidth={d.border}
          />
          {/* Arc — about 3/4 of the circle */}
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke="url(#spin-grad)"
            strokeWidth={d.border}
            strokeLinecap="round"
            strokeDasharray="70 24"
            strokeDashoffset="0"
          />
        </svg>
      </div>
      {text && (
        <p className="text-sm font-medium text-slate-500">{text}</p>
      )}
    </div>
  )

  if (fullPage) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div
          className="glass-card flex flex-col items-center justify-center gap-4 p-10"
          style={{ minWidth: 160 }}
        >
          {spinner}
        </div>
      </div>
    )
  }

  return spinner
}
