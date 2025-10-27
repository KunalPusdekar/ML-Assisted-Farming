from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
import math
import random
import requests

from database import get_db
from auth import get_current_user
from models import Plot, SatelliteData, User
from schemas import PlotCreate, PlotOut, SatelliteDataOut

router = APIRouter(prefix="/plots", tags=["plots"])


def _calculate_area_hectares(coords: List[dict]) -> float:
    # Shoelace formula on lat/lng with rough conversion to hectares (align with sample)
    if len(coords) < 3:
        return 0.0
    area = 0.0
    n = len(coords)
    for i in range(n):
        j = (i + 1) % n
        area += coords[i]["lng"] * coords[j]["lat"]
        area -= coords[j]["lng"] * coords[i]["lat"]
    area = abs(area) / 2.0
    # Rough conversion to hectares (following provided example)
    hect = area * 111.32 * 111.32 * 10000
    return round(hect, 2)

def _calculate_center(coords: List[dict]) -> tuple[float, float]:
    lat = sum(c["lat"] for c in coords) / len(coords)
    lng = sum(c["lng"] for c in coords) / len(coords)
    return lat, lng


def _calculate_realistic_ndvi(lat: float, lng: float, date: datetime) -> float:
    day_of_year = date.timetuple().tm_yday
    seasonal = math.sin((day_of_year / 365) * 2 * math.pi - math.pi / 2) * 0.3 + 0.5
    geo = 0.0
    if 30 < lat < 50 and -120 < lng < -70:
        geo = 0.15
        if 60 < day_of_year < 240:
            geo += 0.1
    elif 40 < lat < 60 and -10 < lng < 40:
        geo = 0.1
        if 80 < day_of_year < 260:
            geo += 0.05
    elif abs(lat) < 30:
        geo = 0.2
        seasonal = 0.7
    elif (20 < lat < 35 and -120 < lng < -70) or (15 < lat < 35 and 0 < lng < 60):
        geo = -0.2
        seasonal = 0.3
    base = seasonal + geo
    variation = random.gauss(0, 0.03)
    if random.random() < 0.1:
        variation += 0.05 if random.random() >= 0.3 else -0.1
    return max(0.05, min(0.95, base + variation))


def _calculate_realistic_soil_moisture(lat: float, lng: float, date: datetime) -> float:
    day_of_year = date.timetuple().tm_yday
    seasonal = math.sin((day_of_year / 365) * 2 * math.pi + math.pi / 4) * 0.2 + 0.5
    base = max(0.2, min(0.8, seasonal))
    geo = 0.0
    if 30 < lat < 50 and -120 < lng < -70:
        geo = 0.1
        if 60 < day_of_year < 180:
            geo += 0.05
    elif 40 < lat < 60 and -10 < lng < 40:
        geo = 0.05
        if 80 < day_of_year < 200:
            geo += 0.03
    elif abs(lat) < 30:
        geo = 0.15
        base = 0.7
    elif (20 < lat < 35 and -120 < lng < -70) or (15 < lat < 35 and 0 < lng < 60):
        geo = -0.2
        base = 0.3
    moisture = base + geo
    variation = random.gauss(0, 0.02)
    if random.random() < 0.08:
        variation += 0.08 if random.random() >= 0.4 else -0.1
    moisture = max(0.1, min(0.95, moisture + variation))
    return round(moisture * 100, 1)


def _determine_crop_type(ndvi: float, date: datetime) -> str:
    day_of_year = date.timetuple().tm_yday
    if day_of_year < 60:
        return 'winter_wheat' if ndvi > 0.3 else 'fallow'
    elif day_of_year < 120:
        return 'corn' if ndvi > 0.4 else 'soybeans'
    elif day_of_year < 240:
        if ndvi > 0.6:
            return 'corn'
        elif ndvi > 0.4:
            return 'soybeans'
        else:
            return 'wheat'
    else:
        return 'harvested' if ndvi < 0.3 else 'late_corn'


def _generate_satellite_data(coords: List[dict]) -> List[SatelliteDataOut]:
    # Following the reference: 18 points over 6 months, every 10 days
    lat, lng = _calculate_center(coords)
    base = datetime.now() - timedelta(days=180)
    out: List[SatelliteDataOut] = []
    for i in range(18):
        date = base + timedelta(days=i * 10)
        ndvi = _calculate_realistic_ndvi(lat, lng, date)
        soil = _calculate_realistic_soil_moisture(lat, lng, date)
        crop = _determine_crop_type(ndvi, date)
        out.append(SatelliteDataOut(date=date.strftime("%Y-%m-%d"), ndvi=round(ndvi, 3), soil_moisture=soil, crop_type=crop))
    return out


@router.post("", response_model=PlotOut)
def create_plot(payload: PlotCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    coords_dicts = [c.dict() for c in payload.coordinates]
    area_hectares = _calculate_area_hectares(coords_dicts)

    plot = Plot(
        user_id=user.id,
        name=payload.name,
        coordinates=coords_dicts,
        area_hectares=area_hectares,
        nitrogen=payload.nitrogen,
        phosphorus=payload.phosphorus,
        potassium=payload.potassium,
        ph=payload.ph,
        organic_matter=payload.organic_matter,
    )
    db.add(plot)
    db.commit()
    db.refresh(plot)

    # Generate realistic satellite data and persist
    sat = _generate_satellite_data(coords_dicts)
    for s in sat:
        db.add(SatelliteData(plot_id=plot.id, date=s.date, ndvi=s.ndvi, soil_moisture=s.soil_moisture, crop_type=s.crop_type))
    db.commit()

    return plot


@router.get("", response_model=List[PlotOut])
def list_plots(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    items = db.query(Plot).filter(Plot.user_id == user.id).order_by(Plot.created_at.desc()).all()
    return items


@router.get("/{plot_id}/satellite-data", response_model=List[SatelliteDataOut])
def get_plot_satellite_data(plot_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    plot = db.query(Plot).filter(Plot.id == plot_id, Plot.user_id == user.id).first()
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")
    rows = db.query(SatelliteData).filter(SatelliteData.plot_id == plot.id).order_by(SatelliteData.date.asc()).all()
    return [SatelliteDataOut(date=r.date, ndvi=r.ndvi, soil_moisture=r.soil_moisture, crop_type=r.crop_type) for r in rows]
