import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import {
  LayoutDashboard,
  Users,
  Calendar,
  DollarSign,
  BarChart2,
  Menu,
  X,
  IndianRupee,
  Clock,
  Bell,
  LogOut,
  ChevronDown,
  TrendingUp,
  Settings,
  Receipt,
  User,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const ALL_NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true, roles: null },
  { to: '/employees', label: 'Employees', icon: Users, roles: ['hr', 'super_admin', 'manager'] },
  { to: '/leaves', label: 'Leave Management', icon: Calendar, roles: null },
  { to: '/payroll', label: 'Payroll', icon: DollarSign, roles: ['hr', 'finance', 'super_admin'] },
  { to: '/commission', label: 'Commission', icon: TrendingUp, roles: null },
  { to: '/expenses', label: 'Expenses', icon: Receipt, roles: null },
  { to: '/reports', label: 'Reports', icon: BarChart2, roles: ['hr', 'super_admin', 'manager', 'finance'] },
  { to: '/settings', label: 'Settings', icon: Settings, roles: ['hr', 'super_admin'] },
]

// Bottom nav icons (mobile only): max 5
const BOTTOM_NAV = [
  { to: '/', label: 'Home', icon: LayoutDashboard, exact: true, roles: null },
  { to: '/leaves', label: 'Leaves', icon: Calendar, roles: null },
  { to: '/expenses', label: 'Expenses', icon: Receipt, roles: null },
  { to: '/profile', label: 'Profile', icon: User, roles: null },
]

function LiveClock({ timezone, label }) {
  const [time, setTime] = useState('')
  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString('en-IN', {
          timeZone: timezone,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      )
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [timezone])
  return (
    <div className="text-center">
      <div className="text-xs font-bold text-indigo-200 uppercase tracking-wider">{label}</div>
      <div className="text-xs text-white font-mono">{time}</div>
    </div>
  )
}

function UserInitials({ name }) {
  if (!name) return 'HR'
  const parts = name.trim().split(' ')
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
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

function hasAccess(roles, userRole) {
  if (!roles) return true
  if (!userRole) return false
  return roles.includes(userRole)
}

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const userMenuRef = useRef(null)

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  })

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  // Close user menu on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const filteredNav = ALL_NAV.filter((item) => hasAccess(item.roles, user?.role))
  const filteredBottomNav = BOTTOM_NAV.filter((item) => hasAccess(item.roles, user?.role))

  const initials = user ? UserInitials({ name: user.full_name }) : 'HR'

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-indigo-900 transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2.5 border-b border-indigo-800 px-5 flex-shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500">
            <IndianRupee className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-tight">LeavePayroll</div>
            <div className="text-xs text-indigo-300">Indian HR System</div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto text-indigo-300 lg:hidden p-1 rounded"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {filteredNav.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-700 text-white'
                    : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
                }`
              }
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Clocks */}
        <div className="border-t border-indigo-800 px-3 py-3 flex-shrink-0">
          <div className="flex items-center gap-1.5 mb-2">
            <Clock className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-xs text-indigo-400">Live Time</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <LiveClock timezone="Asia/Kolkata" label="IST" />
            <LiveClock timezone="America/New_York" label="EST" />
          </div>
        </div>

        {/* Date */}
        <div className="border-t border-indigo-800 px-4 py-2 flex-shrink-0">
          <p className="text-xs text-indigo-400">{today}</p>
          <p className="text-xs text-indigo-500 mt-0.5">Financial Year 2025–26</p>
        </div>

        {/* User profile (sidebar bottom) */}
        <div className="border-t border-indigo-800 px-4 py-4 flex-shrink-0">
          <NavLink
            to="/profile"
            className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-indigo-800 transition-colors group"
          >
            <div className="relative h-9 w-9 flex-shrink-0">
              <div className="h-9 w-9 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-bold">
                {initials}
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 text-[9px] font-bold px-1 rounded-full leading-tight ${roleBadgeColor(user?.role)}`}>
                {(user?.role ?? 'emp').slice(0, 3)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.full_name ?? 'User'}
              </p>
              <p className="text-xs text-indigo-400 group-hover:text-indigo-300">View Profile</p>
            </div>
            <button
              onClick={(e) => { e.preventDefault(); handleLogout() }}
              className="p-1.5 text-indigo-300 hover:text-white hover:bg-indigo-700 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </NavLink>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* ── Top header (visible on all sizes) ── */}
        <header className="flex h-16 items-center gap-3 border-b border-gray-200 bg-white px-4 sm:px-6 flex-shrink-0">
          {/* Hamburger (mobile only) */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Title (mobile center) / Breadcrumb (desktop) */}
          <div className="flex-1 text-center lg:text-left">
            <span className="font-semibold text-gray-900 lg:hidden text-base">LeavePayroll</span>
            <nav className="hidden lg:block text-sm text-gray-500">
              {location.pathname === '/' ? (
                <span className="font-medium text-gray-900">Dashboard</span>
              ) : (
                <span className="font-medium text-gray-900 capitalize">
                  {location.pathname.split('/').filter(Boolean).join(' / ')}
                </span>
              )}
            </nav>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* System Online badge (desktop only) */}
            <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-indigo-700 hidden md:inline">System Online</span>
            </div>

            {/* Notification bell */}
            <button
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center relative"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
            </button>

            {/* User avatar + dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 transition-colors min-h-[44px]"
                aria-label="User menu"
              >
                <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                  {initials}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-gray-900 leading-tight">
                    {user?.full_name ?? 'User'}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role ?? 'employee'}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400 hidden sm:block" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">{user?.full_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
                    <span
                      className={`inline-block mt-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${roleBadgeColor(user?.role)}`}
                    >
                      {user?.role}
                    </span>
                  </div>
                  <NavLink
                    to="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User className="h-4 w-4" />
                    My Profile
                  </NavLink>
                  {['hr', 'super_admin'].includes(user?.role) && (
                    <NavLink
                      to="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </NavLink>
                  )}
                  <div className="border-t border-gray-100 mt-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 lg:pb-6">
          {children}
        </main>

        {/* ── Mobile bottom navigation ── */}
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 flex items-stretch"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {filteredBottomNav.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-2 min-h-[56px] text-xs font-medium transition-colors gap-1 ${
                  isActive ? 'text-indigo-600' : 'text-gray-500 hover:text-indigo-500'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1 rounded-lg ${isActive ? 'bg-indigo-100' : ''}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="leading-none">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
