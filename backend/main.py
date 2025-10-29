import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from database import Base, engine, SessionLocal
from utils import load_fertilizer_model, load_crop_model
from routes.auth_routes import router as auth_router
from routes.predict_routes import router as predict_router
from routes.utility_routes import router as utility_router
from routes.plot_routes import router as plot_router

load_dotenv()

app = FastAPI(title=os.getenv("APP_NAME", "ML-Assisted Farming API"))

# CORS
origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins != ['*'] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    # Eagerly load ML models to fail fast if missing/incompatible
    try:
        load_fertilizer_model()
    except Exception:
        # Defer errors to request time but avoid crashing startup
        pass
    try:
        load_crop_model()
    except Exception:
        pass


@app.get("/")
def root():
    return {"status": "ok", "app": os.getenv("APP_NAME", "ML-Assisted Farming API")}


# Routers
app.include_router(auth_router)
app.include_router(predict_router)
app.include_router(utility_router)
app.include_router(plot_router)
