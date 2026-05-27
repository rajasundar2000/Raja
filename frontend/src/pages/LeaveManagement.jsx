import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Filter,
  Check,
  X,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Info,
} from 'lucide-react'
import { leaves } from '../api.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import Modal from '../components/Modal.jsx'
import toast from 'react-hot-toast'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth } from 'date-fns'

const TABS = ['My Leaves', 'Pending Approvals', 'Team Calendar', 'Leave Types']

export default function LeaveManagement() {
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [myLeaves, setMyLeaves] = useState([])
  const [pendingLeaves, setPendingLeaves] = useState([])
  const [leaveTypes, setLeaveTypes] = useState([])
  const [allLeaves, setAllLeaves] = useState([])
  const [holidays, setHolidays] = useState([])
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [approveModal, setApproveModal] = useState(null)
  const [approveComments, setApproveComments] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterStatus) params.status = filterStatus
      if (filterType) params.leave_type = filterType
      if (filterFrom) params.from_date = filterFrom
      if (filterTo) params.to_date = filterTo

      const [myRes, pendRes, typeRes, allRes, holRes] = await Promise.allSettled([
        leaves.getRequests({ ...params, employee_id: 'E001', page_size: 50 }),
        leaves.getRequests({ status: 'submitted', page_size: 50 }),
        leaves.getTypes(),
        leaves.getRequests({ ...params, page_size: 100 }),
        leaves.getHolidays({ year: new Date().getFullYear() }),
      ])

      if (myRes.status === 'fulfilled') {
        const d = myRes.value.data
        setMyLeaves(d.results ?? d.data ?? (Array.isArray(d) ? d : []))
      }
      if (pendRes.status === 'fulfilled') {
        const d = pendRes.value.data
        setPendingLeaves(d.results ?? d.data ?? (Array.isArray(d) ? d : []))
      }
      if (typeRes.status === 'fulfilled') {
        const d = typeRes.value.data
        setLeaveTypes(d.results ?? d.data ?? (Array.isArray(d) ? d : []))
      }
      if (allRes.status === 'fulfilled') {
        const d = allRes.value.data
        setAllLeaves(d.results ?? d.data ?? (Array.isArray(d) ? d : []))
      }
      if (holRes.status === 'fulfilled') {
        const d = holRes.value.data
        setHolidays(d.results ?? d.data ?? (Array.isArray(d) ? d : []))
      }
    } catch {
      toast.error('Failed to load leave data')
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterType, filterFrom, filterTo])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleApprove(action) {
    if (!approveModal) return
    setActionLoading(true)
    try {
      await leaves.approveRequest(approveModal.id, action, approveComments)
      toast.success(`Leave ${action}d successfully!`)
      setApproveModal(null)
      setApproveComments('')
      fetchData()
    } catch (err) {
      toast.error(err.userMessage ?? `Failed to ${action} leave`)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCancel(id) {
    if (!confirm('Cancel this leave request?')) return
    try {
      await leaves.cancelRequest(id)
      toast.success('Leave request cancelled')
      fetchData()
    } catch (err) {
      toast.error(err.userMessage ?? 'Failed to cancel')
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage employee leaves and approvals</p>
        </div>
        <button
          onClick={() => navigate('/leaves/request')}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Apply Leave
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
        <Filter className="h-4 w-4 text-gray-400 self-center" />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Statuses</option>
          {['draft', 'submitted', 'approved', 'rejected', 'cancelled'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Leave Types</option>
          {leaveTypes.map((t) => (
            <option key={t.id} value={t.id}>{t.name ?? t.leave_type_name}</option>
          ))}
        </select>
        <input
          type="date"
          value={filterFrom}
          onChange={(e) => setFilterFrom(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="date"
          value={filterTo}
          onChange={(e) => setFilterTo(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={() => { setFilterStatus(''); setFilterType(''); setFilterFrom(''); setFilterTo('') }}
          className="text-sm text-gray-500 hover:text-red-600"
        >
          Clear
        </button>
        <button
          onClick={fetchData}
          className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 ml-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === i
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
            {i === 1 && pendingLeaves.length > 0 && (
              <span className="ml-1.5 bg-amber-100 text-amber-700 text-xs rounded-full px-1.5 py-0.5">
                {pendingLeaves.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner text="Loading leave data…" />
        </div>
      ) : (
        <>
          {tab === 0 && (
            <LeaveTable
              rows={myLeaves}
              showActions={true}
              onApprove={(r) => { setApproveModal(r); setApproveComments('') }}
              onCancel={handleCancel}
              showApproveBtn={false}
            />
          )}
          {tab === 1 && (
            <LeaveTable
              rows={pendingLeaves}
              showActions={true}
              onApprove={(r) => { setApproveModal(r); setApproveComments('') }}
              onCancel={handleCancel}
              showApproveBtn={true}
            />
          )}
          {tab === 2 && (
            <TeamCalendar leaves={allLeaves} holidays={holidays} />
          )}
          {tab === 3 && (
            <LeaveTypesTab leaveTypes={leaveTypes} />
          )}
        </>
      )}

      {/* Approve/Reject Modal */}
      <Modal
        open={!!approveModal}
        onClose={() => setApproveModal(null)}
        title="Leave Approval"
        size="sm"
      >
        {approveModal && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Employee</span>
                <span className="font-medium">{approveModal.employee_name ?? approveModal.employee_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Leave Type</span>
                <span className="font-medium">{approveModal.leave_type_name ?? approveModal.leave_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Duration</span>
                <span className="font-medium">
                  {approveModal.from_date ?? approveModal.start_date} →{' '}
                  {approveModal.to_date ?? approveModal.end_date}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Working Days</span>
                <span className="font-medium">{approveModal.working_days ?? approveModal.days}</span>
              </div>
              {approveModal.reason && (
                <div>
                  <span className="text-gray-500 block mb-1">Reason:</span>
                  <span className="text-gray-800">{approveModal.reason}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comments (optional)
              </label>
              <textarea
                value={approveComments}
                onChange={(e) => setApproveComments(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Add remarks…"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => handleApprove('reject')}
                disabled={actionLoading}
                className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
              >
                <X className="h-4 w-4" /> Reject
              </button>
              <button
                onClick={() => handleApprove('approve')}
                disabled={actionLoading}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
              >
                {actionLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Approve
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function LeaveTable({ rows, onApprove, onCancel, showApproveBtn }) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm text-center py-16 text-gray-400">
        <Calendar className="h-10 w-10 mx-auto mb-3 text-gray-300" />
        <p className="text-sm">No leave requests found</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
          <tr>
            <th className="px-5 py-3 text-left">Employee</th>
            <th className="px-5 py-3 text-left">Leave Type</th>
            <th className="px-5 py-3 text-left">From</th>
            <th className="px-5 py-3 text-left">To</th>
            <th className="px-5 py-3 text-left">Days</th>
            <th className="px-5 py-3 text-left">Status</th>
            <th className="px-5 py-3 text-left">Applied On</th>
            <th className="px-5 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r, i) => (
            <tr key={r.id ?? i} className="hover:bg-gray-50">
              <td className="px-5 py-3 font-medium text-gray-900">
                {r.employee_name ?? r.employee_id ?? '—'}
              </td>
              <td className="px-5 py-3 text-gray-600">{r.leave_type_name ?? r.leave_type ?? '—'}</td>
              <td className="px-5 py-3 text-gray-600">{r.from_date ?? r.start_date ?? '—'}</td>
              <td className="px-5 py-3 text-gray-600">{r.to_date ?? r.end_date ?? '—'}</td>
              <td className="px-5 py-3 text-gray-600">{r.working_days ?? r.days ?? '—'}</td>
              <td className="px-5 py-3">
                <StatusBadge status={r.status} />
              </td>
              <td className="px-5 py-3 text-gray-400 text-xs">
                {r.applied_on ?? r.created_at?.split('T')[0] ?? '—'}
              </td>
              <td className="px-5 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  {showApproveBtn && r.status === 'submitted' && (
                    <button
                      onClick={() => onApprove(r)}
                      className="text-xs text-green-600 hover:underline font-medium"
                    >
                      Review
                    </button>
                  )}
                  {['draft', 'submitted'].includes(r.status) && (
                    <button
                      onClick={() => onCancel(r.id)}
                      className="text-xs text-red-500 hover:underline font-medium"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TeamCalendar({ leaves, holidays }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Map holiday dates
  const holidayDates = new Set(
    holidays.map((h) => h.date).filter(Boolean)
  )

  // Map leave dates to employee names
  const leaveDates = {}
  leaves.forEach((leave) => {
    const from = leave.from_date ?? leave.start_date
    const to = leave.to_date ?? leave.end_date
    const empName = leave.employee_name ?? leave.employee_id ?? 'Employee'
    if (!from) return
    // Simple approach: mark from_date
    if (!leaveDates[from]) leaveDates[from] = []
    leaveDates[from].push({ name: empName, status: leave.status })
  })

  const startDow = getDay(monthStart) // 0=Sun

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
      {/* Calendar header */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
          className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50"
        >
          <ChevronLeft className="h-4 w-4 text-gray-600" />
        </button>
        <h2 className="text-base font-semibold text-gray-900">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <button
          onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
          className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50"
        >
          <ChevronRight className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4 text-xs text-gray-500">
        <div className="flex items-center gap-1"><div className="h-3 w-3 rounded bg-red-100 border border-red-300" /> Holiday</div>
        <div className="flex items-center gap-1"><div className="h-3 w-3 rounded bg-yellow-100 border border-yellow-300" /> Leave Pending</div>
        <div className="flex items-center gap-1"><div className="h-3 w-3 rounded bg-green-100 border border-green-300" /> Leave Approved</div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for offset */}
        {Array.from({ length: startDow }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const isHoliday = holidayDates.has(dateStr)
          const dayLeaves = leaveDates[dateStr] ?? []
          const isWeekend = getDay(day) === 0 || getDay(day) === 6
          const isToday = dateStr === format(new Date(), 'yyyy-MM-dd')

          return (
            <div
              key={dateStr}
              className={`min-h-16 rounded-lg p-1.5 text-xs border transition-colors ${
                isHoliday
                  ? 'bg-red-50 border-red-200'
                  : isWeekend
                  ? 'bg-gray-50 border-gray-100'
                  : dayLeaves.length > 0
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-white border-gray-100 hover:bg-gray-50'
              } ${isToday ? 'ring-2 ring-indigo-400' : ''}`}
            >
              <div className={`font-semibold ${isToday ? 'text-indigo-600' : isWeekend ? 'text-gray-400' : 'text-gray-700'} mb-1`}>
                {format(day, 'd')}
              </div>
              {isHoliday && (
                <div className="text-red-600 truncate text-xs leading-tight">Holiday</div>
              )}
              {dayLeaves.slice(0, 2).map((l, i) => (
                <div
                  key={i}
                  className={`truncate rounded px-1 text-xs leading-tight mb-0.5 ${
                    l.status === 'approved'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {l.name.split(' ')[0]}
                </div>
              ))}
              {dayLeaves.length > 2 && (
                <div className="text-gray-400 text-xs">+{dayLeaves.length - 2} more</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function LeaveTypesTab({ leaveTypes }) {
  if (leaveTypes.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm text-center py-16 text-gray-400">
        <Info className="h-10 w-10 mx-auto mb-3 text-gray-300" />
        <p className="text-sm">No leave types configured</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {leaveTypes.map((t, i) => (
        <div key={t.id ?? i} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900 text-sm">{t.name ?? t.leave_type_name}</h3>
            <StatusBadge status={t.is_active ? 'active' : 'inactive'} />
          </div>
          <div className="space-y-1 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>Annual Allotment</span>
              <span className="font-medium text-gray-800">{t.annual_allotment ?? t.max_days ?? '—'} days</span>
            </div>
            <div className="flex justify-between">
              <span>Carry Forward</span>
              <span className="font-medium text-gray-800">{t.carry_forward ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between">
              <span>Encashable</span>
              <span className="font-medium text-gray-800">{t.is_encashable ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between">
              <span>Paid Leave</span>
              <span className="font-medium text-gray-800">{t.is_paid !== false ? 'Yes' : 'No'}</span>
            </div>
            {t.description && (
              <p className="text-gray-400 mt-2 border-t pt-2">{t.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
