import { useState, useEffect } from 'react'
import { User, Shield, FileText, Calendar, Eye, EyeOff, Download, X } from 'lucide-react'
import { profileAPI } from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { formatINR, formatDate } from '../utils/format.js'
import StatusBadge from '../components/StatusBadge.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import toast from 'react-hot-toast'

function getPasswordStrength(password) {
  if (!password) return { level: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  if (score <= 1) return { level: 1, label: 'Weak', color: 'bg-red-500' }
  if (score <= 3) return { level: 2, label: 'Medium', color: 'bg-yellow-500' }
  return { level: 3, label: 'Strong', color: 'bg-green-500' }
}

function PasswordStrengthBar({ password }) {
  const strength = getPasswordStrength(password)
  if (!password) return null
  const widths = { 1: 'w-1/3', 2: 'w-2/3', 3: 'w-full' }
  const textColors = { 1: 'text-red-600', 2: 'text-yellow-600', 3: 'text-green-600' }
  return (
    <div className="mt-1.5">
      <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${widths[strength.level]}`} />
      </div>
      <p className={`text-xs mt-1 font-medium ${textColors[strength.level]}`}>{strength.label} password</p>
    </div>
  )
}

function roleBadgeColor(role) {
  const map = {
    super_admin: 'bg-purple-100 text-purple-800',
    hr: 'bg-blue-100 text-blue-800',
    manager: 'bg-green-100 text-green-800',
    finance: 'bg-amber-100 text-amber-800',
    employee: 'bg-gray-100 text-gray-700',
  }
  return map[role] ?? 'bg-gray-100 text-gray-700'
}

function UserInitials(name) {
  if (!name) return 'U'
  const parts = name.trim().split(' ')
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

// ── Salary Slip Modal ──────────────────────────────────────────────────────────
function SalarySlipModal({ slip, onClose }) {
  if (!slip) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Salary Slip — {slip.month_name ?? slip.period ?? ''}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Gross Pay</p>
              <p className="font-bold text-gray-900">{formatINR(slip.gross_pay ?? slip.gross_salary ?? 0)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Net Pay</p>
              <p className="font-bold text-green-700">{formatINR(slip.net_pay ?? slip.net_salary ?? 0)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Basic Salary</p>
              <p className="font-semibold text-gray-900">{formatINR(slip.basic_salary ?? 0)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Total Deductions</p>
              <p className="font-semibold text-red-600">{formatINR(slip.total_deductions ?? 0)}</p>
            </div>
          </div>
          {slip.allowances && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Allowances</p>
              <div className="space-y-1">
                {Object.entries(slip.allowances).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-gray-600 capitalize">{k.replace(/_/g, ' ')}</span>
                    <span className="font-medium text-gray-900">{formatINR(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-gray-100 px-5 py-4 flex gap-3">
          <button
            onClick={() => toast('Download feature coming soon', { icon: '📄' })}
            className="flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tabs ───────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'info', label: 'Personal Info', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'leaves', label: 'Leave Summary', icon: Calendar },
]

export default function Profile() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('info')

  // Personal info state
  const [profile, setProfile] = useState(null)
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [savingInfo, setSavingInfo] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(true)

  // Security state
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [savingPwd, setSavingPwd] = useState(false)

  // Documents state
  const [salarySlips, setSalarySlips] = useState([])
  const [loadingSlips, setLoadingSlips] = useState(false)
  const [selectedSlip, setSelectedSlip] = useState(null)

  // Leave state
  const [leaveBalance, setLeaveBalance] = useState([])
  const [recentLeaves, setRecentLeaves] = useState([])
  const [loadingLeaves, setLoadingLeaves] = useState(false)

  useEffect(() => {
    async function fetchProfile() {
      setLoadingProfile(true)
      try {
        const res = await profileAPI.get()
        const d = res.data
        setProfile(d)
        setPhone(d.phone ?? d.phone_number ?? '')
        setAddress(d.address ?? '')
      } catch {
        // fall back to auth context user
        if (user) {
          setProfile(user)
          setPhone(user.phone ?? '')
          setAddress(user.address ?? '')
        }
      } finally {
        setLoadingProfile(false)
      }
    }
    fetchProfile()
  }, [user])

  useEffect(() => {
    if (activeTab === 'documents' && salarySlips.length === 0) {
      setLoadingSlips(true)
      profileAPI.getSalarySlips()
        .then((res) => {
          const d = res.data
          setSalarySlips(d.results ?? d.slips ?? (Array.isArray(d) ? d : []))
        })
        .catch(() => setSalarySlips([]))
        .finally(() => setLoadingSlips(false))
    }
    if (activeTab === 'leaves' && leaveBalance.length === 0) {
      setLoadingLeaves(true)
      Promise.allSettled([profileAPI.getLeaveBalance()])
        .then(([balRes]) => {
          if (balRes.status === 'fulfilled') {
            const d = balRes.value.data
            setLeaveBalance(d.balances ?? d.data ?? (Array.isArray(d) ? d : []))
            setRecentLeaves(d.recent_requests ?? d.recent ?? [])
          }
        })
        .finally(() => setLoadingLeaves(false))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  async function handleSaveInfo(e) {
    e.preventDefault()
    setSavingInfo(true)
    try {
      await profileAPI.update({ phone_number: phone, address })
      toast.success('Profile updated successfully')
    } catch (err) {
      toast.error(err.userMessage || 'Failed to update profile')
    } finally {
      setSavingInfo(false)
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    if (newPwd.length < 8) {
      toast.error('New password must be at least 8 characters')
      return
    }
    if (newPwd !== confirmPwd) {
      toast.error('Passwords do not match')
      return
    }
    setSavingPwd(true)
    try {
      await profileAPI.changePassword({
        current_password: currentPwd,
        new_password: newPwd,
        confirm_password: confirmPwd,
      })
      toast.success('Password changed successfully')
      setCurrentPwd('')
      setNewPwd('')
      setConfirmPwd('')
    } catch (err) {
      toast.error(err.userMessage || 'Failed to change password')
    } finally {
      setSavingPwd(false)
    }
  }

  const displayUser = profile ?? user
  const initials = UserInitials(displayUser?.full_name)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            {loadingProfile ? (
              <div className="space-y-2">
                <div className="h-5 w-40 bg-gray-100 animate-pulse rounded" />
                <div className="h-4 w-56 bg-gray-100 animate-pulse rounded" />
              </div>
            ) : (
              <>
                <h1 className="text-lg font-bold text-gray-900 truncate">
                  {displayUser?.full_name ?? 'User'}
                </h1>
                <p className="text-sm text-gray-500 truncate">{displayUser?.email}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${roleBadgeColor(displayUser?.role)}`}>
                    {displayUser?.role ?? 'employee'}
                  </span>
                  {displayUser?.employee_id && (
                    <span className="text-xs text-gray-400">ID: {displayUser.employee_id}</span>
                  )}
                  {displayUser?.department && (
                    <span className="text-xs text-gray-400">{displayUser.department}</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5 sm:p-6">
          {/* ── Personal Info ── */}
          {activeTab === 'info' && (
            <form onSubmit={handleSaveInfo} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <input
                    readOnly
                    value={displayUser?.full_name ?? ''}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    readOnly
                    value={displayUser?.email ?? ''}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Employee ID</label>
                  <input
                    readOnly
                    value={displayUser?.employee_id ?? ''}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
                  <input
                    readOnly
                    value={displayUser?.department ?? '—'}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Designation</label>
                  <input
                    readOnly
                    value={displayUser?.designation ?? '—'}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  placeholder="Your residential address"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingInfo}
                  className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2 min-h-[44px]"
                >
                  {savingInfo ? (
                    <><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</>
                  ) : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {/* ── Security ── */}
          {activeTab === 'security' && (
            <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Change Password</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 pr-10 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button type="button" onClick={() => setShowCurrent((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    required
                    minLength={8}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 pr-10 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <PasswordStrengthBar password={newPwd} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    required
                    className={`w-full rounded-xl border px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-1 ${
                      confirmPwd && confirmPwd !== newPwd
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                    }`}
                  />
                  <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPwd && confirmPwd !== newPwd && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>
              <button
                type="submit"
                disabled={savingPwd}
                className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
              >
                {savingPwd ? (
                  <><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Changing Password…</>
                ) : 'Update Password'}
              </button>
            </form>
          )}

          {/* ── Documents ── */}
          {activeTab === 'documents' && (
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-4">Salary Slips</h3>
              {loadingSlips ? (
                <div className="flex justify-center py-10"><LoadingSpinner text="Loading slips…" /></div>
              ) : salarySlips.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">No salary slips available</div>
              ) : (
                <>
                  {/* Desktop */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3 text-left">Period</th>
                          <th className="px-4 py-3 text-right">Gross Pay</th>
                          <th className="px-4 py-3 text-right">Net Pay</th>
                          <th className="px-4 py-3 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {salarySlips.map((slip, i) => (
                          <tr key={slip.id ?? i} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {slip.month_name ?? slip.period ?? `Slip ${i + 1}`}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600">
                              {formatINR(slip.gross_pay ?? slip.gross_salary ?? 0)}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-green-700">
                              {formatINR(slip.net_pay ?? slip.net_salary ?? 0)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setSelectedSlip(slip)}
                                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => toast('Download feature coming soon', { icon: '📄' })}
                                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  Download
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Mobile */}
                  <div className="md:hidden space-y-3">
                    {salarySlips.map((slip, i) => (
                      <div key={slip.id ?? i} className="bg-gray-50 rounded-xl p-4 flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">
                            {slip.month_name ?? slip.period ?? `Slip ${i + 1}`}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Net: {formatINR(slip.net_pay ?? slip.net_salary ?? 0)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedSlip(slip)}
                            className="text-xs text-indigo-600 font-medium px-3 py-1.5 bg-indigo-50 rounded-lg"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {selectedSlip && (
                <SalarySlipModal slip={selectedSlip} onClose={() => setSelectedSlip(null)} />
              )}
            </div>
          )}

          {/* ── Leave Summary ── */}
          {activeTab === 'leaves' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-3">Leave Balance</h3>
                {loadingLeaves ? (
                  <div className="flex justify-center py-8"><LoadingSpinner size="sm" text="Loading…" /></div>
                ) : leaveBalance.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No leave balance data</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {leaveBalance.map((b, i) => (
                      <div key={b.leave_type_id ?? i} className="bg-gray-50 rounded-xl p-4 text-center">
                        <p className="text-xs text-gray-500 mb-1 truncate">
                          {b.leave_type_name ?? b.leave_type ?? `Type ${i + 1}`}
                        </p>
                        <p className="text-2xl font-bold text-indigo-600">
                          {b.available ?? b.remaining ?? 0}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          of {b.total_allotted ?? b.total ?? 0} days
                        </p>
                        <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{
                              width: `${Math.min(100, ((b.used ?? b.taken ?? 0) / Math.max(1, b.total_allotted ?? b.total ?? 1)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {recentLeaves.length > 0 && (
                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-3">Recent Leave Requests</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3 text-left">Type</th>
                          <th className="px-4 py-3 text-left">From</th>
                          <th className="px-4 py-3 text-left">Days</th>
                          <th className="px-4 py-3 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {recentLeaves.slice(0, 8).map((req, i) => (
                          <tr key={req.id ?? i} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-700">{req.leave_type_name ?? req.leave_type ?? '—'}</td>
                            <td className="px-4 py-3 text-gray-600">{formatDate(req.from_date ?? req.start_date)}</td>
                            <td className="px-4 py-3 text-gray-600">{req.working_days ?? req.days ?? '—'}</td>
                            <td className="px-4 py-3"><StatusBadge status={req.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
