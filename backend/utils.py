import os
import json
from typing import List, Dict, Any, Optional
import pickle
import threading
import requests

NASA_POWER_BASE = os.getenv("NASA_POWER_BASE_URL", "https://power.larc.nasa.gov/api/temporal/daily/point")

_fertilizer_model_lock = threading.Lock()
_fertilizer_model: Optional[Any] = None

def load_fertilizer_model() -> Any:
    global _fertilizer_model
    if _fertilizer_model is not None:
        return _fertilizer_model
    with _fertilizer_model_lock:
        if _fertilizer_model is not None:
            return _fertilizer_model
        # Model path: project_root/models/FertiRecom.pkl
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
        model_path = os.path.join(base_dir, "models", "FertiRecom.pkl")
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Fertilizer model not found at {model_path}")
        with open(model_path, "rb") as f:
            _fertilizer_model = pickle.load(f)
        return _fertilizer_model

def get_fertilizer_recommendation(features: Dict[str, float]) -> Dict[str, Any]:
    """Run the fertilizer recommendation model.

    Accepts feature keys such as nitrogen, phosphorus, potassium, ph, etc.
    The model commonly accepts N,P,K (and possibly pH). We attempt to map accordingly.
    """
    model = load_fertilizer_model()
    # Preferred order
    ordered_keys = ["nitrogen", "phosphorus", "potassium", "ph"]
    x = [features.get(k) for k in ordered_keys]
    # Remove trailing None values to fit expected model input size
    while x and x[-1] is None:
        x.pop()
    # Fallback: ensure at least N,P,K are present
    if len(x) < 3 or any(v is None for v in x[:3]):
        raise ValueError("Missing required features: nitrogen, phosphorus, potassium")
    # Some models expect 3 features; slice to length if needed
    try:
        # Try 4, then 3, then 2 if necessary
        for size in (len(x), 4, 3):
            try_input = x[:size]
            # scikit models accept 2D array-like
            pred = getattr(model, "predict", None)
            proba = getattr(model, "predict_proba", None)
            if callable(pred):
                y = pred([try_input])
                label = y[0] if isinstance(y, (list, tuple)) else y
                prob = None
                if callable(proba):
                    try:
                        p = proba([try_input])
                        prob = float(max(p[0]))
                    except Exception:
                        prob = None
                return {"label": str(label), "confidence": round(prob, 3) if isinstance(prob, float) else None}
    except Exception as e:
        raise RuntimeError(f"Fertilizer model inference failed: {e}")
    raise RuntimeError("Fertilizer model inference failed: incompatible input shape")


def simple_crop_recommendation(features: Dict[str, float]) -> List[Dict[str, Any]]:
    # This is a simple deterministic scorer to avoid ML dependency.
    # Higher nitrogen and rainfall -> Rice; higher potassium and moderate rainfall -> Wheat; higher pH -> Cotton
    scores = {
        "Rice": features["nitrogen"] * 0.3 + features["rainfall"] * 0.4 + features["humidity"] * 0.2,
        "Wheat": features["potassium"] * 0.35 + (30 - abs(22 - features["temperature"])) * 0.3 + features["ph"] * 0.1,
        "Maize": features["phosphorus"] * 0.3 + features["temperature"] * 0.2 + features["rainfall"] * 0.2,
        "Cotton": features["ph"] * 0.4 + features["temperature"] * 0.3 + features["humidity"] * 0.1,
    }
    total = sum(max(s, 0.001) for s in scores.values())
    recs = [
        {"crop": k, "confidence": round(v / total, 3)} for k, v in sorted(scores.items(), key=lambda x: x[1], reverse=True)
    ]
    return recs


def estimate_costs(crop: str, area_hectares: float) -> Dict[str, float]:
    # Example coefficients per hectare
    seed_cost = {
        "Rice": 120.0,
        "Wheat": 100.0,
        "Maize": 90.0,
        "Cotton": 150.0,
    }.get(crop, 100.0)

    fertilizer_cost = 200.0
    labor_cost = 250.0
    irrigation_cost = 80.0

    investment = (seed_cost + fertilizer_cost + labor_cost + irrigation_cost) * area_hectares

    # Yield and market price assumptions
    yield_ton_per_hectare = {
        "Rice": 4.5,
        "Wheat": 3.5,
        "Maize": 5.0,
        "Cotton": 2.2,
    }.get(crop, 3.0)

    market_price_per_ton = {
        "Rice": 280.0,
        "Wheat": 240.0,
        "Maize": 220.0,
        "Cotton": 600.0,
    }.get(crop, 200.0)

    expected_yield = yield_ton_per_hectare * area_hectares
    expected_revenue = expected_yield * market_price_per_ton
    expected_profit = expected_revenue - investment

    return {
        "investment": round(investment, 2),
        "expected_yield_tons": round(expected_yield, 2),
        "market_price_per_ton": round(market_price_per_ton, 2),
        "expected_revenue": round(expected_revenue, 2),
        "expected_profit": round(expected_profit, 2),
    }


def fetch_nasa_power(latitude: float, longitude: float, start: str, end: str) -> Dict[str, Any]:
    params = {
        "parameters": "T2M,PRECTOTCORR",
        "community": "AG",
        "longitude": longitude,
        "latitude": latitude,
        "start": start,
        "end": end,
        "format": "JSON",
    }
    resp = requests.get(NASA_POWER_BASE, params=params, timeout=20)
    resp.raise_for_status()
    return resp.json()


def derive_weather_alerts(raw: Dict[str, Any]) -> List[Dict[str, str]]:
    alerts: List[Dict[str, str]] = []
    try:
        parms = raw.get("properties", {}).get("parameter", {})
        temps = parms.get("T2M", {})
        rains = parms.get("PRECTOTCORR", {})
        # Analyze last available day
        if temps:
            last_temp = list(temps.values())[-1]
            if last_temp >= 35:
                alerts.append({"type": "High Temperature", "message": "Heat stress possible. Irrigate and mulch.", "severity": "high"})
            elif last_temp <= 5:
                alerts.append({"type": "Low Temperature", "message": "Frost risk. Use covers.", "severity": "medium"})
        if rains:
            last_rain = list(rains.values())[-1]
            if last_rain >= 20:
                alerts.append({"type": "Heavy Rainfall", "message": "Drainage and disease monitoring advised.", "severity": "high"})
            elif last_rain == 0:
                alerts.append({"type": "No Rain", "message": "Irrigation may be required.", "severity": "low"})
    except Exception:
        pass
    if not alerts:
        alerts.append({"type": "Normal", "message": "No significant alerts.", "severity": "low"})
    return alerts
