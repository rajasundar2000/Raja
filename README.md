# Indian Leave Management & Payroll System

A comprehensive HR system for Indian employees working in US EST timezone, with full compliance for Indian labor laws and tax regulations.

## Features

### Leave Management
- **Leave Types**: Casual (CL), Earned (EL), Sick (SL), Privilege (PL), Maternity, Paternity, Bereavement, LWP
- **Accrual Engine**: Monthly EL accrual (1.75 days/month), carry-forward rules
- **Workflow**: Multi-level approval (Manager → Dept Head → HR)
- **Calendars**: India + US holiday calendars, IST/EST timezone support
- **Balance Tracking**: Real-time balances, encashment, expiry alerts
- **Auto-approval**: Rules based on notice period

### Payroll
- **Salary Components**: Basic, HRA, DA, Conveyance, Medical, Special Allowance, LTA
- **Deductions**: PF (12%), ESI, Professional Tax (state-wise), Income Tax
- **Tax Engine**: FY 2024-25 slabs with standard deduction, surcharge, cess, Section 87A rebate
- **Salary Slips**: Full Indian-format salary slips with YTD
- **Loan Management**: Personal, salary advance, festival, emergency loans with EMI
- **Leave-Payroll Integration**: Approved leaves auto-reflect in payroll

### Reports
- Employee leave balance & history
- Payroll register & cost analysis
- YTD earnings & deductions
- Tax summary (Form 16 prep)
- PF/ESI compliance reports

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11 + FastAPI |
| ORM | SQLAlchemy 2.0 |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| API Client | Axios |

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## API Documentation
After starting the backend, visit http://localhost:8000/docs for the interactive Swagger UI.

## Indian Tax Slabs (FY 2024-25)
| Income Range | Rate |
|---|---|
| Up to ₹2,50,000 | Nil |
| ₹2,50,001 – ₹5,00,000 | 5% |
| ₹5,00,001 – ₹7,50,000 | 10% |
| ₹7,50,001 – ₹10,00,000 | 15% |
| ₹10,00,001 – ₹12,50,000 | 20% |
| ₹12,50,001 – ₹15,00,000 | 25% |
| Above ₹15,00,000 | 30% |

Standard Deduction: ₹50,000
Rebate u/s 87A: Up to ₹12,500 if taxable income ≤ ₹5,00,000
Health & Education Cess: 4%

## Leave Entitlements
| Type | Days/Year | Carry Forward | Encashable |
|---|---|---|---|
| Casual Leave (CL) | 10 | 5 | No |
| Earned Leave (EL) | 18 | 30 | Yes |
| Sick Leave (SL) | 10 | 0 | No |
| Privilege Leave (PL) | 12 | 10 | No |
| Maternity Leave | 182 (26 weeks) | N/A | No |
| Paternity Leave | 5 | N/A | No |

## Compliance
- Shops & Establishment Act
- Payment of Gratuity Act, 1972
- EPF Act (12% employee + 12% employer)
- Income Tax Act, 1961
- Professional Tax (state-wise)
