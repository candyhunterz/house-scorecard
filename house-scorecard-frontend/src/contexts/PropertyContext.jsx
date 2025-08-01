// src/contexts/PropertyContext.jsx
import React, { createContext, useState, useContext, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { PROPERTY_STATUSES } from '../constants/propertyStatus';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const getApiUrl = (path) => `${API_BASE_URL}${path}`;

// 1. Create the Context
const PropertyContext = createContext();

// 2. Create a Provider Component
export function PropertyProvider({ children }) {
  // State holding the array of all property objects
  const [properties, setProperties] = useState([]);
  const { authenticatedFetch } = useAuth();

    useEffect(() => {
      const fetchProperties = async () => {
        try {
          const response = await authenticatedFetch(getApiUrl('/properties/'));
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          const data = await response.json();
          
          // Ensure all properties have required frontend fields with defaults
          const propertiesWithDefaults = data.map(property => ({
            ...property,
            // Status fields (now supported by backend)
            status: property.status !== undefined ? property.status : PROPERTY_STATUSES.UNSET,
            statusHistory: Array.isArray(property.statusHistory) ? property.statusHistory : [],
            // Ensure other frontend fields exist
            ratings: property.ratings || {},
            score: property.score !== undefined ? property.score : null,  
            imageUrls: Array.isArray(property.imageUrls) ? property.imageUrls : []
          }));
          
          console.log('CONTEXT: Properties loaded from backend:', propertiesWithDefaults);
          setProperties(propertiesWithDefaults);
          // Keep localStorage as backup
          localStorage.setItem('houseScorecard_properties', JSON.stringify(propertiesWithDefaults));
        } catch (error) {
          console.error('Failed to fetch properties:', error);
          // Fallback to localStorage if backend fails
          const savedProperties = localStorage.getItem('houseScorecard_properties');
          if (savedProperties) {
            try {
              const parsedProperties = JSON.parse(savedProperties);
              console.log('CONTEXT: Fallback - loading properties from localStorage:', parsedProperties);
              setProperties(parsedProperties);
            } catch (parseError) {
              console.error('Failed to parse saved properties:', parseError);
            }
          }
        }
      };

      if (authenticatedFetch) {
        fetchProperties();
      }
    }, [authenticatedFetch]);

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
        score: null,
        status: PROPERTY_STATUSES.UNSET, // No default status - user must set
        statusHistory: [] // Empty history until user sets first status
    };

    try {
      // Create backend payload (backend now fully supports all fields)
      const backendProperty = {
        address: propertyWithId.address,
        listingUrl: propertyWithId.listingUrl,
        price: propertyWithId.price,
        beds: propertyWithId.beds,
        baths: propertyWithId.baths,
        sqft: propertyWithId.sqft,
        notes: propertyWithId.notes,
        latitude: propertyWithId.latitude,
        longitude: propertyWithId.longitude,
        imageUrls: propertyWithId.imageUrls,
        status: propertyWithId.status,
        statusHistory: propertyWithId.statusHistory,
        score: propertyWithId.score
      };

      const response = await authenticatedFetch(getApiUrl('/properties/'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backendProperty),
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const savedProperty = await response.json();
      // Ensure saved property has all frontend fields
      const savedPropertyWithDefaults = {
        ...savedProperty,
        status: savedProperty.status !== undefined ? savedProperty.status : PROPERTY_STATUSES.UNSET,
        statusHistory: Array.isArray(savedProperty.statusHistory) ? savedProperty.statusHistory : [],
        ratings: savedProperty.ratings || {},
        score: savedProperty.score !== undefined ? savedProperty.score : null,
        imageUrls: Array.isArray(savedProperty.imageUrls) ? savedProperty.imageUrls : []
      };
      
      setProperties(prevProperties => {
        const newProperties = [...prevProperties, savedPropertyWithDefaults];
        // Save updated properties to localStorage
        localStorage.setItem('houseScorecard_properties', JSON.stringify(newProperties));
        return newProperties;
      });
    } catch (error) {
      console.error('Failed to add property:', error);
    }
  }, [authenticatedFetch]); // Depends on authenticatedFetch

  /** Retrieves a property by its ID */
  const getPropertyById = (id) => {
    const numId = parseInt(id, 10);
    const foundProperty = properties.find(p => p.id === numId);
    return foundProperty;
  };

  /** Updates the ratings and calculated score for a specific property */
  const updatePropertyRatingsAndScore = useCallback(async (propertyId, newRatings, newScore) => {
    
    const propertyToUpdate = properties.find(p => p.id === parseInt(propertyId, 10));
    if (!propertyToUpdate) return;

    // Update local state immediately with ratings and score
    const updatedProperty = { 
      ...propertyToUpdate, 
      ratings: newRatings,
      score: newScore 
    };

    setProperties(prevProperties => {
      const newProperties = prevProperties.map(prop => 
        prop.id === parseInt(propertyId, 10) ? updatedProperty : prop
      );
      
      // Save updated properties to localStorage
      localStorage.setItem('houseScorecard_properties', JSON.stringify(newProperties));
      console.log(`CONTEXT: Property ${propertyId} ratings and score updated locally`);
      
      return newProperties;
    });

    // Sync with backend (attempt ratings and score sync with graceful fallback)
    try {
      // First, save each rating via the Rating API (this should work)
      for (const [criterionId, value] of Object.entries(newRatings)) {
        try {
          // Convert frontend value format to backend format
          let backendValue = value;
          if (typeof value === 'boolean') {
            backendValue = value ? 'yes' : 'no';
          } else if (typeof value === 'number') {
            backendValue = value.toString();
          }

          // Check if rating already exists
          const existingRatingResponse = await authenticatedFetch(getApiUrl(`/ratings/?property=${propertyId}&criterion=${criterionId}`));
          
          if (existingRatingResponse.ok) {
            const existingRatings = await existingRatingResponse.json();
            
            // Find the specific rating for this property-criterion combination
            const matchingRating = existingRatings.find(r => 
              r.property === parseInt(propertyId, 10) && r.criterion === parseInt(criterionId, 10)
            );
            
            if (matchingRating) {
              // Update existing rating
              await authenticatedFetch(getApiUrl(`/ratings/${matchingRating.id}/`), {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  property: parseInt(propertyId, 10),
                  criterion: parseInt(criterionId, 10),
                  value: backendValue
                }),
              });
            } else {
              // Create new rating
              await authenticatedFetch(getApiUrl(`/ratings/`), {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  property: parseInt(propertyId, 10),
                  criterion: parseInt(criterionId, 10),
                  value: backendValue
                }),
              });
            }
          }
        } catch (ratingError) {
          console.warn(`Failed to save rating for criterion ${criterionId}:`, ratingError);
        }
      }

      // Update the property score (fully supported by backend)
      const response = await authenticatedFetch(getApiUrl(`/properties/${propertyId}/`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ score: newScore }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update property score: ${response.statusText}`);
      }
      
      const savedProperty = await response.json();
      console.log(`Property ${propertyId} score synced to backend: ${savedProperty.score}`);
      
      // Update state with backend response to ensure consistency
      setProperties(prevProperties =>
        prevProperties.map(prop => 
          prop.id === parseInt(propertyId, 10) ? {
            ...savedProperty,
            // Ensure frontend field compatibility
            statusHistory: Array.isArray(savedProperty.statusHistory) ? savedProperty.statusHistory : [],
            ratings: savedProperty.ratings || {},
            imageUrls: Array.isArray(savedProperty.imageUrls) ? savedProperty.imageUrls : []
          } : prop
        )
      );

    } catch (error) {
      console.warn('Failed to sync ratings with backend:', error);
    }
    
    /*
    // Original backend sync code
    try {
      // First, save each rating via the Rating API
      for (const [criterionId, value] of Object.entries(newRatings)) {
        // Convert frontend value format to backend format
        let backendValue = value;
        if (typeof value === 'boolean') {
          backendValue = value ? 'yes' : 'no';
        } else if (typeof value === 'number') {
          backendValue = value.toString();
        }

        // Check if rating already exists
        try {
          const existingRatingResponse = await authenticatedFetch(getApiUrl(`/ratings/?property=${propertyId}&criterion=${criterionId}`));
          
          if (existingRatingResponse.ok) {
            const existingRatings = await existingRatingResponse.json();
            
            // Find the specific rating for this property-criterion combination
            const matchingRating = existingRatings.find(r => 
              r.property === parseInt(propertyId, 10) && r.criterion === parseInt(criterionId, 10)
            );
            
            if (matchingRating) {
              // Update existing rating
              await authenticatedFetch(getApiUrl(`/ratings/${matchingRating.id}/`), {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  property: parseInt(propertyId, 10),
                  criterion: parseInt(criterionId, 10),
                  value: backendValue
                }),
              });
            } else {
              // Create new rating
              await authenticatedFetch(getApiUrl(`/ratings/`), {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  property: parseInt(propertyId, 10),
                  criterion: parseInt(criterionId, 10),
                  value: backendValue
                }),
              });
            }
          }
        } catch (ratingError) {
          console.error(`Failed to save rating for criterion ${criterionId}:`, ratingError);
        }
      }

      // Then update the property score
      const response = await authenticatedFetch(getApiUrl(`/properties/${propertyId}/`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
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
    */
  }, [properties]); // Only depend on properties

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
        const response = await authenticatedFetch(getApiUrl(`/properties/${propertyId}/`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
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
  }, [properties, authenticatedFetch]); // Depends on properties and authenticatedFetch


  /** Deletes a property by its ID */
  const deleteProperty = useCallback(async (id) => {
    console.log(`CONTEXT: deleteProperty called for ID: ${id}`);
    try {
      const response = await authenticatedFetch(getApiUrl(`/properties/${id}/`), {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      setProperties(prevProperties => prevProperties.filter(p => p.id !== id));
    } catch (error) {
      console.error('Failed to delete property:', error);
    }
  }, [authenticatedFetch]);

  /** Updates an existing property in the state */
  const updateProperty = useCallback(async (id, updatedData) => {
    console.log(`CONTEXT: updateProperty called for ID: ${id}`, updatedData);
    try {
      const response = await authenticatedFetch(getApiUrl(`/properties/${id}/`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
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
  }, [authenticatedFetch]);

  /** Updates the status of a specific property and adds to status history */
  const updatePropertyStatus = useCallback(async (propertyId, newStatus, notes = null) => {
    const propertyToUpdate = properties.find(p => p.id === parseInt(propertyId, 10));
    if (!propertyToUpdate) {
      console.error(`Property with ID ${propertyId} not found`);
      return;
    }

    // Create status history entry
    const statusHistoryEntry = {
      status: newStatus,
      date: new Date().toISOString(),
      notes: notes || (propertyToUpdate.status === PROPERTY_STATUSES.UNSET ? 'Initial status set' : null)
    };

    const updatedProperty = {
      ...propertyToUpdate,
      status: newStatus,
      statusHistory: [...(propertyToUpdate.statusHistory || []), statusHistoryEntry]
    };

    // Update local state immediately for responsive UI
    setProperties(prevProperties => {
      const newProperties = prevProperties.map(p =>
        p.id === parseInt(propertyId, 10) ? updatedProperty : p
      );
      console.log(`CONTEXT: Properties updated. Property ${propertyId} now has status:`, 
        newProperties.find(p => p.id === parseInt(propertyId, 10))?.status);
      
      // Save updated properties to localStorage
      localStorage.setItem('houseScorecard_properties', JSON.stringify(newProperties));
      
      return newProperties;
    });

    // Sync with backend (full status and statusHistory support)
    try {
      const response = await authenticatedFetch(getApiUrl(`/properties/${propertyId}/`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: newStatus,
          statusHistory: updatedProperty.statusHistory 
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update property status: ${response.statusText}`);
      }

      const savedProperty = await response.json();
      console.log(`Property ${propertyId} status and history synced to backend:`, savedProperty.status);
      
      // Update state with backend response to ensure consistency
      setProperties(prevProperties =>
        prevProperties.map(p =>
          p.id === parseInt(propertyId, 10) ? {
            ...savedProperty,
            // Ensure frontend field compatibility
            statusHistory: Array.isArray(savedProperty.statusHistory) ? savedProperty.statusHistory : [],
            ratings: savedProperty.ratings || {},
            imageUrls: Array.isArray(savedProperty.imageUrls) ? savedProperty.imageUrls : []
          } : p
        )
      );
    } catch (error) {
      console.error('Failed to sync status with backend:', error);
      // Status update UI feedback is already shown, but backend sync failed
      // Could add error toast here if needed
    }
    
    /*
    // Full backend sync code (for when statusHistory is supported)
    try {
      const response = await authenticatedFetch(getApiUrl(`/properties/${propertyId}/`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          statusHistory: updatedProperty.statusHistory
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update property status');
      }

      const savedProperty = await response.json();
      console.log(`CONTEXT: Backend returned property:`, savedProperty);
      console.log(`CONTEXT: Backend property status:`, savedProperty.status);
      
      // Update with server response to ensure consistency
      setProperties(prevProperties =>
        prevProperties.map(p =>
          p.id === parseInt(propertyId, 10) ? savedProperty : p
        )
      );
      
      console.log(`CONTEXT: Property ${propertyId} status updated to ${newStatus}`);
    } catch (error) {
      console.error('Failed to update property status:', error);
      // Local state is already updated, so user sees immediate feedback
      // Could add error handling here if needed
    }
    */
  }, [authenticatedFetch, properties]);

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
    updatePropertyStatus,          // Memoized function
  }), [
      properties, // Re-memoize value object if properties array changes
      addProperty, getPropertyById, updatePropertyRatingsAndScore, updatePropertyImages, deleteProperty, updateProperty, updatePropertyStatus // Include stable functions
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