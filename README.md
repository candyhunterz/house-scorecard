# House Scorecard App

A web application designed to help users objectively compare and score potential houses based on their personalized criteria (Must-Haves, Nice-to-Haves, Deal Breakers).

This repository contains:
1.  **Frontend:** A React application built with Vite providing the user interface.
2.  **Backend:** An initial Django project setup serving as the foundation for the API and data persistence.

**Note:** Currently, the frontend uses local React Context state and does not communicate with the backend API (which is not fully built yet). Data added in the frontend will be lost on page refresh.

## Features (Current State)

**Frontend:**
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
*   Basic Django project structure using `django-admin`.
*   `properties` Django app created.
*   `Property` model defined in `properties/models.py` (including fields for address, price, stats, notes, location, imageUrls (JSON), ratings (JSON), score).
*   Database migrations created and applied (using default SQLite for now).
*   Django Admin interface configured to manage `Property` data.
*   Required libraries installed: `Django`, `djangorestframework`, `psycopg2-binary` (for potential PostgreSQL use), `django-cors-headers`.

## Tech Stack

*   **Frontend:** React, Vite, JavaScript, CSS, `react-router-dom`, `leaflet`, `react-leaflet`
*   **Backend:** Python, Django, Django Rest Framework (DRF)
*   **Database (Default):** SQLite (Configured for PostgreSQL compatibility)

## Prerequisites

*   **Node.js and npm** (or yarn): For running the React frontend. [Download Node.js](https://nodejs.org/)
*   **Python 3:** For running the Django backend. [Download Python](https://www.python.org/)
*   **pip:** Python package installer (usually comes with Python).
*   **(Recommended) Git:** For version control.

## Setup and Running Instructions

**1. Clone the Repository (If applicable)**

```bash
git clone <your-repository-url>
cd <project-root-directory>

BACKEND SETUP

# Navigate to the backend directory
cd scorecard-backend

# (Recommended) Create and activate a virtual environment
python -m venv venv
# On macOS/Linux:
source venv/bin/activate
# On Windows (Git Bash/PowerShell):
# source venv/Scripts/activate or .\venv\Scripts\Activate.ps1

# Install backend dependencies
# (If requirements.txt exists):
# pip install -r requirements.txt
# (If not, generate it first, then install, or install manually):
# pip freeze > requirements.txt # Run this once after installing manually
pip install django djangorestframework psycopg2-binary django-cors-headers

# Apply database migrations
python manage.py migrate

# Create a superuser account for the Django Admin
python manage.py createsuperuser
# Follow the prompts to create username and password

# Run the Django development server
python manage.py runserver

# The backend server should now be running, typically at http://127.0.0.1:8000/
# You can access the admin panel at http://127.0.0.1:8000/admin/ and log in.

FRONTEND SETUP
# Navigate to the frontend directory from the project root
cd ../house-scorecard-frontend
# Or if starting from scratch: cd path/to/house-scorecard-frontend

# Install frontend dependencies
npm install
# or: yarn install

# Run the Vite development server
npm run dev
# or: yarn dev

# The frontend development server should now be running, typically at http://localhost:5173/
# Open this URL in your browser to use the app.

Next Steps
Implement Django Rest Framework Serializers and Views for the Property and Criterion models.

Create API endpoints (urls.py) for CRUD operations.

Refactor frontend Contexts and components to fetch data from and send data to the backend API instead of using local state.

Implement user authentication (registration/login) and associate data with users.

Enhance error handling and loading states on the frontend.