from sqlalchemy import Column, Integer, String, DateTime, Text, Float
from sqlalchemy import ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON as SAJSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

# Use SAJSON for cross-db; JSONB if postgres
try:
    JSONType = JSONB  # type: ignore
except Exception:
    JSONType = SAJSON  # fallback


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    histories = relationship("UserHistory", back_populates="user", cascade="all, delete-orphan")
    plots = relationship("Plot", back_populates="owner", cascade="all, delete-orphan")


class UserHistory(Base):
    __tablename__ = "user_histories"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    type = Column(String(50), nullable=False)  # crop_recommendation, disease_detection, cost_estimation, weather_alert
    payload = Column(JSONType().with_variant(SAJSON, 'sqlite'), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="histories", primaryjoin="User.id==foreign(UserHistory.user_id)")


class Plot(Base):
    __tablename__ = "plots"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    name = Column(String(100), nullable=False)
    # store polygon coordinates as list of {lat,lng}
    coordinates = Column(JSONType().with_variant(SAJSON, 'sqlite'), nullable=False)
    area_hectares = Column(Float, nullable=False)
    # optional nutrient fields for crop recommendation context
    nitrogen = Column(Float, nullable=True)
    phosphorus = Column(Float, nullable=True)
    potassium = Column(Float, nullable=True)
    ph = Column(Float, nullable=True)
    organic_matter = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="plots", primaryjoin="User.id==foreign(Plot.user_id)")
    satellite_data = relationship("SatelliteData", back_populates="plot", cascade="all, delete-orphan")


class SatelliteData(Base):
    __tablename__ = "satellite_data"
    id = Column(Integer, primary_key=True, index=True)
    plot_id = Column(Integer, ForeignKey("plots.id"), index=True, nullable=False)
    date = Column(String(10), nullable=False)  # ISO date string
    ndvi = Column(Float, nullable=True)
    soil_moisture = Column(Float, nullable=True)
    crop_type = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    plot = relationship("Plot", back_populates="satellite_data", primaryjoin="Plot.id==foreign(SatelliteData.plot_id)")
