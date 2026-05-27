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
} from 'lucide-react'
import { employees, leaves, payroll } from '../api.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import LeaveBalanceCard from '../components/LeaveBalanceCard.jsx'
import toast from 'react-hot-toast'

const DEFAULT_EMP = 'E001'

function formatINR(amount) {
  if (amount == null) return '₹0'
  return '₹' + Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function StatCard({ icon: Icon, label, value, sub, color = 'indigo', loading }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
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
  const [loading, setLoading] = useState(true)
  const [empCount, setEmpCount] = useState(0)
  const [pendingLeaves, setPendingLeaves] = useState([])
  const [leaveBalance, setLeaveBalance] = useState([])
  const [recentLeaves, setRecentLeaves] = useState([])
  const [payrollCycles, setPayrollCycles] = useState([])
  const [loans, setLoans] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      setError(null)
      try {
        const [empRes, leaveReqRes, balRes, cycleRes, loanRes] = await Promise.allSettled([
          employees.getAll({ page: 1, page_size: 1 }),
          leaves.getRequests({ status: 'submitted', page_size: 5 }),
          leaves.getBalance(DEFAULT_EMP),
          payroll.getCycles({ page_size: 5 }),
          payroll.getLoans({ page_size: 100 }),
        ])

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
      } catch (err) {
        setError('Failed to load dashboard data. Backend may not be running.')
        toast.error('Could not connect to backend API')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  const latestCycle = payrollCycles[0]
  const totalPayroll = latestCycle?.total_net_pay ?? latestCycle?.total_amount ?? 0

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Employees"
          value={empCount}
          color="indigo"
          loading={loading}
        />
        <StatCard
          icon={Calendar}
          label="Pending Leave Requests"
          value={pendingLeaves.length}
          sub="Awaiting approval"
          color="amber"
          loading={loading}
        />
        <StatCard
          icon={DollarSign}
          label="This Month Payroll"
          value={formatINR(totalPayroll)}
          sub={latestCycle ? `${latestCycle.month_name ?? ''} ${latestCycle.year ?? ''}` : 'No cycles yet'}
          color="green"
          loading={loading}
        />
        <StatCard
          icon={TrendingUp}
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
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner text="Loading leaves..." />
              </div>
            ) : recentLeaves.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                No pending leave requests
              </div>
            ) : (
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
            )}
          </div>
        </div>

        {/* Leave balance for E001 */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">My Leave Balance</h2>
              <p className="text-xs text-gray-400 mt-0.5">Employee: {DEFAULT_EMP}</p>
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

      {/* Quick actions */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-5 py-4">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/leaves/request')}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            Apply Leave
          </button>
          <button
            onClick={() => navigate(`/employees/${DEFAULT_EMP}`)}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-4 w-4" />
            View Salary Slip
          </button>
          <button
            onClick={() => navigate('/payroll')}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <CreditCard className="h-4 w-4" />
            Request Loan
          </button>
          <button
            onClick={() => navigate('/reports')}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <TrendingUp className="h-4 w-4" />
            View Reports
          </button>
        </div>
      </div>
    </div>
  )
}
