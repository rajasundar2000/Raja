import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Users,
  Calendar,
  DollarSign,
  BarChart2,
  Menu,
  X,
  Bell,
  LogOut,
  TrendingUp,
  Settings,
  Receipt,
  User,
  Briefcase,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const ALL_NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true, roles: null },
  { to: '/employees', label: 'Employees', icon: Users, roles: ['hr', 'super_admin', 'manager'] },
  { to: '/leaves', label: 'Leave Management', icon: Calendar, roles: null },
  { to: '/payroll', label: 'Payroll', icon: DollarSign, roles: ['hr', 'finance', 'super_admin'] },
  { to: '/expenses', label: 'Expenses', icon: Receipt, roles: null },
  { to: '/reports', label: 'Reports', icon: BarChart2, roles: ['hr', 'super_admin', 'manager', 'finance'] },
  { to: '/settings', label: 'Settings', icon: Settings, roles: ['hr', 'super_admin'] },
]

const BOTTOM_NAV = [
  { to: '/', label: 'Home', icon: LayoutDashboard, exact: true, roles: null },
  { to: '/leaves', label: 'Leaves', icon: Calendar, roles: null },
  { to: '/payroll', label: 'Payroll', icon: DollarSign, roles: null },
  { to: '/expenses', label: 'Expenses', icon: Receipt, roles: null },
  { to: '/profile', label: 'Profile', icon: User, roles: null },
]

function getUserInitials(name) {
  if (!name) return 'HR'
  const parts = name.trim().split(' ')
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

function hasAccess(roles, userRole) {
  if (!roles) return true
  if (!userRole) return false
  return roles.includes(userRole)
}

function SidebarContent({ filteredNav, user, initials, handleLogout, onClose }) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 flex-shrink-0">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
        >
          <Briefcase className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-base font-extrabold leading-tight"
            style={{ background: 'linear-gradient(135deg, #818CF8, #C4B5FD)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            Elite Recruit
          </div>
          <div className="text-[10px] text-slate-500 font-medium tracking-wide">HR Portal</div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white p-1 rounded-lg transition-colors lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        <div
          className="px-4 mt-2 mb-2"
          style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#475569' }}
        >
          Main Menu
        </div>
        {filteredNav.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl mx-2 text-sm font-medium transition-all ${
                isActive
                  ? 'text-white shadow-glow'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`
            }
            style={({ isActive }) =>
              isActive
                ? { background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }
                : {}
            }
          >
            <Icon size={18} className="flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User card */}
      <div className="flex-shrink-0 mx-3 mb-4 mt-2">
        <div className="p-3 rounded-2xl border border-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold"
              style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-tight">
                {user?.full_name ?? 'User'}
              </p>
              <p className="text-xs text-slate-400 capitalize truncate">{user?.role ?? 'employee'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Layout({ children }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const filteredNav = ALL_NAV.filter((item) => hasAccess(item.roles, user?.role))
  const filteredBottomNav = BOTTOM_NAV.filter((item) => hasAccess(item.roles, user?.role))
  const initials = getUserInitials(user?.full_name)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F0F2FF' }}>

      {/* ── Mobile drawer overlay ── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Mobile drawer ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 flex flex-col transition-transform duration-300 ease-in-out lg:hidden ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: '#0F172A' }}
      >
        <SidebarContent
          filteredNav={filteredNav}
          user={user}
          initials={initials}
          handleLogout={handleLogout}
          onClose={() => setDrawerOpen(false)}
        />
      </aside>

      {/* ── Desktop sidebar ── */}
      <aside
        className="hidden lg:flex flex-col w-64 flex-shrink-0 h-full"
        style={{ background: '#0F172A' }}
      >
        <SidebarContent
          filteredNav={filteredNav}
          user={user}
          initials={initials}
          handleLogout={handleLogout}
          onClose={null}
        />
      </aside>

      {/* ── Main content ── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">

        {/* ── Mobile header ── */}
        <header
          className="lg:hidden h-14 flex items-center justify-between px-4 flex-shrink-0 border-b"
          style={{
            background: 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderColor: 'rgba(255,255,255,0.5)',
          }}
        >
          {/* Hamburger */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 rounded-xl text-slate-600 hover:bg-white/60 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Center brand */}
          <span
            className="text-base font-extrabold"
            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            Elite Recruit
          </span>

          {/* Right actions */}
          <div className="flex items-center gap-1.5">
            <button
              className="p-2 rounded-xl text-slate-500 hover:bg-white/60 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center relative"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
            </button>
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
            >
              {initials}
            </div>
          </div>
        </header>

        {/* ── Page content ── */}
        <main
          className="flex-1 overflow-y-auto p-6 lg:p-6 pb-24 lg:pb-6"
          style={{ background: '#F0F2FF' }}
        >
          {children}
        </main>

        {/* ── Mobile bottom nav ── */}
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 z-20 flex items-stretch border-t"
          style={{
            background: 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderColor: '#E2E8F0',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          {filteredBottomNav.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-2 min-h-[56px] text-xs font-semibold transition-colors gap-1 ${
                  isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-500'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`p-1.5 rounded-xl transition-colors ${
                      isActive ? 'bg-indigo-100' : ''
                    }`}
                  >
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
