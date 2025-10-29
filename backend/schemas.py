from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any, Dict
from datetime import datetime


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=2,max_length=72)
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CropInput(BaseModel):
    nitrogen: float
    phosphorus: float
    potassium: float
    ph: float
    rainfall: float
    temperature: float
    humidity: float


class CropRecommendation(BaseModel):
    crop: str
    confidence: float


class CropResponse(BaseModel):
    recommendations: List[CropRecommendation]


class CostInput(BaseModel):
    crop: str
    area_hectares: float


class CostResponse(BaseModel):
    crop: str
    area_hectares: float
    investment: float
    expected_yield_tons: float
    market_price_per_ton: float
    expected_revenue: float
    expected_profit: float


class WeatherRequest(BaseModel):
    latitude: float
    longitude: float
    start: str  # YYYYMMDD
    end: str    # YYYYMMDD


class WeatherAlert(BaseModel):
    type: str
    message: str
    severity: str


class WeatherResponse(BaseModel):
    alerts: List[WeatherAlert]
    raw: Dict[str, Any]


class HistoryItem(BaseModel):
    id: int
    type: str
    payload: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None


# Land selection / plots
class PlotCoordinate(BaseModel):
    lat: float
    lng: float


class PlotCreate(BaseModel):
    name: str
    coordinates: List[PlotCoordinate]
    # optional nutrient inputs to aide crop recommendation
    nitrogen: Optional[float] = None
    phosphorus: Optional[float] = None
    potassium: Optional[float] = None
    ph: Optional[float] = None
    organic_matter: Optional[float] = None


class PlotOut(BaseModel):
    id: int
    name: str
    area_hectares: float
    coordinates: List[PlotCoordinate]
    nitrogen: Optional[float] = None
    phosphorus: Optional[float] = None
    potassium: Optional[float] = None
    ph: Optional[float] = None
    organic_matter: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SatelliteDataOut(BaseModel):
    date: str
    ndvi: Optional[float] = None
    soil_moisture: Optional[float] = None
    crop_type: Optional[str] = None


# Fertilizer recommendation
class FertilizerInput(BaseModel):
    nitrogen: float
    phosphorus: float
    potassium: float
    ph: Optional[float] = None


class FertilizerResponse(BaseModel):
    label: str
    confidence: Optional[float] = None
