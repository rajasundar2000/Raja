"""
Indian tax calculation service for FY 2024-25.
Includes Income Tax, PF, ESI, and Professional Tax.
"""
from typing import Tuple


def calculate_income_tax(annual_income: float) -> float:
    """
    Calculate income tax under the new tax regime for FY 2024-25.
    Applies standard deduction of Rs. 50,000.

    Tax Slabs (New Regime FY 2024-25):
    - 0 - 2,50,000       : 0%
    - 2,50,001 - 5,00,000 : 5%
    - 5,00,001 - 7,50,000 : 10%
    - 7,50,001 - 10,00,000: 15%
    - 10,00,001 - 12,50,000: 20%
    - 12,50,001 - 15,00,000: 25%
    - Above 15,00,000    : 30%

    Standard Deduction: Rs. 50,000
    Rebate u/s 87A: if taxable income <= 5L, rebate = min(tax, 12500)
    Health & Education Cess: 4%
    Surcharge on income tax:
      - 10% if income > 50L
      - 15% if income > 1Cr
      - 25% if income > 2Cr
      - 37% if income > 5Cr
    """
    # Apply standard deduction
    standard_deduction = 50000.0
    taxable_income = max(0.0, annual_income - standard_deduction)

    # Compute base tax
    base_tax = _compute_slab_tax(taxable_income)

    # Rebate u/s 87A (taxable income before cess, rebate up to 12500)
    if taxable_income <= 500000:
        rebate = min(base_tax, 12500.0)
        base_tax = max(0.0, base_tax - rebate)

    # Surcharge
    surcharge_rate = 0.0
    if annual_income > 50_00_000:  # 50 Lakhs
        surcharge_rate = 0.10
    if annual_income > 1_00_00_000:  # 1 Crore
        surcharge_rate = 0.15
    if annual_income > 2_00_00_000:  # 2 Crores
        surcharge_rate = 0.25
    if annual_income > 5_00_00_000:  # 5 Crores
        surcharge_rate = 0.37

    tax_with_surcharge = base_tax * (1 + surcharge_rate)

    # Health & Education Cess: 4%
    cess = tax_with_surcharge * 0.04
    total_tax = tax_with_surcharge + cess

    return round(total_tax, 2)


def _compute_slab_tax(taxable_income: float) -> float:
    """Compute slab-wise tax for new regime FY 2024-25."""
    slabs = [
        (250000, 0.00),
        (250000, 0.05),   # 2.5L - 5L
        (250000, 0.10),   # 5L - 7.5L
        (250000, 0.15),   # 7.5L - 10L
        (250000, 0.20),   # 10L - 12.5L
        (250000, 0.25),   # 12.5L - 15L
        (float("inf"), 0.30),  # 15L+
    ]

    tax = 0.0
    remaining = taxable_income
    for slab_limit, rate in slabs:
        if remaining <= 0:
            break
        taxable_in_slab = min(remaining, slab_limit)
        tax += taxable_in_slab * rate
        remaining -= taxable_in_slab

    return round(tax, 2)


def get_monthly_income_tax(annual_income: float) -> float:
    """Calculate monthly TDS (annual tax / 12)."""
    annual_tax = calculate_income_tax(annual_income)
    return round(annual_tax / 12, 2)


def calculate_pf(basic_plus_da: float) -> Tuple[float, float]:
    """
    Calculate Provident Fund contributions.
    Employee: 12% of basic + DA (capped at 1800 if basic+DA > 15000)
    Employer: 12% of basic + DA (capped at 1800)

    Note: PF is computed on basic + DA. Ceiling is 15000 for PF wage.
    Returns: (employee_pf, employer_pf)
    """
    pf_wage = min(basic_plus_da, 15000.0)
    employee_pf = round(pf_wage * 0.12, 2)
    employer_pf = round(pf_wage * 0.12, 2)
    return employee_pf, employer_pf


def calculate_esi(gross_salary: float) -> Tuple[float, float]:
    """
    Calculate ESI contributions.
    ESI applies only if gross salary <= 21,000 per month.
    Employee: 0.75% of gross
    Employer: 3.25% of gross
    Returns: (employee_esi, employer_esi)
    """
    esi_threshold = 21000.0
    if gross_salary > esi_threshold:
        return 0.0, 0.0

    employee_esi = round(gross_salary * 0.0075, 2)
    employer_esi = round(gross_salary * 0.0325, 2)
    return employee_esi, employer_esi


def get_professional_tax(state: str, monthly_gross: float) -> float:
    """
    Calculate Professional Tax based on state and monthly gross salary.

    Karnataka:
    - > 15,000/month: Rs. 200/month
    - <= 15,000/month: Rs. 0

    Maharashtra:
    - <= 7,500: Rs. 0
    - 7,501 - 10,000: Rs. 175/month
    - 10,001 - 40,000: Rs. 200/month (Rs. 300 in February)
    - > 40,000: Rs. 300/month

    Andhra Pradesh:
    - > 15,000: Rs. 150/month

    Tamil Nadu:
    - Rs. 100/month if > 21,000/month

    Telangana:
    - > 15,000: Rs. 150/month

    West Bengal:
    - > 10,000: Rs. 110/month
    - > 15,000: Rs. 130/month
    - > 25,000: Rs. 150/month
    - > 40,000: Rs. 200/month

    Default (other states): Rs. 0
    """
    state_lower = state.strip().lower()

    if state_lower in ("karnataka", "ka"):
        return 200.0 if monthly_gross > 15000 else 0.0

    elif state_lower in ("maharashtra", "mh"):
        if monthly_gross <= 7500:
            return 0.0
        elif monthly_gross <= 10000:
            return 175.0
        elif monthly_gross <= 40000:
            return 200.0
        else:
            return 300.0

    elif state_lower in ("andhra pradesh", "ap"):
        return 150.0 if monthly_gross > 15000 else 0.0

    elif state_lower in ("telangana", "ts"):
        return 150.0 if monthly_gross > 15000 else 0.0

    elif state_lower in ("tamil nadu", "tn"):
        return 100.0 if monthly_gross > 21000 else 0.0

    elif state_lower in ("west bengal", "wb"):
        if monthly_gross <= 10000:
            return 0.0
        elif monthly_gross <= 15000:
            return 110.0
        elif monthly_gross <= 25000:
            return 130.0
        elif monthly_gross <= 40000:
            return 150.0
        else:
            return 200.0

    elif state_lower in ("gujarat", "gj"):
        return 200.0 if monthly_gross > 12000 else 0.0

    elif state_lower in ("madhya pradesh", "mp"):
        return 208.0 if monthly_gross > 18750 else 0.0

    # Most other states don't have PT or it's minimal
    return 0.0


def calculate_all_deductions(
    basic_salary: float,
    da_amount: float,
    gross_salary: float,
    annual_gross: float,
    state: str = "Karnataka",
) -> dict:
    """
    Calculate all deductions for a month's salary slip.
    Returns a dict with all deduction amounts.
    """
    basic_plus_da = basic_salary + da_amount

    # PF
    emp_pf, employer_pf = calculate_pf(basic_plus_da)

    # ESI
    emp_esi, employer_esi = calculate_esi(gross_salary)

    # Professional Tax
    pt = get_professional_tax(state, gross_salary)

    # Monthly Income Tax (TDS)
    monthly_tax = get_monthly_income_tax(annual_gross)

    total_deductions = round(emp_pf + emp_esi + pt + monthly_tax, 2)

    return {
        "pf_employee": emp_pf,
        "pf_employer": employer_pf,
        "esi_employee": emp_esi,
        "esi_employer": employer_esi,
        "professional_tax": pt,
        "income_tax": monthly_tax,
        "total_employee_deductions": total_deductions,
    }
