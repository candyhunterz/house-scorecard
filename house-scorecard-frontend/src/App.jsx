// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'; // Import router components
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Compare from './pages/Compare';
import Criteria from './pages/Criteria';
import MapPage from './pages/MapPage';
import PropertyDetail from './pages/PropertyDetail';
import AddProperty from './pages/AddProperty';

function App() {
  return (
    // Wrap the entire application in BrowserRouter
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content-area">
          {/* Define the routes */}
          <Routes>
            {/* Default route redirects to /properties */}
            <Route path="/" element={<Navigate replace to="/properties" />} />

            {/* Dashboard / Properties List */}
            <Route path="/properties" element={<Dashboard />} />

            {/* View/Edit details of a specific property */}
            {/* The ':propertyId' is a URL parameter */}
            <Route path="/properties/:propertyId" element={<PropertyDetail />} />

            {/* Add New Property Form */}
            <Route path="/add-property" element={<AddProperty />} />

            {/* Comparison Page */}
            <Route path="/compare" element={<Compare />} />

            {/* Criteria Management Page */}
            <Route path="/criteria" element={<Criteria />} />

            {/* Map View Page */}
            <Route path="/map" element={<MapPage />} />

            {/* Add a catch-all for unknown routes (optional) */}
            <Route path="*" element={<div><h2>404 Not Found</h2><p>Sorry, this page doesn't exist.</p></div>} />
          </Routes>

          {/* FAB can remain here if it's global, or moved into specific pages */}
          {/* We'll make it navigate later */}
           {/* <button className="fab" title="Add New Property">+</button>  */}
           {/* Moved FAB handling to Dashboard for now, can be adjusted */}
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;