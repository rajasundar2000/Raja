import { NavLink, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Users,
  Calendar,
  DollarSign,
  BarChart2,
  Settings,
  Menu,
  X,
  IndianRupee,
  Clock,
} from 'lucide-react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/employees', label: 'Employees', icon: Users },
  { to: '/leaves', label: 'Leave Management', icon: Calendar },
  { to: '/payroll', label: 'Payroll', icon: DollarSign },
  { to: '/reports', label: 'Reports', icon: BarChart2 },
]

function Clock2({ timezone, label }) {
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

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  })

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-indigo-900 transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2.5 border-b border-indigo-800 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500">
            <IndianRupee className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-tight">LeavePayroll</div>
            <div className="text-xs text-indigo-300">Indian HR System</div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto text-indigo-300 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              onClick={() => setSidebarOpen(false)}
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
        <div className="border-t border-indigo-800 px-3 py-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Clock className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-xs text-indigo-400">Live Time</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Clock2 timezone="Asia/Kolkata" label="IST" />
            <Clock2 timezone="America/New_York" label="EST" />
          </div>
        </div>

        {/* Date */}
        <div className="border-t border-indigo-800 px-4 py-3">
          <p className="text-xs text-indigo-400">{today}</p>
          <p className="text-xs text-indigo-500 mt-0.5">Financial Year 2025–26</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header */}
        <header className="flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1">
            <nav className="text-sm text-gray-500">
              {location.pathname === '/' ? (
                <span className="font-medium text-gray-900">Dashboard</span>
              ) : (
                <span className="font-medium text-gray-900 capitalize">
                  {location.pathname.split('/').filter(Boolean).join(' / ')}
                </span>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-indigo-700">System Online</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">
              HR
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
