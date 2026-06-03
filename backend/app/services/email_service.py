import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from ..config import settings
import logging

logger = logging.getLogger(__name__)


def send_email(to_email: str, subject: str, html_body: str, text_body: str = "") -> bool:
    """Send email via SMTP. Returns True on success, False on failure."""
    if not settings.smtp_username or not settings.smtp_password:
        logger.warning(f"Email not configured. Would send to {to_email}: {subject}")
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
        msg["To"] = to_email
        if text_body:
            msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_username, settings.smtp_password)
            server.sendmail(settings.smtp_from_email, to_email, msg.as_string())
        logger.info(f"Email sent to {to_email}: {subject}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


def send_invitation_email(to_email: str, full_name: str, invite_token: str, invited_by_name: str):
    invite_url = f"{settings.frontend_url}/accept-invite/{invite_token}"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:#4338ca;padding:20px;border-radius:8px 8px 0 0;text-align:center">
        <h1 style="color:white;margin:0">LeavePayroll</h1>
        <p style="color:#c7d2fe;margin:5px 0">Indian HR Management System</p>
      </div>
      <div style="background:white;padding:30px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px">
        <h2>You're invited, {full_name}!</h2>
        <p>{invited_by_name} has invited you to join <strong>LeavePayroll</strong>.</p>
        <p>Use this system to:</p>
        <ul>
          <li>Apply for and track leaves</li>
          <li>View your salary slips</li>
          <li>Track your commission</li>
          <li>Submit expense claims</li>
        </ul>
        <div style="text-align:center;margin:30px 0">
          <a href="{invite_url}" style="background:#4338ca;color:white;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px">
            Accept Invitation &amp; Set Password
          </a>
        </div>
        <p style="color:#6b7280;font-size:14px">This link expires in 72 hours. If you did not expect this invitation, ignore this email.</p>
      </div>
    </div>
    """
    return send_email(to_email, "You're invited to LeavePayroll", html)


def send_leave_status_email(to_email: str, employee_name: str, leave_type: str,
                             from_date: str, to_date: str, status: str, comments: str = ""):
    color = "#16a34a" if status == "approved" else "#dc2626"
    icon = "approved" if status == "approved" else "rejected"
    comments_row = (
        f"<tr><td style='padding:8px;background:#f9fafb;border:1px solid #e5e7eb'><strong>Comments</strong></td>"
        f"<td style='padding:8px;border:1px solid #e5e7eb'>{comments}</td></tr>"
        if comments else ""
    )
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:#4338ca;padding:20px;border-radius:8px 8px 0 0;text-align:center">
        <h1 style="color:white;margin:0">LeavePayroll</h1>
      </div>
      <div style="background:white;padding:30px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px">
        <h2>Leave Request {status.title()} [{icon}]</h2>
        <p>Dear {employee_name},</p>
        <p>Your leave request has been <strong style="color:{color}">{status}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0">
          <tr><td style="padding:8px;background:#f9fafb;border:1px solid #e5e7eb"><strong>Leave Type</strong></td><td style="padding:8px;border:1px solid #e5e7eb">{leave_type}</td></tr>
          <tr><td style="padding:8px;background:#f9fafb;border:1px solid #e5e7eb"><strong>From</strong></td><td style="padding:8px;border:1px solid #e5e7eb">{from_date}</td></tr>
          <tr><td style="padding:8px;background:#f9fafb;border:1px solid #e5e7eb"><strong>To</strong></td><td style="padding:8px;border:1px solid #e5e7eb">{to_date}</td></tr>
          {comments_row}
        </table>
        <p style="color:#6b7280;font-size:14px">Login to <a href="{settings.frontend_url}">LeavePayroll</a> to view details.</p>
      </div>
    </div>
    """
    return send_email(to_email, f"Leave Request {status.title()} - {leave_type}", html)


def send_salary_slip_email(to_email: str, employee_name: str, month: str, year: int, net_pay: float):
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:#4338ca;padding:20px;border-radius:8px 8px 0 0;text-align:center">
        <h1 style="color:white;margin:0">LeavePayroll</h1>
      </div>
      <div style="background:white;padding:30px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px">
        <h2>Salary Slip Available</h2>
        <p>Dear {employee_name},</p>
        <p>Your salary slip for <strong>{month} {year}</strong> is now available.</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;text-align:center;margin:20px 0">
          <p style="margin:0;color:#6b7280">Net Pay</p>
          <p style="margin:0;font-size:32px;font-weight:bold;color:#16a34a">&#8377;{net_pay:,.0f}</p>
        </div>
        <div style="text-align:center;margin:20px 0">
          <a href="{settings.frontend_url}/payroll" style="background:#4338ca;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
            View Salary Slip
          </a>
        </div>
      </div>
    </div>
    """
    return send_email(to_email, f"Salary Slip Available - {month} {year}", html)
