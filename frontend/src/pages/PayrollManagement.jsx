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
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import Modal from '../components/Modal.jsx'
import { formatINR } from '../utils/format.js'
import toast from 'react-hot-toast'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// Status → left border color
function cycleBorderColor(status) {
  switch (status) {
    case 'paid': return 'border-l-emerald-500'
    case 'processed': return 'border-l-indigo-500'
    case 'draft': return 'border-l-amber-400'
    case 'cancelled': return 'border-l-red-400'
    default: return 'border-l-slate-300'
  }
}

export default function PayrollManagement() {
  const { user } = useAuth()
  const isAdmin = ['hr', 'finance', 'super_admin'].includes(user?.role)

  if (!isAdmin) {
    return <EmployeePayslipView user={user} />
  }

  return <AdminPayrollView />
}

// ─── Employee Payslip View ─────────────────────────────────────────────────────
function EmployeePayslipView({ user }) {
  const [slips, setSlips] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [year, setYear] = useState(new Date().getFullYear())

  useEffect(() => {
    if (!user?.id) return
    setLoading(true)
    payroll.getEmployeeSlips(user.id, { year }).then((res) => {
      const d = res.data
      setSlips(d.items ?? d.results ?? (Array.isArray(d) ? d : []))
    }).catch(() => {
      toast.error('Failed to load payslips')
    }).finally(() => setLoading(false))
  }, [user?.id, year])

  const years = [new Date().getFullYear(), new Date().getFullYear() - 1]

  return (
    <div className="animate-fade-in-up space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">My Payslips</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {user?.full_name} &bull; {user?.employee_id}
          </p>
        </div>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {years.map((y) => <option key={y} value={y}>FY {y}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner text="Loading payslips…" /></div>
      ) : slips.length === 0 ? (
        <div className="glass-card text-center py-20 text-slate-400">
          <DollarSign className="h-10 w-10 mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-medium">No payslips found for {year}</p>
          <p className="text-xs mt-1">Payslips appear here once your payroll is processed</p>
        </div>
      ) : (
        <div className="space-y-3">
          {slips.map((slip) => {
            const isOpen = expandedId === slip.id
            const monthName = MONTHS[(slip.month ?? 1) - 1]
            return (
              <div key={slip.id} className="glass-card overflow-hidden p-0">
                {/* Payslip header row */}
                <button
                  onClick={() => setExpandedId(isOpen ? null : slip.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-indigo-50/20 transition-colors text-left"
                >
                  <div
                    className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
                    style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
                  >
                    {monthName.slice(0, 3).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900">{monthName} {slip.year}</p>
                    <p className="text-xs text-slate-500">
                      Gross: {formatINR(slip.gross_earnings ?? 0)} &bull; Deductions: {formatINR(slip.total_deductions ?? 0)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-black text-emerald-600">{formatINR(slip.net_pay ?? 0)}</p>
                    <StatusBadge status={slip.status ?? 'processed'} />
                  </div>
                  <ChevronRight className={`h-4 w-4 text-slate-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                </button>

                {/* Expanded breakdown */}
                {isOpen && (
                  <div className="border-t border-slate-100 px-5 py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* Earnings */}
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Earnings</p>
                        <div className="space-y-2">
                          {[
                            ['Basic Salary', slip.basic_salary],
                            ['HRA', slip.hra],
                            ['DA', slip.da],
                            ['Conveyance', slip.conveyance],
                            ['Medical', slip.medical],
                            ['Special Allowance', slip.special_allowance],
                            ['LTA', slip.lta],
                            ['Other Allowances', slip.other_allowances],
                            ...(slip.commission_amount > 0 ? [['Commission', slip.commission_amount]] : []),
                          ].filter(([, v]) => v > 0).map(([label, val]) => (
                            <div key={label} className="flex justify-between text-sm">
                              <span className="text-slate-500">{label}</span>
                              <span className="font-medium text-slate-800">{formatINR(val)}</span>
                            </div>
                          ))}
                          <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-2 mt-1">
                            <span className="text-slate-700">Gross Earnings</span>
                            <span className="text-slate-900">{formatINR(slip.gross_earnings ?? 0)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Deductions */}
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Deductions</p>
                        <div className="space-y-2">
                          {[
                            ['PF (Employee)', slip.pf_employee],
                            ['ESI (Employee)', slip.esi_employee],
                            ['Professional Tax', slip.professional_tax],
                            ['Income Tax (TDS)', slip.income_tax],
                            ['LWP Deduction', slip.unpaid_leave_deduction],
                            ['Other Deductions', slip.other_deductions],
                          ].filter(([, v]) => v > 0).map(([label, val]) => (
                            <div key={label} className="flex justify-between text-sm">
                              <span className="text-slate-500">{label}</span>
                              <span className="font-medium text-red-600">−{formatINR(val)}</span>
                            </div>
                          ))}
                          <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-2 mt-1">
                            <span className="text-slate-700">Total Deductions</span>
                            <span className="text-red-600">−{formatINR(slip.total_deductions ?? 0)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Net Pay banner */}
                    <div className="mt-4 rounded-xl p-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-white/70">Net Pay</p>
                        <p className="text-2xl font-black text-white">{formatINR(slip.net_pay ?? 0)}</p>
                      </div>
                      <div className="text-right text-white/80 text-xs">
                        <p>YTD Earnings: {formatINR(slip.ytd_earnings ?? 0)}</p>
                        <p>YTD Tax: {formatINR(slip.ytd_tax ?? 0)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Admin Payroll View ────────────────────────────────────────────────────────
function AdminPayrollView() {
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
    if (!cycleForm.payment_date) { toast.error('Please select payment date'); return }
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
    if (!loanForm.employee_id || !loanForm.principal_amount) { toast.error('Please fill required fields'); return }
    setCreating(true)
    try {
      await payroll.createLoan(loanForm)
      toast.success('Loan request created!')
      setShowLoanModal(false)
      setLoanForm({ employee_id: '', principal_amount: '', interest_rate: 0, tenure_months: 12, emi: '', purpose: '' })
    } catch (err) {
      toast.error(err.userMessage ?? 'Failed to create loan')
    } finally {
      setCreating(false)
    }
  }

  const latestCycle = cycles[0]
  const totalPayrollCost = cycles.reduce((s, c) => s + Number(c.total_net_pay ?? c.total_amount ?? 0), 0)
  const avgSalary = empCount > 0 ? totalPayrollCost / (cycles.length || 1) / empCount : 0

  return (
    <div className="animate-fade-in-up space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between animate-stagger-1">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Payroll Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage payroll cycles, slips and loans</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowLoanModal(true)} className="btn-glass">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Create Loan</span>
          </button>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <Plus className="h-4 w-4" />
            New Cycle
          </button>
        </div>
      </div>

      {/* ── Summary stat gradient cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-stagger-2">
        <div className="gradient-card gradient-indigo p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="stat-label text-white/70">TOTAL EMPLOYEES</p>
            <p className="stat-number text-white">{empCount}</p>
          </div>
        </div>

        <div className="gradient-card gradient-green p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <DollarSign className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="stat-label text-white/70">LATEST PAYROLL</p>
            <p className="stat-number text-white text-xl">
              {formatINR(latestCycle?.total_net_pay ?? latestCycle?.total_amount ?? 0)}
            </p>
          </div>
        </div>

        <div className="gradient-card gradient-amber p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="stat-label text-white/70">AVERAGE SALARY</p>
            <p className="stat-number text-white text-xl">
              {formatINR(latestCycle?.average_salary ?? avgSalary)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Cycles list ── */}
      <div className="animate-stagger-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-slate-900">Payroll Cycles</h2>
          <button onClick={fetchCycles} className="btn-glass text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner text="Loading cycles…" />
          </div>
        ) : cycles.length === 0 ? (
          <div className="glass-card text-center py-16 text-slate-400">
            <Calendar className="h-10 w-10 mx-auto mb-3 text-slate-300" />
            <p className="text-sm">No payroll cycles yet. Create your first cycle.</p>
            <button onClick={() => setShowCreateModal(true)} className="btn-primary mt-4">
              <Plus className="h-4 w-4" /> New Cycle
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {cycles.map((cycle, i) => (
              <div
                key={cycle.id}
                onClick={() => navigate(`/payroll/${cycle.id}`)}
                className={`glass-card p-4 flex items-center gap-4 cursor-pointer hover:shadow-lg transition-all border-l-4 ${cycleBorderColor(cycle.status)} animate-stagger-${Math.min(i + 1, 5)}`}
              >
                {/* Month/Year badge */}
                <div className="text-center min-w-16 flex-shrink-0">
                  <p className="text-lg font-black text-slate-900">{MONTHS[(cycle.month ?? 1) - 1].slice(0, 3)}</p>
                  <p className="text-xs text-slate-500">{cycle.year}</p>
                </div>

                <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                  <div>
                    <p className="stat-label">EMPLOYEES</p>
                    <p className="font-bold text-slate-800">{cycle.employee_count ?? cycle.total_employees ?? '—'}</p>
                  </div>
                  <div>
                    <p className="stat-label">GROSS</p>
                    <p className="font-bold text-slate-800 text-xs">{formatINR(cycle.total_gross_salary ?? cycle.total_gross)}</p>
                  </div>
                  <div>
                    <p className="stat-label">DEDUCTIONS</p>
                    <p className="font-bold text-red-600 text-xs">{formatINR(cycle.total_deductions)}</p>
                  </div>
                  <div>
                    <p className="stat-label">NET PAY</p>
                    <p className="font-bold text-emerald-700 text-xs">{formatINR(cycle.total_net_pay ?? cycle.total_amount)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <StatusBadge status={cycle.status} />
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create Cycle Modal ── */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Payroll Cycle" size="sm">
        <form onSubmit={handleCreateCycle} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Month *</label>
              <select
                value={cycleForm.month}
                onChange={(e) => setCycleForm((f) => ({ ...f, month: Number(e.target.value) }))}
                className="input-glass"
              >
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Year *</label>
              <select
                value={cycleForm.year}
                onChange={(e) => setCycleForm((f) => ({ ...f, year: Number(e.target.value) }))}
                className="input-glass"
              >
                {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Payment Date *</label>
            <input
              type="date"
              value={cycleForm.payment_date}
              onChange={(e) => setCycleForm((f) => ({ ...f, payment_date: e.target.value }))}
              required
              className="input-glass"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Remarks</label>
            <textarea
              value={cycleForm.remarks}
              onChange={(e) => setCycleForm((f) => ({ ...f, remarks: e.target.value }))}
              rows={3}
              className="input-glass resize-none"
              placeholder="Optional remarks…"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowCreateModal(false)} className="btn-glass">Cancel</button>
            <button type="submit" disabled={creating} className="btn-primary">
              {creating && <RefreshCw className="h-4 w-4 animate-spin" />}
              {creating ? 'Creating…' : 'Create Cycle'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Loan Modal ── */}
      <Modal open={showLoanModal} onClose={() => setShowLoanModal(false)} title="Create Employee Loan" size="sm">
        <form onSubmit={handleCreateLoan} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Employee *</label>
            <select
              value={loanForm.employee_id}
              onChange={(e) => setLoanForm((f) => ({ ...f, employee_id: e.target.value }))}
              required
              className="input-glass"
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
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Principal (₹) *</label>
              <input
                type="number"
                value={loanForm.principal_amount}
                onChange={(e) => setLoanForm((f) => ({ ...f, principal_amount: e.target.value }))}
                required min={0}
                className="input-glass"
                placeholder="50000"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Tenure (months)</label>
              <input
                type="number"
                value={loanForm.tenure_months}
                onChange={(e) => setLoanForm((f) => ({ ...f, tenure_months: Number(e.target.value) }))}
                min={1} max={60}
                className="input-glass"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Interest Rate (%)</label>
              <input
                type="number"
                value={loanForm.interest_rate}
                onChange={(e) => setLoanForm((f) => ({ ...f, interest_rate: Number(e.target.value) }))}
                min={0} max={24} step={0.5}
                className="input-glass"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Monthly EMI (₹)</label>
              <input
                type="number"
                value={loanForm.emi}
                onChange={(e) => setLoanForm((f) => ({ ...f, emi: e.target.value }))}
                min={0}
                className="input-glass"
                placeholder="Auto-calculate"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Purpose</label>
            <textarea
              value={loanForm.purpose}
              onChange={(e) => setLoanForm((f) => ({ ...f, purpose: e.target.value }))}
              rows={2}
              className="input-glass resize-none"
              placeholder="Reason for loan…"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowLoanModal(false)} className="btn-glass">Cancel</button>
            <button type="submit" disabled={creating} className="btn-primary">
              {creating && <RefreshCw className="h-4 w-4 animate-spin" />}
              {creating ? 'Creating…' : 'Create Loan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
