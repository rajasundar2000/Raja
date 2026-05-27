export default function LeaveBalanceCard({ leaveType, available, total, used }) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0

  const colorMap = {
    'Casual Leave': { bar: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    'Sick Leave': { bar: 'bg-red-400', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    'Earned Leave': { bar: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    'Privilege Leave': { bar: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    'Maternity Leave': { bar: 'bg-pink-500', bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
    'Paternity Leave': { bar: 'bg-cyan-500', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
    'Compensatory Off': { bar: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    'Loss of Pay': { bar: 'bg-gray-400', bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
  }

  const colors = colorMap[leaveType] || {
    bar: 'bg-indigo-500',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
  }

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} p-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-medium ${colors.text}`}>{leaveType}</span>
        <span className={`text-xs font-semibold ${colors.text}`}>
          {available} / {total} days
        </span>
      </div>

      <div className="h-2 bg-white rounded-full overflow-hidden">
        <div
          className={`h-full ${colors.bar} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex justify-between mt-1.5">
        <span className="text-xs text-gray-500">Used: {used} days</span>
        <span className="text-xs text-gray-500">{pct}% used</span>
      </div>
    </div>
  )
}
