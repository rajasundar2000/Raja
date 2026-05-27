import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const DEMO_CREDENTIALS = [
  { name: 'Raj Kumar', email: 'raj.kumar@company.com', password: 'Employee@123' },
  { name: 'Priya Singh', email: 'priya.singh@company.com', password: 'Employee@123' },
  { name: 'Amit Verma', email: 'amit.verma@company.com', password: 'Employee@123' },
]

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter both email and password.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.userMessage ||
        err?.message ||
        'Invalid credentials. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  function fillCredential(cred) {
    setEmail(cred.email)
    setPassword(cred.password)
    setError('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-indigo-900 px-8 pt-10 pb-8 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-700 shadow-lg mb-4">
              <Briefcase className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">LeavePayroll</h1>
            <p className="text-indigo-300 text-sm mt-1">Indian HR Management System</p>
          </div>

          {/* Form */}
          <div className="px-8 py-8 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Sign in to your account</h2>
              <p className="text-sm text-gray-500 mt-0.5">Enter your credentials to continue</p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                  disabled={loading}
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-base font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 min-h-[48px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  'Login'
                )}
              </button>
            </form>

            {/* Demo Credentials */}
            <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-4">
              <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-3">
                Default Credentials
              </p>
              <div className="space-y-2">
                {DEMO_CREDENTIALS.map((cred) => (
                  <button
                    key={cred.email}
                    type="button"
                    onClick={() => fillCredential(cred)}
                    disabled={loading}
                    className="w-full text-left rounded-md px-3 py-2.5 hover:bg-indigo-100 transition-colors disabled:opacity-50 group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-indigo-900">{cred.name}</p>
                        <p className="text-xs text-indigo-600 mt-0.5">{cred.email}</p>
                      </div>
                      <span className="text-xs text-indigo-400 group-hover:text-indigo-600 font-mono">
                        Employee@123
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-indigo-500 mt-3 text-center">
                Click any row to auto-fill credentials
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-indigo-400 text-xs mt-6">
          LeavePayroll © {new Date().getFullYear()} — Secure HR Platform
        </p>
      </div>
    </div>
  )
}
