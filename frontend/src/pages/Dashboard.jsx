import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  ArrowRight,
  PlusCircle,
  FileText,
  CreditCard,
  AlertCircle,
  X,
  Bell,
} from 'lucide-react'
import { employees, leaves, payroll, commissionAPI, announcementAPI } from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import LeaveBalanceCard from '../components/LeaveBalanceCard.jsx'
import { formatINR } from '../utils/format.js'
import toast from 'react-hot-toast'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function StatCard({ icon: Icon, label, value, sub, color = 'indigo', loading }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className={`rounded-lg p-2.5 ${colors[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {loading ? (
        <div className="h-7 w-20 bg-gray-100 animate-pulse rounded" />
      ) : (
        <div className="text-2xl font-bold text-gray-900">{value}</div>
      )}
      <div className="text-sm text-gray-500 mt-1">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [empCount, setEmpCount] = useState(0)
  const [pendingLeaves, setPendingLeaves] = useState([])
  const [leaveBalance, setLeaveBalance] = useState([])
  const [recentLeaves, setRecentLeaves] = useState([])
  const [payrollCycles, setPayrollCycles] = useState([])
  const [loans, setLoans] = useState([])
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
          payroll.getLoans({ page_size: 100 }),
          commissionAPI.getEntries({ employee_id: empId, month: curMonth, year: curYear }),
          commissionAPI.getEmployeeSummary(empId, curMonth, curYear),
          announcementAPI.getAll(),
        ]

        const [empRes, leaveReqRes, balRes, cycleRes, loanRes, commRes, commSumRes, annRes] =
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
          const list = d.balances ?? d.data ?? (Array.isArray(d) ? d : [])
          setLeaveBalance(list)
        }
        if (cycleRes.status === 'fulfilled') {
          const d = cycleRes.value.data
          const list = d.results ?? d.data ?? (Array.isArray(d) ? d : [])
          setPayrollCycles(list)
        }
        if (loanRes.status === 'fulfilled') {
          const d = loanRes.value.data
          const list = d.results ?? d.data ?? (Array.isArray(d) ? d : [])
          setLoans(list.filter((l) => l.status === 'active'))
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

  const thisMonthCommission = commissionSummary?.total ??
    commissionEntries
      .filter((e) => e.status === 'approved')
      .reduce((s, e) => s + parseFloat(e.commission_amount ?? 0), 0)

  const firstName = user?.full_name?.split(' ')[0] ?? 'there'

  function announcementStyle(priority) {
    switch (priority) {
      case 'urgent': return 'bg-red-50 border-red-300 text-red-900'
      case 'high': return 'bg-orange-50 border-orange-300 text-orange-900'
      case 'normal': return 'bg-blue-50 border-blue-300 text-blue-900'
      default: return 'bg-gray-50 border-gray-300 text-gray-700'
    }
  }

  return (
    <div className="space-y-6">
      {/* Announcements */}
      {visibleAnnouncements.length > 0 && (
        <div className="space-y-2">
          {visibleAnnouncements.map((ann) => (
            <div
              key={ann.id}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${announcementStyle(ann.priority)}`}
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {getGreeting()}, {firstName}! 👋
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Indian Leave Management & Payroll — FY 2025–26
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error} — Showing demo mode with empty data.
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
        {isManager && (
          <StatCard
            icon={Users}
            label="Total Employees"
            value={empCount}
            color="indigo"
            loading={loading}
          />
        )}
        <StatCard
          icon={Calendar}
          label="Pending Leaves"
          value={pendingLeaves.length}
          sub="Awaiting approval"
          color="amber"
          loading={loading}
        />
        {isManager && (
          <StatCard
            icon={DollarSign}
            label="This Month Payroll"
            value={formatINR(totalPayroll)}
            sub={latestCycle ? `${latestCycle.month_name ?? ''} ${latestCycle.year ?? ''}` : 'No cycles yet'}
            color="green"
            loading={loading}
          />
        )}
        <StatCard
          icon={TrendingUp}
          label="My Commission"
          value={formatINR(thisMonthCommission)}
          sub={`${new Date().toLocaleString('en-IN', { month: 'short' })} ${curYear}`}
          color="purple"
          loading={loading}
        />
        <StatCard
          icon={CreditCard}
          label="Active Loans"
          value={loans.length}
          sub="Employee loans"
          color="blue"
          loading={loading}
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent leave requests */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 className="text-base font-semibold text-gray-900">Recent Leave Requests</h2>
            <button
              onClick={() => navigate('/leaves')}
              className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
            >
              View all <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner text="Loading leaves..." />
            </div>
          ) : recentLeaves.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              No pending leave requests
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3 text-left">Employee</th>
                      <th className="px-5 py-3 text-left">Type</th>
                      <th className="px-5 py-3 text-left">From</th>
                      <th className="px-5 py-3 text-left">Days</th>
                      <th className="px-5 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentLeaves.map((req, i) => (
                      <tr key={req.id ?? i} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-gray-900">
                          {req.employee_name ?? req.employee_id ?? '—'}
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {req.leave_type_name ?? req.leave_type ?? '—'}
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {req.from_date ?? req.start_date ?? '—'}
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {req.working_days ?? req.days ?? '—'}
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={req.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {recentLeaves.map((req, i) => (
                  <div key={req.id ?? i} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">
                          {req.employee_name ?? req.employee_id ?? '—'}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {req.leave_type_name ?? req.leave_type ?? '—'}
                        </p>
                      </div>
                      <StatusBadge status={req.status} />
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-500">
                      <span>From: {req.from_date ?? req.start_date ?? '—'}</span>
                      <span>Days: {req.working_days ?? req.days ?? '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Leave balance */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">My Leave Balance</h2>
              <p className="text-xs text-gray-400 mt-0.5">Employee: {empId}</p>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {loading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="sm" text="Loading..." />
              </div>
            ) : leaveBalance.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No balance data</p>
            ) : (
              leaveBalance.slice(0, 5).map((b, i) => (
                <LeaveBalanceCard
                  key={b.leave_type_id ?? i}
                  leaveType={b.leave_type_name ?? b.leave_type ?? `Type ${i + 1}`}
                  available={b.available ?? b.remaining ?? 0}
                  total={b.total_allotted ?? b.total ?? 0}
                  used={b.used ?? b.taken ?? 0}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* My Commission This Month */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">My Commission This Month</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date().toLocaleString('en-IN', { month: 'long' })} {curYear}
            </p>
          </div>
          <button
            onClick={() => navigate('/commission')}
            className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
          >
            View all <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="sm" text="Loading commission..." />
          </div>
        ) : commissionEntries.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            No commission entries this month
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3 text-left">Description</th>
                    <th className="px-5 py-3 text-right">Deal Value</th>
                    <th className="px-5 py-3 text-right">Commission</th>
                    <th className="px-5 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {commissionEntries.slice(0, 5).map((e, i) => (
                    <tr key={e.id ?? i} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-700">{e.description ?? '—'}</td>
                      <td className="px-5 py-3 text-right text-gray-600">
                        {e.deal_value ? formatINR(e.deal_value) : '—'}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-indigo-700">
                        {formatINR(e.commission_amount ?? 0)}
                      </td>
                      <td className="px-5 py-3"><StatusBadge status={e.status ?? 'pending'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-gray-100">
              {commissionEntries.slice(0, 5).map((e, i) => (
                <div key={e.id ?? i} className="p-4 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{e.description ?? '—'}</p>
                    {e.deal_value && (
                      <p className="text-xs text-gray-500 mt-0.5">Deal: {formatINR(e.deal_value)}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-indigo-700">{formatINR(e.commission_amount ?? 0)}</p>
                    <div className="mt-1"><StatusBadge status={e.status ?? 'pending'} /></div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-5 py-4">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/leaves/request')}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors min-h-[44px]"
          >
            <PlusCircle className="h-4 w-4" />
            Apply Leave
          </button>
          <button
            onClick={() => navigate(`/employees/${empId}`)}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors min-h-[44px]"
          >
            <FileText className="h-4 w-4" />
            View Salary Slip
          </button>
          <button
            onClick={() => navigate('/commission')}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors min-h-[44px]"
          >
            <TrendingUp className="h-4 w-4" />
            Log Commission
          </button>
          <button
            onClick={() => navigate('/reports')}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors min-h-[44px]"
          >
            <DollarSign className="h-4 w-4" />
            View Reports
          </button>
        </div>
      </div>
    </div>
  )
}
