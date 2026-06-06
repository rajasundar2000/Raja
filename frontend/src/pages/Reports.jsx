import { useState, useEffect } from 'react'
import {
  BarChart2,
  FileText,
  User,
  IndianRupee,
  RefreshCw,
} from 'lucide-react'
import { reports, payroll, employees } from '../api.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { formatINR } from '../utils/format.js'
import toast from 'react-hot-toast'

const TABS = [
  { id: 'leave', label: 'Leave Utilization', icon: BarChart2 },
  { id: 'payroll', label: 'Payroll Summary', icon: FileText },
  { id: 'ytd', label: 'Employee YTD', icon: User },
  { id: 'tax', label: 'Tax Summary', icon: IndianRupee },
]

// ─── Pill Tabs ─────────────────────────────────────────────────────────────────
function PillTabs({ tabs, active, onChange }) {
  return (
    <div className="flex bg-white/60 rounded-2xl p-1 gap-1 overflow-x-auto">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl whitespace-nowrap transition-all duration-200 ${
            active === id
              ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
          }`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  )
}

export default function Reports() {
  const [tab, setTab] = useState('leave')

  return (
    <div className="animate-fade-in-up space-y-5">
      {/* Header */}
      <div className="animate-stagger-1">
        <h1 className="text-2xl font-black text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500 mt-0.5">HR analytics and financial reports</p>
      </div>

      {/* Pill Tabs */}
      <div className="animate-stagger-2">
        <PillTabs tabs={TABS} active={tab} onChange={setTab} />
      </div>

      <div className="animate-stagger-3">
        {tab === 'leave' && <LeaveUtilizationReport />}
        {tab === 'payroll' && <PayrollSummaryReport />}
        {tab === 'ytd' && <EmployeeYTDReport />}
        {tab === 'tax' && <TaxSummaryReport />}
      </div>
    </div>
  )
}

// ─── Leave Utilization Report ──────────────────────────────────────────────────
function LeaveUtilizationReport() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState([])
  const [year, setYear] = useState(new Date().getFullYear())

  useEffect(() => {
    setLoading(true)
    reports.getLeaveUtilization({ year })
      .then((res) => {
        const d = res.data
        setData(d.data ?? d.results ?? (Array.isArray(d) ? d : []))
      })
      .catch(() => { toast.error('Failed to load leave utilization data'); setData([]) })
      .finally(() => setLoading(false))
  }, [year])

  const maxUsed = Math.max(...data.map((d) => Number(d.used ?? d.total_used ?? 0)), 1)

  return (
    <div className="space-y-4">
      {/* Control bar */}
      <div className="glass-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-indigo-500" />
          <h2 className="text-xl font-bold text-slate-900">Leave Utilization by Type</h2>
        </div>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="input-glass w-auto"
        >
          {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Chart card */}
      <div className="glass-card p-6">
        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner text="Loading…" /></div>
        ) : data.length === 0 ? (
          <EmptyState icon={BarChart2} label="No leave utilization data available" />
        ) : (
          <div className="space-y-6">
            {data.map((item, i) => {
              const used = Number(item.used ?? item.total_used ?? item.taken ?? 0)
              const allotted = Number(item.allotted ?? item.total_allotted ?? item.available ?? 0)
              const pct = allotted > 0 ? Math.min(100, Math.round((used / allotted) * 100)) : 0
              const widthPct = maxUsed > 0 ? Math.round((used / maxUsed) * 100) : 0

              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }} />
                      <span className="text-sm font-semibold text-slate-700">
                        {item.leave_type_name ?? item.name ?? item.leave_type ?? `Type ${i + 1}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{used}</span> used /
                      <span>{allotted}</span> allotted
                      <span className="font-black text-slate-800">({pct}%)</span>
                    </div>
                  </div>
                  <div className="h-6 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 flex items-center justify-end pr-2 bg-gradient-to-r from-indigo-500 to-violet-500"
                      style={{ width: `${widthPct}%`, minWidth: used > 0 ? '20px' : '0' }}
                    >
                      {widthPct > 15 && (
                        <span className="text-white text-xs font-bold">{used}</span>
                      )}
                    </div>
                  </div>
                  {item.employees_count != null && (
                    <div className="text-xs text-slate-400 mt-1">
                      {item.employees_count} employees used this leave
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Department breakdown */}
      {!loading && data.length > 0 && data[0]?.department_breakdown && (
        <div className="glass-card p-5">
          <h3 className="text-xl font-bold text-slate-900 mb-4">Department-wise Breakdown</h3>
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 uppercase tracking-wider bg-slate-50/50">
              <tr>
                <th className="px-4 py-2 text-left">Department</th>
                <th className="px-4 py-2 text-right">Leaves Taken</th>
                <th className="px-4 py-2 text-right">Avg per Employee</th>
              </tr>
            </thead>
            <tbody>
              {data[0].department_breakdown.map((d, i) => (
                <tr key={i} className="border-t border-slate-100 hover:bg-indigo-50/20">
                  <td className="px-4 py-2 text-slate-700">{d.department}</td>
                  <td className="px-4 py-2 text-right font-semibold">{d.total_leaves}</td>
                  <td className="px-4 py-2 text-right text-slate-500">{d.avg_leaves?.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Payroll Summary Report ────────────────────────────────────────────────────
function PayrollSummaryReport() {
  const [loading, setLoading] = useState(false)
  const [cycles, setCycles] = useState([])
  const [cycleId, setCycleId] = useState('')
  const [data, setData] = useState(null)

  const MONTHS_LIST = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  useEffect(() => {
    payroll.getCycles({ page_size: 24 }).then((res) => {
      const d = res.data
      const list = d.results ?? d.data ?? (Array.isArray(d) ? d : [])
      setCycles(list)
      if (list.length > 0) setCycleId(list[0].id)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!cycleId) return
    setLoading(true)
    reports.getPayrollSummary(cycleId)
      .then((res) => setData(res.data))
      .catch(() => { toast.error('Failed to load payroll summary'); setData(null) })
      .finally(() => setLoading(false))
  }, [cycleId])

  const depts = data?.department_summary ?? data?.departments ?? []
  const maxCost = Math.max(...depts.map((d) => Number(d.total_cost ?? d.net_pay ?? 0)), 1)

  return (
    <div className="space-y-4">
      <div className="glass-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-indigo-500" />
          <h2 className="text-xl font-bold text-slate-900">Payroll Summary</h2>
        </div>
        <select
          value={cycleId}
          onChange={(e) => setCycleId(e.target.value)}
          className="input-glass w-auto"
        >
          <option value="">Select cycle…</option>
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>
              {MONTHS_LIST[(c.month ?? 1) - 1]} {c.year}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner text="Loading…" /></div>
      ) : !data ? (
        <div className="glass-card">
          <EmptyState icon={FileText} label="Select a payroll cycle to view summary" />
        </div>
      ) : (
        <>
          {/* Summary stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'TOTAL EMPLOYEES', value: data.total_employees ?? '—', gradient: 'gradient-indigo' },
              { label: 'TOTAL GROSS', value: formatINR(data.total_gross), gradient: 'gradient-cyan' },
              { label: 'TOTAL DEDUCTIONS', value: formatINR(data.total_deductions), gradient: 'gradient-amber' },
              { label: 'NET PAY', value: formatINR(data.total_net), gradient: 'gradient-green' },
            ].map(({ label, value, gradient }) => (
              <div key={label} className={`gradient-card ${gradient} p-4`}>
                <p className="stat-label text-white/70">{label}</p>
                <p className="stat-number text-white text-xl">{value}</p>
              </div>
            ))}
          </div>

          {/* Department chart */}
          {depts.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Department-wise Cost</h3>
              <div className="space-y-4">
                {depts.map((d, i) => {
                  const cost = Number(d.total_cost ?? d.net_pay ?? d.total_net ?? 0)
                  const pct = maxCost > 0 ? Math.round((cost / maxCost) * 100) : 0
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-semibold text-slate-700">{d.department ?? d.dept ?? '—'}</span>
                        <span className="text-slate-500">
                          {d.employee_count ?? d.employees ?? 0} emp &bull; {formatINR(cost)}
                        </span>
                      </div>
                      <div className="h-5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-indigo-500 to-violet-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Deduction breakdown */}
          {data.deduction_breakdown && (
            <div className="glass-card p-5">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Deduction Breakdown</h3>
              <table className="w-full text-sm">
                <thead className="text-xs text-slate-500 uppercase tracking-wider bg-slate-50/50">
                  <tr>
                    <th className="px-4 py-2 text-left">Component</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                    <th className="px-4 py-2 text-right">% of Gross</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.deduction_breakdown).map(([key, val]) => (
                    <tr key={key} className="border-t border-slate-100 hover:bg-indigo-50/20">
                      <td className="px-4 py-2 text-slate-700 capitalize">{key.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-2 text-right font-semibold">{formatINR(val)}</td>
                      <td className="px-4 py-2 text-right text-slate-500">
                        {data.total_gross > 0
                          ? ((Number(val) / Number(data.total_gross)) * 100).toFixed(1) + '%'
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Employee YTD Report ───────────────────────────────────────────────────────
function EmployeeYTDReport() {
  const [empList, setEmpList] = useState([])
  const [empId, setEmpId] = useState('E001')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)

  useEffect(() => {
    employees.getAll({ page_size: 200 }).then((res) => {
      const d = res.data
      setEmpList(d.results ?? d.data ?? (Array.isArray(d) ? d : []))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!empId) return
    setLoading(true)
    reports.getEmployeeYTD(empId)
      .then((res) => setData(res.data))
      .catch(() => { toast.error('Failed to load YTD data'); setData(null) })
      .finally(() => setLoading(false))
  }, [empId])

  const monthlyData = data?.monthly_breakdown ?? data?.months ?? []

  return (
    <div className="space-y-4">
      <div className="glass-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-indigo-500" />
          <h2 className="text-xl font-bold text-slate-900">Year-to-Date Report</h2>
        </div>
        <select
          value={empId}
          onChange={(e) => setEmpId(e.target.value)}
          className="input-glass w-auto"
        >
          <option value="">Select employee…</option>
          {empList.map((e) => (
            <option key={e.employee_id ?? e.id} value={e.employee_id ?? e.id}>
              {e.employee_id} — {e.first_name} {e.last_name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner text="Loading…" /></div>
      ) : !data ? (
        <div className="glass-card">
          <EmptyState icon={User} label="Select an employee to view YTD data" />
        </div>
      ) : (
        <>
          {/* YTD stat grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'YTD GROSS', value: formatINR(data.ytd_gross ?? data.total_gross), gradient: 'gradient-indigo' },
              { label: 'YTD DEDUCTIONS', value: formatINR(data.ytd_deductions ?? data.total_deductions), gradient: 'gradient-amber' },
              { label: 'YTD NET SALARY', value: formatINR(data.ytd_net ?? data.total_net), gradient: 'gradient-green' },
              { label: 'YTD PF', value: formatINR(data.ytd_pf ?? data.total_pf), gradient: 'gradient-cyan' },
              { label: 'YTD TDS', value: formatINR(data.ytd_tds ?? data.total_tds), gradient: 'gradient-amber' },
              { label: 'YTD PROF. TAX', value: formatINR(data.ytd_pt ?? data.total_pt), gradient: 'gradient-indigo' },
            ].map(({ label, value, gradient }) => (
              <div key={label} className={`gradient-card ${gradient} p-4`}>
                <p className="stat-label text-white/70">{label}</p>
                <p className="stat-number text-white text-xl">{value}</p>
              </div>
            ))}
          </div>

          {/* Monthly breakdown table */}
          {monthlyData.length > 0 && (
            <div className="glass-card overflow-hidden p-0">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-900">Monthly Breakdown</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/50 text-xs text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-left">Month</th>
                      <th className="px-4 py-3 text-right">Gross</th>
                      <th className="px-4 py-3 text-right">PF</th>
                      <th className="px-4 py-3 text-right">PT</th>
                      <th className="px-4 py-3 text-right">TDS</th>
                      <th className="px-4 py-3 text-right">Total Ded.</th>
                      <th className="px-4 py-3 text-right">Net Pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.map((m, i) => (
                      <tr key={i} className={`hover:bg-indigo-50/20 ${i !== monthlyData.length - 1 ? 'border-b border-slate-100' : ''}`}>
                        <td className="px-4 py-2.5 font-semibold text-slate-900">{m.month_name ?? m.month} {m.year}</td>
                        <td className="px-4 py-2.5 text-right text-slate-700">{formatINR(m.gross_salary ?? m.gross)}</td>
                        <td className="px-4 py-2.5 text-right text-slate-600">{formatINR(m.pf ?? m.provident_fund)}</td>
                        <td className="px-4 py-2.5 text-right text-slate-600">{formatINR(m.pt ?? m.professional_tax)}</td>
                        <td className="px-4 py-2.5 text-right text-slate-600">{formatINR(m.tds ?? m.income_tax)}</td>
                        <td className="px-4 py-2.5 text-right text-red-600 font-semibold">{formatINR(m.total_deductions)}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-emerald-700">{formatINR(m.net_salary ?? m.net_pay)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Tax Summary Report ────────────────────────────────────────────────────────
function TaxSummaryReport() {
  const [empList, setEmpList] = useState([])
  const [empId, setEmpId] = useState('E001')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [year] = useState(new Date().getFullYear())

  useEffect(() => {
    employees.getAll({ page_size: 200 }).then((res) => {
      const d = res.data
      setEmpList(d.results ?? d.data ?? (Array.isArray(d) ? d : []))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!empId) return
    setLoading(true)
    reports.getEmployeeYTD(empId)
      .then((res) => setData(res.data))
      .catch(() => { toast.error('Failed to load tax data'); setData(null) })
      .finally(() => setLoading(false))
  }, [empId])

  const annualGross = Number(data?.ytd_gross ?? data?.total_gross ?? 0)
  const stdDeduction = 50000
  const taxableIncome = Math.max(0, annualGross - stdDeduction)
  const sections = data?.tax_sections ?? {}

  const slabs = [
    { range: '0 – 3,00,000', slab: 0, income: Math.min(taxableIncome, 300000) },
    { range: '3,00,001 – 7,00,000', slab: 5, income: Math.min(Math.max(0, taxableIncome - 300000), 400000) },
    { range: '7,00,001 – 10,00,000', slab: 10, income: Math.min(Math.max(0, taxableIncome - 700000), 300000) },
    { range: '10,00,001 – 12,00,000', slab: 15, income: Math.min(Math.max(0, taxableIncome - 1000000), 200000) },
    { range: '12,00,001 – 15,00,000', slab: 20, income: Math.min(Math.max(0, taxableIncome - 1200000), 300000) },
    { range: 'Above 15,00,000', slab: 30, income: Math.max(0, taxableIncome - 1500000) },
  ].map((s) => ({ ...s, tax: Math.round((s.income * s.slab) / 100) }))

  const totalTax = slabs.reduce((sum, s) => sum + s.tax, 0)
  const surcharge = annualGross > 5000000 ? Math.round(totalTax * 0.1) : 0
  const cess = Math.round((totalTax + surcharge) * 0.04)
  const grandTotal = totalTax + surcharge + cess
  const monthlyTDS = Math.round(grandTotal / 12)

  return (
    <div className="space-y-4">
      <div className="glass-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IndianRupee className="h-5 w-5 text-indigo-500" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">Annual Tax Summary</h2>
            <p className="text-xs text-slate-500">New Tax Regime — FY {year}–{String(year + 1).slice(-2)}</p>
          </div>
        </div>
        <select
          value={empId}
          onChange={(e) => setEmpId(e.target.value)}
          className="input-glass w-auto"
        >
          {empList.map((e) => (
            <option key={e.employee_id ?? e.id} value={e.employee_id ?? e.id}>
              {e.employee_id} — {e.first_name} {e.last_name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner text="Loading…" /></div>
      ) : (
        <>
          {/* Form 16 quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'GROSS SALARY', value: formatINR(annualGross), gradient: 'gradient-indigo' },
              { label: 'STD. DEDUCTION', value: formatINR(stdDeduction), gradient: 'gradient-cyan' },
              { label: 'TAXABLE INCOME', value: formatINR(taxableIncome), gradient: 'gradient-amber' },
              { label: 'TAX PAYABLE', value: formatINR(grandTotal), gradient: 'gradient-green' },
            ].map(({ label, value, gradient }) => (
              <div key={label} className={`gradient-card ${gradient} p-4`}>
                <p className="stat-label text-white/70">{label}</p>
                <p className="stat-number text-white text-xl">{value}</p>
              </div>
            ))}
          </div>

          {/* Income computation */}
          <div className="glass-card p-5">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Income Computation</h3>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-2.5 text-slate-600">Gross Annual Salary</td>
                  <td className="py-2.5 text-right font-semibold text-slate-900">{formatINR(annualGross)}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2.5 text-slate-600">Less: Standard Deduction (u/s 16)</td>
                  <td className="py-2.5 text-right font-semibold text-red-600">({formatINR(stdDeduction)})</td>
                </tr>
                {Object.entries(sections).map(([key, val]) => (
                  <tr key={key} className="border-b border-slate-100">
                    <td className="py-2.5 text-slate-600">{key}</td>
                    <td className="py-2.5 text-right font-semibold text-red-600">({formatINR(val)})</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-300">
                  <td className="py-3 font-bold text-slate-900">Taxable Income</td>
                  <td className="py-3 text-right font-black text-indigo-700">{formatINR(taxableIncome)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tax slabs */}
          <div className="glass-card p-5">
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              Tax Slabs — New Regime FY {year}–{String(year + 1).slice(-2)}
            </h3>
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500 uppercase tracking-wider bg-slate-50/50">
                <tr>
                  <th className="px-3 py-2 text-left">Income Slab</th>
                  <th className="px-3 py-2 text-right">Rate</th>
                  <th className="px-3 py-2 text-right">Income in Slab</th>
                  <th className="px-3 py-2 text-right">Tax</th>
                </tr>
              </thead>
              <tbody>
                {slabs.map((s, i) => (
                  <tr
                    key={i}
                    className={`border-t border-slate-100 ${s.income > 0 ? 'bg-amber-50/50' : ''}`}
                  >
                    <td className="px-3 py-2 text-slate-700">₹{s.range}</td>
                    <td className="px-3 py-2 text-right text-slate-600">{s.slab}%</td>
                    <td className="px-3 py-2 text-right text-slate-700">{formatINR(s.income)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-900">{formatINR(s.tax)}</td>
                  </tr>
                ))}
                <tr className="border-t border-slate-300">
                  <td colSpan={3} className="px-3 py-2 font-bold text-slate-900">Total Tax</td>
                  <td className="px-3 py-2 text-right font-bold">{formatINR(totalTax)}</td>
                </tr>
                {surcharge > 0 && (
                  <tr className="border-t border-slate-100">
                    <td colSpan={3} className="px-3 py-2 text-slate-600">Surcharge (10%)</td>
                    <td className="px-3 py-2 text-right">{formatINR(surcharge)}</td>
                  </tr>
                )}
                <tr className="border-t border-slate-100">
                  <td colSpan={3} className="px-3 py-2 text-slate-600">Health &amp; Education Cess (4%)</td>
                  <td className="px-3 py-2 text-right">{formatINR(cess)}</td>
                </tr>
                <tr className="border-t-2 border-slate-800 bg-slate-900">
                  <td colSpan={3} className="px-3 py-2.5 text-white font-bold">Total Annual Tax Liability</td>
                  <td className="px-3 py-2.5 text-right text-amber-400 font-black">{formatINR(grandTotal)}</td>
                </tr>
                <tr className="bg-indigo-50">
                  <td colSpan={3} className="px-3 py-2 text-indigo-800 font-semibold">Monthly TDS</td>
                  <td className="px-3 py-2 text-right text-indigo-900 font-black">{formatINR(monthlyTDS)}</td>
                </tr>
              </tbody>
            </table>
            <p className="text-xs text-slate-400 mt-4">
              * Computed under New Tax Regime. Rebate u/s 87A applies if taxable income ≤ ₹7,00,000.
              Consult your CA for accurate tax computation.
            </p>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Shared helpers ────────────────────────────────────────────────────────────
const BAR_COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6',
  '#a855f7', '#06b6d4', '#f97316', '#14b8a6', '#e11d48',
]

function EmptyState({ icon: Icon, label }) {
  return (
    <div className="text-center py-16 text-slate-400">
      <Icon className="h-10 w-10 mx-auto mb-3 text-slate-300" />
      <p className="text-sm">{label}</p>
    </div>
  )
}
