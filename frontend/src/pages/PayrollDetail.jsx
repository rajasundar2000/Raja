import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  FileText,
  Check,
  DollarSign,
  Download,
  RefreshCw,
  Users,
  Loader,
} from 'lucide-react'
import { payroll } from '../api.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import Modal from '../components/Modal.jsx'
import toast from 'react-hot-toast'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function formatINR(amount) {
  if (amount == null || amount === '') return '₹0'
  return '₹' + Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

export default function PayrollDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [cycle, setCycle] = useState(null)
  const [slips, setSlips] = useState([])
  const [selectedSlip, setSelectedSlip] = useState(null)
  const [slipDetail, setSlipDetail] = useState(null)
  const [slipLoading, setSlipLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState('')

  const fetchCycle = useCallback(async () => {
    setLoading(true)
    try {
      const [slipRes] = await Promise.allSettled([
        payroll.getSlips(id),
      ])
      if (slipRes.status === 'fulfilled') {
        const d = slipRes.value.data
        // Some backends wrap in { cycle, slips }
        if (d.cycle) setCycle(d.cycle)
        const list = d.results ?? d.slips ?? d.data ?? (Array.isArray(d) ? d : [])
        setSlips(list)
        if (d.cycle) setCycle(d.cycle)
      }
      // Try to get cycle info directly
      try {
        const cycleRes = await payroll.getCycles({ id })
        const d = cycleRes.data
        const list = d.results ?? d.data ?? (Array.isArray(d) ? d : [])
        const found = list.find((c) => String(c.id) === String(id))
        if (found) setCycle(found)
      } catch {}
    } catch {
      toast.error('Failed to load payroll cycle')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchCycle()
  }, [fetchCycle])

  async function handleGenerateSlips() {
    setActionLoading('generate')
    try {
      await payroll.generateSlips(id)
      toast.success('Salary slips generated!')
      fetchCycle()
    } catch (err) {
      toast.error(err.userMessage ?? 'Failed to generate slips')
    } finally {
      setActionLoading('')
    }
  }

  async function handleApproveCycle() {
    if (!confirm('Approve this payroll cycle? This action cannot be undone.')) return
    setActionLoading('approve')
    try {
      await payroll.approveCycle(id)
      toast.success('Payroll cycle approved!')
      fetchCycle()
    } catch (err) {
      toast.error(err.userMessage ?? 'Failed to approve cycle')
    } finally {
      setActionLoading('')
    }
  }

  async function viewSlip(slip) {
    setSelectedSlip(slip)
    setSlipLoading(true)
    try {
      const res = await payroll.getSlip(slip.id)
      setSlipDetail(res.data)
    } catch {
      setSlipDetail(slip) // fallback to list data
    } finally {
      setSlipLoading(false)
    }
  }

  const totalGross = slips.reduce((s, sl) => s + Number(sl.gross_salary ?? 0), 0)
  const totalDeductions = slips.reduce((s, sl) => s + Number(sl.total_deductions ?? 0), 0)
  const totalNet = slips.reduce((s, sl) => s + Number(sl.net_salary ?? sl.net_pay ?? 0), 0)

  const monthName = cycle ? MONTHS[(cycle.month ?? 1) - 1] : '—'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/payroll')}
          className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            Payroll — {monthName} {cycle?.year ?? ''}
          </h1>
          <div className="flex items-center gap-3 mt-0.5">
            {cycle && <StatusBadge status={cycle.status} />}
            {cycle?.payment_date && (
              <span className="text-sm text-gray-500">
                Payment Date: <span className="font-medium text-gray-700">{cycle.payment_date}</span>
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {(!cycle?.status || cycle.status === 'draft') && (
            <button
              onClick={handleGenerateSlips}
              disabled={!!actionLoading}
              className="flex items-center gap-2 rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
            >
              {actionLoading === 'generate' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              Generate Slips
            </button>
          )}
          {cycle?.status === 'processing' && (
            <button
              onClick={handleApproveCycle}
              disabled={!!actionLoading}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
            >
              {actionLoading === 'approve' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Approve Cycle
            </button>
          )}
          <button
            onClick={fetchCycle}
            className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <SummaryCard label="Total Employees" value={slips.length} icon={Users} color="indigo" />
        <SummaryCard label="Total Gross" value={formatINR(totalGross)} icon={DollarSign} color="blue" />
        <SummaryCard label="Total Deductions" value={formatINR(totalDeductions)} icon={DollarSign} color="red" />
        <SummaryCard label="Net Payroll" value={formatINR(totalNet)} icon={DollarSign} color="green" />
      </div>

      {/* Slips table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Salary Slips</h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner text="Loading salary slips…" />
          </div>
        ) : slips.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FileText className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No salary slips generated yet.</p>
            <p className="text-xs mt-1">Click "Generate Slips" to create salary slips for this cycle.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3 text-left">Employee</th>
                  <th className="px-5 py-3 text-left">Department</th>
                  <th className="px-5 py-3 text-right">Basic</th>
                  <th className="px-5 py-3 text-right">Gross</th>
                  <th className="px-5 py-3 text-right">Deductions</th>
                  <th className="px-5 py-3 text-right">Net Pay</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {slips.map((slip, i) => (
                  <tr key={slip.id ?? i} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900">
                        {slip.employee_name ?? slip.employee_id}
                      </div>
                      <div className="text-xs text-indigo-600 font-mono">{slip.employee_id}</div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{slip.department ?? '—'}</td>
                    <td className="px-5 py-3 text-right text-gray-700">{formatINR(slip.basic_salary ?? slip.basic)}</td>
                    <td className="px-5 py-3 text-right text-gray-700">{formatINR(slip.gross_salary)}</td>
                    <td className="px-5 py-3 text-right text-red-600">{formatINR(slip.total_deductions)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-green-700">
                      {formatINR(slip.net_salary ?? slip.net_pay)}
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={slip.status} /></td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => viewSlip(slip)}
                        className="text-indigo-600 hover:underline text-xs font-medium"
                      >
                        View Slip
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Totals row */}
              <tfoot className="border-t-2 border-gray-300 bg-gray-50">
                <tr>
                  <td colSpan={3} className="px-5 py-3 font-semibold text-gray-700">
                    Total ({slips.length} employees)
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-900">{formatINR(totalGross)}</td>
                  <td className="px-5 py-3 text-right font-semibold text-red-700">{formatINR(totalDeductions)}</td>
                  <td className="px-5 py-3 text-right font-bold text-green-700">{formatINR(totalNet)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Salary Slip Detail Modal */}
      <Modal
        open={!!selectedSlip}
        onClose={() => { setSelectedSlip(null); setSlipDetail(null) }}
        title="Salary Slip"
        size="lg"
      >
        {slipLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner text="Loading slip details…" />
          </div>
        ) : (
          <SalarySlipDetail slip={slipDetail ?? selectedSlip} monthName={monthName} year={cycle?.year} />
        )}
      </Modal>
    </div>
  )
}

function SummaryCard({ label, value, icon: Icon, color }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
  }
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <div className={`inline-flex rounded-lg p-2 ${colors[color]} mb-2`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  )
}

function SalarySlipDetail({ slip, monthName, year }) {
  if (!slip) return null

  const COMPANY_NAME = 'TechCorp India Pvt. Ltd.'
  const COMPANY_ADDRESS = '123, Rajiv Gandhi Salai, Perungudi, Chennai - 600096, Tamil Nadu'
  const COMPANY_PAN = 'AABCT1234K'
  const COMPANY_CIN = 'U72900TN2015PTC123456'

  const earnings = [
    { label: 'Basic Salary', value: slip.basic_salary ?? slip.basic },
    { label: 'House Rent Allowance (HRA)', value: slip.hra },
    { label: 'Dearness Allowance (DA)', value: slip.da ?? slip.dearness_allowance },
    { label: 'Conveyance Allowance', value: slip.conveyance_allowance },
    { label: 'Medical Allowance', value: slip.medical_allowance },
    { label: 'Special Allowance', value: slip.special_allowance },
    { label: 'Leave Travel Allowance (LTA)', value: slip.lta },
    { label: 'Performance Bonus', value: slip.bonus ?? slip.performance_bonus },
    { label: 'Commission', value: slip.commission_amount ?? slip.commission },
    { label: 'Overtime', value: slip.overtime },
    { label: 'Other Allowance', value: slip.other_allowance },
    { label: 'Arrears', value: slip.arrears },
  ].filter((e) => e.value != null && Number(e.value) !== 0)

  const deductions = [
    { label: 'Provident Fund (Employee)', value: slip.pf_employee ?? slip.employee_pf },
    { label: 'Provident Fund (Employer)', value: slip.pf_employer ?? slip.employer_pf },
    { label: 'ESI (Employee)', value: slip.esi_employee ?? slip.employee_esi },
    { label: 'ESI (Employer)', value: slip.esi_employer ?? slip.employer_esi },
    { label: 'Professional Tax', value: slip.professional_tax ?? slip.pt },
    { label: 'Income Tax (TDS)', value: slip.income_tax_tds ?? slip.tds },
    { label: 'Loan EMI', value: slip.loan_deduction ?? slip.loan_emi },
    { label: 'Loss of Pay', value: slip.loss_of_pay ?? slip.lop },
    { label: 'Other Deductions', value: slip.other_deductions },
  ].filter((d) => d.value != null && Number(d.value) !== 0)

  const grossEarnings =
    slip.gross_salary ??
    slip.gross_pay ??
    earnings.reduce((s, e) => s + Number(e.value ?? 0), 0)
  const totalDeduct =
    slip.total_deductions ??
    deductions.reduce((s, d) => s + Number(d.value ?? 0), 0)
  const netPay = slip.net_salary ?? slip.net_pay ?? grossEarnings - totalDeduct

  // YTD
  const ytdGross = slip.ytd_gross ?? slip.year_to_date_gross ?? null
  const ytdDeductions = slip.ytd_deductions ?? slip.year_to_date_deductions ?? null
  const ytdNet = slip.ytd_net ?? slip.year_to_date_net ?? null

  return (
    <div className="font-mono text-xs space-y-0 print:text-black" id="salary-slip-print">
      {/* Company header */}
      <div className="text-center border-2 border-gray-800 p-4 mb-0">
        <div className="text-lg font-bold text-indigo-900 not-italic" style={{ fontFamily: 'serif' }}>
          {COMPANY_NAME}
        </div>
        <div className="text-xs text-gray-600 mt-1">{COMPANY_ADDRESS}</div>
        <div className="text-xs text-gray-500 mt-0.5">
          PAN: {COMPANY_PAN} &bull; CIN: {COMPANY_CIN}
        </div>
        <div className="mt-2 bg-indigo-700 text-white font-bold tracking-widest py-1 text-sm rounded">
          SALARY SLIP — {monthName?.toUpperCase()} {year}
        </div>
      </div>

      {/* Employee info */}
      <div className="border border-t-0 border-gray-400 grid grid-cols-2 gap-0">
        <div className="p-3 border-r border-gray-400 space-y-1.5">
          <Row label="Employee ID" value={slip.employee_id} />
          <Row label="Employee Name" value={slip.employee_name} />
          <Row label="Designation" value={slip.designation} />
          <Row label="Department" value={slip.department} />
          <Row label="Date of Joining" value={slip.date_of_joining} />
          <Row label="Work Location" value={slip.work_location ?? 'Chennai'} />
        </div>
        <div className="p-3 space-y-1.5">
          <Row label="PAN Number" value={slip.pan_number} />
          <Row label="UAN Number" value={slip.uan_number} />
          <Row label="ESI Number" value={slip.esi_number} />
          <Row label="Bank Account" value={slip.bank_account_number ? '****' + String(slip.bank_account_number).slice(-4) : '—'} />
          <Row label="IFSC Code" value={slip.ifsc_code} />
          <Row label="Pay Period" value={`${monthName} ${year}`} />
        </div>
      </div>

      {/* Earnings & Deductions */}
      <div className="border border-t-0 border-gray-400 grid grid-cols-2 gap-0">
        {/* Earnings */}
        <div className="border-r border-gray-400">
          <div className="bg-green-700 text-white font-bold px-3 py-1.5 text-center uppercase tracking-wider">
            Earnings
          </div>
          <div className="p-3">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-1 text-gray-600 font-semibold">Component</th>
                  <th className="text-right py-1 text-gray-600 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {earnings.length === 0 ? (
                  <tr><td colSpan={2} className="py-2 text-gray-400 text-center">No earnings data</td></tr>
                ) : earnings.map(({ label, value }) => (
                  <tr key={label} className="border-b border-gray-100">
                    <td className="py-1 text-gray-700">{label}</td>
                    <td className="py-1 text-right text-gray-900">{formatINR(value)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-green-700">
                  <td className="py-1.5 font-bold text-green-800">Gross Earnings</td>
                  <td className="py-1.5 text-right font-bold text-green-800">{formatINR(grossEarnings)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Deductions */}
        <div>
          <div className="bg-red-700 text-white font-bold px-3 py-1.5 text-center uppercase tracking-wider">
            Deductions
          </div>
          <div className="p-3">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-1 text-gray-600 font-semibold">Component</th>
                  <th className="text-right py-1 text-gray-600 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {deductions.length === 0 ? (
                  <tr><td colSpan={2} className="py-2 text-gray-400 text-center">No deductions data</td></tr>
                ) : deductions.map(({ label, value }) => (
                  <tr key={label} className="border-b border-gray-100">
                    <td className="py-1 text-gray-700">{label}</td>
                    <td className="py-1 text-right text-gray-900">{formatINR(value)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-red-700">
                  <td className="py-1.5 font-bold text-red-800">Total Deductions</td>
                  <td className="py-1.5 text-right font-bold text-red-800">{formatINR(totalDeduct)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Net Pay */}
      <div className="border border-t-0 border-gray-400 bg-gray-900 text-white px-5 py-4 flex justify-between items-center">
        <div>
          <div className="font-bold text-lg">NET PAY</div>
          <div className="text-gray-400 text-xs">Gross {formatINR(grossEarnings)} − Deductions {formatINR(totalDeduct)}</div>
        </div>
        <div className="text-2xl font-bold text-green-400">{formatINR(netPay)}</div>
      </div>

      {/* YTD */}
      {(ytdGross || ytdNet) && (
        <div className="border border-t-0 border-gray-400 p-3">
          <div className="text-xs font-bold text-gray-600 uppercase mb-2 tracking-wider">
            Year-to-Date (YTD) Summary
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 rounded p-2 text-center">
              <div className="text-xs text-blue-600">YTD Gross</div>
              <div className="font-bold text-blue-900">{formatINR(ytdGross)}</div>
            </div>
            <div className="bg-red-50 rounded p-2 text-center">
              <div className="text-xs text-red-600">YTD Deductions</div>
              <div className="font-bold text-red-900">{formatINR(ytdDeductions)}</div>
            </div>
            <div className="bg-green-50 rounded p-2 text-center">
              <div className="text-xs text-green-600">YTD Net</div>
              <div className="font-bold text-green-900">{formatINR(ytdNet)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Footer note */}
      <div className="border border-t-0 border-gray-400 p-3 bg-gray-50">
        <p className="text-gray-500 text-center">
          This is a computer-generated salary slip and does not require a signature.
        </p>
        <p className="text-gray-400 text-center mt-0.5">
          For any queries, contact HR at hr@techcorp.in
        </p>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-500 flex-shrink-0 w-32">{label}:</span>
      <span className="font-medium text-gray-900">{value || '—'}</span>
    </div>
  )
}
