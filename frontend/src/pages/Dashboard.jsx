import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  CalendarDays,
  DollarSign,
  TrendingUp,
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
} from 'lucide-react'
import { employees, leaves, payroll, commissionAPI, announcementAPI } from '../api.js'
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

// ─── Skeleton loader ───────────────────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-xl bg-white/30 ${className}`} />
}

// ─── Bento stat card ──────────────────────────────────────────────────────────
function BentoStatCard({ icon: Icon, label, value, sub, gradient, loading, pulse }) {
  return (
    <div className={`gradient-card ${gradient} p-5 flex flex-col justify-between min-h-[130px]`}>
      <div className="flex items-start justify-between">
        <p className="stat-label text-white/70">{label}</p>
        <Icon className="h-6 w-6 text-white/80" />
      </div>
      {loading ? (
        <Skeleton className="h-9 w-32 mt-2" />
      ) : (
        <div>
          <div className={`stat-number text-white ${pulse ? 'badge-pulse inline-block' : ''}`}>
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
      className={`flex flex-col items-center gap-2 p-4 rounded-2xl bg-gradient-to-br ${gradient} cursor-pointer hover:scale-105 transition-transform text-white text-center w-full`}
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

// ─── Main component ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [empCount, setEmpCount] = useState(0)
  const [pendingLeaves, setPendingLeaves] = useState([])
  const [leaveBalance, setLeaveBalance] = useState([])
  const [recentLeaves, setRecentLeaves] = useState([])
  const [payrollCycles, setPayrollCycles] = useState([])
  const [commissionEntries, setCommissionEntries] = useState([])
  const [commissionSummary, setCommissionSummary] = useState(null)
  const [error, setError] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [dismissedIds, setDismissedIds] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('dismissed_announcements') || '[]') } catch { return [] }
  })

  const empId = user?.employee_id ?? 'E001'
  const isManager = ['hr', 'super_admin', 'manager'].includes(user?.role)
  const now = new Date()
  const curMonth = now.getMonth() + 1
  const curYear = now.getFullYear()

  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      setError(null)
      try {
        const calls = [
          ...(isManager ? [employees.getAll({ page: 1, page_size: 1 })] : [Promise.resolve({ data: {} })]),
          leaves.getRequests({ status: 'submitted', page_size: 5 }),
          leaves.getBalance(empId),
          payroll.getCycles({ page_size: 5 }),
          commissionAPI.getEntries({ employee_id: empId, month: curMonth, year: curYear }),
          commissionAPI.getEmployeeSummary(empId, curMonth, curYear),
          announcementAPI.getAll(),
        ]
        const [empRes, leaveReqRes, balRes, cycleRes, commRes, commSumRes, annRes] =
          await Promise.allSettled(calls)

        if (empRes.status === 'fulfilled') {
          const d = empRes.value.data
          setEmpCount(d.count ?? d.total ?? (Array.isArray(d) ? d.length : 0))
        }
        if (leaveReqRes.status === 'fulfilled') {
          const d = leaveReqRes.value.data
          const list = d.results ?? d.data ?? (Array.isArray(d) ? d : [])
          setPendingLeaves(list)
          setRecentLeaves(list.slice(0, 5))
        }
        if (balRes.status === 'fulfilled') {
          const d = balRes.value.data
          setLeaveBalance(d.balances ?? d.data ?? (Array.isArray(d) ? d : []))
        }
        if (cycleRes.status === 'fulfilled') {
          const d = cycleRes.value.data
          setPayrollCycles(d.results ?? d.data ?? (Array.isArray(d) ? d : []))
        }
        if (commRes.status === 'fulfilled') {
          const d = commRes.value.data
          setCommissionEntries(d.results ?? d.data ?? (Array.isArray(d) ? d : []))
        }
        if (commSumRes.status === 'fulfilled') {
          setCommissionSummary(commSumRes.value.data)
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
  const latestCycle = payrollCycles[0]
  const totalPayroll = latestCycle?.total_net_pay ?? latestCycle?.total_amount ?? 0
  const thisMonthCommission =
    commissionSummary?.total ??
    commissionEntries
      .filter((e) => e.status === 'approved')
      .reduce((s, e) => s + parseFloat(e.commission_amount ?? 0), 0)
  const firstName = user?.full_name?.split(' ')[0] ?? 'there'

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* ── Announcements ── */}
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

      {/* ── Greeting bar ── */}
      <div className="flex items-center justify-between animate-stagger-1">
        <div>
          <p className="stat-label text-indigo-400">{getGreeting()}</p>
          <h1 className="text-3xl font-black text-slate-900">{firstName} 👋</h1>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-slate-500">
            {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <p className="text-xs text-slate-400">FY 2025–26</p>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="flex items-center gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error} — Showing demo mode with empty data.
        </div>
      )}

      {/* ── Bento Row 1: Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-stagger-2">
        {isManager && (
          <BentoStatCard
            icon={Users}
            label="TOTAL EMPLOYEES"
            value={empCount}
            sub="Active team members"
            gradient="gradient-indigo"
            loading={loading}
          />
        )}
        <BentoStatCard
          icon={Clock}
          label="PENDING APPROVALS"
          value={pendingLeaves.length}
          sub="Leaves awaiting action"
          gradient="gradient-amber"
          loading={loading}
          pulse={pendingLeaves.length > 0}
        />
        {isManager && (
          <BentoStatCard
            icon={DollarSign}
            label="THIS MONTH PAYROLL"
            value={formatINR(totalPayroll)}
            sub="Net disbursement"
            gradient="gradient-cyan"
            loading={loading}
          />
        )}
        <BentoStatCard
          icon={TrendingUp}
          label="MY COMMISSION"
          value={formatINR(thisMonthCommission)}
          sub={`${now.toLocaleString('en-IN', { month: 'short' })} ${curYear}`}
          gradient="gradient-green"
          loading={loading}
        />
      </div>

      {/* ── Bento Row 2: Leave balance + Recent requests ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-stagger-3">
        {/* Leave Balance */}
        <div className="glass-card p-5 lg:col-span-2">
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
        <div className="glass-card p-5 flex flex-col">
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
            className="btn-primary w-full mt-4 justify-center"
          >
            Apply Leave
          </button>
        </div>
      </div>

      {/* ── Bento Row 3: Quick Actions + Recent Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-stagger-4">
        {/* Quick Actions */}
        <div className="glass-card p-5">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickAction
              icon={CalendarPlus}
              label="Apply Leave"
              gradient="from-indigo-500 to-indigo-600"
              onClick={() => navigate('/leaves/request')}
            />
            <QuickAction
              icon={FileText}
              label="View Salary Slip"
              gradient="from-violet-500 to-violet-600"
              onClick={() => navigate(`/employees/${empId}`)}
            />
            <QuickAction
              icon={TrendingUp}
              label="Log Commission"
              gradient="from-amber-500 to-orange-500"
              onClick={() => navigate('/commission')}
            />
            <QuickAction
              icon={Receipt}
              label="View Reports"
              gradient="from-cyan-500 to-cyan-600"
              onClick={() => navigate('/reports')}
            />
          </div>
        </div>

        {/* Recent Commission Activity */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-indigo-500" />
            <h2 className="text-xl font-bold text-slate-900">Recent Activity</h2>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : commissionEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <Activity className="h-10 w-10 mb-3 text-slate-300" />
              <p className="text-sm">No recent activity</p>
            </div>
          ) : (
            <div className="relative pl-4 space-y-3">
              {/* Timeline line */}
              <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-gradient-to-b from-indigo-400 to-violet-400 rounded-full" />
              {commissionEntries.slice(0, 5).map((e, i) => (
                <div key={e.id ?? i} className="relative">
                  <div className="absolute -left-[18px] top-1.5 h-2.5 w-2.5 rounded-full bg-indigo-500 border-2 border-white" />
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{e.description ?? 'Commission entry'}</p>
                      {e.deal_value && (
                        <p className="text-xs text-slate-500">Deal: {formatINR(e.deal_value)}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold text-indigo-700">{formatINR(e.commission_amount ?? 0)}</p>
                      <StatusBadge status={e.status ?? 'pending'} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {commissionEntries.length > 0 && (
            <button
              onClick={() => navigate('/commission')}
              className="btn-glass w-full mt-4 justify-center"
            >
              View all <ArrowRight className="h-4 w-4 ml-1" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
