import { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp,
  Plus,
  Check,
  X,
  RefreshCw,
  ChevronDown,
  AlertCircle,
  DollarSign,
  Clock,
  BadgeCheck,
} from 'lucide-react'
import { commissionAPI, employees as employeesAPI } from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import Modal from '../components/Modal.jsx'
import toast from 'react-hot-toast'
import { formatINR, formatDate } from '../utils/format.js'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const STRUCTURE_TYPES = [
  { value: 'flat', label: 'Flat Amount' },
  { value: 'percentage', label: 'Percentage of Deal' },
  { value: 'tiered', label: 'Tiered (by sales volume)' },
  { value: 'target_bonus', label: 'Target Bonus' },
]

const now = new Date()
const CUR_MONTH = now.getMonth() + 1
const CUR_YEAR = now.getFullYear()

function StatCard({ icon: Icon, label, value, color = 'indigo', loading }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
  }
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`rounded-lg p-2.5 ${colors[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {loading ? (
        <div className="h-7 w-24 bg-gray-100 animate-pulse rounded" />
      ) : (
        <div className="text-2xl font-bold text-gray-900">{value}</div>
      )}
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </div>
  )
}

// ─── Log Commission Modal ────────────────────────────────────────────────────
function LogCommissionModal({ open, onClose, user, structures, employeeList, onSaved }) {
  const isManager = ['hr', 'super_admin', 'manager'].includes(user?.role)
  const [form, setForm] = useState({
    employee_id: user?.employee_id ?? '',
    description: '',
    structure_id: '',
    deal_value: '',
    commission_amount: '',
    month: CUR_MONTH,
    year: CUR_YEAR,
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  // Auto-calculate commission when structure + deal_value change
  useEffect(() => {
    if (!form.structure_id || !form.deal_value) return
    const struct = structures.find((s) => String(s.id) === String(form.structure_id))
    if (!struct) return
    const deal = parseFloat(form.deal_value) || 0
    let calc = 0
    if (struct.type === 'flat') {
      calc = parseFloat(struct.amount ?? 0)
    } else if (struct.type === 'percentage') {
      calc = (deal * parseFloat(struct.rate ?? 0)) / 100
    } else if (struct.type === 'target_bonus') {
      calc = deal >= parseFloat(struct.target ?? 0) ? parseFloat(struct.bonus ?? 0) : 0
    }
    if (calc > 0) setForm((f) => ({ ...f, commission_amount: String(Math.round(calc)) }))
  }, [form.structure_id, form.deal_value, structures])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.employee_id || !form.description || !form.commission_amount) {
      toast.error('Please fill required fields')
      return
    }
    setSaving(true)
    try {
      await commissionAPI.createEntry({
        employee_id: form.employee_id,
        description: form.description,
        structure_id: form.structure_id || undefined,
        deal_value: form.deal_value ? parseFloat(form.deal_value) : undefined,
        commission_amount: parseFloat(form.commission_amount),
        month: parseInt(form.month),
        year: parseInt(form.year),
        notes: form.notes || undefined,
      })
      toast.success('Commission entry logged!')
      onSaved()
      onClose()
      setForm({
        employee_id: user?.employee_id ?? '',
        description: '',
        structure_id: '',
        deal_value: '',
        commission_amount: '',
        month: CUR_MONTH,
        year: CUR_YEAR,
        notes: '',
      })
    } catch (err) {
      toast.error(err.userMessage ?? 'Failed to log commission')
    } finally {
      setSaving(false)
    }
  }

  const selectedStruct = structures.find((s) => String(s.id) === String(form.structure_id))

  return (
    <Modal open={open} onClose={onClose} title="Log Commission Entry" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Employee */}
        {isManager ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Employee <span className="text-red-500">*</span>
            </label>
            <select
              value={form.employee_id}
              onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="">Select employee…</option>
              {employeeList.map((emp) => (
                <option key={emp.employee_id ?? emp.id} value={emp.employee_id ?? emp.id}>
                  {emp.first_name} {emp.last_name} ({emp.employee_id})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Employee</label>
            <input
              value={user?.full_name ?? user?.employee_id ?? ''}
              disabled
              className="w-full rounded-lg border border-gray-200 px-3 py-3 text-base bg-gray-50 text-gray-500"
            />
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Description <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="e.g. Q2 Sales Deal — Acme Corp"
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        {/* Structure */}
        {structures.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Commission Structure (optional)
            </label>
            <select
              value={form.structure_id}
              onChange={(e) => setForm((f) => ({ ...f, structure_id: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">None / Manual</option>
              {structures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.type})
                </option>
              ))}
            </select>
            {selectedStruct && (
              <p className="text-xs text-indigo-600 mt-1">{selectedStruct.description}</p>
            )}
          </div>
        )}

        {/* Deal Value */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Deal / Sales Value (₹)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.deal_value}
            onChange={(e) => setForm((f) => ({ ...f, deal_value: e.target.value }))}
            placeholder="0"
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Commission Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Commission Amount (₹) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.commission_amount}
            onChange={(e) => setForm((f) => ({ ...f, commission_amount: e.target.value }))}
            placeholder="0"
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
          {form.structure_id && form.deal_value && (
            <p className="text-xs text-green-600 mt-1">Auto-calculated from selected structure</p>
          )}
        </div>

        {/* Month / Year */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Month</label>
            <select
              value={form.month}
              onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Year</label>
            <select
              value={form.year}
              onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {[CUR_YEAR - 1, CUR_YEAR, CUR_YEAR + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Additional notes…"
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 min-h-[44px]"
          >
            {saving && <RefreshCw className="h-4 w-4 animate-spin" />}
            {saving ? 'Saving…' : 'Log Commission'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Commission Structure Modal ──────────────────────────────────────────────
function StructureModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'percentage',
    amount: '',
    rate: '',
    monthly_target: '',
    target: '',
    bonus: '',
    tiers: [{ min_sales: '', max_sales: '', rate: '' }],
  })
  const [saving, setSaving] = useState(false)

  function addTier() {
    setForm((f) => ({ ...f, tiers: [...f.tiers, { min_sales: '', max_sales: '', rate: '' }] }))
  }
  function removeTier(idx) {
    setForm((f) => ({ ...f, tiers: f.tiers.filter((_, i) => i !== idx) }))
  }
  function updateTier(idx, field, value) {
    setForm((f) => ({
      ...f,
      tiers: f.tiers.map((t, i) => (i === idx ? { ...t, [field]: value } : t)),
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name || !form.type) {
      toast.error('Name and type are required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        description: form.description,
        type: form.type,
      }
      if (form.type === 'flat') payload.amount = parseFloat(form.amount) || 0
      if (form.type === 'percentage') {
        payload.rate = parseFloat(form.rate) || 0
        if (form.monthly_target) payload.monthly_target = parseFloat(form.monthly_target)
      }
      if (form.type === 'target_bonus') {
        payload.target = parseFloat(form.target) || 0
        payload.bonus = parseFloat(form.bonus) || 0
      }
      if (form.type === 'tiered') {
        payload.tiers = form.tiers.map((t) => ({
          min_sales: parseFloat(t.min_sales) || 0,
          max_sales: t.max_sales ? parseFloat(t.max_sales) : null,
          rate: parseFloat(t.rate) || 0,
        }))
      }
      await commissionAPI.createStructure(payload)
      toast.success('Commission structure created!')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.userMessage ?? 'Failed to create structure')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Commission Structure" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Sales Team Q2 Plan"
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
          <input
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Brief description…"
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Type <span className="text-red-500">*</span>
          </label>
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {STRUCTURE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Conditional fields */}
        {form.type === 'flat' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Flat Amount (₹)</label>
            <input
              type="number" min="0" step="0.01"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="5000"
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        {form.type === 'percentage' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Rate (%)</label>
              <input
                type="number" min="0" max="100" step="0.01"
                value={form.rate}
                onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
                placeholder="5"
                className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Monthly Target (₹)</label>
              <input
                type="number" min="0" step="0.01"
                value={form.monthly_target}
                onChange={(e) => setForm((f) => ({ ...f, monthly_target: e.target.value }))}
                placeholder="100000"
                className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {form.type === 'target_bonus' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Target (₹)</label>
              <input
                type="number" min="0" step="0.01"
                value={form.target}
                onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}
                placeholder="500000"
                className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Bonus (₹)</label>
              <input
                type="number" min="0" step="0.01"
                value={form.bonus}
                onChange={(e) => setForm((f) => ({ ...f, bonus: e.target.value }))}
                placeholder="25000"
                className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {form.type === 'tiered' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Tiers</label>
              <button
                type="button"
                onClick={addTier}
                className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Add Tier
              </button>
            </div>
            <div className="space-y-2">
              {form.tiers.map((tier, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="number" min="0" placeholder="Min Sales"
                    value={tier.min_sales}
                    onChange={(e) => updateTier(idx, 'min_sales', e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="number" min="0" placeholder="Max Sales"
                    value={tier.max_sales}
                    onChange={(e) => updateTier(idx, 'max_sales', e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="number" min="0" max="100" placeholder="Rate %"
                    value={tier.rate}
                    onChange={(e) => updateTier(idx, 'rate', e.target.value)}
                    className="w-20 rounded-lg border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {form.tiers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTier(idx)}
                      className="p-1.5 text-red-400 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 min-h-[44px]"
          >
            {saving && <RefreshCw className="h-4 w-4 animate-spin" />}
            {saving ? 'Creating…' : 'Create Structure'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function Commission() {
  const { user } = useAuth()
  const isManager = ['hr', 'super_admin', 'manager'].includes(user?.role)

  const [tab, setTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState([])
  const [structures, setStructures] = useState([])
  const [employeeList, setEmployeeList] = useState([])
  const [summary, setSummary] = useState(null)
  const [filterEmp, setFilterEmp] = useState('')
  const [filterMonth, setFilterMonth] = useState(CUR_MONTH)
  const [filterYear, setFilterYear] = useState(CUR_YEAR)
  const [showLogModal, setShowLogModal] = useState(false)
  const [showStructureModal, setShowStructureModal] = useState(false)
  const [actionLoading, setActionLoading] = useState('')

  const TABS = isManager
    ? ['My Team', 'Pending Approval', 'Commission Structures']
    : ['My Commission']

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (!isManager) params.employee_id = user?.employee_id
      else if (filterEmp) params.employee_id = filterEmp
      if (filterMonth) params.month = filterMonth
      if (filterYear) params.year = filterYear

      const calls = [
        commissionAPI.getEntries(params),
        commissionAPI.getStructures(),
      ]
      if (!isManager && user?.employee_id) {
        calls.push(commissionAPI.getEmployeeSummary(user.employee_id, filterMonth, filterYear))
      }
      if (isManager) {
        calls.push(employeesAPI.getAll({ page_size: 100 }))
      }

      const results = await Promise.allSettled(calls)

      if (results[0].status === 'fulfilled') {
        const d = results[0].value.data
        setEntries(d.results ?? d.data ?? (Array.isArray(d) ? d : []))
      }
      if (results[1].status === 'fulfilled') {
        const d = results[1].value.data
        setStructures(d.results ?? d.data ?? (Array.isArray(d) ? d : []))
      }
      if (!isManager && results[2]?.status === 'fulfilled') {
        setSummary(results[2].value.data)
      }
      if (isManager && results[2]?.status === 'fulfilled') {
        const d = results[2].value.data
        setEmployeeList(d.results ?? d.data ?? (Array.isArray(d) ? d : []))
      }
    } catch {
      // non-fatal — API may not be running yet
    } finally {
      setLoading(false)
    }
  }, [isManager, user?.employee_id, filterEmp, filterMonth, filterYear])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleApprove(entry, action) {
    setActionLoading(entry.id + action)
    try {
      await commissionAPI.approveEntry(entry.id, { action })
      toast.success(`Entry ${action}d!`)
      fetchData()
    } catch (err) {
      toast.error(err.userMessage ?? `Failed to ${action}`)
    } finally {
      setActionLoading('')
    }
  }

  const pendingEntries = entries.filter((e) => e.status === 'pending')
  const approvedEntries = entries.filter((e) => e.status === 'approved')

  const thisMonthTotal = entries
    .filter((e) => e.status === 'approved' && e.month === filterMonth && e.year === filterYear)
    .reduce((s, e) => s + parseFloat(e.commission_amount ?? 0), 0)

  const ytdTotal = entries
    .filter((e) => e.status === 'approved' && e.year === filterYear)
    .reduce((s, e) => s + parseFloat(e.commission_amount ?? 0), 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isManager ? 'Commission Management' : 'My Commission'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {MONTHS[filterMonth - 1]} {filterYear}
          </p>
        </div>
        <button
          onClick={() => setShowLogModal(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 min-h-[44px]"
        >
          <Plus className="h-4 w-4" />
          Log Commission
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={TrendingUp}
          label={`${MONTHS[filterMonth - 1]} Commission`}
          value={formatINR(summary?.total ?? thisMonthTotal)}
          color="indigo"
          loading={loading}
        />
        <StatCard
          icon={DollarSign}
          label="YTD Commission"
          value={formatINR(summary?.ytd ?? ytdTotal)}
          color="green"
          loading={loading}
        />
        <StatCard
          icon={Clock}
          label="Pending Approval"
          value={pendingEntries.length}
          color="amber"
          loading={loading}
        />
        <StatCard
          icon={BadgeCheck}
          label="Approved"
          value={approvedEntries.length}
          color="blue"
          loading={loading}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {isManager && (
          <select
            value={filterEmp}
            onChange={(e) => setFilterEmp(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
          >
            <option value="">All Employees</option>
            {employeeList.map((emp) => (
              <option key={emp.employee_id ?? emp.id} value={emp.employee_id ?? emp.id}>
                {emp.first_name} {emp.last_name}
              </option>
            ))}
          </select>
        )}
        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(Number(e.target.value))}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
        >
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          value={filterYear}
          onChange={(e) => setFilterYear(Number(e.target.value))}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
        >
          {[CUR_YEAR - 1, CUR_YEAR, CUR_YEAR + 1].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 min-h-[44px]"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Tabs (manager only) */}
      {isManager && (
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit overflow-x-auto">
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className={`whitespace-nowrap px-4 py-2 rounded-md text-sm font-medium transition-colors min-h-[36px] ${
                tab === i
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t}
              {t === 'Pending Approval' && pendingEntries.length > 0 && (
                <span className="ml-1.5 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {pendingEntries.length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner text="Loading commission data…" />
        </div>
      ) : (
        <>
          {/* Employee own view OR My Team tab */}
          {(!isManager || tab === 0) && (
            <EntriesTable
              entries={entries}
              isManager={isManager}
              onApprove={handleApprove}
              actionLoading={actionLoading}
              showApprove={false}
            />
          )}

          {/* Pending Approval tab */}
          {isManager && tab === 1 && (
            <EntriesTable
              entries={pendingEntries}
              isManager={isManager}
              onApprove={handleApprove}
              actionLoading={actionLoading}
              showApprove={true}
            />
          )}

          {/* Commission Structures tab */}
          {isManager && tab === 2 && (
            <StructuresPanel
              structures={structures}
              onCreateNew={() => setShowStructureModal(true)}
            />
          )}
        </>
      )}

      {/* Modals */}
      <LogCommissionModal
        open={showLogModal}
        onClose={() => setShowLogModal(false)}
        user={user}
        structures={structures}
        employeeList={employeeList}
        onSaved={fetchData}
      />
      <StructureModal
        open={showStructureModal}
        onClose={() => setShowStructureModal(false)}
        onSaved={fetchData}
      />
    </div>
  )
}

// ─── Entries Table ────────────────────────────────────────────────────────────
function EntriesTable({ entries, isManager, onApprove, actionLoading, showApprove }) {
  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm text-center py-16">
        <TrendingUp className="h-10 w-10 mx-auto mb-3 text-gray-300" />
        <p className="text-sm text-gray-500">No commission entries found</p>
        <p className="text-xs text-gray-400 mt-1">Entries will appear here once logged</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
            <tr>
              {isManager && <th className="px-5 py-3 text-left">Employee</th>}
              <th className="px-5 py-3 text-left">Description</th>
              <th className="px-5 py-3 text-left">Month</th>
              <th className="px-5 py-3 text-right">Deal Value</th>
              <th className="px-5 py-3 text-right">Commission</th>
              <th className="px-5 py-3 text-left">Status</th>
              {showApprove && <th className="px-5 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entries.map((entry, i) => (
              <tr key={entry.id ?? i} className="hover:bg-gray-50">
                {isManager && (
                  <td className="px-5 py-3">
                    <div className="font-medium text-gray-900">{entry.employee_name ?? entry.employee_id}</div>
                    <div className="text-xs text-indigo-600 font-mono">{entry.employee_id}</div>
                  </td>
                )}
                <td className="px-5 py-3 text-gray-700">{entry.description ?? '—'}</td>
                <td className="px-5 py-3 text-gray-600">
                  {entry.month ? `${MONTHS[entry.month - 1]} ${entry.year}` : '—'}
                </td>
                <td className="px-5 py-3 text-right text-gray-600">
                  {entry.deal_value ? formatINR(entry.deal_value) : '—'}
                </td>
                <td className="px-5 py-3 text-right font-semibold text-indigo-700">
                  {formatINR(entry.commission_amount ?? 0)}
                </td>
                <td className="px-5 py-3"><StatusBadge status={entry.status ?? 'pending'} /></td>
                {showApprove && (
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onApprove(entry, 'approve')}
                        disabled={!!actionLoading}
                        className="flex items-center gap-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 px-2.5 py-1.5 text-xs font-medium disabled:opacity-60 min-h-[36px]"
                      >
                        <Check className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => onApprove(entry, 'reject')}
                        disabled={!!actionLoading}
                        className="flex items-center gap-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 px-2.5 py-1.5 text-xs font-medium disabled:opacity-60 min-h-[36px]"
                      >
                        <X className="h-3.5 w-3.5" /> Reject
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden divide-y divide-gray-100">
        {entries.map((entry, i) => (
          <div key={entry.id ?? i} className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                {isManager && (
                  <p className="text-xs text-indigo-600 font-mono mb-0.5">{entry.employee_id}</p>
                )}
                <p className="font-medium text-gray-900 text-sm truncate">
                  {entry.description ?? '—'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {entry.month ? `${MONTHS[entry.month - 1]} ${entry.year}` : '—'}
                </p>
              </div>
              <div className="ml-3 text-right flex-shrink-0">
                <p className="font-bold text-indigo-700">{formatINR(entry.commission_amount ?? 0)}</p>
                <div className="mt-1">
                  <StatusBadge status={entry.status ?? 'pending'} />
                </div>
              </div>
            </div>
            {entry.deal_value && (
              <p className="text-xs text-gray-500 mt-2">
                Deal Value: {formatINR(entry.deal_value)}
              </p>
            )}
            {showApprove && (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => onApprove(entry, 'approve')}
                  disabled={!!actionLoading}
                  className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-green-100 text-green-700 px-3 py-2 text-sm font-medium min-h-[44px] disabled:opacity-60"
                >
                  <Check className="h-4 w-4" /> Approve
                </button>
                <button
                  onClick={() => onApprove(entry, 'reject')}
                  disabled={!!actionLoading}
                  className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-red-100 text-red-700 px-3 py-2 text-sm font-medium min-h-[44px] disabled:opacity-60"
                >
                  <X className="h-4 w-4" /> Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Structures Panel ─────────────────────────────────────────────────────────
function StructuresPanel({ structures, onCreateNew }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-semibold text-gray-900">Commission Structures</h2>
        <button
          onClick={onCreateNew}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 min-h-[44px]"
        >
          <Plus className="h-4 w-4" />
          Create Structure
        </button>
      </div>

      {structures.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm text-center py-16">
          <DollarSign className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500">No commission structures defined</p>
          <p className="text-xs text-gray-400 mt-1">Create structures to auto-calculate commissions</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {structures.map((s, i) => (
            <div key={s.id ?? i} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{s.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>
                </div>
                <span className="text-xs bg-indigo-100 text-indigo-700 rounded-full px-2 py-0.5 font-medium capitalize ml-2 flex-shrink-0">
                  {s.type?.replace('_', ' ')}
                </span>
              </div>
              <div className="mt-3 text-sm text-gray-600 space-y-1">
                {s.type === 'flat' && <p>Flat: {formatINR(s.amount)}</p>}
                {s.type === 'percentage' && (
                  <>
                    <p>Rate: {s.rate}%</p>
                    {s.monthly_target && <p>Target: {formatINR(s.monthly_target)}/mo</p>}
                  </>
                )}
                {s.type === 'target_bonus' && (
                  <>
                    <p>Target: {formatINR(s.target)}</p>
                    <p>Bonus: {formatINR(s.bonus)}</p>
                  </>
                )}
                {s.type === 'tiered' && s.tiers && (
                  <p>{s.tiers.length} tier{s.tiers.length !== 1 ? 's' : ''} defined</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
