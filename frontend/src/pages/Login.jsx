import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Eye, EyeOff, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const FEATURES = [
  'Smart leave & approval workflows',
  'Payroll with PF, PT & TDS automation',
  'Commission tracking & reports',
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

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel (hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 bg-gradient-to-br from-indigo-900 via-violet-900 to-slate-900 relative overflow-hidden flex-col items-center justify-center p-16">
        {/* Decorative blurred glass orbs */}
        <div className="absolute top-16 left-16 h-48 w-48 rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 rotate-12" />
        <div className="absolute bottom-24 right-12 h-36 w-64 rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 -rotate-6" />
        <div className="absolute top-1/2 right-20 h-24 w-24 rounded-2xl bg-violet-500/20 backdrop-blur-md border border-white/10 rotate-45" />

        {/* Content */}
        <div className="relative z-10 max-w-md text-center">
          {/* Logo */}
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl mb-8">
            <Briefcase className="h-10 w-10 text-white" />
          </div>

          <h1 className="text-5xl font-black text-white mb-3 leading-tight">
            Elite Recruit LLC
          </h1>
          <p className="text-lg text-indigo-300 mb-12">HR Management Portal</p>

          {/* Feature bullets */}
          <div className="space-y-4 text-left">
            {FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </div>
                <span className="text-white/80 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 bg-[#F0F2FF] flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="h-10 w-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-black text-slate-900">Elite Recruit LLC</p>
              <p className="text-xs text-slate-500">HR Management Portal</p>
            </div>
          </div>

          {/* Card */}
          <div className="glass-card p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-slate-900">Welcome back</h2>
              <p className="text-sm text-slate-500 mt-1">Sign in to your account to continue</p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 mb-5">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="input-glass"
                  disabled={loading}
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
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
                    className="input-glass pr-12"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
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
                className="btn-primary w-full justify-center mt-2 min-h-[48px]"
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

          </div>

          <p className="text-center text-slate-400 text-xs mt-6">
            Elite Recruit LLC © {new Date().getFullYear()} — Secure HR Platform
          </p>
        </div>
      </div>
    </div>
  )
}
