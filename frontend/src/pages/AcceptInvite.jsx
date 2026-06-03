import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { IndianRupee, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { invitationAPI } from '../api.js'

function passwordStrength(password) {
  if (!password) return { level: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  if (score <= 1) return { level: 1, label: 'Weak', color: 'bg-red-500' }
  if (score <= 3) return { level: 2, label: 'Medium', color: 'bg-amber-500' }
  return { level: 3, label: 'Strong', color: 'bg-green-500' }
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
  const [error, setError] = useState('')
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

  const strength = passwordStrength(password)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      await invitationAPI.accept(token, { password, confirm_password: confirmPassword })
      setSuccess(true)
    } catch (err) {
      setError(err.userMessage || 'Failed to create account. The link may have expired.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingInvite) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm text-gray-500">Validating invitation...</p>
        </div>
      </div>
    )
  }

  if (invalidToken) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-14 w-14 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-7 w-7 text-red-600" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid Invitation</h1>
          <p className="text-sm text-gray-500 mb-6">
            This invitation link is invalid or has expired. Please ask your HR team for a new invitation.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-7 w-7 text-green-600" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Account Created!</h1>
          <p className="text-sm text-gray-500 mb-6">
            Welcome to LeavePayroll, {invitation?.full_name}! Your account has been set up successfully. You can now log in with your email and the password you just created.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
            <IndianRupee className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900 leading-tight">LeavePayroll</div>
            <div className="text-xs text-gray-500">Indian HR System</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome, {invitation?.full_name}!
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              You've been invited to join as{' '}
              <span className="font-medium text-indigo-600 capitalize">
                {invitation?.role?.replace('_', ' ')}
              </span>
              {invitation?.department && (
                <> in <span className="font-medium">{invitation.department}</span></>
              )}
            </p>
            <p className="text-xs text-gray-400 mt-1">{invitation?.email}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 pr-10 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Strength indicator */}
              {password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3].map((n) => (
                      <div
                        key={n}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          strength.level >= n ? strength.color : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    Strength:{' '}
                    <span
                      className={
                        strength.level === 1
                          ? 'text-red-600'
                          : strength.level === 2
                          ? 'text-amber-600'
                          : 'text-green-600'
                      }
                    >
                      {strength.label}
                    </span>
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 pr-10 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-xs text-red-600">Passwords do not match.</p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-60 min-h-[44px]"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Already have an account?{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  )
}
