import os
import json
from typing import List, Dict, Any
import requests

NASA_POWER_BASE = os.getenv("NASA_POWER_BASE_URL", "https://power.larc.nasa.gov/api/temporal/daily/point")


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
