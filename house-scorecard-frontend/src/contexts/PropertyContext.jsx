// src/contexts/PropertyContext.jsx
import React, { createContext, useState, useContext, useCallback, useMemo, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const getApiUrl = (path) => `${API_BASE_URL}${path}`;

// 1. Create the Context
const PropertyContext = createContext();

// 2. Create a Provider Component
export function PropertyProvider({ children }) {
  // State holding the array of all property objects
  const [properties, setProperties] = useState([]);

    const getAuthHeaders = useCallback(() => {
      const token = localStorage.getItem('accessToken');
      return token ? { 'Authorization': `Bearer ${token}` } : {};
    }, []);

    useEffect(() => {
      const fetchProperties = async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          console.log("No access token found, skipping property fetch.");
          return;
        }
        try {
          const response = await fetch(getApiUrl('/properties/'), {
            headers: getAuthHeaders(),
          });
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          const data = await response.json();
          setProperties(data);
        } catch (error) {
          console.error('Failed to fetch properties:', error);
        }
      };

      fetchProperties();
    }, [getAuthHeaders]);

  // --- Action Functions (Memoized using useCallback for stable references) ---

  /** Adds a new property, parsing the image URLs string into an array */
  const addProperty = useCallback(async (newPropertyData) => {
    console.log("CONTEXT: addProperty called with raw data:", newPropertyData);

    // --- Parse imageUrlsString into an array ---
    let imageUrlsArray = [];
    if (newPropertyData.imageUrlsString) {
        // Split by newline OR comma (allowing flexibility), trim whitespace, filter out empty strings
        imageUrlsArray = newPropertyData.imageUrlsString
            .split(/[\n,]+/) // Regex to split by one or more newlines or commas
            .map(url => url.trim()) // Remove leading/trailing whitespace from each potential URL
            .filter(url => url && url.length > 5); // Remove empty strings and very short strings (basic filter)
            // Optional: Add more robust URL validation here if needed (e.g., using URL constructor)
    }
    console.log("CONTEXT: Parsed Image URLs:", imageUrlsArray);
    // --- End Parsing ---

    // Create the final property object to add to state
    const propertyWithId = {
        // Basic info from form data
        id: Date.now(), // Use timestamp for simple unique ID
        address: newPropertyData.address,
        listingUrl: newPropertyData.listingUrl || null,
        price: newPropertyData.price, // Assumes already parsed in form handler
        beds: newPropertyData.beds,   // Assumes already parsed
        baths: newPropertyData.baths, // Assumes already parsed
        sqft: newPropertyData.sqft,   // Assumes already parsed
        notes: newPropertyData.notes,
        // Add latitude/longitude later if included in form
        latitude: newPropertyData.latitude || null, // Example placeholder
        longitude: newPropertyData.longitude || null, // Example placeholder
        // Store the processed array of image URLs
        imageUrls: imageUrlsArray,
        // Defaults for new properties
        ratings: {},
        score: null
    };

    try {
      const response = await fetch(getApiUrl('/properties/'), {
        method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify(propertyWithId),
        });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const savedProperty = await response.json();
      setProperties(prevProperties => [...prevProperties, savedProperty]);
    } catch (error) {
      console.error('Failed to add property:', error);
    }
  }, []); // Depends only on setProperties (stable)

  /** Retrieves a property by its ID */
  const getPropertyById = useCallback((id) => {
    console.log(`CONTEXT: getPropertyById called for ID: ${id}`);
    const numId = parseInt(id, 10);
    // Find returns undefined if not found, which is handled in consuming components
    return properties.find(p => p.id === numId);
  }, [properties]); // Re-memoize only if the 'properties' array reference changes

  /** Updates the ratings and calculated score for a specific property */
  const updatePropertyRatingsAndScore = useCallback(async (propertyId, newRatings, newScore) => {
    console.log(`CONTEXT: updatePropertyRatingsAndScore called for ID: ${propertyId}`);
    
    const propertyToUpdate = properties.find(p => p.id === parseInt(propertyId, 10));
    if (!propertyToUpdate) return;

    const updatedProperty = { ...propertyToUpdate, ratings: newRatings, score: newScore };

    try {
      const response = await fetch(getApiUrl(`/properties/${propertyId}/`), {
        method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify(updatedProperty),
        });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const savedProperty = await response.json();
      setProperties(prevProperties =>
        prevProperties.map(prop => (prop.id === savedProperty.id ? savedProperty : prop))
      );
    } catch (error) {
      console.error('Failed to update property:', error);
    }
  }, [properties]); // Depends only on setProperties

  /** Updates only the imageUrls array for a specific property */
  const updatePropertyImages = useCallback(async (propertyId, newImageUrlsArray) => {
      // Basic validation: ensure input is an array
      if (!Array.isArray(newImageUrlsArray)) {
          console.error("CONTEXT Error: updatePropertyImages requires an array. Received:", newImageUrlsArray);
          return;
      }
      console.log(`CONTEXT: updatePropertyImages called for ID: ${propertyId} with ${newImageUrlsArray.length} URLs`);
      
      const propertyToUpdate = properties.find(p => p.id === parseInt(propertyId, 10));
      if (!propertyToUpdate) return;

      const updatedProperty = { ...propertyToUpdate, imageUrls: newImageUrlsArray };

      try {
        const response = await fetch(getApiUrl(`/properties/${propertyId}/`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify(updatedProperty),
        });
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const savedProperty = await response.json();
        setProperties(prevProperties =>
          prevProperties.map(prop => (prop.id === savedProperty.id ? savedProperty : prop))
        );
      } catch (error) {
        console.error('Failed to update property images:', error);
      }
  }, [properties]); // Depends only on setProperties


  /** Deletes a property by its ID */
  const deleteProperty = useCallback(async (id) => {
    console.log(`CONTEXT: deleteProperty called for ID: ${id}`);
    try {
      const response = await fetch(getApiUrl(`/properties/${id}/`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      setProperties(prevProperties => prevProperties.filter(p => p.id !== id));
    } catch (error) {
      console.error('Failed to delete property:', error);
    }
  }, [getAuthHeaders]);

  /** Updates an existing property in the state */
  const updateProperty = useCallback(async (id, updatedData) => {
    console.log(`CONTEXT: updateProperty called for ID: ${id}`, updatedData);
    try {
      const response = await fetch(getApiUrl(`/properties/${id}/`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(updatedData),
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const savedProperty = await response.json();
      setProperties(prevProperties =>
        prevProperties.map(prop => (prop.id === savedProperty.id ? savedProperty : prop))
      );
    } catch (error) {
      console.error('Failed to update property:', error);
    }
  }, [getAuthHeaders]);

  // --- Memoize the context value object itself ---
  // Bundles all state and functions provided by the context
  const value = useMemo(() => ({
    properties,                    // Raw properties array
    addProperty,                   // Memoized function
    getPropertyById,               // Memoized function
    updatePropertyRatingsAndScore, // Memoized function
    updatePropertyImages,          // Memoized function
    deleteProperty,                // Memoized function
    updateProperty,                // Memoized function
  }), [
      properties, // Re-memoize value object if properties array changes
      addProperty, getPropertyById, updatePropertyRatingsAndScore, updatePropertyImages, deleteProperty, updateProperty // Include stable functions
  ]);


  // Provide the memoized value object to consuming components
  return (
    <PropertyContext.Provider value={value}>
      {children}
    </PropertyContext.Provider>
  );
} // End PropertyProvider

// 3. Custom Hook for easy consumption
export function useProperties() {
  const context = useContext(PropertyContext);
  if (context === undefined) {
    throw new Error('useProperties must be used within a PropertyProvider');
  }
  return context;
}