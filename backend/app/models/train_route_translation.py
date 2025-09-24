from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.database import Base


class TrainRouteTranslation(Base):
    __tablename__ = "train_route_translations"

    id = Column(Integer, primary_key=True, index=True)
    train_route_id = Column(Integer, ForeignKey(
        "train_routes.id"), nullable=False)

    # English translations
    train_name_en = Column(String, nullable=False)
    from_station_name_en = Column(String, nullable=False)
    to_station_name_en = Column(String, nullable=False)

    # Hindi translations
    train_name_hi = Column(String, nullable=False)
    from_station_name_hi = Column(String, nullable=False)
    to_station_name_hi = Column(String, nullable=False)

    # Marathi translations
    train_name_mr = Column(String, nullable=False)
    from_station_name_mr = Column(String, nullable=False)
    to_station_name_mr = Column(String, nullable=False)

    # Gujarati translations
    train_name_gu = Column(String, nullable=False)
    from_station_name_gu = Column(String, nullable=False)
    to_station_name_gu = Column(String, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationship with TrainRoute
    train_route = relationship("TrainRoute", back_populates="translations")
