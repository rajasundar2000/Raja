import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  User,
  Banknote,
  Calendar,
  FileText,
  CreditCard,
  Mail,
  Phone,
  Building2,
  Briefcase,
  RefreshCw,
} from 'lucide-react'
import { employees, leaves, payroll } from '../api.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import LeaveBalanceCard from '../components/LeaveBalanceCard.jsx'
import toast from 'react-hot-toast'

function formatINR(amount) {
  if (amount == null || amount === '') return '₹0'
  return '₹' + Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'salary', label: 'Salary Structure', icon: Banknote },
  { id: 'leaves', label: 'Leave Balance', icon: Calendar },
  { id: 'slips', label: 'Salary Slips', icon: FileText },
  { id: 'loans', label: 'Loans', icon: CreditCard },
]

export default function EmployeeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('profile')
  const [loading, setLoading] = useState(true)
  const [emp, setEmp] = useState(null)
  const [salary, setSalary] = useState(null)
  const [balance, setBalance] = useState([])
  const [slips, setSlips] = useState([])
  const [loans, setLoans] = useState([])

  useEffect(() => {
    async function fetchEmp() {
      setLoading(true)
      try {
        const res = await employees.getOne(id)
        setEmp(res.data)
      } catch {
        toast.error('Employee not found')
        navigate('/employees')
      } finally {
        setLoading(false)
      }
    }
    fetchEmp()
  }, [id])

  useEffect(() => {
    if (!emp) return
    async function fetchExtra() {
      try {
        const [salRes, balRes, slipRes, loanRes] = await Promise.allSettled([
          employees.getSalaryStructure(id),
          leaves.getBalance(id),
          payroll.getEmployeeSlips(id),
          payroll.getLoans({ employee_id: id }),
        ])
        if (salRes.status === 'fulfilled') setSalary(salRes.value.data)
        if (balRes.status === 'fulfilled') {
          const d = balRes.value.data
          setBalance(d.balances ?? d.data ?? (Array.isArray(d) ? d : []))
        }
        if (slipRes.status === 'fulfilled') {
          const d = slipRes.value.data
          setSlips(d.results ?? d.data ?? (Array.isArray(d) ? d : []))
        }
        if (loanRes.status === 'fulfilled') {
          const d = loanRes.value.data
          setLoans(d.results ?? d.data ?? (Array.isArray(d) ? d : []))
        }
      } catch {
        // best effort
      }
    }
    fetchExtra()
  }, [emp])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner text="Loading employee…" />
      </div>
    )
  }

  if (!emp) return null

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/employees')}
          className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </button>
        <div className="flex items-center gap-4 flex-1">
          <div className="h-14 w-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xl">
            {emp.first_name?.[0]}{emp.last_name?.[0]}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {emp.first_name} {emp.last_name}
            </h1>
            <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
              <span className="font-mono text-indigo-600 text-xs font-semibold">{emp.employee_id}</span>
              <span>&bull;</span>
              <span>{emp.designation ?? '—'}</span>
              <span>&bull;</span>
              <StatusBadge status={emp.status ?? 'active'} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(({ id: tid, label, icon: Icon }) => (
          <button
            key={tid}
            onClick={() => setTab(tid)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === tid
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        {tab === 'profile' && <ProfileTab emp={emp} />}
        {tab === 'salary' && <SalaryTab salary={salary} empId={id} />}
        {tab === 'leaves' && <LeavesTab balance={balance} />}
        {tab === 'slips' && <SlipsTab slips={slips} />}
        {tab === 'loans' && <LoansTab loans={loans} />}
      </div>
    </div>
  )
}

function ProfileTab({ emp }) {
  const Section = ({ title, children }) => (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
    </div>
  )

  const Field = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-3">
      {Icon && <Icon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />}
      <div>
        <div className="text-xs text-gray-400">{label}</div>
        <div className="text-sm font-medium text-gray-900">{value || '—'}</div>
      </div>
    </div>
  )

  return (
    <div>
      <Section title="Personal Information">
        <Field icon={User} label="Full Name" value={`${emp.first_name} ${emp.last_name}`} />
        <Field icon={Mail} label="Email" value={emp.email} />
        <Field icon={Phone} label="Phone" value={emp.phone} />
        <Field label="Date of Birth" value={emp.date_of_birth} />
        <Field label="Gender" value={emp.gender} />
        <Field label="Blood Group" value={emp.blood_group} />
      </Section>

      <Section title="Work Information">
        <Field icon={Building2} label="Department" value={emp.department} />
        <Field icon={Briefcase} label="Designation" value={emp.designation} />
        <Field label="Role" value={emp.role} />
        <Field label="Date of Joining" value={emp.date_of_joining} />
        <Field label="Manager" value={emp.manager_name ?? emp.manager} />
        <Field label="Work Location" value={emp.work_location} />
      </Section>

      <Section title="Government Documents">
        <Field label="PAN Number" value={emp.pan_number} />
        <Field label="Aadhaar Number" value={emp.aadhaar_number ? '****' + emp.aadhaar_number.slice(-4) : '—'} />
        <Field label="UAN Number" value={emp.uan_number} />
        <Field label="ESI Number" value={emp.esi_number} />
        <Field label="PF Account" value={emp.pf_account_number} />
      </Section>

      <Section title="Bank Details">
        <Field icon={Banknote} label="Bank Name" value={emp.bank_name} />
        <Field label="Account Number" value={emp.bank_account_number ? '****' + emp.bank_account_number.slice(-4) : '—'} />
        <Field label="IFSC Code" value={emp.ifsc_code} />
        <Field label="Account Type" value={emp.account_type} />
        <Field label="Branch Name" value={emp.branch_name} />
      </Section>
    </div>
  )
}

function SalaryTab({ salary, empId }) {
  if (!salary) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Banknote className="h-10 w-10 mx-auto mb-3 text-gray-300" />
        <p className="text-sm">No salary structure set for this employee.</p>
      </div>
    )
  }

  const earnings = [
    { label: 'Basic Salary', value: salary.basic_salary ?? salary.basic },
    { label: 'HRA', value: salary.hra },
    { label: 'Dearness Allowance', value: salary.da ?? salary.dearness_allowance },
    { label: 'Conveyance Allowance', value: salary.conveyance_allowance },
    { label: 'Medical Allowance', value: salary.medical_allowance },
    { label: 'Special Allowance', value: salary.special_allowance },
    { label: 'Other Allowance', value: salary.other_allowance },
    { label: 'LTA', value: salary.lta },
  ].filter((e) => e.value != null && e.value !== 0)

  const deductions = [
    { label: 'PF Employee', value: salary.pf_employee ?? salary.employee_pf },
    { label: 'PF Employer', value: salary.pf_employer ?? salary.employer_pf },
    { label: 'ESI Employee', value: salary.esi_employee ?? salary.employee_esi },
    { label: 'ESI Employer', value: salary.esi_employer ?? salary.employer_esi },
    { label: 'Professional Tax', value: salary.professional_tax ?? salary.pt },
    { label: 'Income Tax (TDS)', value: salary.income_tax_tds ?? salary.tds },
  ].filter((d) => d.value != null && d.value !== 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg">
        <div>
          <div className="text-xs text-indigo-600 font-medium">Cost to Company (CTC)</div>
          <div className="text-2xl font-bold text-indigo-900 mt-0.5">
            {formatINR(salary.ctc ?? salary.annual_ctc)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Monthly Gross</div>
          <div className="text-lg font-semibold text-gray-900 mt-0.5">
            {formatINR(salary.gross_salary ?? salary.monthly_gross)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Earnings */}
        <div>
          <h3 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" /> Earnings
          </h3>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {earnings.length === 0 ? (
                <tr><td className="py-3 text-gray-400 text-xs">No earnings data</td></tr>
              ) : earnings.map(({ label, value }) => (
                <tr key={label}>
                  <td className="py-2 text-gray-600">{label}</td>
                  <td className="py-2 text-right font-medium text-gray-900">{formatINR(value)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-300 font-semibold">
                <td className="py-2 text-gray-900">Total Earnings</td>
                <td className="py-2 text-right text-green-700">
                  {formatINR(salary.gross_salary ?? earnings.reduce((s, e) => s + (Number(e.value) || 0), 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Deductions */}
        <div>
          <h3 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-500" /> Deductions
          </h3>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {deductions.length === 0 ? (
                <tr><td className="py-3 text-gray-400 text-xs">No deductions data</td></tr>
              ) : deductions.map(({ label, value }) => (
                <tr key={label}>
                  <td className="py-2 text-gray-600">{label}</td>
                  <td className="py-2 text-right font-medium text-gray-900">{formatINR(value)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-300 font-semibold">
                <td className="py-2 text-gray-900">Total Deductions</td>
                <td className="py-2 text-right text-red-700">
                  {formatINR(salary.total_deductions ?? deductions.reduce((s, d) => s + (Number(d.value) || 0), 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-between items-center p-4 bg-gray-900 rounded-lg text-white">
        <span className="font-semibold">Net Monthly Salary</span>
        <span className="text-xl font-bold text-green-400">{formatINR(salary.net_salary ?? salary.net_monthly)}</span>
      </div>
    </div>
  )
}

function LeavesTab({ balance }) {
  if (balance.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Calendar className="h-10 w-10 mx-auto mb-3 text-gray-300" />
        <p className="text-sm">No leave balance data available.</p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Leave Balance — FY 2025–26</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {balance.map((b, i) => (
          <LeaveBalanceCard
            key={b.leave_type_id ?? i}
            leaveType={b.leave_type_name ?? b.leave_type ?? `Type ${i + 1}`}
            available={b.available ?? b.remaining ?? 0}
            total={b.total_allotted ?? b.total ?? 0}
            used={b.used ?? b.taken ?? 0}
          />
        ))}
      </div>
    </div>
  )
}

function SlipsTab({ slips }) {
  if (slips.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <FileText className="h-10 w-10 mx-auto mb-3 text-gray-300" />
        <p className="text-sm">No salary slips found.</p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Salary Slips</h3>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
          <tr>
            <th className="px-4 py-3 text-left">Month / Year</th>
            <th className="px-4 py-3 text-right">Gross</th>
            <th className="px-4 py-3 text-right">Deductions</th>
            <th className="px-4 py-3 text-right">Net Pay</th>
            <th className="px-4 py-3 text-left">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {slips.map((slip, i) => (
            <tr key={slip.id ?? i} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">
                {slip.month_name ?? slip.month} {slip.year}
              </td>
              <td className="px-4 py-3 text-right text-gray-700">{formatINR(slip.gross_salary)}</td>
              <td className="px-4 py-3 text-right text-red-600">{formatINR(slip.total_deductions)}</td>
              <td className="px-4 py-3 text-right font-semibold text-green-700">{formatINR(slip.net_salary ?? slip.net_pay)}</td>
              <td className="px-4 py-3"><StatusBadge status={slip.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LoansTab({ loans }) {
  if (loans.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <CreditCard className="h-10 w-10 mx-auto mb-3 text-gray-300" />
        <p className="text-sm">No loans found.</p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Loans</h3>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
          <tr>
            <th className="px-4 py-3 text-left">Loan ID</th>
            <th className="px-4 py-3 text-right">Principal</th>
            <th className="px-4 py-3 text-right">Outstanding</th>
            <th className="px-4 py-3 text-right">Monthly EMI</th>
            <th className="px-4 py-3 text-left">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {loans.map((loan, i) => (
            <tr key={loan.id ?? i} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-mono text-xs text-gray-700">{loan.loan_id ?? loan.id}</td>
              <td className="px-4 py-3 text-right text-gray-700">{formatINR(loan.principal_amount ?? loan.amount)}</td>
              <td className="px-4 py-3 text-right text-amber-700">{formatINR(loan.outstanding_balance ?? loan.outstanding)}</td>
              <td className="px-4 py-3 text-right text-gray-700">{formatINR(loan.monthly_emi ?? loan.emi)}</td>
              <td className="px-4 py-3"><StatusBadge status={loan.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
