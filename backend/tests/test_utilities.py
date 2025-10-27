import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import patch

from main import app
from database import Base, get_db


@pytest.fixture(scope="module")
def test_db():
    SQLALCHEMY_DATABASE_URL = "sqlite:///./test_utils.db"
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()


@pytest.fixture()
def client_with_user(test_db):
    client = TestClient(app)
    client.post("/auth/register", json={
        "email": "u@example.com",
        "password": "password123",
        "full_name": "U Test"
    })
    login = client.post("/auth/login", data={"username": "u@example.com", "password": "password123"})
    token = login.json()["access_token"]
    return client, token


def test_estimate_cost(client_with_user):
    client, token = client_with_user
    resp = client.post(
        "/estimate_cost",
        headers={"Authorization": f"Bearer {token}"},
        json={"crop": "Rice", "area_hectares": 2.5},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["crop"] == "Rice"
    assert data["area_hectares"] == 2.5
    assert data["expected_profit"] == round(data["expected_revenue"] - data["investment"], 2)


def test_weather_alerts(client_with_user):
    client, token = client_with_user

    fake_resp = {
        "properties": {
            "parameter": {
                "T2M": {"20240101": 36},
                "PRECTOTCORR": {"20240101": 25},
            }
        }
    }

    with patch("utils.requests.get") as mock_get:
        class M:
            def raise_for_status(self):
                return None

            def json(self):
                return fake_resp
        mock_get.return_value = M()
        resp = client.post(
            "/weather_alerts",
            headers={"Authorization": f"Bearer {token}"},
            json={"latitude": 12.9, "longitude": 77.6, "start": "20240101", "end": "20240101"},
        )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "alerts" in data and isinstance(data["alerts"], list)
    assert any(a["type"] == "High Temperature" for a in data["alerts"]) or any(a["type"] == "Heavy Rainfall" for a in data["alerts"]) 
