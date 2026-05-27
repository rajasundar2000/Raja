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
import Commission from './pages/Commission.jsx'

export default function App() {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<Login />} />

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
                    <ProtectedRoute allowedRoles={['hr', 'super_admin', 'manager']}>
                      <EmployeeList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/employees/:id"
                  element={
                    <ProtectedRoute allowedRoles={['hr', 'super_admin', 'manager']}>
                      <EmployeeDetail />
                    </ProtectedRoute>
                  }
                />

                <Route path="/leaves" element={<LeaveManagement />} />
                <Route path="/leaves/request" element={<LeaveRequest />} />

                <Route
                  path="/payroll"
                  element={
                    <ProtectedRoute allowedRoles={['hr', 'finance', 'super_admin']}>
                      <PayrollManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/payroll/:id"
                  element={
                    <ProtectedRoute allowedRoles={['hr', 'finance', 'super_admin']}>
                      <PayrollDetail />
                    </ProtectedRoute>
                  }
                />

                <Route path="/commission" element={<Commission />} />

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
