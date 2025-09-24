from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class TrainRouteTranslationBase(BaseModel):
    train_route_id: int = Field(..., description="ID of the train route")

    # English translations
    train_name_en: str = Field(..., description="Train name in English")
    from_station_name_en: str = Field(...,
                                      description="From station name in English")
    to_station_name_en: str = Field(...,
                                    description="To station name in English")

    # Hindi translations
    train_name_hi: str = Field(..., description="Train name in Hindi")
    from_station_name_hi: str = Field(...,
                                      description="From station name in Hindi")
    to_station_name_hi: str = Field(...,
                                    description="To station name in Hindi")

    # Marathi translations
    train_name_mr: str = Field(..., description="Train name in Marathi")
    from_station_name_mr: str = Field(...,
                                      description="From station name in Marathi")
    to_station_name_mr: str = Field(...,
                                    description="To station name in Marathi")

    # Gujarati translations
    train_name_gu: str = Field(..., description="Train name in Gujarati")
    from_station_name_gu: str = Field(...,
                                      description="From station name in Gujarati")
    to_station_name_gu: str = Field(...,
                                    description="To station name in Gujarati")


class TrainRouteTranslationCreate(TrainRouteTranslationBase):
    pass


class TrainRouteTranslationUpdate(BaseModel):
    # English translations
    train_name_en: Optional[str] = None
    from_station_name_en: Optional[str] = None
    to_station_name_en: Optional[str] = None

    # Hindi translations
    train_name_hi: Optional[str] = None
    from_station_name_hi: Optional[str] = None
    to_station_name_hi: Optional[str] = None

    # Marathi translations
    train_name_mr: Optional[str] = None
    from_station_name_mr: Optional[str] = None
    to_station_name_mr: Optional[str] = None

    # Gujarati translations
    train_name_gu: Optional[str] = None
    from_station_name_gu: Optional[str] = None
    to_station_name_gu: Optional[str] = None


class TrainRouteTranslationResponse(TrainRouteTranslationBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TrainRouteWithTranslations(BaseModel):
    """Response model that includes train route with its translations"""
    id: int
    train_number: str
    train_name: str
    from_station_name: str
    from_station_code: str
    to_station_name: str
    to_station_code: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    translations: Optional[TrainRouteTranslationResponse] = None

    class Config:
        from_attributes = True
