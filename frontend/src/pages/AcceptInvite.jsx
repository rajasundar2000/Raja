import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { IndianRupee, Eye, EyeOff, CheckCircle, AlertCircle, Lock } from 'lucide-react'
import { invitationAPI } from '../api.js'
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
        <div
          className={`h-full rounded-full transition-all duration-300 ${strength.color} ${widths[strength.level]}`}
        />
      </div>
      <p className={`text-xs mt-1 font-medium ${textColors[strength.level]}`}>
        {strength.label} password
      </p>
    </div>
  )
}

export default function AcceptInvite() {
  const { token } = useParams()
  const navigate = useNavigate()

  const [invitation, setInvitation] = useState(null)
  const [loadingInvite, setLoadingInvite] = useState(true)
  const [invalidToken, setInvalidToken] = useState(false)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function validate() {
      try {
        const res = await invitationAPI.validateToken(token)
        setInvitation(res.data)
      } catch {
        setInvalidToken(true)
      } finally {
        setLoadingInvite(false)
      }
    }
    validate()
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setSubmitting(true)
    try {
      await invitationAPI.accept(token, { password, confirm_password: confirmPassword })
      setSuccess(true)
      toast.success('Account created successfully!')
    } catch (err) {
      toast.error(err.userMessage || 'Failed to create account')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingInvite) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Validating invitation…</p>
        </div>
      </div>
    )
  }

  if (invalidToken) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 w-full max-w-md text-center">
          <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid or Expired Invitation</h1>
          <p className="text-gray-500 text-sm mb-6">
            This invitation link is no longer valid. Please contact your HR administrator for a new invitation.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 w-full max-w-md text-center">
          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Account Created!</h1>
          <p className="text-gray-500 text-sm mb-6">
            Your account has been set up successfully. You can now log in with your email and the password you just created.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 w-full max-w-md">
        {/* Header */}
        <div className="bg-indigo-900 rounded-t-2xl px-8 py-6 text-center">
          <div className="flex items-center justify-center gap-2.5 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500">
              <IndianRupee className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">
              {import.meta.env.VITE_APP_NAME || 'LeavePayroll'}
            </span>
          </div>
          <p className="text-indigo-300 text-xs">Indian HR System</p>
        </div>

        {/* Body */}
        <div className="px-8 py-6">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-gray-900">
              Welcome, {invitation?.full_name || invitation?.name || 'there'}!
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              You've been invited to join as{' '}
              <span className="font-medium text-indigo-600 capitalize">
                {invitation?.role || 'employee'}
              </span>
              {invitation?.department && (
                <> in <span className="font-medium">{invitation.department}</span></>
              )}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Setting up account for <span className="font-medium">{invitation?.email}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <Lock className="h-3.5 w-3.5 inline mr-1" />
                Create Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Min. 8 characters"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordStrengthBar password={password} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Re-enter password"
                  className={`w-full rounded-xl border px-4 py-3 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 ${
                    confirmPassword && confirmPassword !== password
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== password && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || !password || !confirmPassword}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[48px]"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating Account…
                </>
              ) : (
                'Create Account & Login'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
