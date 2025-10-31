import os
import json
from typing import List, Dict, Any, Optional, Tuple
import pickle
import threading
import requests

NASA_POWER_BASE = os.getenv("NASA_POWER_BASE_URL", "https://power.larc.nasa.gov/api/temporal/daily/point")
HF_API_URL = os.getenv("HF_PLANT_MODEL", "")  # e.g., https://api-inference.huggingface.co/models/some-user/plant-disease-model
HF_TOKEN = os.getenv("HF_TOKEN", "")

_fertilizer_model_lock = threading.Lock()
_fertilizer_model: Optional[Any] = None

_crop_model_lock = threading.Lock()
_crop_model: Optional[Any] = None
_crop_label_encoder: Optional[Any] = None

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


def load_crop_model() -> Tuple[Optional[Any], Optional[Any]]:
    """Load crop recommendation model and optional label encoder if present.

    Tries XGBoost first, then RandomForest. Returns (model, label_encoder).
    """
    global _crop_model, _crop_label_encoder
    if _crop_model is not None:
        return _crop_model, _crop_label_encoder
    with _crop_model_lock:
        if _crop_model is not None:
            return _crop_model, _crop_label_encoder
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
        models_dir = os.path.join(base_dir, "models")
        candidates = [
            os.path.join(models_dir, "xgb_crop_recommendation_model.pkl"),
            os.path.join(models_dir, "Random_Forest_npk_recommendation.pkl"),
        ]
        model_path = next((p for p in candidates if os.path.exists(p)), None)
        if model_path is None:
            # No model available; return None gracefully
            return None, None
        with open(model_path, "rb") as f:
            _crop_model = pickle.load(f)
        # Optional label encoder
        le_path = os.path.join(models_dir, "label_encoder.pkl")
        if os.path.exists(le_path):
            try:
                with open(le_path, "rb") as f:
                    _crop_label_encoder = pickle.load(f)
            except Exception:
                _crop_label_encoder = None
        return _crop_model, _crop_label_encoder

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


def crop_recommendation_ml(features: Dict[str, float]) -> Optional[List[Dict[str, Any]]]:
    """Run ML crop recommendation if model exists; otherwise return None.

    Expects features including nitrogen, phosphorus, potassium, ph, rainfall, temperature, humidity.
    Tolerates missing optional features by trimming the input vector to model's expected length.
    """
    model, label_encoder = load_crop_model()
    if model is None:
        return None
    ordered_keys = [
        "nitrogen",
        "phosphorus",
        "potassium",
        "ph",
        "rainfall",
        "temperature",
        "humidity",
    ]
    x = [features.get(k) for k in ordered_keys]
    # Trim trailing None values to adapt to models trained on fewer features
    while x and x[-1] is None:
        x.pop()
    if len(x) < 3 or any(v is None for v in x[:3]):
        raise ValueError("Missing required features: nitrogen, phosphorus, potassium")
    # Predict
    pred = getattr(model, "predict", None)
    proba = getattr(model, "predict_proba", None)
    if not callable(pred):
        raise RuntimeError("Crop model does not support predict()")
    y = pred([x])
    # Resolve labels
    def decode(label: Any) -> str:
        try:
            if label_encoder is not None:
                return str(label_encoder.inverse_transform([label])[0])
        except Exception:
            pass
        return str(label)
    # With probabilities
    if callable(proba):
        try:
            p = proba([x])[0]
            # Determine class labels from encoder or model.classes_
            classes = None
            try:
                if label_encoder is not None:
                    classes = [decode(c) for c in range(len(p))]
            except Exception:
                classes = None
            if classes is None:
                try:
                    classes = [str(c) for c in getattr(model, "classes_", list(range(len(p))))]
                except Exception:
                    classes = [str(i) for i in range(len(p))]
            pairs = sorted(zip(classes, p), key=lambda t: t[1], reverse=True)
            return [
                {"crop": cls, "confidence": round(float(prob), 3)} for cls, prob in pairs[:5]
            ]
        except Exception:
            pass
    # Fallback: single label without proba
    label = y[0] if isinstance(y, (list, tuple)) else y
    return [
        {"crop": decode(label), "confidence": None}
    ]


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


def predict_leaf_disease_hf(image_bytes: bytes) -> Optional[Dict[str, Any]]:
    """Call Hugging Face Inference API for plant disease classification if configured.

    Returns a dict with keys: label (str), confidence (float), treatment (str | None)
    or None if not configured or on error.
    """
    if not HF_API_URL:
        return None
    headers = {"Accept": "application/json"}
    if HF_TOKEN:
        headers["Authorization"] = f"Bearer {HF_TOKEN}"
    try:
        resp = requests.post(HF_API_URL, headers=headers, data=image_bytes, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        # Expected formats:
        # - List of {"label": str, "score": float}
        # - Or {"error": "..."} for cold starts; handle gracefully
        if isinstance(data, dict) and "error" in data:
            return None
        if isinstance(data, list) and data:
            top = max(data, key=lambda x: x.get("score", 0.0))
            label = str(top.get("label", "Unknown")).strip()
            conf = float(top.get("score", 0.0))
            treatment = None
            # Simple suggestions by keyword; extendable later
            low = label.lower()
            if any(k in low for k in ["blight", "spot", "mildew", "rust"]):
                treatment = "Apply appropriate fungicide; remove infected leaves; improve airflow."
            elif any(k in low for k in ["mosaic", "virus"]):
                treatment = "Remove infected plants; control vectors; sanitize tools."
            elif any(k in low for k in ["healthy", "normal"]):
                treatment = "No action needed."
            return {"label": label, "confidence": round(conf, 3), "treatment": treatment}
    except Exception:
        return None
    return None
