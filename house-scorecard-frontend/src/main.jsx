// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { PropertyProvider } from './contexts/PropertyContext.jsx';
import { CriteriaProvider } from './contexts/CriteriaContext.jsx'; // Import Criteria Provider
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Wrap App with both Providers */}
    <PropertyProvider>
      <CriteriaProvider>
        <App />
      </CriteriaProvider>
    </PropertyProvider>
  </React.StrictMode>,
);