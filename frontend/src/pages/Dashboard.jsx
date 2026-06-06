import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  CalendarDays,
  DollarSign,
  ArrowRight,
  FileText,
  Receipt,
  CalendarPlus,
  Activity,
  List,
  AlertCircle,
  X,
  Bell,
  Clock,
  UserPlus,
  BarChart2,
  Settings,
  CheckCircle,
  XCircle,
  Briefcase,
} from 'lucide-react'
import { employees, leaves, payroll, expenseAPI, announcementAPI } from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { formatINR } from '../utils/format.js'
import toast from 'react-hot-toast'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// ─── Live dual timezone clock ─────────────────────────────────────────────────
function DualClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  function fmt(tz) {
    return now.toLocaleTimeString('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
  }
  function fmtDate(tz) {
    return now.toLocaleDateString('en-US', {
      timeZone: tz,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="hidden sm:flex items-center gap-3">
      {/* IST */}
      <div className="text-right">
        <div className="flex items-center gap-1.5 justify-end">
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">IST</span>
          <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
        </div>
        <p className="text-sm font-bold text-slate-800 tabular-nums leading-tight">{fmt('Asia/Kolkata')}</p>
        <p className="text-xs text-slate-400">{fmtDate('Asia/Kolkata')}</p>
      </div>

      <div className="w-px h-10 bg-slate-200" />

      {/* EST/EDT */}
      <div className="text-right">
        <div className="flex items-center gap-1.5 justify-end">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-500">EST</span>
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
        </div>
        <p className="text-sm font-bold text-slate-800 tabular-nums leading-tight">{fmt('America/New_York')}</p>
        <p className="text-xs text-slate-400">{fmtDate('America/New_York')}</p>
      </div>
    </div>
  )
}

// ─── Skeleton loader ───────────────────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-xl bg-white/30 ${className}`} />
}

// ─── Bento stat card ──────────────────────────────────────────────────────────
function BentoStatCard({ icon: Icon, label, value, sub, gradient, loading, pulse }) {
  return (
    <div
      className="p-5 flex flex-col justify-between min-h-[130px] rounded-2xl"
      style={{ background: gradient }}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/70">{label}</p>
        <Icon className="h-6 w-6 text-white/80" />
      </div>
      {loading ? (
        <Skeleton className="h-9 w-32 mt-2" />
      ) : (
        <div>
          <div className={`text-3xl font-black text-white ${pulse ? 'animate-pulse' : ''}`}>
            {value}
          </div>
          {sub && <p className="text-white/70 text-xs mt-1">{sub}</p>}
        </div>
      )}
    </div>
  )
}

// ─── Leave balance mini‑card ──────────────────────────────────────────────────
function LeaveBalanceMini({ leaveType, available, total }) {
  const pct = total > 0 ? Math.min(100, Math.round((available / total) * 100)) : 0
  return (
    <div className="bg-white/40 rounded-2xl p-3">
      <p className="text-xs font-bold text-slate-700 mb-1">{leaveType}</p>
      <div className="h-2 rounded-full bg-slate-200 overflow-hidden mb-1">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-slate-500">
        <span className="font-semibold text-slate-700">{available}</span> of {total} available
      </p>
    </div>
  )
}

// ─── Quick action card ────────────────────────────────────────────────────────
function QuickAction({ icon: Icon, label, gradient, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-2xl cursor-pointer hover:scale-105 transition-transform text-white text-center w-full"
      style={{ background: gradient }}
    >
      <Icon className="h-6 w-6" />
      <span className="text-xs font-semibold">{label}</span>
    </button>
  )
}

// ─── Status dot ───────────────────────────────────────────────────────────────
function StatusDot({ status }) {
  const map = {
    approved: 'bg-emerald-500',
    rejected: 'bg-red-500',
    submitted: 'bg-amber-500',
    draft: 'bg-slate-400',
    cancelled: 'bg-slate-300',
    pending: 'bg-amber-500',
  }
  return (
    <span className={`inline-block h-2 w-2 rounded-full flex-shrink-0 mt-1 ${map[status] ?? 'bg-slate-400'}`} />
  )
}

// ─── Announcement banner ──────────────────────────────────────────────────────
function announcementStyle(priority) {
  switch (priority) {
    case 'urgent': return 'bg-red-500/10 border-red-400/40 text-red-900'
    case 'high': return 'bg-orange-500/10 border-orange-400/40 text-orange-900'
    case 'normal': return 'bg-indigo-500/10 border-indigo-400/40 text-indigo-900'
    default: return 'bg-slate-500/10 border-slate-400/40 text-slate-700'
  }
}

// ─── ADMIN DASHBOARD ─────────────────────────────────────────────────────────
function AdminDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [empCount, setEmpCount] = useState(0)
  const [pendingLeaves, setPendingLeaves] = useState([])
  const [pendingExpenses, setPendingExpenses] = useState([])
  const [payrollCycles, setPayrollCycles] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [dismissedIds, setDismissedIds] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('dismissed_announcements') || '[]') } catch { return [] }
  })
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState({})

  const firstName = ''

  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      setError(null)
      try {
        const [empRes, leaveRes, expenseRes, cycleRes, annRes] = await Promise.allSettled([
          employees.getAll({ page: 1, page_size: 1 }),
          leaves.getRequests({ status: 'submitted', page_size: 10 }),
          expenseAPI.getAll({ status: 'pending', page_size: 10 }),
          payroll.getCycles({ page_size: 5 }),
          announcementAPI.getAll(),
        ])

        if (empRes.status === 'fulfilled') {
          const d = empRes.value.data
          setEmpCount(d.count ?? d.total ?? (Array.isArray(d) ? d.length : 0))
        }
        if (leaveRes.status === 'fulfilled') {
          const d = leaveRes.value.data
          setPendingLeaves(d.results ?? d.data ?? (Array.isArray(d) ? d : []))
        }
        if (expenseRes.status === 'fulfilled') {
          const d = expenseRes.value.data
          setPendingExpenses(d.results ?? d.data ?? (Array.isArray(d) ? d : []))
        }
        if (cycleRes.status === 'fulfilled') {
          const d = cycleRes.value.data
          setPayrollCycles(d.results ?? d.data ?? (Array.isArray(d) ? d : []))
        }
        if (annRes.status === 'fulfilled') {
          const d = annRes.value.data
          setAnnouncements(d.results ?? d.announcements ?? (Array.isArray(d) ? d : []))
        }
      } catch {
        setError('Failed to load dashboard data.')
        toast.error('Could not connect to backend API')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  function dismissAnnouncement(id) {
    const updated = [...dismissedIds, id]
    setDismissedIds(updated)
    sessionStorage.setItem('dismissed_announcements', JSON.stringify(updated))
  }

  async function handleLeaveAction(leaveId, action) {
    setActionLoading((prev) => ({ ...prev, [`leave_${leaveId}`]: action }))
    try {
      await leaves.approveRequest(leaveId, action, '')
      toast.success(`Leave request ${action === 'approve' ? 'approved' : 'rejected'}`)
      setPendingLeaves((prev) => prev.filter((l) => l.id !== leaveId))
    } catch (err) {
      toast.error(err.userMessage ?? `Failed to ${action} leave`)
    } finally {
      setActionLoading((prev) => { const n = { ...prev }; delete n[`leave_${leaveId}`]; return n })
    }
  }

  async function handleExpenseAction(expenseId, action) {
    setActionLoading((prev) => ({ ...prev, [`expense_${expenseId}`]: action }))
    try {
      await expenseAPI.approve(expenseId, { action })
      toast.success(`Expense ${action === 'approve' ? 'approved' : 'rejected'}`)
      setPendingExpenses((prev) => prev.filter((e) => e.id !== expenseId))
    } catch (err) {
      toast.error(err.userMessage ?? `Failed to ${action} expense`)
    } finally {
      setActionLoading((prev) => { const n = { ...prev }; delete n[`expense_${expenseId}`]; return n })
    }
  }

  const visibleAnnouncements = announcements.filter((a) => !dismissedIds.includes(a.id))
  const latestCycle = payrollCycles[0]
  const activePayrollLabel = latestCycle
    ? `${latestCycle.month_name ?? latestCycle.month} ${latestCycle.year}`
    : 'None'

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Announcements */}
      {visibleAnnouncements.length > 0 && (
        <div className="space-y-2">
          {visibleAnnouncements.map((ann) => (
            <div
              key={ann.id}
              className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${announcementStyle(ann.priority)}`}
            >
              <Bell className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{ann.title}</p>
                <p className="text-sm mt-0.5 opacity-90">{ann.content}</p>
              </div>
              <button
                onClick={() => dismissAnnouncement(ann.id)}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-black/5 transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">{getGreeting()}</p>
          <h1 className="text-3xl font-black text-slate-900">Admin Dashboard</h1>
        </div>
        <DualClock />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error} — Showing demo mode with empty data.
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <BentoStatCard
          icon={Users}
          label="Total Employees"
          value={empCount}
          sub="Active team members"
          gradient="linear-gradient(135deg, #6366F1, #8B5CF6)"
          loading={loading}
        />
        <BentoStatCard
          icon={Clock}
          label="Pending Leave Requests"
          value={pendingLeaves.length}
          sub="Awaiting approval"
          gradient="linear-gradient(135deg, #F59E0B, #EF4444)"
          loading={loading}
          pulse={pendingLeaves.length > 0}
        />
        <BentoStatCard
          icon={Receipt}
          label="Pending Expense Claims"
          value={pendingExpenses.length}
          sub="Awaiting approval"
          gradient="linear-gradient(135deg, #06B6D4, #0EA5E9)"
          loading={loading}
          pulse={pendingExpenses.length > 0}
        />
        <BentoStatCard
          icon={DollarSign}
          label="Active Payroll Cycle"
          value={activePayrollLabel}
          sub="Current cycle"
          gradient="linear-gradient(135deg, #10B981, #059669)"
          loading={loading}
        />
      </div>

      {/* Pending Leave Approvals + Pending Expense Claims */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pending Leave Approvals */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/50 shadow-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-indigo-500" />
              <h2 className="text-lg font-bold text-slate-900">Pending Leave Approvals</h2>
            </div>
            <button
              onClick={() => navigate('/leaves')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              View All <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : pendingLeaves.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-300" />
              <p className="text-sm">No pending leave requests</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingLeaves.slice(0, 5).map((req) => {
                const leaveKey = `leave_${req.id}`
                return (
                  <div key={req.id} className="flex items-center gap-3 bg-white/50 rounded-xl px-3 py-2.5">
                    <StatusDot status={req.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {req.employee_name ?? req.employee_id ?? '—'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {req.leave_type_name ?? req.leave_type ?? '—'} &bull;{' '}
                        {req.from_date ?? req.start_date ?? '—'} – {req.to_date ?? req.end_date ?? '—'}
                        {req.number_of_days ? ` (${req.number_of_days}d)` : ''}
                      </p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        disabled={!!actionLoading[leaveKey]}
                        onClick={() => handleLeaveAction(req.id, 'approve')}
                        className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50 transition-colors"
                      >
                        {actionLoading[leaveKey] === 'approve' ? '…' : 'Approve'}
                      </button>
                      <button
                        disabled={!!actionLoading[leaveKey]}
                        onClick={() => handleLeaveAction(req.id, 'reject')}
                        className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 transition-colors"
                      >
                        {actionLoading[leaveKey] === 'reject' ? '…' : 'Reject'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pending Expense Claims */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/50 shadow-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-cyan-500" />
              <h2 className="text-lg font-bold text-slate-900">Pending Expense Claims</h2>
            </div>
            <button
              onClick={() => navigate('/expenses')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              View All <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : pendingExpenses.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-300" />
              <p className="text-sm">No pending expense claims</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingExpenses.slice(0, 5).map((exp) => {
                const expKey = `expense_${exp.id}`
                return (
                  <div key={exp.id} className="flex items-center gap-3 bg-white/50 rounded-xl px-3 py-2.5">
                    <StatusDot status={exp.status ?? 'pending'} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {exp.employee_name ?? exp.employee_id ?? '—'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {exp.category ?? exp.expense_category ?? '—'} &bull; {formatINR(exp.amount ?? exp.total_amount ?? 0)}
                      </p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        disabled={!!actionLoading[expKey]}
                        onClick={() => handleExpenseAction(exp.id, 'approve')}
                        className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50 transition-colors"
                      >
                        {actionLoading[expKey] === 'approve' ? '…' : 'Approve'}
                      </button>
                      <button
                        disabled={!!actionLoading[expKey]}
                        onClick={() => handleExpenseAction(exp.id, 'reject')}
                        className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 transition-colors"
                      >
                        {actionLoading[expKey] === 'reject' ? '…' : 'Reject'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/50 shadow-lg p-5">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction
            icon={UserPlus}
            label="Add Employee"
            gradient="linear-gradient(135deg, #6366F1, #8B5CF6)"
            onClick={() => navigate('/employees')}
          />
          <QuickAction
            icon={DollarSign}
            label="Process Payroll"
            gradient="linear-gradient(135deg, #10B981, #059669)"
            onClick={() => navigate('/payroll')}
          />
          <QuickAction
            icon={BarChart2}
            label="View Reports"
            gradient="linear-gradient(135deg, #06B6D4, #0EA5E9)"
            onClick={() => navigate('/reports')}
          />
          <QuickAction
            icon={Settings}
            label="System Settings"
            gradient="linear-gradient(135deg, #F59E0B, #EF4444)"
            onClick={() => navigate('/settings')}
          />
        </div>
      </div>
    </div>
  )
}

// ─── EMPLOYEE DASHBOARD ───────────────────────────────────────────────────────
function EmployeeDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [leaveBalance, setLeaveBalance] = useState([])
  const [recentLeaves, setRecentLeaves] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [dismissedIds, setDismissedIds] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('dismissed_announcements') || '[]') } catch { return [] }
  })
  const [error, setError] = useState(null)

  const empId = user?.employee_id ?? 'E001'
  const firstName = user?.full_name?.split(' ')[0] ?? 'there'

  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      setError(null)
      try {
        const [leaveReqRes, balRes, annRes] = await Promise.allSettled([
          leaves.getRequests({ status: 'submitted', page_size: 5 }),
          leaves.getBalance(empId),
          announcementAPI.getAll(),
        ])

        if (leaveReqRes.status === 'fulfilled') {
          const d = leaveReqRes.value.data
          const list = d.results ?? d.data ?? (Array.isArray(d) ? d : [])
          setRecentLeaves(list.slice(0, 5))
        }
        if (balRes.status === 'fulfilled') {
          const d = balRes.value.data
          setLeaveBalance(d.balances ?? d.data ?? (Array.isArray(d) ? d : []))
        }
        if (annRes.status === 'fulfilled') {
          const d = annRes.value.data
          setAnnouncements(d.results ?? d.announcements ?? (Array.isArray(d) ? d : []))
        }
      } catch {
        setError('Failed to load dashboard data. Backend may not be running.')
        toast.error('Could not connect to backend API')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empId])

  function dismissAnnouncement(id) {
    const updated = [...dismissedIds, id]
    setDismissedIds(updated)
    sessionStorage.setItem('dismissed_announcements', JSON.stringify(updated))
  }

  const visibleAnnouncements = announcements.filter((a) => !dismissedIds.includes(a.id))

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Announcements */}
      {visibleAnnouncements.length > 0 && (
        <div className="space-y-2 animate-stagger-1">
          {visibleAnnouncements.map((ann) => (
            <div
              key={ann.id}
              className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${announcementStyle(ann.priority)}`}
            >
              <Bell className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{ann.title}</p>
                <p className="text-sm mt-0.5 opacity-90">{ann.content}</p>
              </div>
              <button
                onClick={() => dismissAnnouncement(ann.id)}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-black/5 transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Greeting bar */}
      <div className="flex items-center justify-between animate-stagger-1">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">{getGreeting()}</p>
          <h1 className="text-3xl font-black text-slate-900">{firstName} 👋</h1>
        </div>
        <DualClock />
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error} — Showing demo mode with empty data.
        </div>
      )}

      {/* Leave balance + Recent requests */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-stagger-3">
        {/* Leave Balance */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/50 shadow-lg p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="h-5 w-5 text-indigo-500" />
            <h2 className="text-xl font-bold text-slate-900">My Leave Balance</h2>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : leaveBalance.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No balance data</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {leaveBalance.slice(0, 6).map((b, i) => (
                <LeaveBalanceMini
                  key={b.leave_type_id ?? i}
                  leaveType={b.leave_type_name ?? b.leave_type ?? `Type ${i + 1}`}
                  available={b.available ?? b.remaining ?? 0}
                  total={b.total_allotted ?? b.total ?? 0}
                />
              ))}
            </div>
          )}
        </div>

        {/* Recent Requests */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/50 shadow-lg p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <List className="h-5 w-5 text-indigo-500" />
            <h2 className="text-xl font-bold text-slate-900">Recent Requests</h2>
          </div>
          {loading ? (
            <div className="space-y-3 flex-1">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : recentLeaves.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8 flex-1">No recent requests</p>
          ) : (
            <div className="space-y-2 flex-1">
              {recentLeaves.map((req, i) => (
                <div key={req.id ?? i} className="flex items-start gap-2 py-2 border-b border-slate-100 last:border-0">
                  <StatusDot status={req.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {req.employee_name ?? req.employee_id ?? '—'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {req.leave_type_name ?? req.leave_type ?? '—'} &bull; {req.from_date ?? req.start_date ?? '—'}
                    </p>
                  </div>
                  <StatusBadge status={req.status} />
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => navigate('/leaves/request')}
            className="px-4 py-2 rounded-full text-white text-sm font-semibold w-full mt-4 text-center"
            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
          >
            Apply Leave
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/50 shadow-lg p-5 animate-stagger-4">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <QuickAction
            icon={CalendarPlus}
            label="Apply Leave"
            gradient="linear-gradient(135deg, #6366F1, #8B5CF6)"
            onClick={() => navigate('/leaves/request')}
          />
          <QuickAction
            icon={FileText}
            label="View Salary Slip"
            gradient="linear-gradient(135deg, #7C3AED, #6D28D9)"
            onClick={() => navigate(`/employees/${empId}`)}
          />
          <QuickAction
            icon={Receipt}
            label="View Reports"
            gradient="linear-gradient(135deg, #06B6D4, #0EA5E9)"
            onClick={() => navigate('/reports')}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth()
  const isAdmin = ['super_admin', 'hr'].includes(user?.role)

  if (isAdmin) {
    return <AdminDashboard />
  }
  return <EmployeeDashboard />
}
