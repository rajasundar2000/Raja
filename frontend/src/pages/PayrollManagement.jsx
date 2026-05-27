import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  DollarSign,
  Users,
  TrendingUp,
  ChevronRight,
  RefreshCw,
  Calendar,
} from 'lucide-react'
import { payroll, employees } from '../api.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import Modal from '../components/Modal.jsx'
import toast from 'react-hot-toast'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function formatINR(amount) {
  if (amount == null) return '₹0'
  return '₹' + Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

export default function PayrollManagement() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [cycles, setCycles] = useState([])
  const [total, setTotal] = useState(0)
  const [empCount, setEmpCount] = useState(0)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showLoanModal, setShowLoanModal] = useState(false)
  const [empList, setEmpList] = useState([])
  const [creating, setCreating] = useState(false)

  const now = new Date()
  const [cycleForm, setCycleForm] = useState({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    payment_date: '',
    remarks: '',
  })

  const [loanForm, setLoanForm] = useState({
    employee_id: '',
    principal_amount: '',
    interest_rate: 0,
    tenure_months: 12,
    emi: '',
    purpose: '',
  })

  const fetchCycles = useCallback(async () => {
    setLoading(true)
    try {
      const [cycleRes, empRes] = await Promise.allSettled([
        payroll.getCycles({ page_size: 50 }),
        employees.getAll({ page_size: 1 }),
      ])
      if (cycleRes.status === 'fulfilled') {
        const d = cycleRes.value.data
        const list = d.results ?? d.data ?? (Array.isArray(d) ? d : [])
        setCycles(list)
        setTotal(d.count ?? d.total ?? list.length)
      }
      if (empRes.status === 'fulfilled') {
        const d = empRes.value.data
        setEmpCount(d.count ?? d.total ?? 0)
      }
    } catch {
      toast.error('Failed to load payroll data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCycles()
    employees.getAll({ page_size: 200 }).then((res) => {
      const d = res.data
      setEmpList(d.results ?? d.data ?? (Array.isArray(d) ? d : []))
    }).catch(() => {})
  }, [fetchCycles])

  async function handleCreateCycle(e) {
    e.preventDefault()
    if (!cycleForm.payment_date) {
      toast.error('Please select payment date')
      return
    }
    setCreating(true)
    try {
      await payroll.createCycle(cycleForm)
      toast.success('Payroll cycle created!')
      setShowCreateModal(false)
      fetchCycles()
    } catch (err) {
      toast.error(err.userMessage ?? 'Failed to create cycle')
    } finally {
      setCreating(false)
    }
  }

  async function handleCreateLoan(e) {
    e.preventDefault()
    if (!loanForm.employee_id || !loanForm.principal_amount) {
      toast.error('Please fill required fields')
      return
    }
    setCreating(true)
    try {
      await payroll.createLoan(loanForm)
      toast.success('Loan request created!')
      setShowLoanModal(false)
      setLoanForm({
        employee_id: '', principal_amount: '', interest_rate: 0,
        tenure_months: 12, emi: '', purpose: '',
      })
    } catch (err) {
      toast.error(err.userMessage ?? 'Failed to create loan')
    } finally {
      setCreating(false)
    }
  }

  // Summary stats
  const latestCycle = cycles[0]
  const totalPayroll = cycles.reduce((s, c) => s + (Number(c.total_net_pay ?? c.total_amount ?? 0)), 0)
  const avgSalary = empCount > 0 ? totalPayroll / (cycles.length || 1) / empCount : 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage payroll cycles, slips and loans</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowLoanModal(true)}
            className="flex items-center gap-2 rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
          >
            <DollarSign className="h-4 w-4" />
            Create Loan
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            New Cycle
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-50 rounded-lg p-2.5">
              <Users className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{empCount}</div>
              <div className="text-sm text-gray-500">Total Employees</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="bg-green-50 rounded-lg p-2.5">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {formatINR(latestCycle?.total_net_pay ?? latestCycle?.total_amount ?? 0)}
              </div>
              <div className="text-sm text-gray-500">Latest Month Payroll</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="bg-amber-50 rounded-lg p-2.5">
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {formatINR(latestCycle?.average_salary ?? avgSalary)}
              </div>
              <div className="text-sm text-gray-500">Average Salary</div>
            </div>
          </div>
        </div>
      </div>

      {/* Cycles list */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">Payroll Cycles</h2>
          <button
            onClick={fetchCycles}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner text="Loading cycles…" />
          </div>
        ) : cycles.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Calendar className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No payroll cycles yet. Create your first cycle.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3 text-left">Period</th>
                  <th className="px-5 py-3 text-left">Payment Date</th>
                  <th className="px-5 py-3 text-right">Employees</th>
                  <th className="px-5 py-3 text-right">Gross Payroll</th>
                  <th className="px-5 py-3 text-right">Deductions</th>
                  <th className="px-5 py-3 text-right">Net Payroll</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cycles.map((cycle) => (
                  <tr
                    key={cycle.id}
                    className="hover:bg-indigo-50/30 cursor-pointer"
                    onClick={() => navigate(`/payroll/${cycle.id}`)}
                  >
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {MONTHS[(cycle.month ?? 1) - 1]} {cycle.year}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {cycle.payment_date ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-700">
                      {cycle.employee_count ?? cycle.total_employees ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-700">
                      {formatINR(cycle.total_gross_salary ?? cycle.total_gross)}
                    </td>
                    <td className="px-5 py-3 text-right text-red-600">
                      {formatINR(cycle.total_deductions)}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-green-700">
                      {formatINR(cycle.total_net_pay ?? cycle.total_amount)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={cycle.status} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/payroll/${cycle.id}`)
                        }}
                        className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-xs font-medium ml-auto"
                      >
                        View <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Cycle Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Payroll Cycle"
        size="sm"
      >
        <form onSubmit={handleCreateCycle} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Month *</label>
              <select
                value={cycleForm.month}
                onChange={(e) => setCycleForm((f) => ({ ...f, month: Number(e.target.value) }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {MONTHS.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
              <select
                value={cycleForm.year}
                onChange={(e) => setCycleForm((f) => ({ ...f, year: Number(e.target.value) }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date *</label>
            <input
              type="date"
              value={cycleForm.payment_date}
              onChange={(e) => setCycleForm((f) => ({ ...f, payment_date: e.target.value }))}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
            <textarea
              value={cycleForm.remarks}
              onChange={(e) => setCycleForm((f) => ({ ...f, remarks: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Optional remarks…"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {creating && <RefreshCw className="h-4 w-4 animate-spin" />}
              {creating ? 'Creating…' : 'Create Cycle'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Loan Modal */}
      <Modal
        open={showLoanModal}
        onClose={() => setShowLoanModal(false)}
        title="Create Employee Loan"
        size="sm"
      >
        <form onSubmit={handleCreateLoan} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee *</label>
            <select
              value={loanForm.employee_id}
              onChange={(e) => setLoanForm((f) => ({ ...f, employee_id: e.target.value }))}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select employee…</option>
              {empList.map((emp) => (
                <option key={emp.employee_id ?? emp.id} value={emp.employee_id ?? emp.id}>
                  {emp.employee_id} — {emp.first_name} {emp.last_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Principal Amount (₹) *</label>
              <input
                type="number"
                value={loanForm.principal_amount}
                onChange={(e) => setLoanForm((f) => ({ ...f, principal_amount: e.target.value }))}
                required
                min={0}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="50000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tenure (months)</label>
              <input
                type="number"
                value={loanForm.tenure_months}
                onChange={(e) => setLoanForm((f) => ({ ...f, tenure_months: Number(e.target.value) }))}
                min={1}
                max={60}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%)</label>
              <input
                type="number"
                value={loanForm.interest_rate}
                onChange={(e) => setLoanForm((f) => ({ ...f, interest_rate: Number(e.target.value) }))}
                min={0}
                max={24}
                step={0.5}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly EMI (₹)</label>
              <input
                type="number"
                value={loanForm.emi}
                onChange={(e) => setLoanForm((f) => ({ ...f, emi: e.target.value }))}
                min={0}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Auto-calculate"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
            <textarea
              value={loanForm.purpose}
              onChange={(e) => setLoanForm((f) => ({ ...f, purpose: e.target.value }))}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Reason for loan…"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowLoanModal(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {creating && <RefreshCw className="h-4 w-4 animate-spin" />}
              {creating ? 'Creating…' : 'Create Loan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
