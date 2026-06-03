from sqlalchemy import Column, Integer, String, Text
from ..database import Base


class AppSetting(Base):
    __tablename__ = "app_settings"

    id = Column(Integer, primary_key=True)
    key = Column(String, unique=True, nullable=False)
    value = Column(Text, nullable=True)
    description = Column(String, nullable=True)
