import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
})

// Initialise auth token from localStorage on app start
const token = localStorage.getItem('auth_token')
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail || error.response?.data?.message || error.message || 'An error occurred'
    return Promise.reject({ ...error, userMessage: message })
  }
)

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  changePassword: (current, next) =>
    api.post('/auth/change-password', { current_password: current, new_password: next }),
  setPassword: (employee_id, new_password) =>
    api.post('/auth/set-password', { employee_id, new_password }),
}

// ─── Employees ────────────────────────────────────────────────────────────────
export const employees = {
  getAll: (params) => api.get('/employees/', { params }),
  getOne: (id) => api.get(`/employees/${id}/`),
  create: (data) => api.post('/employees/', data),
  update: (id, data) => api.patch(`/employees/${id}/`, data),
  getSalaryStructure: (id) => api.get(`/employees/${id}/salary-structure/`),
  setSalaryStructure: (id, data) => api.post(`/employees/${id}/salary-structure/`, data),
}

// ─── Leaves ───────────────────────────────────────────────────────────────────
export const leaves = {
  getTypes: () => api.get('/leaves/types/'),
  getBalance: (empId) => api.get(`/leaves/balance/${empId}/`),
  getRequests: (params) => api.get('/leaves/requests/', { params }),
  createRequest: (data) => api.post('/leaves/requests/', data),
  submitRequest: (id) => api.post(`/leaves/requests/${id}/submit/`),
  cancelRequest: (id) => api.post(`/leaves/requests/${id}/cancel/`),
  approveRequest: (id, action, comments) =>
    api.post(`/leaves/requests/${id}/${action}/`, { comments }),
  getHolidays: (params) => api.get('/leaves/holidays/', { params }),
  getHistory: (empId) => api.get(`/leaves/history/${empId}/`),
}

// ─── Payroll ──────────────────────────────────────────────────────────────────
export const payroll = {
  getCycles: (params) => api.get('/payroll/cycles/', { params }),
  createCycle: (data) => api.post('/payroll/cycles/', data),
  generateSlips: (cycleId) => api.post(`/payroll/cycles/${cycleId}/generate/`),
  getSlips: (cycleId) => api.get(`/payroll/cycles/${cycleId}/slips/`),
  getSlip: (id) => api.get(`/payroll/slips/${id}/`),
  approveCycle: (id) => api.post(`/payroll/cycles/${id}/approve/`),
  getEmployeeSlips: (empId) => api.get(`/payroll/employee/${empId}/slips/`),
  createLoan: (data) => api.post('/payroll/loans/', data),
  getLoans: (params) => api.get('/payroll/loans/', { params }),
  approveLoan: (id) => api.post(`/payroll/loans/${id}/approve/`),
}

// ─── Commission ───────────────────────────────────────────────────────────────
export const commissionAPI = {
  getStructures: () => api.get('/commission/structures'),
  createStructure: (data) => api.post('/commission/structures', data),
  getEntries: (params) => api.get('/commission/entries', { params }),
  createEntry: (data) => api.post('/commission/entries', data),
  approveEntry: (id, data) => api.put(`/commission/entries/${id}/approve`, data),
  getEmployeeSummary: (empId, month, year) =>
    api.get(`/commission/employees/${empId}/summary`, { params: { month, year } }),
  assignStructure: (empId, data) => api.post(`/commission/employees/${empId}/assign`, data),
  getAssignment: (empId) => api.get(`/commission/employees/${empId}/assignment`),
}

// ─── Reports ──────────────────────────────────────────────────────────────────
export const reports = {
  getLeaveUtilization: (params) => api.get('/reports/leave-utilization/', { params }),
  getPayrollSummary: (cycleId) => api.get(`/reports/payroll-summary/${cycleId}/`),
  getEmployeeYTD: (empId) => api.get(`/reports/employee-ytd/${empId}/`),
}

export default api
