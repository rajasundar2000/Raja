export default function LeaveBalanceCard({ leaveType, available, total, used }) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0

  return (
    <div className="glass-card p-4">
      {/* Leave type label */}
      <p
        className="stat-label mb-3"
        style={{ color: '#6366F1' }}
      >
        {leaveType}
      </p>

      {/* Available count */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <span className="text-2xl font-black text-slate-800 leading-none">{available}</span>
          <span className="text-sm font-medium text-slate-500 ml-1">days left</span>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Used</p>
          <p className="text-sm font-bold text-slate-600">{used} / {total}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(99,102,241,0.1)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #6366F1, #8B5CF6)',
          }}
        />
      </div>

      {/* Footer */}
      <div className="flex justify-between mt-2">
        <span className="text-xs text-slate-400">{pct}% used</span>
        <span className="text-xs text-slate-400">{total} total days</span>
      </div>
    </div>
  )
}
