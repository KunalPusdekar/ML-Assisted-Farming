# ML-Assisted Farming: Smart Crop Recommendation and Planning System

A full-stack production-ready web application that provides:

- Crop recommendation
- Cost estimation and profitability analysis
- Disease detection via uploaded images
- Weather-based alerts using NASA POWER API
- Real-time dashboard with interactive charts and a modern UI

Tech stack: FastAPI, SQLAlchemy, PostgreSQL (SQLite fallback), JWT auth, React (Vite), Material-UI, Recharts, Axios, Docker.
Additional: Leaflet + Leaflet.Draw for Land Selection, Chart.js for previews.

## Repository Structure

```
.
├── backend
│   ├── Dockerfile
│   ├── .env.example
│   ├── .env
│   ├── main.py
│   ├── requirements.txt
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── auth.py
│   ├── utils.py
│   ├── routes
│   │   ├── __init__.py
│   │   ├── auth_routes.py
│   │   ├── predict_routes.py
│   │   ├── utility_routes.py
│   │   └── plot_routes.py
│   └── tests
│       ├── test_auth.py
│       └── test_utilities.py
├── frontend
│   ├── Dockerfile
│   ├── .env.example
│   ├── index.html
│   ├── nginx.conf
│   ├── package.json
│   ├── vite.config.js
│   └── src
│       ├── App.jsx
│       ├── main.jsx
│       ├── services
│       │   └── api.js
│       ├── store
│       │   └── AuthContext.jsx
│       ├── components
│       │   ├── AlertBanner.jsx
│       │   ├── Footer.jsx
│       │   ├── InfoCard.jsx
│       │   ├── Navbar.jsx
│       │   └── ProtectedRoute.jsx
│       └── pages
│           ├── CostEstimation.jsx
│           ├── CropRecommendation.jsx
│           ├── Dashboard.jsx
│           ├── DiseaseDetection.jsx
│           ├── LandSelection.jsx
│           ├── Login.jsx
│           ├── Profile.jsx
│           └── WeatherAlerts.jsx
└── docker-compose.yml
```

## Backend

- FastAPI app entrypoint: `backend/main.py`
- Database: PostgreSQL via `docker-compose` (service `db`). Local dev default is SQLite (override via `DATABASE_URL`).
- Auth: JWT with register/login (`/auth/register`, `/auth/login`).
- Routes:
  - `POST /predict_crop`
  - `POST /predict_disease`
  - `POST /estimate_cost`
  - `POST /weather_alerts`
  - `GET /user_history`
  - `PUT /profile`
  - Land selection:
    - `POST /plots` (Create a plot with polygon + optional nutrients; seeds satellite data)
    - `GET /plots` (List current user's plots)
    - `GET /plots/{plot_id}/satellite-data` (NDVI, soil moisture, crop_type)

### Environment

Copy and adjust the example env:

```
cp backend/.env.example backend/.env
```

Important variables:

- `DATABASE_URL` (e.g. `postgresql+psycopg2://postgres:postgres@localhost:5432/ml_farming`)
- `JWT_SECRET` (set a strong secret)
- `CORS_ORIGINS` (comma-separated origins for frontend)

### Run locally (without Docker)

From the `backend` directory:

```
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

API available at http://localhost:8000

Notes:
- Password hashing uses Argon2 (via `argon2-cffi`).
- On SQLite schema changes (e.g., adding `crop_type` to `satellite_data`), either drop `backend/app.db` or run an `ALTER TABLE` (see below).

### Tests

From the `backend` directory:

```
pytest -q
```

## Frontend

Environment variable:

```
cp frontend/.env.example frontend/.env
# Optionally edit VITE_API_BASE (defaults to http://localhost:8000)
```

Install and run (from `frontend`):

```
npm install
npm run dev
```

App served at http://localhost:5173

Install additional UI deps for Land Selection:

```
cd frontend
npm install leaflet leaflet-draw chart.js
```

## Docker (Full Stack)

Ensure Docker is installed. From repository root:

```
docker compose up --build
```

Services:
- Database: `localhost:5432`
- Backend API: `http://localhost:8000`
- Frontend (Nginx): `http://localhost:5173`

The backend uses PostgreSQL in Docker by default via `DATABASE_URL=postgresql+psycopg2://postgres:postgres@db:5432/ml_farming`.

## Authentication Flow

- Register via `/auth/register` with JSON: `{ email, password, full_name }`.
- Login via `/auth/login` using form data, returns a JWT. The frontend stores this token in `localStorage`.
- Authorized routes require `Authorization: Bearer <token>`.

## Land Selection Feature

Frontend:
- Route: `/land-selection` (protected). Draw polygons on a Leaflet map using toolbar or Start/Finish buttons.
- Inputs: optional nutrients (N, P, K, pH, Organic Matter).
- Preview: mock NDVI and soil moisture history.

Backend:
- `POST /plots` body example:
  ```json
  {
    "name": "North Field",
    "coordinates": [
      {"lat": 40.7128, "lng": -74.0060},
      {"lat": 40.7228, "lng": -74.0160},
      {"lat": 40.7328, "lng": -74.0060}
    ],
    "nitrogen": 50,
    "phosphorus": 20,
    "potassium": 30,
    "ph": 6.5,
    "organic_matter": 2.1
  }
  ```
- Area calculation uses a shoelace formula with rough lat/lng conversion.
- Seeds 6 months of satellite data (18 points) with fields: `date`, `ndvi`, `soil_moisture`, `crop_type`.

Database note (SQLite):
- If you created the DB before `crop_type` existed, add it without losing data:
  ```bash
  sqlite3 backend/app.db "ALTER TABLE satellite_data ADD COLUMN crop_type VARCHAR(50);"
  ```
- Or delete the DB for a clean start: `rm backend/app.db` (dev only).

## Notes on ML Models

- The application integrates endpoints for crop recommendation and disease detection. Model training and internals are intentionally not included.
- If you have pre-built models, place them at backend root as:
  - `backend/crop_recommendation_model.pkl`
  - `backend/crop_disease_model.h5`
- The current implementation provides deterministic, production-safe behavior without bundling model code, so the API remains fully functional.

## CORS

`CORS_ORIGINS` in backend `.env` controls allowed origins. Default allows `http://localhost:5173` and `http://localhost:3000`.

## CI/CD Readiness

- Backend tests via `pytest`.
- Deterministic, idempotent containers for frontend and backend.
- Suggested pipeline steps:
  - Install backend deps and run `pytest`.
  - Build frontend `npm ci && npm run build` and backend container images.
  - Deploy images to your registry and orchestrator.

## License

This project is provided as-is for demonstration and production adaptation.
