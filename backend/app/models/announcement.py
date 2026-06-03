from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship
from ..database import Base
from datetime import datetime
import enum


class AnnouncementPriority(str, enum.Enum):
    low = "low"
    normal = "normal"
    high = "high"
    urgent = "urgent"


class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    priority = Column(Enum(AnnouncementPriority), default=AnnouncementPriority.normal)
    is_active = Column(Boolean, default=True)
    published_by = Column(Integer, ForeignKey("employees.id"), nullable=False)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    target_department = Column(String, nullable=True)  # None = all departments

    publisher = relationship("Employee")
