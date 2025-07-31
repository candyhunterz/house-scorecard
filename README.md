# House Scorecard App

A web application designed to help users objectively compare and score potential houses based on their personalized criteria (Must-Haves, Nice-to-Haves, Deal Breakers).

This repository contains:
1.  **Frontend:** A React application built with Vite providing the user interface.
2.  **Backend:** A Django project serving as the API and data persistence layer.

## Features

**Frontend:**
*   User registration and login.
*   Add new property details (address, price, stats, notes, image URLs).
*   View properties list on a dashboard.
*   Filter and sort the property list (by score, price, address).
*   View detailed information for a single property.
*   Define custom criteria (Must-Haves, Nice-to-Haves with weights/categories/rating types, Deal Breakers).
*   Edit/Delete existing criteria.
*   Rate properties against defined criteria using various input types (Checkbox, Stars, Scale 1-10).
*   Dynamically calculated property score based on ratings and criteria.
*   View a breakdown of how the score was calculated.
*   Compare multiple properties side-by-side in a table.
*   View properties on an interactive map (Map View).
*   Display images associated with properties (using URLs).

**Backend:**
*   Django project structure with a `core` app.
*   `Property`, `Criterion`, and `Rating` models defined in `core/models.py`.
*   Scoring logic implemented in the `Property` model.
*   REST API endpoints for user management and all core models using Django Rest Framework and Simple JWT.
*   Secure CORS policy for production.
*   Error monitoring with Sentry.

## Tech Stack

*   **Frontend:** React, Vite, JavaScript, CSS, `react-router-dom`, `leaflet`, `react-leaflet`
*   **Backend:** Python, Django, Django Rest Framework (DRF), Gunicorn
*   **Database:** PostgreSQL (production), SQLite (development)
*   **Monitoring:** Sentry

## Prerequisites

*   **Node.js and npm** (or yarn): For running the React frontend. [Download Node.js](https://nodejs.org/)
*   **Python 3:** For running the Django backend. [Download Python](https://www.python.org/)
*   **pip:** Python package installer (usually comes with Python).
*   **(Recommended) Git:** For version control.

## Local Development Setup

**1. Clone the Repository**

```bash
git clone <your-repository-url>
cd <project-root-directory>
```

**2. Backend Setup**

```bash
# Navigate to the backend directory
cd house-scorecard-backend

# Create and activate a virtual environment
python -m venv venv
# On macOS/Linux:
source venv/bin/activate
# On Windows (Git Bash/PowerShell):
# .\venv\Scripts\Activate.ps1

# Install backend dependencies
pip install -r requirements.txt

# Apply database migrations
python manage.py migrate

# Create a superuser account for the Django Admin
python manage.py createsuperuser

# Run the Django development server
python manage.py runserver
```

**3. Frontend Setup**

```bash
# Navigate to the frontend directory from the project root
cd ../house-scorecard-frontend

# Install frontend dependencies
npm install

# Run the Vite development server
npm run dev
```

## Deployment

This project is configured for deployment with Render for the backend and Vercel for the frontend.

### Backend (Render)

1.  **Create a Render account:** Go to [render.com](https://render.com) and sign up.
2.  **Create a new PostgreSQL database:** In the Render dashboard, create a new database. Copy the "Internal Database URL".
3.  **Create a new Web Service:** In the Render dashboard, create a new web service and connect it to your GitHub repository.
4.  **Configure the Web Service:**
    *   **Build Command:** `./build.sh`
    *   **Start Command:** `gunicorn scorecard_project.wsgi`
    *   **Environment Variables:**
        *   `DATABASE_URL`: Paste the internal database URL you copied.
        *   `SECRET_KEY`: Generate a new, strong secret key.
        *   `SENTRY_DSN`: Your Sentry DSN for the backend.
        *   `PYTHON_VERSION`: `3.11.4` (or your Python version)

### Frontend (Vercel)

1.  **Create a Vercel account:** Go to [vercel.com](https://vercel.com) and sign up.
2.  **Create a new project:** In the Vercel dashboard, import your project from your GitHub repository.
3.  **Configure the project:** Vercel will automatically detect that you're using Vite and configure the build settings for you.
4.  **Add Environment Variables:** In the project settings, add the following environment variables:
    *   `VITE_API_URL`: The URL of your deployed Render backend (e.g., `https://your-app-name.onrender.com/api`).
    *   `VITE_SENTRY_DSN`: Your Sentry DSN for the frontend.
5.  **Deploy:** Click "Deploy".

**Important:** After deploying the frontend, remember to add your Vercel app's URL to the `CORS_ALLOWED_ORIGINS` list in the backend `settings.py` and redeploy the backend for the change to take effect.