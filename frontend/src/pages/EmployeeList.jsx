import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  User,
  Building2,
  RefreshCw,
  UserPlus,
  KeyRound,
} from 'lucide-react'
import axios from 'axios'
import { employees } from '../api.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import Modal from '../components/Modal.jsx'
import toast from 'react-hot-toast'

const API_URL = import.meta.env.VITE_API_URL || 'https://elite-recruit-payroll-system.onrender.com/api'

const PAGE_SIZE = 10

const DEPARTMENTS = [
  'Engineering', 'HR', 'Finance', 'Sales', 'Marketing', 'Operations',
  'Legal', 'IT', 'Product', 'Customer Support',
]
const ROLES = ['employee', 'manager', 'hr', 'admin']
const DESIGNATIONS = [
  'Software Engineer', 'Senior Engineer', 'Tech Lead', 'Manager',
  'HR Executive', 'HR Manager', 'Accountant', 'Sales Executive',
  'Product Manager', 'Analyst',
]

const EMPTY_FORM = {
  employee_id: '', first_name: '', last_name: '', email: '', phone: '',
  department: '', designation: '', role: 'employee', date_of_joining: '',
  date_of_birth: '', pan_number: '', aadhaar_number: '', bank_account_number: '',
  bank_name: '', ifsc_code: '', uan_number: '', status: 'active',
}

// Colored initials avatar
function Avatar({ name }) {
  const initials = (name ?? '?').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
      {initials}
    </div>
  )
}

export default function EmployeeList() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // Reset password state
  const [resetPasswordModal, setResetPasswordModal] = useState(false)
  const [resetTargetEmp, setResetTargetEmp] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resettingPassword, setResettingPassword] = useState(false)

  function openResetPassword(emp, e) {
    e.stopPropagation()
    setResetTargetEmp(emp)
    setNewPassword('')
    setConfirmPassword('')
    setResetPasswordModal(true)
  }

  async function handleResetPassword(e) {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setResettingPassword(true)
    try {
      const token = localStorage.getItem('auth_token')
      await axios.post(
        `${API_URL}/auth/set-password`,
        { employee_id: resetTargetEmp.employee_id, new_password: newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('Password updated successfully')
      setResetPasswordModal(false)
      setResetTargetEmp(null)
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      toast.error(err?.response?.data?.message ?? err?.message ?? 'Failed to reset password')
    } finally {
      setResettingPassword(false)
    }
  }

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, page_size: PAGE_SIZE }
      if (search) params.search = search
      if (deptFilter) params.department = deptFilter
      const res = await employees.getAll(params)
      const d = res.data
      const list = d.results ?? d.data ?? (Array.isArray(d) ? d : [])
      setData(list)
      setTotal(d.count ?? d.total ?? list.length)
    } catch {
      toast.error('Failed to load employees')
      setData([])
    } finally {
      setLoading(false)
    }
  }, [page, search, deptFilter])

  useEffect(() => { fetchEmployees() }, [fetchEmployees])

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1

  function handleSearch(e) { setSearch(e.target.value); setPage(1) }

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.first_name || !form.last_name || !form.email || !form.employee_id) {
      toast.error('Please fill required fields')
      return
    }
    setSaving(true)
    try {
      await employees.create(form)
      toast.success('Employee created successfully!')
      setShowModal(false)
      setForm(EMPTY_FORM)
      fetchEmployees()
    } catch (err) {
      toast.error(err.userMessage ?? 'Failed to create employee')
    } finally {
      setSaving(false)
    }
  }

  function Field({ label, name, type = 'text', required, options }) {
    return (
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {options ? (
          <select
            name={name}
            value={form[name]}
            onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
            className="input-glass"
          >
            <option value="">Select…</option>
            {options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input
            type={type}
            name={name}
            value={form[name]}
            onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
            required={required}
            className="input-glass"
          />
        )}
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between animate-stagger-1">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Employees</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} total employees</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchEmployees} className="btn-glass">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => { setForm(EMPTY_FORM); setShowModal(true) }}
            className="btn-primary"
          >
            <UserPlus className="h-4 w-4" />
            Invite Employee
          </button>
        </div>
      </div>

      {/* ── Search + Department filter ── */}
      <div className="flex flex-wrap gap-3 animate-stagger-2">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or ID…"
            value={search}
            onChange={handleSearch}
            className="input-glass pl-10"
          />
        </div>

        {/* Department chips */}
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={() => { setDeptFilter(''); setPage(1) }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              deptFilter === ''
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white/70 text-slate-600 hover:bg-indigo-50 border border-slate-200'
            }`}
          >
            All
          </button>
          {DEPARTMENTS.slice(0, 6).map((d) => (
            <button
              key={d}
              onClick={() => { setDeptFilter(d); setPage(1) }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                deptFilter === d
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white/70 text-slate-600 hover:bg-indigo-50 border border-slate-200'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="glass-card overflow-hidden p-0 animate-stagger-3">
        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner text="Loading employees…" />
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <User className="h-10 w-10 mx-auto mb-3 text-slate-300" />
            <p className="text-sm">No employees found</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/50 text-xs text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3 text-left">Employee</th>
                    <th className="px-5 py-3 text-left">Department</th>
                    <th className="px-5 py-3 text-left">Designation</th>
                    <th className="px-5 py-3 text-left">Role</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((emp, idx) => (
                    <tr
                      key={emp.id ?? emp.employee_id}
                      className={`hover:bg-indigo-50/30 cursor-pointer transition-colors ${idx !== data.length - 1 ? 'border-b border-slate-100' : ''}`}
                      onClick={() => navigate(`/employees/${emp.employee_id ?? emp.id}`)}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={`${emp.first_name} ${emp.last_name}`} />
                          <div>
                            <p className="font-semibold text-slate-900">
                              {emp.first_name} {emp.last_name}
                            </p>
                            <p className="text-xs font-mono text-indigo-600 font-semibold">{emp.employee_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          {emp.department ?? '—'}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{emp.designation ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs text-slate-500 capitalize bg-slate-100 px-2 py-1 rounded-full">
                          {emp.role ?? '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={emp.status ?? 'active'} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => openResetPassword(emp, e)}
                            title="Reset Password"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/60 border border-white/40 text-slate-600 text-xs font-semibold hover:bg-white/80 transition-colors"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/employees/${emp.employee_id ?? emp.id}`) }}
                            className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold hover:underline"
                          >
                            View Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-slate-100">
              {data.map((emp) => (
                <div
                  key={emp.id ?? emp.employee_id}
                  className="p-4 hover:bg-indigo-50/30 cursor-pointer transition-colors"
                  onClick={() => navigate(`/employees/${emp.employee_id ?? emp.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={`${emp.first_name} ${emp.last_name}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-900">{emp.first_name} {emp.last_name}</p>
                        <StatusBadge status={emp.status ?? 'active'} />
                      </div>
                      <p className="text-xs text-slate-500">{emp.designation ?? '—'}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-mono text-indigo-600 font-semibold">{emp.employee_id}</p>
                      <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                        <Building2 className="h-3 w-3" />
                        {emp.department ?? '—'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {!loading && data.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages} &bull; {total} employees
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="btn-glass text-xs py-1.5 px-3 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="btn-glass text-xs py-1.5 px-3 disabled:opacity-40"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Reset Password Modal ── */}
      <Modal
        open={resetPasswordModal}
        onClose={() => setResetPasswordModal(false)}
        title={`Reset Password for ${resetTargetEmp ? `${resetTargetEmp.first_name} ${resetTargetEmp.last_name}` : ''}`}
        size="sm"
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <p className="text-sm text-slate-500">
            Setting a new password for{' '}
            <span className="font-semibold text-slate-700">
              {resetTargetEmp?.first_name} {resetTargetEmp?.last_name}
            </span>{' '}
            ({resetTargetEmp?.employee_id})
          </p>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3 mt-5 block">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              required
              className="w-full px-4 py-3 rounded-xl border border-white/30 bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder-slate-400"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3 mt-5 block">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              className="w-full px-4 py-3 rounded-xl border border-white/30 bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder-slate-400"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setResetPasswordModal(false)}
              className="btn-glass"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={resettingPassword}
              className="btn-primary"
            >
              {resettingPassword && <RefreshCw className="h-4 w-4 animate-spin" />}
              {resettingPassword ? 'Saving…' : 'Update Password'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Add Employee Modal ── */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Invite New Employee" size="lg">
        <form onSubmit={handleCreate} className="space-y-5">
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 pb-1 border-b border-slate-100">
              Basic Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Employee ID" name="employee_id" required />
              <Field label="Email" name="email" type="email" required />
              <Field label="First Name" name="first_name" required />
              <Field label="Last Name" name="last_name" required />
              <Field label="Phone" name="phone" />
              <Field label="Date of Birth" name="date_of_birth" type="date" />
              <Field label="Date of Joining" name="date_of_joining" type="date" />
              <Field label="Status" name="status" options={['active', 'inactive']} />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 pb-1 border-b border-slate-100">
              Work Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Department" name="department" options={DEPARTMENTS} />
              <Field label="Designation" name="designation" options={DESIGNATIONS} />
              <Field label="Role" name="role" options={ROLES} />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 pb-1 border-b border-slate-100">
              Government &amp; Bank Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="PAN Number" name="pan_number" />
              <Field label="Aadhaar Number" name="aadhaar_number" />
              <Field label="UAN Number" name="uan_number" />
              <Field label="Bank Name" name="bank_name" />
              <Field label="Account Number" name="bank_account_number" />
              <Field label="IFSC Code" name="ifsc_code" />
            </div>
          </section>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="btn-glass"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
            >
              {saving && <RefreshCw className="h-4 w-4 animate-spin" />}
              {saving ? 'Creating…' : 'Create Employee'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
