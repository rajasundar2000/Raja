import { useState, useEffect } from 'react'
import { PlusCircle, X, CheckCircle, XCircle, Receipt } from 'lucide-react'
import { expenseAPI } from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { formatINR, formatDate } from '../utils/format.js'
import StatusBadge from '../components/StatusBadge.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import toast from 'react-hot-toast'

const EXPENSE_CATEGORIES = [
  'Travel', 'Accommodation', 'Food', 'Communication',
  'Office Supplies', 'Medical', 'Training', 'Client Entertainment', 'Other',
]

function StatCard({ label, value, color = 'indigo' }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-700',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
  }
  return (
    <div className={`rounded-xl p-4 ${colors[color]}`}>
      <p className="text-xs font-medium opacity-75 mb-1">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  )
}

// ── Submit Expense Modal ───────────────────────────────────────────────────────
function SubmitExpenseModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    category: '',
    title: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    description: '',
  })
  const [submitting, setSubmitting] = useState(false)

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.category) { toast.error('Please select a category'); return }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Enter a valid amount'); return }
    setSubmitting(true)
    try {
      await expenseAPI.create({
        ...form,
        amount: parseFloat(form.amount),
      })
      toast.success('Expense claim submitted!')
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err.userMessage || 'Failed to submit expense')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Submit Expense Claim</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Category *</label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Select category</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (₹) *</label>
              <input
                type="number"
                name="amount"
                value={form.amount}
                onChange={handleChange}
                required
                min="1"
                step="0.01"
                placeholder="0.00"
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              placeholder="Brief title for the expense"
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Expense Date *</label>
            <input
              type="date"
              name="expense_date"
              value={form.expense_date}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              placeholder="Additional details…"
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Submitting…</>
              ) : 'Submit Claim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Approve/Reject Modal ──────────────────────────────────────────────────────
function ApproveRejectModal({ expense, onClose, onSuccess }) {
  const [action, setAction] = useState('approve')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (action === 'reject' && !reason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }
    setSubmitting(true)
    try {
      await expenseAPI.approve(expense.id, {
        action,
        rejection_reason: action === 'reject' ? reason : undefined,
      })
      toast.success(`Expense ${action === 'approve' ? 'approved' : 'rejected'} successfully`)
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err.userMessage || 'Failed to process expense')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Review Expense</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">
          {/* Expense details */}
          <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Employee</span>
              <span className="font-medium text-gray-900">{expense.employee_name ?? expense.employee_id ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Category</span>
              <span className="font-medium text-gray-900">{expense.category ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Title</span>
              <span className="font-medium text-gray-900">{expense.title ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Amount</span>
              <span className="font-bold text-indigo-700">{formatINR(expense.amount ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Date</span>
              <span className="font-medium text-gray-900">{formatDate(expense.expense_date)}</span>
            </div>
            {expense.description && (
              <div>
                <span className="text-gray-500">Notes: </span>
                <span className="text-gray-700">{expense.description}</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setAction('approve')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-medium transition-colors ${
                  action === 'approve'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <CheckCircle className="h-4 w-4" />
                Approve
              </button>
              <button
                type="button"
                onClick={() => setAction('reject')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-medium transition-colors ${
                  action === 'reject'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <XCircle className="h-4 w-4" />
                Reject
              </button>
            </div>
            {action === 'reject' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Rejection Reason *</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  rows={3}
                  placeholder="Please explain why the claim is being rejected…"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
                />
              </div>
            )}
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                  action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {submitting ? (
                  <><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Processing…</>
                ) : action === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── Expense Table / Cards ─────────────────────────────────────────────────────
function ExpenseList({ expenses, canApprove, onApprove, loading }) {
  if (loading) {
    return <div className="flex justify-center py-12"><LoadingSpinner text="Loading expenses…" /></div>
  }
  if (expenses.length === 0) {
    return (
      <div className="text-center py-12">
        <Receipt className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">No expense claims found</p>
      </div>
    )
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
            <tr>
              {canApprove && <th className="px-4 py-3 text-left">Employee</th>}
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-left">Status</th>
              {canApprove && <th className="px-4 py-3 text-left">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {expenses.map((exp, i) => (
              <tr key={exp.id ?? i} className="hover:bg-gray-50">
                {canApprove && (
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {exp.employee_name ?? exp.employee_id ?? '—'}
                  </td>
                )}
                <td className="px-4 py-3 text-gray-600">{exp.category ?? '—'}</td>
                <td className="px-4 py-3 text-gray-800 font-medium">{exp.title ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{formatDate(exp.expense_date)}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatINR(exp.amount ?? 0)}</td>
                <td className="px-4 py-3"><StatusBadge status={exp.status ?? 'pending'} /></td>
                {canApprove && (
                  <td className="px-4 py-3">
                    {exp.status === 'pending' && (
                      <button
                        onClick={() => onApprove(exp)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Review
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-gray-100">
        {expenses.map((exp, i) => (
          <div key={exp.id ?? i} className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1 min-w-0 mr-3">
                <p className="font-semibold text-gray-900 text-sm truncate">{exp.title ?? '—'}</p>
                {canApprove && (
                  <p className="text-xs text-indigo-600 font-medium mt-0.5">{exp.employee_name ?? exp.employee_id ?? '—'}</p>
                )}
                <p className="text-xs text-gray-500 mt-0.5">{exp.category ?? '—'} • {formatDate(exp.expense_date)}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-gray-900">{formatINR(exp.amount ?? 0)}</p>
                <div className="mt-1"><StatusBadge status={exp.status ?? 'pending'} /></div>
              </div>
            </div>
            {canApprove && exp.status === 'pending' && (
              <button
                onClick={() => onApprove(exp)}
                className="w-full mt-2 rounded-lg border border-indigo-200 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                Review
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Expenses() {
  const { user } = useAuth()
  const isManager = ['hr', 'super_admin', 'manager'].includes(user?.role)
  const isHR = ['hr', 'super_admin'].includes(user?.role)

  const TABS = [
    { id: 'mine', label: 'My Claims' },
    ...(isManager ? [{ id: 'pending', label: 'Pending Approval' }] : []),
    ...(isHR ? [{ id: 'all', label: 'All Claims' }] : []),
  ]

  const [activeTab, setActiveTab] = useState('mine')
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [reviewExpense, setReviewExpense] = useState(null)

  const [myExpenses, setMyExpenses] = useState([])
  const [pendingExpenses, setPendingExpenses] = useState([])
  const [allExpenses, setAllExpenses] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  const currentYear = new Date().getFullYear()

  async function fetchExpenses() {
    setLoading(true)
    try {
      const calls = [
        expenseAPI.getAll({ my: true }),
        expenseAPI.getSummary({ year: currentYear }),
        ...(isManager ? [expenseAPI.getAll({ status: 'pending' })] : []),
        ...(isHR ? [expenseAPI.getAll({})] : []),
      ]
      const results = await Promise.allSettled(calls)

      if (results[0]?.status === 'fulfilled') {
        const d = results[0].value.data
        setMyExpenses(d.items ?? d.results ?? d.data ?? (Array.isArray(d) ? d : []))
      }
      if (results[1]?.status === 'fulfilled') {
        setSummary(results[1].value.data)
      }
      if (isManager && results[2]?.status === 'fulfilled') {
        const d = results[2].value.data
        setPendingExpenses(d.items ?? d.results ?? d.data ?? (Array.isArray(d) ? d : []))
      }
      if (isHR && results[isManager ? 3 : 2]?.status === 'fulfilled') {
        const d = results[isManager ? 3 : 2].value.data
        setAllExpenses(d.items ?? d.results ?? d.data ?? (Array.isArray(d) ? d : []))
      }
    } catch {
      toast.error('Failed to load expense data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchExpenses() }, [])

  const claimed = summary?.total_claimed ?? myExpenses.reduce((s, e) => s + parseFloat(e.amount ?? 0), 0)
  const approved = summary?.total_approved ?? myExpenses.filter((e) => e.status === 'approved').reduce((s, e) => s + parseFloat(e.amount ?? 0), 0)
  const pending = summary?.total_pending ?? myExpenses.filter((e) => e.status === 'pending').reduce((s, e) => s + parseFloat(e.amount ?? 0), 0)
  const rejected = summary?.total_rejected ?? myExpenses.filter((e) => e.status === 'rejected').reduce((s, e) => s + parseFloat(e.amount ?? 0), 0)

  const currentExpenses = activeTab === 'mine' ? myExpenses : activeTab === 'pending' ? pendingExpenses : allExpenses

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Claims</h1>
          <p className="text-sm text-gray-500 mt-0.5">FY {currentYear}–{(currentYear + 1).toString().slice(2)}</p>
        </div>
        <button
          onClick={() => setShowSubmitModal(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors min-h-[44px]"
        >
          <PlusCircle className="h-4 w-4" />
          <span className="hidden sm:inline">Submit Claim</span>
          <span className="sm:hidden">Submit</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Claimed" value={formatINR(claimed)} color="indigo" />
        <StatCard label="Approved" value={formatINR(approved)} color="green" />
        <StatCard label="Pending" value={formatINR(pending)} color="amber" />
        <StatCard label="Rejected" value={formatINR(rejected)} color="red" />
      </div>

      {/* Tabs + Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
              {id === 'pending' && pendingExpenses.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                  {pendingExpenses.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <ExpenseList
          expenses={currentExpenses}
          canApprove={activeTab !== 'mine' && isManager}
          onApprove={setReviewExpense}
          loading={loading}
        />
      </div>

      {/* Modals */}
      {showSubmitModal && (
        <SubmitExpenseModal
          onClose={() => setShowSubmitModal(false)}
          onSuccess={fetchExpenses}
        />
      )}
      {reviewExpense && (
        <ApproveRejectModal
          expense={reviewExpense}
          onClose={() => setReviewExpense(null)}
          onSuccess={fetchExpenses}
        />
      )}
    </div>
  )
}
