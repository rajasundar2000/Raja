import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  User,
  Building2,
  RefreshCw,
} from 'lucide-react'
import { employees } from '../api.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import Modal from '../components/Modal.jsx'
import toast from 'react-hot-toast'

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
  employee_id: '',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  department: '',
  designation: '',
  role: 'employee',
  date_of_joining: '',
  date_of_birth: '',
  pan_number: '',
  aadhaar_number: '',
  bank_account_number: '',
  bank_name: '',
  ifsc_code: '',
  uan_number: '',
  status: 'active',
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

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1

  function handleSearch(e) {
    setSearch(e.target.value)
    setPage(1)
  }

  function handleDept(e) {
    setDeptFilter(e.target.value)
    setPage(1)
  }

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

  function Field({ label, name, type = 'text', required, options, half }) {
    return (
      <div className={half ? '' : 'col-span-2 sm:col-span-1'}>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {options ? (
          <select
            name={name}
            value={form[name]}
            onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select…</option>
            {options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            name={name}
            value={form[name]}
            onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
            required={required}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total employees</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchEmployees}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={() => { setForm(EMPTY_FORM); setShowModal(true) }}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Add Employee
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or ID…"
            value={search}
            onChange={handleSearch}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={deptFilter}
          onChange={handleDept}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner text="Loading employees…" />
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <User className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No employees found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3 text-left">Emp ID</th>
                  <th className="px-5 py-3 text-left">Name</th>
                  <th className="px-5 py-3 text-left">Department</th>
                  <th className="px-5 py-3 text-left">Designation</th>
                  <th className="px-5 py-3 text-left">Role</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((emp) => (
                  <tr
                    key={emp.id ?? emp.employee_id}
                    className="hover:bg-indigo-50/30 cursor-pointer"
                    onClick={() => navigate(`/employees/${emp.employee_id ?? emp.id}`)}
                  >
                    <td className="px-5 py-3 font-mono text-xs text-indigo-600 font-semibold">
                      {emp.employee_id}
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {emp.first_name} {emp.last_name}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-gray-400" />
                        {emp.department ?? '—'}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{emp.designation ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs text-gray-500 capitalize">{emp.role ?? '—'}</span>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={emp.status ?? 'active'} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/employees/${emp.employee_id ?? emp.id}`)
                        }}
                        className="text-indigo-600 hover:underline text-xs font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && data.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
            <span className="text-xs text-gray-500">
              Page {page} of {totalPages} &bull; {total} employees
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs disabled:opacity-40 hover:bg-gray-50"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs disabled:opacity-40 hover:bg-gray-50"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add New Employee" size="lg">
        <form onSubmit={handleCreate} className="space-y-5">
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b">Basic Information</h3>
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
            <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b">Work Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Department" name="department" options={DEPARTMENTS} />
              <Field label="Designation" name="designation" options={DESIGNATIONS} />
              <Field label="Role" name="role" options={ROLES} />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b">Government & Bank Details</h3>
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
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
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
