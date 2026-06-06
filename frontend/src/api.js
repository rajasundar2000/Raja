import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'https://elite-recruit-payroll-system.onrender.com/api'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
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
  getAll: (params) => api.get('/employees', { params }),
  getOne: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.patch(`/employees/${id}`, data),
  getSalaryStructure: (id) => api.get(`/employees/${id}/salary-structure`),
  setSalaryStructure: (id, data) => api.post(`/employees/${id}/salary-structure`, data),
}

// ─── Leaves ───────────────────────────────────────────────────────────────────
export const leaves = {
  getTypes: () => api.get('/leave-types'),
  getBalance: (empId) => api.get(`/employees/${empId}/leave-balance`),
  getRequests: (params) => api.get('/leave-requests', { params }),
  createRequest: (data) => api.post('/leave-requests', data),
  submitRequest: (id) => api.put(`/leave-requests/${id}/submit`),
  cancelRequest: (id) => api.put(`/leave-requests/${id}/cancel`),
  approveRequest: (requestId, action, comments, approverId) =>
    api.post(`/leave-requests/${requestId}/approve`, {
      leave_request_id: requestId,
      approver_id: approverId ?? 1,
      action,
      comments,
    }),
  getHolidays: (params) => api.get('/holidays', { params }),
  getHistory: (empId) => api.get(`/employees/${empId}/leave-history`),
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

// ─── Invitations ──────────────────────────────────────────────────────────────
export const invitationAPI = {
  send: (data) => api.post('/invitations/send', data),
  getAll: () => api.get('/invitations'),
  cancel: (id) => api.delete(`/invitations/${id}`),
  validateToken: (token) => api.get(`/invitations/accept/${token}`),
  accept: (token, data) => api.post(`/invitations/accept/${token}`, data),
}

// ─── Announcements ────────────────────────────────────────────────────────────
export const announcementAPI = {
  getAll: () => api.get('/announcements'),
  create: (data) => api.post('/announcements', data),
  update: (id, data) => api.put(`/announcements/${id}`, data),
  delete: (id) => api.delete(`/announcements/${id}`),
}

// ─── Expenses ─────────────────────────────────────────────────────────────────
export const expenseAPI = {
  getAll: (params) => api.get('/expenses', { params }),
  create: (data) => api.post('/expenses', data),
  getOne: (id) => api.get(`/expenses/${id}`),
  approve: (id, data) => api.put(`/expenses/${id}/approve`, data),
  getSummary: (params) => api.get('/expenses/summary', { params }),
}

// ─── Integrations ─────────────────────────────────────────────────────────────
export const integrationAPI = {
  getGSheetsStatus: () => api.get('/integrations/google-sheets/status'),
  configureGSheets: (data) => api.post('/integrations/google-sheets/configure', data),
  syncEmployees: () => api.post('/integrations/google-sheets/sync/employees'),
  syncPayroll: (cycleId) => api.post(`/integrations/google-sheets/sync/payroll?cycle_id=${cycleId}`),
  syncLeaves: (year) => api.post(`/integrations/google-sheets/sync/leaves?year=${year}`),
  importEmployees: () => api.get('/integrations/google-sheets/import/employees'),
}

// ─── Profile ──────────────────────────────────────────────────────────────────
export const profileAPI = {
  get: () => api.get('/profile'),
  update: (data) => api.put('/profile', data),
  changePassword: (data) => api.post('/profile/change-password', data),
  getLeaveBalance: () => api.get('/profile/leave-balance'),
  getSalarySlips: () => api.get('/profile/salary-slips'),
  getExpenses: () => api.get('/profile/expenses'),
}

export default api
