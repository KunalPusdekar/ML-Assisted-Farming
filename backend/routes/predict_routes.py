from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any

from auth import get_current_user
from database import get_db
from models import User, UserHistory
from schemas import CropInput, CropResponse, FertilizerInput, FertilizerResponse
from utils import simple_crop_recommendation, get_fertilizer_recommendation, crop_recommendation_ml

router = APIRouter(tags=["predictions"])


@router.post("/predict_crop", response_model=CropResponse)
def predict_crop(payload: CropInput, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    features = payload.model_dump()
    # Try ML model first if available; fallback to heuristic
    try:
        recommendations = crop_recommendation_ml(features) or simple_crop_recommendation(features)
    except Exception:
        recommendations = simple_crop_recommendation(features)
    history = UserHistory(user_id=user.id, type="crop_recommendation", payload={"input": features, "output": recommendations})
    db.add(history)
    db.commit()
    return {"recommendations": recommendations}


@router.post("/predict_disease")
def predict_disease(file: UploadFile = File(...), db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict[str, Any]:
    # In a real scenario, integrate with pre-existing ML model 'crop_disease_model.h5'. Here we simulate.
    filename = file.filename or "image.jpg"
    # Simple heuristic based on filename for deterministic output
    label = "Healthy" if "healthy" in filename.lower() else "Leaf Blight"
    confidence = 0.85 if label != "Healthy" else 0.92
    result = {"label": label, "confidence": confidence, "treatment": "Apply recommended fungicide and improve airflow." if label != "Healthy" else "No action needed."}
    history = UserHistory(user_id=user.id, type="disease_detection", payload={"file": filename, "output": result})
    db.add(history)
    db.commit()
    return result


@router.post("/fertilizer_recommendation", response_model=FertilizerResponse)
def fertilizer_recommendation(payload: FertilizerInput, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    features = payload.model_dump()
    result = get_fertilizer_recommendation(features)
    history = UserHistory(user_id=user.id, type="fertilizer_recommendation", payload={"input": features, "output": result})
    db.add(history)
    db.commit()
    return result
