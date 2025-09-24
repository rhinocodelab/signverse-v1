from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.database import Base


class TrainRoute(Base):
    __tablename__ = "train_routes"

    id = Column(Integer, primary_key=True, index=True)
    train_number = Column(String(5), unique=True, index=True, nullable=False)
    train_name = Column(String, nullable=False)
    from_station_name = Column(String, nullable=False)
    from_station_code = Column(String(10), nullable=False)
    to_station_name = Column(String, nullable=False)
    to_station_code = Column(String(10), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationship with TrainRouteTranslation
    translations = relationship(
        "TrainRouteTranslation", back_populates="train_route", cascade="all, delete-orphan")
