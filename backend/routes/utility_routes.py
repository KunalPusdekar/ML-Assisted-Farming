from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any

from auth import get_current_user
from database import get_db
from models import User, UserHistory
from schemas import CostInput, CostResponse, WeatherRequest, WeatherResponse, HistoryItem, ProfileUpdate
from utils import estimate_costs, fetch_nasa_power, derive_weather_alerts

router = APIRouter(tags=["utilities"])


@router.post("/estimate_cost", response_model=CostResponse)
def estimate_cost(payload: CostInput, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    result = estimate_costs(payload.crop, payload.area_hectares)
    history = UserHistory(user_id=user.id, type="cost_estimation", payload={"input": payload.model_dump(), "output": result})
    db.add(history)
    db.commit()
    return {
        "crop": payload.crop,
        "area_hectares": payload.area_hectares,
        **result,
    }


@router.post("/weather_alerts", response_model=WeatherResponse)
def weather_alerts(payload: WeatherRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    raw = fetch_nasa_power(payload.latitude, payload.longitude, payload.start, payload.end)
    alerts = derive_weather_alerts(raw)
    history = UserHistory(user_id=user.id, type="weather_alert", payload={"input": payload.model_dump(), "output": {"alerts": alerts}})
    db.add(history)
    db.commit()
    return {"alerts": alerts, "raw": raw}


@router.get("/user_history", response_model=list[HistoryItem])
def user_history(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    items = db.query(UserHistory).filter(UserHistory.user_id == user.id).order_by(UserHistory.created_at.desc()).all()
    return items


@router.put("/profile", response_model=dict)
def update_profile(update: ProfileUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    changed = False
    if update.full_name is not None:
        user.full_name = update.full_name
        changed = True
    if changed:
        db.add(user)
        db.commit()
    return {"status": "ok", "full_name": user.full_name}
