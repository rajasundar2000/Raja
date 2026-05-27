import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import EmployeeList from './pages/EmployeeList.jsx'
import EmployeeDetail from './pages/EmployeeDetail.jsx'
import LeaveManagement from './pages/LeaveManagement.jsx'
import LeaveRequest from './pages/LeaveRequest.jsx'
import PayrollManagement from './pages/PayrollManagement.jsx'
import PayrollDetail from './pages/PayrollDetail.jsx'
import Reports from './pages/Reports.jsx'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/employees" element={<EmployeeList />} />
        <Route path="/employees/:id" element={<EmployeeDetail />} />
        <Route path="/leaves" element={<LeaveManagement />} />
        <Route path="/leaves/request" element={<LeaveRequest />} />
        <Route path="/payroll" element={<PayrollManagement />} />
        <Route path="/payroll/:id" element={<PayrollDetail />} />
        <Route path="/reports" element={<Reports />} />
      </Routes>
    </Layout>
  )
}
