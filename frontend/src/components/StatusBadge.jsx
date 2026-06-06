export default function StatusBadge({ status }) {
  const map = {
    approved:   { cls: 'bg-emerald-100 text-emerald-700', pulse: false },
    active:     { cls: 'bg-emerald-100 text-emerald-700', pulse: false },
    paid:       { cls: 'bg-emerald-100 text-emerald-700', pulse: false },
    rejected:   { cls: 'bg-red-100 text-red-700',         pulse: false },
    pending:    { cls: 'bg-amber-100 text-amber-700',     pulse: true },
    submitted:  { cls: 'bg-amber-100 text-amber-700',     pulse: true },
    draft:      { cls: 'bg-slate-100 text-slate-600',     pulse: false },
    inactive:   { cls: 'bg-slate-100 text-slate-600',     pulse: false },
    closed:     { cls: 'bg-slate-100 text-slate-600',     pulse: false },
    cancelled:  { cls: 'bg-orange-100 text-orange-700',   pulse: false },
    revoked:    { cls: 'bg-orange-100 text-orange-700',   pulse: false },
    processing: { cls: 'bg-cyan-100 text-cyan-700',       pulse: false },
    locked:     { cls: 'bg-violet-100 text-violet-700',   pulse: false },
    foreclosed: { cls: 'bg-violet-100 text-violet-700',   pulse: false },
  }

  const entry = map[status?.toLowerCase()] ?? { cls: 'bg-slate-100 text-slate-600', pulse: false }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${entry.cls} ${
        entry.pulse ? 'badge-pulse' : ''
      }`}
    >
      {status}
    </span>
  )
}
