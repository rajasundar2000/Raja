from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    secret_key: str = "leave-payroll-secret-key-2024-india"
    app_name: str = "LeavePayroll"
    frontend_url: str = "http://localhost:5173"

    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_email: str = "noreply@leavepayroll.com"
    smtp_from_name: str = "LeavePayroll System"

    google_sheets_credentials_json: Optional[str] = None
    google_sheets_spreadsheet_id: Optional[str] = None

    database_url: str = "sqlite:///./leave_payroll.db"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
