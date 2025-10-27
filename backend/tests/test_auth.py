import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

from main import app
from database import Base, get_db


@pytest.fixture(scope="module")
def test_db():
    # Use an in-memory SQLite DB for tests
    SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
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


def test_register_and_login(test_db):
    client = TestClient(app)

    # Register
    resp = client.post("/auth/register", json={
        "email": "test@example.com",
        "password": "password123",
        "full_name": "Test User"
    })
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["email"] == "test@example.com"

    # Login
    resp = client.post("/auth/login", data={"username": "test@example.com", "password": "password123"})
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    assert token
