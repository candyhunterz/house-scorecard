// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Compare from './pages/Compare';
import Criteria from './pages/Criteria';
import MapPage from './pages/MapPage';
import PropertyDetail from './pages/PropertyDetail';
import AddProperty from './pages/AddProperty';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

function PrivateRoute({ children }) {
  const isAuthenticated = localStorage.getItem('accessToken');
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content-area">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected Routes */}
            <Route path="/" element={<PrivateRoute><Navigate replace to="/properties" /></PrivateRoute>} />
            <Route path="/properties" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/properties/:propertyId" element={<PrivateRoute><PropertyDetail /></PrivateRoute>} />
            <Route path="/add-property" element={<PrivateRoute><AddProperty /></PrivateRoute>} />
            <Route path="/compare" element={<PrivateRoute><Compare /></PrivateRoute>} />
            <Route path="/criteria" element={<PrivateRoute><Criteria /></PrivateRoute>} />
            <Route path="/map" element={<PrivateRoute><MapPage /></PrivateRoute>} />

            <Route path="*" element={<div><h2>404 Not Found</h2><p>Sorry, this page doesn't exist.</p></div>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;