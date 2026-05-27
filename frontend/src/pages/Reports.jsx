import { useState, useEffect } from 'react'
import {
  BarChart2,
  FileText,
  User,
  IndianRupee,
  RefreshCw,
  Download,
  TrendingUp,
} from 'lucide-react'
import { reports, payroll, employees } from '../api.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import toast from 'react-hot-toast'

function formatINR(amount) {
  if (amount == null) return '₹0'
  return '₹' + Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

const TABS = [
  { id: 'leave', label: 'Leave Utilization', icon: BarChart2 },
  { id: 'payroll', label: 'Payroll Summary', icon: FileText },
  { id: 'ytd', label: 'Employee YTD', icon: User },
  { id: 'tax', label: 'Tax Summary', icon: IndianRupee },
]

export default function Reports() {
  const [tab, setTab] = useState('leave')

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">HR analytics and financial reports</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'leave' && <LeaveUtilizationReport />}
      {tab === 'payroll' && <PayrollSummaryReport />}
      {tab === 'ytd' && <EmployeeYTDReport />}
      {tab === 'tax' && <TaxSummaryReport />}
    </div>
  )
}

// ─── Leave Utilization Report ────────────────────────────────────────────────

function LeaveUtilizationReport() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState([])
  const [year, setYear] = useState(new Date().getFullYear())

  useEffect(() => {
    setLoading(true)
    reports
      .getLeaveUtilization({ year })
      .then((res) => {
        const d = res.data
        setData(d.data ?? d.results ?? (Array.isArray(d) ? d : []))
      })
      .catch(() => {
        toast.error('Failed to load leave utilization data')
        setData([])
      })
      .finally(() => setLoading(false))
  }, [year])

  const maxUsed = Math.max(...data.map((d) => Number(d.used ?? d.total_used ?? 0)), 1)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h2 className="text-base font-semibold text-gray-900">Leave Utilization by Type</h2>
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner text="Loading…" /></div>
        ) : data.length === 0 ? (
          <EmptyState icon={BarChart2} label="No leave utilization data available" />
        ) : (
          <div className="space-y-5">
            {data.map((item, i) => {
              const used = Number(item.used ?? item.total_used ?? item.taken ?? 0)
              const allotted = Number(item.allotted ?? item.total_allotted ?? item.available ?? 0)
              const pct = allotted > 0 ? Math.min(100, Math.round((used / allotted) * 100)) : 0
              const widthPct = maxUsed > 0 ? Math.round((used / maxUsed) * 100) : 0

              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-sm"
                        style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {item.leave_type_name ?? item.name ?? item.leave_type ?? `Type ${i + 1}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{used} used</span>
                      <span>/</span>
                      <span>{allotted} allotted</span>
                      <span className="font-semibold text-gray-700">({pct}%)</span>
                    </div>
                  </div>
                  <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 flex items-center justify-end pr-2"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                        minWidth: used > 0 ? '20px' : '0',
                      }}
                    >
                      {widthPct > 15 && (
                        <span className="text-white text-xs font-semibold">{used}</span>
                      )}
                    </div>
                  </div>
                  {item.employees_count != null && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      {item.employees_count} employees used this leave
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Department breakdown table */}
      {!loading && data.length > 0 && data[0]?.department_breakdown && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Department-wise Breakdown</h3>
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Department</th>
                <th className="px-4 py-2 text-right">Leaves Taken</th>
                <th className="px-4 py-2 text-right">Avg per Employee</th>
              </tr>
            </thead>
            <tbody>
              {data[0].department_breakdown.map((d, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-4 py-2 text-gray-700">{d.department}</td>
                  <td className="px-4 py-2 text-right">{d.total_leaves}</td>
                  <td className="px-4 py-2 text-right">{d.avg_leaves?.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Payroll Summary Report ───────────────────────────────────────────────────

function PayrollSummaryReport() {
  const [loading, setLoading] = useState(false)
  const [cycles, setCycles] = useState([])
  const [cycleId, setCycleId] = useState('')
  const [data, setData] = useState(null)

  useEffect(() => {
    payroll
      .getCycles({ page_size: 24 })
      .then((res) => {
        const d = res.data
        const list = d.results ?? d.data ?? (Array.isArray(d) ? d : [])
        setCycles(list)
        if (list.length > 0) setCycleId(list[0].id)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!cycleId) return
    setLoading(true)
    reports
      .getPayrollSummary(cycleId)
      .then((res) => setData(res.data))
      .catch(() => {
        toast.error('Failed to load payroll summary')
        setData(null)
      })
      .finally(() => setLoading(false))
  }, [cycleId])

  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  const depts = data?.department_summary ?? data?.departments ?? []
  const maxCost = Math.max(...depts.map((d) => Number(d.total_cost ?? d.net_pay ?? 0)), 1)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h2 className="text-base font-semibold text-gray-900">Payroll Summary</h2>
        <select
          value={cycleId}
          onChange={(e) => setCycleId(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Select cycle…</option>
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>
              {MONTHS[(c.month ?? 1) - 1]} {c.year}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner text="Loading…" /></div>
      ) : !data ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <EmptyState icon={FileText} label="Select a payroll cycle to view summary" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Employees', value: data.total_employees ?? '—' },
              { label: 'Total Gross', value: formatINR(data.total_gross) },
              { label: 'Total Deductions', value: formatINR(data.total_deductions) },
              { label: 'Total Net Pay', value: formatINR(data.total_net) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <div className="text-xl font-bold text-gray-900">{value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Department-wise chart */}
          {depts.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Department-wise Cost</h3>
              <div className="space-y-4">
                {depts.map((d, i) => {
                  const cost = Number(d.total_cost ?? d.net_pay ?? d.total_net ?? 0)
                  const pct = maxCost > 0 ? Math.round((cost / maxCost) * 100) : 0
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{d.department ?? d.dept ?? '—'}</span>
                        <span className="text-gray-500">
                          {d.employee_count ?? d.employees ?? 0} emp &bull; {formatINR(cost)}
                        </span>
                      </div>
                      <div className="h-5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                          }}
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
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Deduction Breakdown</h3>
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500 bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Component</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                    <th className="px-4 py-2 text-right">% of Gross</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.deduction_breakdown).map(([key, val]) => (
                    <tr key={key} className="border-t border-gray-100">
                      <td className="px-4 py-2 text-gray-700 capitalize">{key.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-2 text-right">{formatINR(val)}</td>
                      <td className="px-4 py-2 text-right text-gray-500">
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

// ─── Employee YTD Report ──────────────────────────────────────────────────────

function EmployeeYTDReport() {
  const [empList, setEmpList] = useState([])
  const [empId, setEmpId] = useState('E001')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)

  useEffect(() => {
    employees
      .getAll({ page_size: 200 })
      .then((res) => {
        const d = res.data
        setEmpList(d.results ?? d.data ?? (Array.isArray(d) ? d : []))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!empId) return
    setLoading(true)
    reports
      .getEmployeeYTD(empId)
      .then((res) => setData(res.data))
      .catch(() => {
        toast.error('Failed to load YTD data')
        setData(null)
      })
      .finally(() => setLoading(false))
  }, [empId])

  const monthlyData = data?.monthly_breakdown ?? data?.months ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h2 className="text-base font-semibold text-gray-900">Year-to-Date Report</h2>
        <select
          value={empId}
          onChange={(e) => setEmpId(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <EmptyState icon={User} label="Select an employee to view YTD data" />
        </div>
      ) : (
        <>
          {/* YTD summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'YTD Gross Earnings', value: formatINR(data.ytd_gross ?? data.total_gross) },
              { label: 'YTD Total Deductions', value: formatINR(data.ytd_deductions ?? data.total_deductions) },
              { label: 'YTD Net Salary', value: formatINR(data.ytd_net ?? data.total_net) },
              { label: 'YTD PF', value: formatINR(data.ytd_pf ?? data.total_pf) },
              { label: 'YTD TDS', value: formatINR(data.ytd_tds ?? data.total_tds) },
              { label: 'YTD Professional Tax', value: formatINR(data.ytd_pt ?? data.total_pt) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <div className="text-lg font-bold text-gray-900">{value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Monthly breakdown */}
          {monthlyData.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">Monthly Breakdown</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
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
                <tbody className="divide-y divide-gray-100">
                  {monthlyData.map((m, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-900">
                        {m.month_name ?? m.month} {m.year}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{formatINR(m.gross_salary ?? m.gross)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{formatINR(m.pf ?? m.provident_fund)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{formatINR(m.pt ?? m.professional_tax)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{formatINR(m.tds ?? m.income_tax)}</td>
                      <td className="px-4 py-2.5 text-right text-red-600">{formatINR(m.total_deductions)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-green-700">
                        {formatINR(m.net_salary ?? m.net_pay)}
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

// ─── Tax Summary Report ───────────────────────────────────────────────────────

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
    // We use YTD endpoint for tax data as well
    reports.getEmployeeYTD(empId).then((res) => setData(res.data)).catch(() => {
      toast.error('Failed to load tax data')
      setData(null)
    }).finally(() => setLoading(false))
  }, [empId])

  // Build tax slabs
  const annualGross = Number(data?.ytd_gross ?? data?.total_gross ?? 0)
  const stdDeduction = 50000
  const taxableIncome = Math.max(0, annualGross - stdDeduction)
  const sections = data?.tax_sections ?? {}

  // New tax regime slabs FY 2025-26
  const slabs = [
    { range: '0 – 3,00,000', slab: 0, income: Math.min(taxableIncome, 300000), tax: 0 },
    { range: '3,00,001 – 7,00,000', slab: 5, income: Math.min(Math.max(0, taxableIncome - 300000), 400000), tax: 0 },
    { range: '7,00,001 – 10,00,000', slab: 10, income: Math.min(Math.max(0, taxableIncome - 700000), 300000), tax: 0 },
    { range: '10,00,001 – 12,00,000', slab: 15, income: Math.min(Math.max(0, taxableIncome - 1000000), 200000), tax: 0 },
    { range: '12,00,001 – 15,00,000', slab: 20, income: Math.min(Math.max(0, taxableIncome - 1200000), 300000), tax: 0 },
    { range: 'Above 15,00,000', slab: 30, income: Math.max(0, taxableIncome - 1500000), tax: 0 },
  ].map((s) => ({ ...s, tax: Math.round((s.income * s.slab) / 100) }))

  const totalTax = slabs.reduce((sum, s) => sum + s.tax, 0)
  const surcharge = annualGross > 5000000 ? Math.round(totalTax * 0.1) : 0
  const cess = Math.round((totalTax + surcharge) * 0.04)
  const grandTotal = totalTax + surcharge + cess
  const monthlyTDS = Math.round(grandTotal / 12)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Annual Tax Summary</h2>
          <p className="text-xs text-gray-500">New Tax Regime — FY {year}–{String(year + 1).slice(-2)}</p>
        </div>
        <select
          value={empId}
          onChange={(e) => setEmpId(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
          {/* Income summary */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Income Computation</h3>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-2 text-gray-600">Gross Annual Salary</td>
                  <td className="py-2 text-right font-medium text-gray-900">{formatINR(annualGross)}</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-600">Less: Standard Deduction (u/s 16)</td>
                  <td className="py-2 text-right font-medium text-red-600">({formatINR(stdDeduction)})</td>
                </tr>
                {Object.entries(sections).map(([key, val]) => (
                  <tr key={key}>
                    <td className="py-2 text-gray-600">{key}</td>
                    <td className="py-2 text-right font-medium text-red-600">({formatINR(val)})</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-400 font-semibold">
                  <td className="py-2 text-gray-900">Taxable Income</td>
                  <td className="py-2 text-right text-indigo-900">{formatINR(taxableIncome)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tax slabs */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Tax Computation (New Regime — FY {year}–{String(year + 1).slice(-2)})
            </h3>
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500 bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Income Slab</th>
                  <th className="px-3 py-2 text-right">Rate</th>
                  <th className="px-3 py-2 text-right">Income in Slab</th>
                  <th className="px-3 py-2 text-right">Tax</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {slabs.map((s, i) => (
                  <tr key={i} className={s.income > 0 ? 'bg-amber-50' : ''}>
                    <td className="px-3 py-2 text-gray-700">₹{s.range}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{s.slab}%</td>
                    <td className="px-3 py-2 text-right text-gray-700">{formatINR(s.income)}</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900">{formatINR(s.tax)}</td>
                  </tr>
                ))}
                <tr className="border-t border-gray-300">
                  <td colSpan={3} className="px-3 py-2 font-semibold text-gray-900">Total Tax</td>
                  <td className="px-3 py-2 text-right font-semibold">{formatINR(totalTax)}</td>
                </tr>
                {surcharge > 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-gray-600">Surcharge (10%)</td>
                    <td className="px-3 py-2 text-right">{formatINR(surcharge)}</td>
                  </tr>
                )}
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-gray-600">Health & Education Cess (4%)</td>
                  <td className="px-3 py-2 text-right">{formatINR(cess)}</td>
                </tr>
                <tr className="border-t-2 border-gray-800 bg-gray-900 text-white font-bold">
                  <td colSpan={3} className="px-3 py-2.5">Total Annual Tax Liability</td>
                  <td className="px-3 py-2.5 text-right text-amber-400">{formatINR(grandTotal)}</td>
                </tr>
                <tr className="bg-indigo-50 font-semibold">
                  <td colSpan={3} className="px-3 py-2 text-indigo-800">Monthly TDS</td>
                  <td className="px-3 py-2 text-right text-indigo-900">{formatINR(monthlyTDS)}</td>
                </tr>
              </tbody>
            </table>
            <p className="text-xs text-gray-400 mt-3">
              * Computed under New Tax Regime. Rebate u/s 87A applies if taxable income ≤ ₹7,00,000.
              Consult your CA for accurate tax computation.
            </p>
          </div>

          {/* Form 16 summary */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Form 16 Summary</h3>
              <span className="text-xs text-gray-400">FY {year}–{String(year + 1).slice(-2)}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Gross Salary', value: formatINR(annualGross), bg: 'bg-blue-50', text: 'text-blue-700' },
                { label: 'Std. Deduction', value: formatINR(stdDeduction), bg: 'bg-gray-50', text: 'text-gray-700' },
                { label: 'Taxable Income', value: formatINR(taxableIncome), bg: 'bg-amber-50', text: 'text-amber-700' },
                { label: 'Tax Payable', value: formatINR(grandTotal), bg: 'bg-red-50', text: 'text-red-700' },
              ].map(({ label, value, bg, text }) => (
                <div key={label} className={`${bg} rounded-lg p-3`}>
                  <div className={`text-lg font-bold ${text}`}>{value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

const BAR_COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6',
  '#a855f7', '#06b6d4', '#f97316', '#14b8a6', '#e11d48',
]

function EmptyState({ icon: Icon, label }) {
  return (
    <div className="text-center py-16 text-gray-400">
      <Icon className="h-10 w-10 mx-auto mb-3 text-gray-300" />
      <p className="text-sm">{label}</p>
    </div>
  )
}
