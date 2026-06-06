import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Filter,
  Check,
  X,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Info,
} from 'lucide-react'
import { leaves } from '../api.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import Modal from '../components/Modal.jsx'
import toast from 'react-hot-toast'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns'

const TABS = ['My Leaves', 'Pending Approvals', 'Team Calendar', 'Leave Types']

// ─── Pill Tabs ─────────────────────────────────────────────────────────────────
function PillTabs({ tabs, active, onChange, badge }) {
  return (
    <div className="flex bg-white/60 rounded-2xl p-1 gap-1 overflow-x-auto">
      {tabs.map((t, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          className={`relative flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl whitespace-nowrap transition-all duration-200 ${
            active === i
              ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
          }`}
        >
          {t}
          {i === 1 && badge > 0 && (
            <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${
              active === 1 ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
            }`}>
              {badge}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── Avatar initials ───────────────────────────────────────────────────────────
function Avatar({ name }) {
  const initials = (name ?? '?').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
      {initials}
    </div>
  )
}

export default function LeaveManagement() {
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [myLeaves, setMyLeaves] = useState([])
  const [pendingLeaves, setPendingLeaves] = useState([])
  const [leaveTypes, setLeaveTypes] = useState([])
  const [allLeaves, setAllLeaves] = useState([])
  const [holidays, setHolidays] = useState([])
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [approveModal, setApproveModal] = useState(null)
  const [approveComments, setApproveComments] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterStatus) params.status = filterStatus
      if (filterType) params.leave_type = filterType
      if (filterFrom) params.from_date = filterFrom
      if (filterTo) params.to_date = filterTo

      const [myRes, pendRes, typeRes, allRes, holRes] = await Promise.allSettled([
        leaves.getRequests({ ...params, employee_id: 'E001', page_size: 50 }),
        leaves.getRequests({ status: 'submitted', page_size: 50 }),
        leaves.getTypes(),
        leaves.getRequests({ ...params, page_size: 100 }),
        leaves.getHolidays({ year: new Date().getFullYear() }),
      ])

      if (myRes.status === 'fulfilled') {
        const d = myRes.value.data
        setMyLeaves(d.results ?? d.data ?? (Array.isArray(d) ? d : []))
      }
      if (pendRes.status === 'fulfilled') {
        const d = pendRes.value.data
        setPendingLeaves(d.results ?? d.data ?? (Array.isArray(d) ? d : []))
      }
      if (typeRes.status === 'fulfilled') {
        const d = typeRes.value.data
        setLeaveTypes(d.results ?? d.data ?? (Array.isArray(d) ? d : []))
      }
      if (allRes.status === 'fulfilled') {
        const d = allRes.value.data
        setAllLeaves(d.results ?? d.data ?? (Array.isArray(d) ? d : []))
      }
      if (holRes.status === 'fulfilled') {
        const d = holRes.value.data
        setHolidays(d.results ?? d.data ?? (Array.isArray(d) ? d : []))
      }
    } catch {
      toast.error('Failed to load leave data')
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterType, filterFrom, filterTo])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleApprove(action) {
    if (!approveModal) return
    setActionLoading(true)
    try {
      await leaves.approveRequest(approveModal.id, action, approveComments)
      toast.success(`Leave ${action}d successfully!`)
      setApproveModal(null)
      setApproveComments('')
      fetchData()
    } catch (err) {
      toast.error(err.userMessage ?? `Failed to ${action} leave`)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCancel(id) {
    if (!confirm('Cancel this leave request?')) return
    try {
      await leaves.cancelRequest(id)
      toast.success('Leave request cancelled')
      fetchData()
    } catch (err) {
      toast.error(err.userMessage ?? 'Failed to cancel')
    }
  }

  const hasFilters = filterStatus || filterType || filterFrom || filterTo

  return (
    <div className="animate-fade-in-up space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between animate-stagger-1">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Leave Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage employee leaves and approvals</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`btn-glass ${hasFilters ? 'ring-2 ring-indigo-400' : ''}`}
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
            {hasFilters && <span className="h-2 w-2 bg-indigo-500 rounded-full" />}
          </button>
          <button
            onClick={() => navigate('/leaves/request')}
            className="btn-primary"
          >
            <Plus className="h-4 w-4" />
            Apply Leave
          </button>
        </div>
      </div>

      {/* ── Collapsible Filters ── */}
      {showFilters && (
        <div className="glass-card p-4 animate-fade-in-up">
          <div className="flex flex-wrap gap-3 items-center">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-glass flex-1 min-w-32"
            >
              <option value="">All Statuses</option>
              {['draft', 'submitted', 'approved', 'rejected', 'cancelled'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input-glass flex-1 min-w-32"
            >
              <option value="">All Leave Types</option>
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name ?? t.leave_type_name}</option>
              ))}
            </select>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="input-glass flex-1 min-w-32"
            />
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="input-glass flex-1 min-w-32"
            />
            <button
              onClick={() => { setFilterStatus(''); setFilterType(''); setFilterFrom(''); setFilterTo('') }}
              className="text-sm text-red-500 hover:text-red-700 font-medium"
            >
              Clear
            </button>
            <button onClick={fetchData} className="btn-glass">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>
        </div>
      )}

      {/* ── Pill Tabs ── */}
      <div className="animate-stagger-2">
        <PillTabs tabs={TABS} active={tab} onChange={setTab} badge={pendingLeaves.length} />
      </div>

      {/* ── Tab Content ── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner text="Loading leave data…" />
        </div>
      ) : (
        <div className="animate-stagger-3">
          {tab === 0 && (
            <LeaveTable
              rows={myLeaves}
              onApprove={(r) => { setApproveModal(r); setApproveComments('') }}
              onCancel={handleCancel}
              showApproveBtn={false}
            />
          )}
          {tab === 1 && (
            <PendingApprovalCards
              rows={pendingLeaves}
              onApprove={(r) => { setApproveModal(r); setApproveComments('') }}
              onCancel={handleCancel}
            />
          )}
          {tab === 2 && (
            <TeamCalendar leaves={allLeaves} holidays={holidays} />
          )}
          {tab === 3 && (
            <LeaveTypesTab leaveTypes={leaveTypes} />
          )}
        </div>
      )}

      {/* ── Approve/Reject Modal ── */}
      <Modal
        open={!!approveModal}
        onClose={() => setApproveModal(null)}
        title="Leave Approval"
        size="sm"
      >
        {approveModal && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4 text-sm space-y-2">
              {[
                ['Employee', approveModal.employee_name ?? approveModal.employee_id],
                ['Leave Type', approveModal.leave_type_name ?? approveModal.leave_type],
                ['Duration', `${approveModal.from_date ?? approveModal.start_date} → ${approveModal.to_date ?? approveModal.end_date}`],
                ['Working Days', approveModal.working_days ?? approveModal.days],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-slate-500">{k}</span>
                  <span className="font-semibold text-slate-800">{v}</span>
                </div>
              ))}
              {approveModal.reason && (
                <div>
                  <span className="text-slate-500 block mb-1">Reason:</span>
                  <span className="text-slate-800">{approveModal.reason}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                Comments (optional)
              </label>
              <textarea
                value={approveComments}
                onChange={(e) => setApproveComments(e.target.value)}
                rows={3}
                className="input-glass resize-none"
                placeholder="Add remarks…"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => handleApprove('reject')}
                disabled={actionLoading}
                className="flex items-center gap-2 rounded-2xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60 transition-colors"
              >
                <X className="h-4 w-4" /> Reject
              </button>
              <button
                onClick={() => handleApprove('approve')}
                disabled={actionLoading}
                className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
              >
                {actionLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Approve
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ─── My Leaves Table ───────────────────────────────────────────────────────────
function LeaveTable({ rows, onApprove, onCancel, showApproveBtn }) {
  if (rows.length === 0) {
    return (
      <div className="glass-card text-center py-16 text-slate-400">
        <Calendar className="h-10 w-10 mx-auto mb-3 text-slate-300" />
        <p className="text-sm">No leave requests found</p>
      </div>
    )
  }

  return (
    <div className="glass-card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/50 text-xs text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3 text-left">Employee</th>
              <th className="px-5 py-3 text-left">Leave Type</th>
              <th className="px-5 py-3 text-left">From</th>
              <th className="px-5 py-3 text-left">To</th>
              <th className="px-5 py-3 text-left">Days</th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-left">Applied On</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id ?? i} className={`hover:bg-indigo-50/30 transition-colors ${i !== rows.length - 1 ? 'border-b border-slate-100' : ''}`}>
                <td className="px-5 py-3 font-semibold text-slate-900">
                  {r.employee_name ?? r.employee_id ?? '—'}
                </td>
                <td className="px-5 py-3 text-slate-600">{r.leave_type_name ?? r.leave_type ?? '—'}</td>
                <td className="px-5 py-3 text-slate-600">{r.from_date ?? r.start_date ?? '—'}</td>
                <td className="px-5 py-3 text-slate-600">{r.to_date ?? r.end_date ?? '—'}</td>
                <td className="px-5 py-3 text-slate-600">{r.working_days ?? r.days ?? '—'}</td>
                <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-5 py-3 text-slate-400 text-xs">
                  {r.applied_on ?? r.created_at?.split('T')[0] ?? '—'}
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {showApproveBtn && r.status === 'submitted' && (
                      <button
                        onClick={() => onApprove(r)}
                        className="text-xs text-emerald-600 hover:underline font-semibold"
                      >
                        Review
                      </button>
                    )}
                    {['draft', 'submitted'].includes(r.status) && (
                      <button
                        onClick={() => onCancel(r.id)}
                        className="text-xs text-red-500 hover:underline font-semibold"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Pending Approvals as Cards ────────────────────────────────────────────────
function PendingApprovalCards({ rows, onApprove, onCancel }) {
  if (rows.length === 0) {
    return (
      <div className="glass-card text-center py-16 text-slate-400">
        <Calendar className="h-10 w-10 mx-auto mb-3 text-slate-300" />
        <p className="text-sm">No pending approvals</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={r.id ?? i} className="glass-card p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {(r.employee_name ?? r.employee_id ?? '?').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-slate-900">{r.employee_name ?? r.employee_id ?? '—'}</p>
              <StatusBadge status={r.status} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {r.leave_type_name ?? r.leave_type ?? '—'} &bull;{' '}
              {r.from_date ?? r.start_date ?? '—'} → {r.to_date ?? r.end_date ?? '—'} &bull;{' '}
              {r.working_days ?? r.days ?? '—'} days
            </p>
            {r.reason && <p className="text-xs text-slate-400 mt-0.5 truncate">{r.reason}</p>}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => onCancel(r.id)}
              className="flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
            >
              <X className="h-3.5 w-3.5" /> Reject
            </button>
            <button
              onClick={() => onApprove(r)}
              className="flex items-center gap-1 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 transition-colors"
            >
              <Check className="h-3.5 w-3.5" /> Approve
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Team Calendar ─────────────────────────────────────────────────────────────
function TeamCalendar({ leaves, holidays }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const holidayDates = new Set(holidays.map((h) => h.date).filter(Boolean))

  const leaveDates = {}
  leaves.forEach((leave) => {
    const from = leave.from_date ?? leave.start_date
    const empName = leave.employee_name ?? leave.employee_id ?? 'Employee'
    if (!from) return
    if (!leaveDates[from]) leaveDates[from] = []
    leaveDates[from].push({ name: empName, status: leave.status })
  })

  const startDow = getDay(monthStart)

  return (
    <div className="glass-card p-5">
      {/* Calendar header */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
          className="btn-glass p-2"
        >
          <ChevronLeft className="h-4 w-4 text-slate-600" />
        </button>
        <h2 className="text-xl font-bold text-slate-900">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <button
          onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
          className="btn-glass p-2"
        >
          <ChevronRight className="h-4 w-4 text-slate-600" />
        </button>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded bg-red-100 border border-red-300" /> Holiday</div>
        <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded bg-amber-100 border border-amber-300" /> Leave Pending</div>
        <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded bg-emerald-100 border border-emerald-300" /> Leave Approved</div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="text-center text-xs font-bold text-slate-400 py-1">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startDow }).map((_, i) => <div key={`empty-${i}`} />)}
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const isHoliday = holidayDates.has(dateStr)
          const dayLeaves = leaveDates[dateStr] ?? []
          const isWeekend = getDay(day) === 0 || getDay(day) === 6
          const isToday = dateStr === format(new Date(), 'yyyy-MM-dd')

          return (
            <div
              key={dateStr}
              className={`min-h-16 rounded-xl p-1.5 text-xs border transition-colors ${
                isHoliday
                  ? 'bg-red-50 border-red-200'
                  : isWeekend
                  ? 'bg-slate-50/80 border-slate-100'
                  : dayLeaves.length > 0
                  ? 'bg-indigo-50 border-indigo-200'
                  : 'bg-white/40 border-slate-100 hover:bg-white/60'
              } ${isToday ? 'ring-2 ring-indigo-400' : ''}`}
            >
              <div className={`font-bold mb-1 ${isToday ? 'text-indigo-600' : isWeekend ? 'text-slate-400' : 'text-slate-700'}`}>
                {format(day, 'd')}
              </div>
              {isHoliday && <div className="text-red-600 truncate text-xs leading-tight">Holiday</div>}
              {dayLeaves.slice(0, 2).map((l, i) => (
                <div
                  key={i}
                  className={`truncate rounded-md px-1 text-xs leading-tight mb-0.5 ${
                    l.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {l.name.split(' ')[0]}
                </div>
              ))}
              {dayLeaves.length > 2 && (
                <div className="text-slate-400 text-xs">+{dayLeaves.length - 2}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Leave Types ───────────────────────────────────────────────────────────────
function LeaveTypesTab({ leaveTypes }) {
  if (leaveTypes.length === 0) {
    return (
      <div className="glass-card text-center py-16 text-slate-400">
        <Info className="h-10 w-10 mx-auto mb-3 text-slate-300" />
        <p className="text-sm">No leave types configured</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {leaveTypes.map((t, i) => (
        <div key={t.id ?? i} className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-bold text-slate-900">{t.name ?? t.leave_type_name}</h3>
            <StatusBadge status={t.is_active ? 'active' : 'inactive'} />
          </div>
          <div className="flex items-end gap-2 mb-3">
            <span className="stat-number text-indigo-600 text-3xl">{t.annual_allotment ?? t.max_days ?? '—'}</span>
            <span className="text-slate-500 text-sm mb-1">days/year</span>
          </div>
          <div className="space-y-1.5 text-xs">
            {[
              ['Carry Forward', t.carry_forward ? 'Yes' : 'No'],
              ['Paid Leave', t.is_paid !== false ? 'Yes' : 'No'],
              ['Encashable', t.is_encashable ? 'Yes' : 'No'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-slate-500">
                <span>{k}</span>
                <span className={`font-semibold ${v === 'Yes' ? 'text-emerald-600' : 'text-slate-400'}`}>{v}</span>
              </div>
            ))}
            {t.is_encashable && (
              <span className="inline-block mt-2 bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 text-xs font-semibold">
                Encashable
              </span>
            )}
            {t.description && (
              <p className="text-slate-400 mt-2 pt-2 border-t border-slate-100">{t.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
