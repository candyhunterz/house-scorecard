# House Scorecard App

A web application designed to help users objectively compare and score potential houses based on their personalized criteria (Must-Haves, Nice-to-Haves, Deal Breakers).

This repository contains:
1.  **Frontend:** A React application built with Vite providing the user interface.
2.  **Backend:** A Django project serving as the API and data persistence layer.

## Features

**Frontend:**
*   User registration and login.
*   Add new property details (address, price, stats, notes, image URLs).
*   View properties list on a dashboard with enhanced search and filtering.
*   **Property Status Tracking**: Full pipeline management (Interested → Viewing Scheduled → Viewed → Offer Made → Under Contract → Closed → Passed).
*   **Advanced Filtering**: Filter by price, score, beds, baths, square footage, criteria status, and property status.
*   **Enhanced Search**: Real-time search across property addresses and notes.
*   View detailed information for a single property with status timeline.
*   Define custom criteria (Must-Haves, Nice-to-Haves with weights/categories/rating types, Deal Breakers).
*   Edit/Delete existing criteria with confirmation dialogs.
*   Rate properties against defined criteria using various input types (Checkbox, Stars, Scale 1-10).
*   Dynamically calculated property score based on ratings and criteria with instant updates.
*   View a breakdown of how the score was calculated.
*   **Toast Notifications**: User-friendly notifications for all actions.
*   **Settings Page**: Manage criteria and application preferences.
*   Display images associated with properties (using URLs) with gallery view.

**Backend:**
*   Django project structure with a `core` app.
*   `Property`, `Criterion`, and `Rating` models defined in `core/models.py`.
*   **Enhanced Property Model**: Includes `status`, `status_history`, and `score` fields for complete tracking.
*   Scoring logic implemented in the `Property` model with automatic recalculation.
*   **Full Status Support**: 7-stage property status pipeline with history tracking.
*   REST API endpoints for user management and all core models using Django Rest Framework and Simple JWT.
*   **Complete API Integration**: All frontend features fully synchronized with backend.
*   Secure CORS policy for production.
*   Error monitoring with Sentry.

## Tech Stack

*   **Frontend:** React, Vite, JavaScript, CSS, `react-router-dom`, React Context API
*   **Backend:** Python, Django, Django Rest Framework (DRF), Gunicorn
*   **Database:** PostgreSQL (production), SQLite (development)
*   **State Management:** React Context with localStorage fallback
*   **UI/UX:** Custom CSS with responsive design, Toast notifications, Confirmation dialogs
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

# Apply database migrations (includes new status tracking fields)
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

## Recent Updates (Latest Version)

### 🎉 **Major Feature Additions**

**Property Status Tracking System**
- Complete 7-stage pipeline: Interested → Viewing Scheduled → Viewed → Offer Made → Under Contract → Closed → Passed
- Status history tracking with timestamps and notes
- Visual status indicators with color-coded badges
- Status filtering and search capabilities

**Enhanced User Experience** 
- Toast notification system replacing browser alerts
- Confirmation dialogs for destructive actions
- Immediate UI feedback for all operations
- Real-time search and advanced filtering
- Settings page for criteria management

**Backend Integration Improvements**
- Full database persistence for all new features
- Status and status history fields added to Property model
- Complete API synchronization between frontend and backend  
- Robust error handling with localStorage fallback
- Database migration for seamless upgrades

### 🔧 **Technical Improvements**

**State Management**
- Optimized React Context implementation
- Prevented infinite API loops
- Fixed React re-rendering issues
- Improved component lifecycle management

**Data Persistence**
- All ratings, scores, and status changes persist to database
- localStorage backup for offline capability
- Immediate local updates with background sync
- Data integrity through proper validation

**User Interface**
- Responsive design for mobile compatibility
- Enhanced property cards with status display
- Improved property detail page layout
- Better visual hierarchy and user flow

### 📱 **New User Capabilities**

- Track properties through entire house hunting process
- See complete timeline of property status changes  
- Filter properties by status, criteria, and custom ranges
- Get instant feedback for all actions
- Manage preferences through dedicated settings page
- View property galleries with improved image handling

### 🚀 **Deployment Ready**

- Frontend build passes with all optimizations
- Backend migrations applied successfully
- Full API compatibility verified
- Error handling tested and robust
- Production-ready configuration maintained