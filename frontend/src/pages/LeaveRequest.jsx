import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  User,
  FileText,
  RefreshCw,
  Info,
} from 'lucide-react'
import { employees, leaves } from '../api.js'
import LeaveBalanceCard from '../components/LeaveBalanceCard.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import toast from 'react-hot-toast'

function isWeekend(date) {
  const d = new Date(date)
  const dow = d.getDay()
  return dow === 0 || dow === 6
}

function calcWorkingDays(from, to, holidays = []) {
  if (!from || !to) return 0
  const start = new Date(from)
  const end = new Date(to)
  if (end < start) return 0

  const holidaySet = new Set(holidays.map((h) => h.date).filter(Boolean))
  let count = 0
  const cur = new Date(start)
  while (cur <= end) {
    const ds = cur.toISOString().split('T')[0]
    if (!isWeekend(cur) && !holidaySet.has(ds)) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

export default function LeaveRequest() {
  const navigate = useNavigate()
  const [empList, setEmpList] = useState([])
  const [leaveTypes, setLeaveTypes] = useState([])
  const [holidays, setHolidays] = useState([])
  const [balance, setBalance] = useState([])
  const [loadingInit, setLoadingInit] = useState(true)
  const [loadingBalance, setLoadingBalance] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    employee_id: 'E001',
    leave_type_id: '',
    from_date: '',
    to_date: '',
    reason: '',
    backfill_employee_id: '',
  })

  const workingDays = calcWorkingDays(form.from_date, form.to_date, holidays)

  const selectedBalance = balance.find(
    (b) => String(b.leave_type_id) === String(form.leave_type_id) ||
           String(b.id) === String(form.leave_type_id)
  )

  useEffect(() => {
    async function init() {
      setLoadingInit(true)
      try {
        const [empRes, typeRes, holRes] = await Promise.allSettled([
          employees.getAll({ page_size: 200 }),
          leaves.getTypes(),
          leaves.getHolidays({ year: new Date().getFullYear() }),
        ])
        if (empRes.status === 'fulfilled') {
          const d = empRes.value.data
          setEmpList(d.results ?? d.data ?? (Array.isArray(d) ? d : []))
        }
        if (typeRes.status === 'fulfilled') {
          const d = typeRes.value.data
          setLeaveTypes(d.results ?? d.data ?? (Array.isArray(d) ? d : []))
        }
        if (holRes.status === 'fulfilled') {
          const d = holRes.value.data
          setHolidays(d.results ?? d.data ?? (Array.isArray(d) ? d : []))
        }
      } catch {
        toast.error('Failed to load form data')
      } finally {
        setLoadingInit(false)
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (!form.employee_id) return
    setLoadingBalance(true)
    leaves
      .getBalance(form.employee_id)
      .then((res) => {
        const d = res.data
        setBalance(d.balances ?? d.data ?? (Array.isArray(d) ? d : []))
      })
      .catch(() => setBalance([]))
      .finally(() => setLoadingBalance(false))
  }, [form.employee_id])

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.employee_id || !form.leave_type_id || !form.from_date || !form.to_date) {
      toast.error('Please fill all required fields')
      return
    }
    if (workingDays <= 0) {
      toast.error('Invalid date range or no working days selected')
      return
    }
    if (selectedBalance && workingDays > (selectedBalance.available ?? selectedBalance.remaining ?? 999)) {
      toast.error('Insufficient leave balance')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        employee_id: form.employee_id,
        leave_type_id: form.leave_type_id,
        from_date: form.from_date,
        to_date: form.to_date,
        reason: form.reason,
        backfill_employee_id: form.backfill_employee_id || undefined,
      }
      const res = await leaves.createRequest(payload)
      const id = res.data?.id ?? res.data?.leave_id
      if (id) await leaves.submitRequest(id)
      toast.success('Leave request submitted successfully!')
      navigate('/leaves')
    } catch (err) {
      toast.error(err.userMessage ?? 'Failed to submit leave request')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingInit) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner text="Loading form data…" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/leaves')}
          className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Apply for Leave</h1>
          <p className="text-sm text-gray-500 mt-0.5">Submit a new leave request</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-5">
            {/* Employee */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <User className="h-4 w-4 inline-block mr-1.5 text-gray-400" />
                Employee <span className="text-red-500">*</span>
              </label>
              <select
                value={form.employee_id}
                onChange={(e) => setField('employee_id', e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select employee…</option>
                {empList.map((emp) => (
                  <option key={emp.employee_id ?? emp.id} value={emp.employee_id ?? emp.id}>
                    {emp.employee_id} — {emp.first_name} {emp.last_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Leave Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <Calendar className="h-4 w-4 inline-block mr-1.5 text-gray-400" />
                Leave Type <span className="text-red-500">*</span>
              </label>
              <select
                value={form.leave_type_id}
                onChange={(e) => setField('leave_type_id', e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select leave type…</option>
                {leaveTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name ?? t.leave_type_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  From Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.from_date}
                  onChange={(e) => setField('from_date', e.target.value)}
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  To Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.to_date}
                  onChange={(e) => setField('to_date', e.target.value)}
                  required
                  min={form.from_date || new Date().toISOString().split('T')[0]}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Working Days Preview */}
            {form.from_date && form.to_date && (
              <div className={`flex items-center gap-3 rounded-lg p-3 border text-sm ${
                workingDays > 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-red-50 border-red-200'
              }`}>
                <Info className={`h-4 w-4 flex-shrink-0 ${workingDays > 0 ? 'text-indigo-600' : 'text-red-500'}`} />
                <div>
                  <span className={`font-semibold ${workingDays > 0 ? 'text-indigo-900' : 'text-red-700'}`}>
                    {workingDays} working day{workingDays !== 1 ? 's' : ''}
                  </span>
                  <span className="text-gray-500 ml-1">(weekends & holidays excluded)</span>
                </div>
                {selectedBalance && (
                  <div className={`ml-auto text-xs font-medium ${
                    workingDays > (selectedBalance.available ?? selectedBalance.remaining ?? 999)
                      ? 'text-red-600'
                      : 'text-green-600'
                  }`}>
                    Balance: {selectedBalance.available ?? selectedBalance.remaining ?? 0} days
                  </div>
                )}
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <FileText className="h-4 w-4 inline-block mr-1.5 text-gray-400" />
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.reason}
                onChange={(e) => setField('reason', e.target.value)}
                required
                rows={4}
                placeholder="Briefly describe the reason for your leave…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {/* Backfill Employee */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Backfill / Coverage Employee (optional)
              </label>
              <select
                value={form.backfill_employee_id}
                onChange={(e) => setField('backfill_employee_id', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">No backfill needed</option>
                {empList
                  .filter((e) => (e.employee_id ?? e.id) !== form.employee_id)
                  .map((emp) => (
                    <option key={emp.employee_id ?? emp.id} value={emp.employee_id ?? emp.id}>
                      {emp.employee_id} — {emp.first_name} {emp.last_name}
                    </option>
                  ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Select a colleague who will cover your responsibilities
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => navigate('/leaves')}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || workingDays === 0}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {submitting && <RefreshCw className="h-4 w-4 animate-spin" />}
                {submitting ? 'Submitting…' : 'Submit Leave Request'}
              </button>
            </div>
          </form>
        </div>

        {/* Leave Balance Sidebar */}
        <div>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 sticky top-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Leave Balance
              {form.employee_id && (
                <span className="text-indigo-600 ml-1">— {form.employee_id}</span>
              )}
            </h3>
            {loadingBalance ? (
              <div className="flex justify-center py-6">
                <LoadingSpinner size="sm" text="Loading…" />
              </div>
            ) : balance.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">
                Select an employee to view balance
              </p>
            ) : (
              <div className="space-y-3">
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
            )}

            {/* Upcoming Holidays */}
            {holidays.length > 0 && (
              <div className="mt-5 border-t border-gray-100 pt-4">
                <h4 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">
                  Upcoming Holidays
                </h4>
                <div className="space-y-1.5">
                  {holidays
                    .filter((h) => h.date >= new Date().toISOString().split('T')[0])
                    .slice(0, 5)
                    .map((h, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">{h.name ?? h.holiday_name}</span>
                        <span className="text-gray-400 font-mono">{h.date}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
