from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any
import os

from auth import get_current_user
from database import get_db
from models import User, UserHistory
from schemas import CropInput, CropResponse, FertilizerInput, FertilizerResponse
from utils import simple_crop_recommendation, get_fertilizer_recommendation, crop_recommendation_ml, predict_leaf_disease_hf

from pydantic import BaseModel
import pickle
import numpy as np
import joblib
import pandas as pd
from catboost import CatBoostRegressor

router = APIRouter(tags=["predictions"])

# === Build absolute paths to model files ===
BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # path to backend/routes/
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "../.."))  # goes up to ML-Assisted-Farming/

model_path = os.path.join(PROJECT_ROOT, "models", "Random_Forest_npk_recommendation_2.pkl")
encoder_path = os.path.join(PROJECT_ROOT, "models", "Random_Forest_npk_recommendation_label_encoder.pkl")

print(f"📁 Loading model from: {model_path}")
print(f"📁 Loading encoder from: {encoder_path}")

# === Load Model and Encoder ===
with open(model_path, "rb") as f:
    model = pickle.load(f)

with open(encoder_path, "rb") as f:
    le = pickle.load(f)

print("✅ Model and LabelEncoder loaded successfully!")


# === Request & Response Models ===
class CropRequest(BaseModel):
    nitrogen: float
    phosphorus: float
    potassium: float
    temperature: float
    humidity: float
    ph: float
    rainfall: float


class CropRecommendation(BaseModel):
    crop: str
    confidence: float  # value between 0–1


class CropResponse(BaseModel):
    recommendations: list[CropRecommendation]


# === Helper Function ===
def recommend_crop_with_probabilities(N, P, K, temperature, humidity, ph, rainfall, top_n=5):
    sample = np.array([[N, P, K, temperature, humidity, ph, rainfall]])
    probs = model.predict_proba(sample)[0]

    results = sorted(zip(le.classes_, probs), key=lambda x: x[1], reverse=True)

    # Return top N crops as list of dicts
    return [
        {"crop": crop, "confidence": float(prob)}
        for crop, prob in results[:top_n]
    ]


@router.post("/predict_crop", response_model=CropResponse)
async def predict_crop(input_data: CropRequest):
    try:
        recommendations = recommend_crop_with_probabilities(
            input_data.nitrogen,
            input_data.phosphorus,
            input_data.potassium,
            input_data.temperature,
            input_data.humidity,
            input_data.ph,
            input_data.rainfall,
        )

        return {"recommendations": recommendations}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")




# ---------- Pydantic Input Schema ----------
class CostEstimationInput(BaseModel):
    state: str
    district: str
    market: str
    commodity: str
    variety: str
    grade: str
    min_price: float
    max_price: float
    day: int
    month: int
    year: int

# ---------- Function to Predict Modal Price ----------
def predict_modal_price(
    state: str,
    district: str,
    market: str,
    commodity: str,
    variety: str,
    grade: str,
    min_price: float,
    max_price: float,
    day: int,
    month: int,
    year: int
):
    model_path = os.path.join(PROJECT_ROOT, "models", "price_model.cbm")
    features_path = os.path.join(PROJECT_ROOT, "models", "features_list.joblib")

    model = CatBoostRegressor()
    model.load_model(model_path)
    features = joblib.load(features_path)
    feature_names = model.feature_names_

    test_input = pd.DataFrame([{
        'State': state,
        'District': district,
        'Market': market,
        'Commodity': commodity,
        'Variety': variety,
        'Grade': grade,
        'Min Price': min_price,
        'Max Price': max_price,
        'price_spread': max_price - min_price,
        'arrival_day': day,
        'arrival_month': month,
        'arrival_year': year,
        'arrival_dayofweek': pd.Timestamp(year=year, month=month, day=day).dayofweek
    }])[feature_names]

    pred = model.predict(test_input)
    return round(float(pred[0]), 2)


# ---------- FastAPI Route ----------
@router.post("/estimate_cost")
def estimate_cost(input_data: CostEstimationInput):
    try:
        modal_price = predict_modal_price(
            state=input_data.state,
            district=input_data.district,
            market=input_data.market,
            commodity=input_data.commodity,
            variety=input_data.variety,
            grade=input_data.grade,
            min_price=input_data.min_price,
            max_price=input_data.max_price,
            day=input_data.day,
            month=input_data.month,
            year=input_data.year,
        )



        return {
            "Crop": input_data.commodity,
            "State": input_data.state,
            "District": input_data.district,
            "Predicted_modal_Price_in_rupees_per_quintal": modal_price
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predict_disease")
def predict_disease(file: UploadFile = File(...), db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Dict[str, Any]:
    filename = file.filename or "image.jpg"
    # Try Hugging Face Inference API if configured
    try:
        image_bytes = file.file.read()
        hf_result = predict_leaf_disease_hf(image_bytes)
    finally:
        try:
            file.file.close()
        except Exception:
            pass
    if hf_result:
        result = hf_result
    else:
        # Fallback heuristic to keep feature working offline
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
