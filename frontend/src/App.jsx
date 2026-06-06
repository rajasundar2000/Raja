import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import EmployeeList from './pages/EmployeeList.jsx'
import EmployeeDetail from './pages/EmployeeDetail.jsx'
import LeaveManagement from './pages/LeaveManagement.jsx'
import LeaveRequest from './pages/LeaveRequest.jsx'
import PayrollManagement from './pages/PayrollManagement.jsx'
import PayrollDetail from './pages/PayrollDetail.jsx'
import Reports from './pages/Reports.jsx'
import AcceptInvite from './pages/AcceptInvite.jsx'
import Profile from './pages/Profile.jsx'
import Expenses from './pages/Expenses.jsx'
import Settings from './pages/Settings.jsx'

export default function App() {
  return (
    <Routes>
      {/* Public routes — no Layout, no auth required */}
      <Route path="/login" element={<Login />} />
      <Route path="/accept-invite/:token" element={<AcceptInvite />} />

      {/* Protected routes — all wrapped in Layout */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />

                <Route
                  path="/employees"
                  element={
                    <ProtectedRoute allowedRoles={['hr', 'super_admin']}>
                      <EmployeeList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/employees/:id"
                  element={
                    <ProtectedRoute allowedRoles={['hr', 'super_admin']}>
                      <EmployeeDetail />
                    </ProtectedRoute>
                  }
                />

                <Route path="/leaves" element={<LeaveManagement />} />
                <Route path="/leaves/request" element={<LeaveRequest />} />

                <Route path="/payroll" element={<PayrollManagement />} />
                <Route
                  path="/payroll/:id"
                  element={
                    <ProtectedRoute allowedRoles={['hr', 'finance', 'super_admin']}>
                      <PayrollDetail />
                    </ProtectedRoute>
                  }
                />


                <Route path="/profile" element={<Profile />} />

                <Route path="/expenses" element={<Expenses />} />

                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute allowedRoles={['hr', 'super_admin']}>
                      <Settings />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/reports"
                  element={
                    <ProtectedRoute allowedRoles={['hr', 'super_admin', 'manager', 'finance']}>
                      <Reports />
                    </ProtectedRoute>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
