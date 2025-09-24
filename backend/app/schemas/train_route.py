from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class TrainRouteBase(BaseModel):
    train_number: str = Field(..., min_length=5,
                              max_length=5, description="5-digit train number")
    train_name: str = Field(..., description="Name of the train")
    from_station_name: str = Field(...,
                                   description="Name of the departure station")
    from_station_code: str = Field(..., max_length=10,
                                   description="Code of the departure station")
    to_station_name: str = Field(...,
                                 description="Name of the destination station")
    to_station_code: str = Field(..., max_length=10,
                                 description="Code of the destination station")


class TrainRouteCreate(TrainRouteBase):
    pass


class TrainRouteUpdate(BaseModel):
    train_name: Optional[str] = None
    from_station_name: Optional[str] = None
    from_station_code: Optional[str] = Field(None, max_length=10)
    to_station_name: Optional[str] = None
    to_station_code: Optional[str] = Field(None, max_length=10)


class TrainRouteResponse(TrainRouteBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
