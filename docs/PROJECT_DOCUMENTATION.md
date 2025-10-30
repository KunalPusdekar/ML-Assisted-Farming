# ML-Assisted Farming – Project Documentation

A full-stack application for crop recommendation, cost estimation, disease detection, weather alerts, and land selection with satellite data previews.

This document explains the aim of the project and the purpose of each file/folder, including why each piece of code is needed.

## Aim of the Project

- Provide ML-assisted decision support for farmers.
- Features:
  - Crop recommendation using ML and heuristic fallback.
  - Cost estimation and profitability analysis.
  - Disease detection from leaf images (stub/predict flow).
  - Weather-based alerts via NASA POWER API integration.
  - Land selection with polygon drawing and satellite metrics preview.
- Tech: FastAPI, SQLAlchemy, JWT auth, React (Vite), Material UI, Recharts, Leaflet, Docker, docker-compose.

---

# Repository Overview

- **Root**
  - **README.md**
    - Purpose: High-level overview, setup, and run instructions.
    - Why needed: Primary guide for developers and users.
  - **docker-compose.yml**
    - Purpose: Defines services for database, backend, and frontend containers.
    - Why needed: One command to run full stack with correct networking and envs.
  - **.gitignore**
    - Purpose: Excludes build artifacts, virtual envs, local DB, and env files.
    - Why needed: Keeps repo clean and avoids committing secrets and binaries.
  - **backend/**
    - Purpose: Backend API (FastAPI), business logic, persistence, and ML hooks.
    - Why needed: Core server for authentication and all API endpoints.
  - **frontend/**
    - Purpose: React SPA providing the UI/UX.
    - Why needed: Client interface to interact with backend features.
  - **models/**
    - Purpose: ML assets (pickled models, notebooks).
    - Why needed: Enables ML-based recommendations when models are present.
  - **satelliteFeature/** (empty)
    - Purpose: Placeholder for future satellite-related assets.
    - Why needed: Organizational scaffold for further work.
  - **.pytest_cache/**, **.git/**
    - Purpose: Tooling caches and VCS metadata.
    - Why needed: Not part of source; auto-managed by tools.

---

# Backend

Location: `backend/`

- **.env.example**
  - Purpose: Example environment configuration.
  - Why needed: Safe template to create local `.env` without exposing secrets.
- **.env**
  - Purpose: Actual environment variables (ignored by git).
  - Why needed: Configure secrets, DB URL, CORS origins, JWT settings.
- **requirements.txt**
  - Purpose: Python dependencies with pinned versions.
  - Why needed: Reproducible installs locally and in Docker.
- **Dockerfile**
  - Purpose: Builds backend container image.
  - Why needed: Production-ready containerization for deployment.
- **app.db** (SQLite file, dev)
  - Purpose: Local development database if `DATABASE_URL` uses SQLite.
  - Why needed: Quick local testing without Postgres.
- **__pycache__/**
  - Purpose: Python bytecode cache.
  - Why needed: Performance only; not source.

Core application code:

- **main.py**
  - Purpose: FastAPI app initialization; CORS; router includes; startup hooks to create tables and warm ML models.
  - Why needed: Application entry point `uvicorn main:app`.
- **database.py**
  - Purpose: SQLAlchemy engine/session setup and `get_db` dependency.
  - Why needed: Centralized DB connection management for all routes.
- **models.py**
  - Purpose: ORM models (e.g., `User`, `UserHistory`, `Plot`, `SatelliteData`).
  - Why needed: Defines database schema and relationships used by the API.
- **schemas.py**
  - Purpose: Pydantic models for request/response validation (e.g., `UserCreate`, `CropInput`, `CostResponse`, `PlotCreate`).
  - Why needed: Ensures typed, validated payloads and documented OpenAPI.
- **auth.py**
  - Purpose: Password hashing (Argon2), JWT creation/verification, `get_current_user` dependency.
  - Why needed: Secure authentication and protecting routes.
- **utils.py**
  - Purpose: Utility functions: load ML models, heuristic fallbacks, fertilizer recommendation, cost estimation, NASA POWER fetch, weather alert derivation.
  - Why needed: Encapsulates business and integration logic reused across routes.

Routers (modular endpoints): `backend/routes/`

- **__init__.py**
  - Purpose: Package marker.
  - Why needed: Allows importing routers as a package.
- **auth_routes.py**
  - Purpose: `/auth/register`, `/auth/login` endpoints.
  - Why needed: User onboarding/authentication flows returning JWT.
- **predict_routes.py**
  - Purpose: `/predict_crop`, `/predict_disease`, `/fertilizer_recommendation`.
  - Why needed: ML/heuristic predictions and storing history per user.
- **utility_routes.py**
  - Purpose: `/estimate_cost`, `/weather_alerts`, `/user_history`, `/profile`.
  - Why needed: Cost/profit analysis, weather advisories, history retrieval, profile update.
- **plot_routes.py**
  - Purpose: Land selection workflows: `POST /plots`, `GET /plots`, `GET /plots/{id}/satellite-data`.
  - Why needed: Persist user plots, compute area, seed and return satellite metrics.

Tests: `backend/tests/`

- **test_auth.py**
  - Purpose: Validates register/login flows using in-memory SQLite.
  - Why needed: Ensures auth remains correct during changes.
- **test_utilities.py**
  - Purpose: Tests cost estimation and weather alerts (with mocked NASA POWER).
  - Why needed: Guards core utilities and API contract.

---

# Frontend

Location: `frontend/`

- **.env.example** / **.env**
  - Purpose: Set `VITE_API_BASE_URL` for API calls.
  - Why needed: Configures backend endpoint for different environments.
- **package.json** / **package-lock.json**
  - Purpose: Dependencies and scripts (`dev`, `build`, `preview`).
  - Why needed: Manage React app lifecycle and reproducible installs.
- **vite.config.js**
  - Purpose: Vite configuration (React plugin, dev server, build dir).
  - Why needed: Fast dev server and optimized builds.
- **Dockerfile**
  - Purpose: Multi-stage build (Node build, Nginx serve static files).
  - Why needed: Production container for frontend.
- **index.html**
  - Purpose: SPA root with Leaflet CSS links; mounts React at `#root`.
  - Why needed: Entry HTML for the client app.
- **nginx.conf**
  - Purpose: Nginx config for SPA routing and static hosting.
  - Why needed: Serves built assets and supports client-side routing.
- **node_modules/**, **dist/** (ignored)
  - Purpose: Installed dependencies and build output.
  - Why needed: Tooling outputs; not tracked in git.

Source: `frontend/src/`

- **main.jsx**
  - Purpose: App bootstrap; wraps with `AppThemeProvider`, `BrowserRouter`, and `AuthProvider`.
  - Why needed: Sets global providers and routing foundation.
- **App.jsx**
  - Purpose: Defines routes and top-level layout (Navbar, Footer, Container, transitions).
  - Why needed: Navigation and protected route structure.

Services and State:

- **services/api.js**
  - Purpose: Axios instance with normalized baseURL and auth interceptor.
  - Why needed: Centralized HTTP client with JWT header injection.
- **store/AuthContext.jsx**
  - Purpose: Auth state (token/user), login/signup/logout actions, persistence, navigation.
  - Why needed: Application-wide authentication and route protection.
- **store/ThemeContext.jsx**
  - Purpose: Color mode/theme context (light/dark) used in UI (e.g., Navbar toggles).
  - Why needed: Consistent theming and user preference handling.

Components:

- **components/ProtectedRoute.jsx**
  - Purpose: Guarded routes; redirects to `/login` if not authenticated.
  - Why needed: Enforces auth for app pages.
- **components/Navbar.jsx**
  - Purpose: Top navigation with feature links, theme toggle, and auth actions.
  - Why needed: Primary nav and brand surface across pages.
- **components/Footer.jsx**
  - Purpose: Rich footer with links, newsletter mockup, social icons.
  - Why needed: UX completeness and navigation redundancy.
- **components/InfoCard.jsx**
  - Purpose: Small display card for metrics and summaries.
  - Why needed: Reusable information blocks across pages.
- **components/AlertBanner.jsx**
  - Purpose: Standardized alert component with title and severity.
  - Why needed: Consistent feedback messaging.

Pages:

- **pages/Dashboard.jsx**
  - Purpose: Overview of features, quick links, and recent history.
  - Why needed: Central hub for the app after login.
- **pages/LandSelection.jsx**
  - Purpose: Draw polygons via Leaflet, submit plot with optional nutrients, preview seeded satellite metrics in charts, and view saved plots.
  - Why needed: Land planning feature integrated with backend plots API.
- **pages/CropRecommendation.jsx**
  - Purpose: Form for soil/weather inputs; displays ML/heuristic crop recommendations.
  - Why needed: Core recommendation functionality.
- **pages/CostEstimation.jsx**
  - Purpose: Crop + area form; shows investment vs revenue and profit breakdown (charts and figures).
  - Why needed: Budgeting and profitability analysis.
- **pages/DiseaseDetection.jsx**
  - Purpose: Upload leaf image; sends to backend; shows label and confidence.
  - Why needed: Plant health diagnostic workflow.
- **pages/WeatherAlerts.jsx**
  - Purpose: Inputs lat/lng and date range; shows derived alerts and messages.
  - Why needed: Weather risk advisory.
- **pages/Login.jsx** / **pages/Signup.jsx**
  - Purpose: Auth forms for sign-in and registration.
  - Why needed: Access control and onboarding.
- **pages/Profile.jsx**
  - Purpose: Update profile (e.g., full name) via backend `/profile`.
  - Why needed: Basic user profile management.

---

# Models

Location: `models/`

- **FertiRecom.pkl**
  - Purpose: Fertilizer recommendation model (large pickled artifact).
  - Why needed: Enables ML-based fertilizer recommendations.
- **xgb_crop_recommendation_model.pkl**, **label_encoder.pkl**
  - Purpose: XGBoost crop recommendation model and its label encoder.
  - Why needed: ML-powered crop prediction endpoints.
- **Random_Forest_npk_recommendation.pkl**
  - Purpose: Alternative or legacy model artifact.
  - Why needed: Supports experimentation/fallbacks.
- **MODEL_*.ipynb** notebooks
  - Purpose: Model training and experimentation notebooks.
  - Why needed: Reproducibility and future model improvements.

Note: Backend `utils.py` looks for ML models in project paths and falls back to heuristics if not found or incompatible.

---

# Orchestration & Deployment

- **docker-compose.yml** (root)
  - Purpose: Spins up Postgres, backend (FastAPI), and frontend (Nginx) together.
  - Why needed: Local dev and demo in a reproducible stack.
- **backend/Dockerfile**, **frontend/Dockerfile**
  - Purpose: Containerize services with production defaults.
  - Why needed: Deployment to any container platform.

---

# How Pieces Work Together

- Frontend calls backend via `services/api.js` using `VITE_API_BASE_URL`.
- JWT token stored in `localStorage` and injected via Axios interceptor.
- Backend validates requests with `get_current_user` and persists actions in `UserHistory`.
- Land selection persists `Plot` + seeded `SatelliteData`; frontend charts consume `/plots/{id}/satellite-data`.
- ML endpoints attempt to load models (from `models/`) and gracefully degrade to heuristics.

---

# Running the Project

- Local backend: `cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && uvicorn main:app --reload`
- Local frontend: `cd frontend && npm install && npm run dev`
- Full stack via Docker: `docker compose up --build`

---

# Notes

- Do not commit `.env` or `backend/app.db` (already ignored).
- If SQLite schema changed earlier, either migrate or recreate `app.db` per README notes.
- For production, set strong `JWT_SECRET` and proper `CORS_ORIGINS`.
