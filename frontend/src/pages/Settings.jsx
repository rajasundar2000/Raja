import { useState, useEffect } from 'react'
import {
  UserPlus, Bell, Sheet, Info,
  Send, Trash2, CheckCircle, RefreshCw, ChevronDown, ChevronUp, X,
} from 'lucide-react'
import { invitationAPI, announcementAPI, integrationAPI, employees } from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { formatDate } from '../utils/format.js'
import StatusBadge from '../components/StatusBadge.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import toast from 'react-hot-toast'

const ROLES = ['employee', 'manager', 'hr', 'finance', 'super_admin']
const PRIORITIES = ['urgent', 'high', 'normal', 'low']

function priorityBadge(priority) {
  const map = {
    urgent: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    normal: 'bg-blue-100 text-blue-800',
    low: 'bg-gray-100 text-gray-600',
  }
  return map[priority] ?? 'bg-gray-100 text-gray-600'
}

// ── Invite Employees Tab ──────────────────────────────────────────────────────
function InviteTab() {
  const [form, setForm] = useState({ email: '', full_name: '', department: '', designation: '', role: 'employee' })
  const [sending, setSending] = useState(false)
  const [invitations, setInvitations] = useState([])
  const [loadingList, setLoadingList] = useState(true)

  async function fetchInvitations() {
    setLoadingList(true)
    try {
      const res = await invitationAPI.getAll()
      const d = res.data
      setInvitations(d.results ?? d.invitations ?? (Array.isArray(d) ? d : []))
    } catch {
      setInvitations([])
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => { fetchInvitations() }, [])

  async function handleSend(e) {
    e.preventDefault()
    if (!form.email || !form.full_name) { toast.error('Email and Full Name are required'); return }
    setSending(true)
    try {
      await invitationAPI.send(form)
      toast.success(`Invitation sent to ${form.email}`)
      setForm({ email: '', full_name: '', department: '', designation: '', role: 'employee' })
      fetchInvitations()
    } catch (err) {
      toast.error(err.userMessage || 'Failed to send invitation')
    } finally {
      setSending(false)
    }
  }

  async function handleCancel(id) {
    try {
      await invitationAPI.cancel(id)
      toast.success('Invitation cancelled')
      fetchInvitations()
    } catch (err) {
      toast.error(err.userMessage || 'Failed to cancel invitation')
    }
  }

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  return (
    <div className="space-y-6">
      {/* Send invite form */}
      <div className="bg-gray-50 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Send New Invitation</h3>
        <form onSubmit={handleSend} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Email *</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="employee@company.com"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Full Name *</label>
              <input
                type="text"
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                required
                placeholder="John Doe"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Department</label>
              <input
                type="text"
                name="department"
                value={form.department}
                onChange={handleChange}
                placeholder="Engineering, HR, Sales…"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Designation</label>
              <input
                type="text"
                name="designation"
                value={form.designation}
                onChange={handleChange}
                placeholder="Software Engineer, Manager…"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Role *</label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r} className="capitalize">{r.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={sending}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 min-h-[44px]"
          >
            {sending ? (
              <><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Sending…</>
            ) : (
              <><Send className="h-4 w-4" />Send Invitation</>
            )}
          </button>
        </form>
      </div>

      {/* Invitations list */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Sent Invitations</h3>
        {loadingList ? (
          <div className="flex justify-center py-8"><LoadingSpinner size="sm" text="Loading…" /></div>
        ) : invitations.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No invitations sent yet</p>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Role</th>
                    <th className="px-4 py-3 text-left">Sent At</th>
                    <th className="px-4 py-3 text-left">Expires At</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invitations.map((inv, i) => (
                    <tr key={inv.id ?? i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">{inv.email}</td>
                      <td className="px-4 py-3 text-gray-700">{inv.full_name ?? inv.name ?? '—'}</td>
                      <td className="px-4 py-3 capitalize text-gray-600">{inv.role?.replace('_', ' ') ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(inv.created_at ?? inv.sent_at)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(inv.expires_at)}</td>
                      <td className="px-4 py-3"><StatusBadge status={inv.status ?? 'pending'} /></td>
                      <td className="px-4 py-3">
                        {inv.status === 'pending' && (
                          <button
                            onClick={() => handleCancel(inv.id)}
                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium"
                          >
                            <X className="h-3.5 w-3.5" />
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile */}
            <div className="md:hidden space-y-3">
              {invitations.map((inv, i) => (
                <div key={inv.id ?? i} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{inv.email}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{inv.full_name ?? '—'} • {inv.role?.replace('_', ' ') ?? '—'}</p>
                    </div>
                    <StatusBadge status={inv.status ?? 'pending'} />
                  </div>
                  {inv.status === 'pending' && (
                    <button
                      onClick={() => handleCancel(inv.id)}
                      className="mt-2 w-full rounded-lg border border-red-200 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Cancel Invitation
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Announcements Tab ─────────────────────────────────────────────────────────
function AnnouncementsTab() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', priority: 'normal', target_department: '', expires_at: '' })
  const [submitting, setSubmitting] = useState(false)

  async function fetchAnnouncements() {
    setLoading(true)
    try {
      const res = await announcementAPI.getAll()
      const d = res.data
      setAnnouncements(d.results ?? d.announcements ?? (Array.isArray(d) ? d : []))
    } catch {
      setAnnouncements([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAnnouncements() }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.title || !form.content) { toast.error('Title and content are required'); return }
    setSubmitting(true)
    try {
      await announcementAPI.create(form)
      toast.success('Announcement posted!')
      setShowModal(false)
      setForm({ title: '', content: '', priority: 'normal', target_department: '', expires_at: '' })
      fetchAnnouncements()
    } catch (err) {
      toast.error(err.userMessage || 'Failed to post announcement')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this announcement?')) return
    try {
      await announcementAPI.delete(id)
      toast.success('Announcement deleted')
      fetchAnnouncements()
    } catch (err) {
      toast.error(err.userMessage || 'Failed to delete announcement')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Announcements</h3>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors min-h-[44px]"
        >
          <Bell className="h-4 w-4" />
          Post Announcement
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><LoadingSpinner size="sm" text="Loading…" /></div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">No announcements yet</div>
      ) : (
        <div className="space-y-3">
          {announcements.map((ann, i) => (
            <div key={ann.id ?? i} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${priorityBadge(ann.priority)}`}>
                      {ann.priority}
                    </span>
                    {ann.target_department && (
                      <span className="text-xs text-gray-500">{ann.target_department}</span>
                    )}
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">{ann.title}</p>
                  <p className="text-sm text-gray-600 mt-1">{ann.content}</p>
                  {ann.expires_at && (
                    <p className="text-xs text-gray-400 mt-1.5">Expires: {formatDate(ann.expires_at)}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(ann.id)}
                  className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-lg flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Post Announcement</h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  required
                  placeholder="Announcement title"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Content *</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                  required
                  rows={4}
                  placeholder="Announcement message…"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p} className="capitalize">{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Dept.</label>
                  <input
                    type="text"
                    value={form.target_department}
                    onChange={(e) => setForm((p) => ({ ...p, target_department: e.target.value }))}
                    placeholder="All (leave blank)"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Expires At</label>
                <input
                  type="date"
                  value={form.expires_at}
                  onChange={(e) => setForm((p) => ({ ...p, expires_at: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Posting…</> : 'Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Google Sheets Tab ─────────────────────────────────────────────────────────
function GoogleSheetsTab() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [spreadsheetId, setSpreadsheetId] = useState('')
  const [credentialsJson, setCredentialsJson] = useState('')
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState({})
  const [guideOpen, setGuideOpen] = useState(false)
  const LS_KEY = 'gsheets_last_sync'

  function getLastSync(key) {
    try {
      const d = JSON.parse(localStorage.getItem(LS_KEY) || '{}')
      if (!d[key]) return null
      const diff = Math.round((Date.now() - d[key]) / 60000)
      if (diff < 1) return 'just now'
      if (diff < 60) return `${diff} minute${diff > 1 ? 's' : ''} ago`
      return `${Math.round(diff / 60)} hour${Math.round(diff / 60) > 1 ? 's' : ''} ago`
    } catch { return null }
  }

  function setLastSync(key) {
    try {
      const d = JSON.parse(localStorage.getItem(LS_KEY) || '{}')
      d[key] = Date.now()
      localStorage.setItem(LS_KEY, JSON.stringify(d))
    } catch { /* ignore */ }
  }

  async function fetchStatus() {
    setLoading(true)
    try {
      const res = await integrationAPI.getGSheetsStatus()
      setStatus(res.data)
      if (res.data?.spreadsheet_id) setSpreadsheetId(res.data.spreadsheet_id)
    } catch {
      setStatus({ connected: false })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStatus() }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      let creds = undefined
      if (credentialsJson.trim()) {
        creds = JSON.parse(credentialsJson)
      }
      await integrationAPI.configureGSheets({ spreadsheet_id: spreadsheetId, credentials: creds })
      toast.success('Google Sheets configuration saved!')
      fetchStatus()
    } catch (err) {
      if (err.message?.includes('JSON')) {
        toast.error('Invalid JSON in credentials field')
      } else {
        toast.error(err.userMessage || 'Failed to save configuration')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleSync(key, apiFn, label) {
    setSyncing((prev) => ({ ...prev, [key]: true }))
    try {
      await apiFn()
      setLastSync(key)
      toast.success(`${label} synced successfully!`)
    } catch (err) {
      toast.error(err.userMessage || `Failed to sync ${label}`)
    } finally {
      setSyncing((prev) => ({ ...prev, [key]: false }))
    }
  }

  const isConnected = status?.connected

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Status card */}
      {loading ? (
        <div className="flex justify-center py-8"><LoadingSpinner size="sm" text="Checking status…" /></div>
      ) : (
        <div className={`rounded-xl p-4 flex items-center gap-3 ${isConnected ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
          <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${isConnected ? 'bg-green-100' : 'bg-gray-100'}`}>
            <Sheet className={`h-5 w-5 ${isConnected ? 'text-green-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <p className={`font-semibold text-sm ${isConnected ? 'text-green-800' : 'text-gray-700'}`}>
              {isConnected ? 'Connected to Google Sheets' : 'Not Configured'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {isConnected ? `Spreadsheet: ${status?.spreadsheet_id ?? '—'}` : 'Set up your Google Sheets integration below'}
            </p>
          </div>
          {isConnected && (
            <span className="ml-auto flex items-center gap-1 text-xs text-green-600 font-medium">
              <CheckCircle className="h-4 w-4" />
              Active
            </span>
          )}
        </div>
      )}

      {/* Configure form */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {isConnected ? 'Update Configuration' : 'Configure Integration'}
        </h3>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Spreadsheet ID *</label>
            <input
              type="text"
              value={spreadsheetId}
              onChange={(e) => setSpreadsheetId(e.target.value)}
              required
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-400 mt-1">Found in the Google Sheets URL after /d/</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Service Account Credentials (JSON)
              {isConnected && <span className="ml-1 text-gray-400 font-normal">(leave blank to keep existing)</span>}
            </label>
            <textarea
              value={credentialsJson}
              onChange={(e) => setCredentialsJson(e.target.value)}
              rows={6}
              placeholder='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-xs font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 min-h-[44px]"
          >
            {saving ? (
              <><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</>
            ) : 'Save Configuration'}
          </button>
        </form>
      </div>

      {/* Sync buttons (only if connected) */}
      {isConnected && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Sync Data</h3>
          <div className="space-y-3">
            {[
              { key: 'employees', label: 'Sync Employees', fn: integrationAPI.syncEmployees },
              { key: 'leaves', label: 'Sync Leave Register (2025)', fn: () => integrationAPI.syncLeaves(2025) },
            ].map(({ key, label, fn }) => (
              <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  {getLastSync(key) && (
                    <p className="text-xs text-gray-400 mt-0.5">Last synced: {getLastSync(key)}</p>
                  )}
                </div>
                <button
                  onClick={() => handleSync(key, fn, label)}
                  disabled={syncing[key]}
                  className="flex items-center gap-2 rounded-xl border border-indigo-200 px-3 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50 min-h-[36px]"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${syncing[key] ? 'animate-spin' : ''}`} />
                  {syncing[key] ? 'Syncing…' : 'Sync'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Setup guide */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setGuideOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
        >
          Step-by-Step Setup Guide
          {guideOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </button>
        {guideOpen && (
          <div className="px-5 pb-5 bg-gray-50">
            <ol className="space-y-3 text-sm text-gray-700">
              {[
                'Go to Google Cloud Console (console.cloud.google.com) and create a new project.',
                'Enable the "Google Sheets API" for your project under APIs & Services.',
                'Go to "Credentials" → "Create Credentials" → "Service Account".',
                'Fill in service account details and click "Create and Continue".',
                'Click on your new service account, go to "Keys" tab → "Add Key" → "JSON".',
                'Download the JSON file — paste its contents in the credentials field above.',
                'In Google Sheets, click "Share" and add the service account email (client_email from JSON) with Editor access.',
                'Copy the Spreadsheet ID from the URL and paste it above.',
              ].map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex-shrink-0 h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}

// ── System Info Tab ────────────────────────────────────────────────────────────
function SystemInfoTab() {
  const [counts, setCounts] = useState({ employees: 0, leaves: 0, payroll: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCounts() {
      try {
        const [empRes] = await Promise.allSettled([
          employees.getAll({ page: 1, page_size: 1 }),
        ])
        if (empRes.status === 'fulfilled') {
          const d = empRes.value.data
          setCounts((prev) => ({ ...prev, employees: d.count ?? d.total ?? (Array.isArray(d) ? d.length : 0) }))
        }
      } catch { /* ignore */ }
      setLoading(false)
    }
    fetchCounts()
  }, [])

  const rows = [
    { label: 'Version', value: '1.0.0' },
    { label: 'Database', value: 'SQLite' },
    { label: 'API URL', value: import.meta.env.VITE_API_URL || 'http://localhost:8000/api' },
    { label: 'App Name', value: import.meta.env.VITE_APP_NAME || 'LeavePayroll' },
    { label: 'Total Employees', value: loading ? '…' : counts.employees.toString() },
  ]

  return (
    <div className="max-w-lg">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">System Information</h3>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {rows.map((row, i) => (
          <div
            key={i}
            className={`flex items-center justify-between px-5 py-3.5 text-sm ${i > 0 ? 'border-t border-gray-100' : ''}`}
          >
            <span className="text-gray-500 font-medium">{row.label}</span>
            <span className="text-gray-900 font-mono text-xs max-w-xs truncate text-right">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'invite', label: 'Invite Employees', icon: UserPlus },
  { id: 'announcements', label: 'Announcements', icon: Bell },
  { id: 'sheets', label: 'Google Sheets', icon: Sheet },
  { id: 'system', label: 'System Info', icon: Info },
]

export default function Settings() {
  const [activeTab, setActiveTab] = useState('invite')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage system configuration and integrations</p>
      </div>

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

        <div className="p-5 sm:p-6">
          {activeTab === 'invite' && <InviteTab />}
          {activeTab === 'announcements' && <AnnouncementsTab />}
          {activeTab === 'sheets' && <GoogleSheetsTab />}
          {activeTab === 'system' && <SystemInfoTab />}
        </div>
      </div>
    </div>
  )
}
