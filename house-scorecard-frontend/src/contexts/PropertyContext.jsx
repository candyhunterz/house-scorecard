// src/contexts/PropertyContext.jsx
import React, { createContext, useState, useContext, useCallback, useMemo } from 'react';

// Define initial data with 'imageUrls' as an array
const initialPropertiesData = [
    {
        id: 1,
        address: '123 Main St, Anytown',
        listingUrl: 'https://www.example.com/listing/123',
        price: 450000,
        beds: 3,
        baths: 2,
        sqft: 1800,
        imageUrls: [ // Array of image URLs
            'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=400',
            'https://images.pexels.com/photos/164558/pexels-photo-164558.jpeg?auto=compress&cs=tinysrgb&w=400'
        ],
        notes: 'Nice curb appeal, kitchen needs update.',
        latitude: 40.7128,
        longitude: -74.0060,
        ratings: {}, // Placeholder for ratings object
        score: null,   // Placeholder for calculated score
    },
    {
        id: 2,
        address: '456 Oak Ave, Anytown',
        listingUrl: 'https://www.example.com/listing/456',
        price: 510000,
        beds: 4,
        baths: 2.5,
        sqft: 2100,
        imageUrls: [ // Single image example
            'https://images.pexels.com/photos/259588/pexels-photo-259588.jpeg?auto=compress&cs=tinysrgb&w=400'
        ],
        notes: 'Great layout, but backs onto busy road.',
        latitude: 40.7580,
        longitude: -73.9855,
        ratings: {},
        score: null,
    },
      {
        id: 3,
        address: '789 Pine Ln, Sometown',
        listingUrl: null,
        price: 485000,
        beds: 3,
        baths: 2,
        sqft: 1950,
        imageUrls: [], // Example with no images initially
        notes: '',
        latitude: 34.0522,
        longitude: -118.2437,
        ratings: {},
        score: null,
    },
     {
        id: 4,
        address: '101 Maple Dr, Villagetown',
        listingUrl: null,
        price: 420000,
        beds: 2,
        baths: 1.5,
        sqft: 1450,
        imageUrls: [ // Multiple images example
            'https://images.pexels.com/photos/209315/pexels-photo-209315.jpeg?auto=compress&cs=tinysrgb&w=400',
            'https://images.pexels.com/photos/271816/pexels-photo-271816.jpeg?auto=compress&cs=tinysrgb&w=400',
            'https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg?auto=compress&cs=tinysrgb&w=400'
            ],
        notes: 'Small but cozy, potential for expansion.',
        latitude: 34.0722,
        longitude: -118.2537,
        ratings: {},
        score: null,
    },
];

// 1. Create the Context
const PropertyContext = createContext();

// 2. Create a Provider Component
export function PropertyProvider({ children }) {
  // State holding the array of all property objects
  const [properties, setProperties] = useState(initialPropertiesData);

  // --- Action Functions (Memoized using useCallback for stable references) ---

  /** Adds a new property, parsing the image URLs string into an array */
  const addProperty = useCallback((newPropertyData) => {
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

    console.log("CONTEXT: Adding property object:", propertyWithId);
    // Update state using functional form
    setProperties(prevProperties => [...prevProperties, propertyWithId]);
  }, []); // Depends only on setProperties (stable)

  /** Retrieves a property by its ID */
  const getPropertyById = useCallback((id) => {
    console.log(`CONTEXT: getPropertyById called for ID: ${id}`);
    const numId = parseInt(id, 10);
    // Find returns undefined if not found, which is handled in consuming components
    return properties.find(p => p.id === numId);
  }, [properties]); // Re-memoize only if the 'properties' array reference changes

  /** Updates the ratings and calculated score for a specific property */
  const updatePropertyRatingsAndScore = useCallback((propertyId, newRatings, newScore) => {
    console.log(`CONTEXT: updatePropertyRatingsAndScore called for ID: ${propertyId}`);
    setProperties(prevProperties =>
      prevProperties.map(prop => {
        if (prop.id === parseInt(propertyId, 10)) {
            // Optimization: Only create new object if data actually changed
            if (prop.ratings !== newRatings || prop.score !== newScore) {
                console.log(`CONTEXT: Updating ratings/score state for ${propertyId}. New Score: ${newScore}`);
                return { ...prop, ratings: newRatings, score: newScore };
            }
        }
        return prop; // Return unchanged property
      })
    );
  }, []); // Depends only on setProperties

  /** Updates only the imageUrls array for a specific property */
  const updatePropertyImages = useCallback((propertyId, newImageUrlsArray) => {
      // Basic validation: ensure input is an array
      if (!Array.isArray(newImageUrlsArray)) {
          console.error("CONTEXT Error: updatePropertyImages requires an array. Received:", newImageUrlsArray);
          return;
      }
      console.log(`CONTEXT: updatePropertyImages called for ID: ${propertyId} with ${newImageUrlsArray.length} URLs`);
      setProperties(prevProperties => prevProperties.map(prop => {
          if (prop.id === parseInt(propertyId, 10)) {
              // Optimization: Only update if the array content has actually changed
              // Simple JSON check works for arrays of strings/primitives
              if (JSON.stringify(prop.imageUrls) !== JSON.stringify(newImageUrlsArray)) {
                   console.log(`CONTEXT: Updating images state for ${propertyId}.`);
                  return { ...prop, imageUrls: newImageUrlsArray };
              } else {
                   console.log(`CONTEXT: Images for ${propertyId} unchanged. Skipping state update.`);
              }
          }
          return prop; // Return unchanged property
      }));
  }, []); // Depends only on setProperties


  // --- Memoize the context value object itself ---
  // Bundles all state and functions provided by the context
  const value = useMemo(() => ({
    properties,                    // Raw properties array
    addProperty,                   // Memoized function
    getPropertyById,               // Memoized function
    updatePropertyRatingsAndScore, // Memoized function
    updatePropertyImages,          // Memoized function
  }), [
      properties, // Re-memoize value object if properties array changes
      addProperty, getPropertyById, updatePropertyRatingsAndScore, updatePropertyImages // Include stable functions
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