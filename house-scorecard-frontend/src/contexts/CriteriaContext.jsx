// src/contexts/CriteriaContext.jsx
import React, { createContext, useState, useContext, useMemo, useCallback } from 'react';

// Define allowed rating types as constants for better maintainability
export const RATING_TYPE_STARS = 'stars';
export const RATING_TYPE_YES_NO = 'yesNo';
export const RATING_TYPE_SCALE_10 = 'scale10';
export const RATING_TYPES = [RATING_TYPE_STARS, RATING_TYPE_YES_NO, RATING_TYPE_SCALE_10];

// --- Initial Mock/Default Criteria ---
// Structure: { id: number, text: string, type: 'mustHave'|'niceToHave'|'dealBreaker', weight?: number, category?: string | null, ratingType?: 'stars'|'yesNo'|'scale10' }
const initialCriteria = [
  // Must Haves (no ratingType needed)
  { id: 101, text: 'Minimum 3 Bedrooms', type: 'mustHave', category: 'Interior Features' },
  { id: 102, text: 'Within Specific School District', type: 'mustHave', category: 'Location' },
  { id: 103, text: 'Budget Under $500k', type: 'mustHave', category: 'Financial' },
  // Nice to Haves (Add ratingType)
  { id: 201, text: 'Updated Kitchen', type: 'niceToHave', weight: 8, category: 'Interior Features', ratingType: RATING_TYPE_STARS }, // Default: Stars 1-5
  { id: 202, text: 'Fenced Yard', type: 'niceToHave', weight: 7, category: 'Exterior', ratingType: RATING_TYPE_YES_NO }, // Example Yes/No
  { id: 203, text: 'Two-Car Garage', type: 'niceToHave', weight: 5, category: 'Exterior', ratingType: RATING_TYPE_YES_NO },
  { id: 204, text: 'Basement Condition (Scale 1-10)', type: 'niceToHave', weight: 4, category: 'Condition/Maintenance', ratingType: RATING_TYPE_SCALE_10 }, // Example Scale 1-10
  { id: 205, text: 'Walkable to Park', type: 'niceToHave', weight: 6, category: 'Location', ratingType: RATING_TYPE_STARS },
  // Deal Breakers (no ratingType needed)
  { id: 301, text: 'On a Busy Main Road', type: 'dealBreaker', category: 'Location' },
  { id: 302, text: 'Evidence of Foundation Issues', type: 'dealBreaker', category: 'Condition/Maintenance' },
  { id: 303, text: 'Active HOA Restrictions (strict)', type: 'dealBreaker', category: 'Financial' },
];

// 1. Create the Context
const CriteriaContext = createContext();

// 2. Create a Provider Component
export function CriteriaProvider({ children }) {
  // State holding the array of all criteria objects
  const [criteria, setCriteria] = useState(initialCriteria);

  // --- Action Functions (Memoized using useCallback for stable references) ---

  /** Adds a new criterion object to the state */
  const addCriterion = useCallback((newCriterion) => {
    console.log("CONTEXT: addCriterion called with:", newCriterion);

    // --- Input Validation ---
    if (!newCriterion.text || !newCriterion.type) {
      console.error("Add Criterion failed: text and type are required.");
      return;
    }
    const trimmedText = newCriterion.text.trim();
    if (!trimmedText) {
        console.error("Add Criterion failed: text cannot be empty.");
        return;
    }

    let criterionWeight = undefined;
    let criterionRatingType = RATING_TYPE_STARS; // Default rating type

    if (newCriterion.type === 'niceToHave') {
        // Validate Weight (1-10)
        const numWeight = Number(newCriterion.weight);
        if (isNaN(numWeight) || numWeight < 1 || numWeight > 10) {
            console.warn("Add Criterion: Invalid weight provided, defaulting to 5.");
            criterionWeight = 5;
        } else {
            criterionWeight = numWeight;
        }
        // Validate Rating Type
        if (newCriterion.ratingType && RATING_TYPES.includes(newCriterion.ratingType)) {
            criterionRatingType = newCriterion.ratingType;
        } else {
            console.warn(`Add Criterion: Invalid or missing ratingType "${newCriterion.ratingType}", defaulting to '${RATING_TYPE_STARS}'.`);
            criterionRatingType = RATING_TYPE_STARS; // Default if invalid or missing
        }
    }
    // --- End Validation ---

    // Create the final criterion object to be added
    const criterionWithId = {
      id: Date.now(), // Simple unique ID
      text: trimmedText,
      type: newCriterion.type,
      category: newCriterion.category?.trim() || null, // Use null if category is empty/whitespace
      // Only include weight and ratingType for 'niceToHave' criteria
      weight: newCriterion.type === 'niceToHave' ? criterionWeight : undefined,
      ratingType: newCriterion.type === 'niceToHave' ? criterionRatingType : undefined,
    };

    console.log("CONTEXT: Adding criterion:", criterionWithId);
    // Update state using the functional form
    setCriteria(prevCriteria => [...prevCriteria, criterionWithId]);

  }, []); // Depends only on setCriteria (stable)

  /** Deletes a criterion from the state by its ID */
  const deleteCriterion = useCallback((id) => {
    console.log(`CONTEXT: deleteCriterion called for ID: ${id}`);
    setCriteria(prevCriteria => prevCriteria.filter(c => c.id !== id));
  }, []); // Depends only on setCriteria

  /** Updates an existing criterion in the state */
  const updateCriterion = useCallback((id, updatedData) => {
     console.log(`CONTEXT: updateCriterion called for ID: ${id}`, updatedData);

     // --- Input Validation for Update ---
     if (!updatedData) {
         console.error("Update failed: No update data provided.");
         return;
     }
     // Validate text if provided
     if (updatedData.text !== undefined) {
        const trimmedText = updatedData.text?.trim();
        if (!trimmedText) {
            console.error("Update failed: Criterion text cannot be empty.");
            return;
        }
        updatedData.text = trimmedText; // Use the trimmed text
     }
     // Validate weight if provided
     let validatedWeight = undefined;
     if (updatedData.weight !== undefined) {
         const numWeight = Number(updatedData.weight);
         if (isNaN(numWeight) || numWeight < 1 || numWeight > 10) {
            console.error("Update failed: Weight must be a number between 1 and 10.");
            return;
         }
         validatedWeight = numWeight;
         updatedData.weight = validatedWeight; // Ensure updatedData has the number
     }
     // Process category if provided
     if (updatedData.category !== undefined) {
         updatedData.category = updatedData.category?.trim() || null;
     }
     // Validate ratingType if provided
     let validatedRatingType = undefined;
     if (updatedData.ratingType !== undefined) {
         if (RATING_TYPES.includes(updatedData.ratingType)) {
            validatedRatingType = updatedData.ratingType;
            updatedData.ratingType = validatedRatingType; // Ensure updatedData has the validated type
         } else {
            console.warn(`Update Warning: Invalid ratingType "${updatedData.ratingType}" for criterion ${id}. Ignoring type update.`);
            // Don't include invalid ratingType in updatedData
            delete updatedData.ratingType;
         }
     }
     // --- End Validation ---


     // Update state using functional form and map
     setCriteria(prevCriteria => prevCriteria.map(c => {
       if (c.id === id) {
         // Create the potential updated criterion object
         const potentialUpdate = {
             ...c, // Start with existing data
             ...updatedData, // Apply validated changes (text, weight, category, ratingType)

             // Re-apply weight and ratingType logic strictly based on ORIGINAL type 'c.type'
             // This prevents weight/ratingType being added if the type were somehow changed away from 'niceToHave'
             weight: c.type === 'niceToHave'
                ? (validatedWeight !== undefined ? validatedWeight : c.weight) // Use validated weight if provided, else keep original
                : undefined, // Ensure weight is undefined if not a niceToHave type
             ratingType: c.type === 'niceToHave'
                ? (validatedRatingType !== undefined ? validatedRatingType : c.ratingType) // Use validated type if provided, else keep original
                : undefined // Ensure ratingType is undefined if not a niceToHave type
         };

         // Optimization: Only return a new object reference if data actually changed
         if (JSON.stringify(c) !== JSON.stringify(potentialUpdate)) {
             console.log(`CONTEXT: Updating criterion ${id} in state.`);
             return potentialUpdate;
         } else {
             console.log(`CONTEXT: Criterion ${id} data unchanged. Skipping state update.`);
             return c;
         }
       }
       return c; // Return other criteria unchanged
     }));
  }, []); // Depends only on setCriteria


  // --- Memoize Derived Lists (using useMemo for stable references) ---
  // These filtered lists run only when the base 'criteria' array changes.
  const mustHaves = useMemo(() => {
      console.log("CONTEXT: Memoizing mustHaves list");
      return criteria.filter(c => c.type === 'mustHave');
  }, [criteria]);

  const niceToHaves = useMemo(() => {
       console.log("CONTEXT: Memoizing niceToHaves list");
      return criteria.filter(c => c.type === 'niceToHave');
  }, [criteria]);

  const dealBreakers = useMemo(() => {
       console.log("CONTEXT: Memoizing dealBreakers list");
      return criteria.filter(c => c.type === 'dealBreaker');
  }, [criteria]);

  // --- Get unique category names (Memoized) ---
  const uniqueCategories = useMemo(() => {
      console.log("CONTEXT: Memoizing uniqueCategories list");
      const categories = new Set(criteria.map(c => c.category).filter(Boolean));
      return Array.from(categories).sort();
  }, [criteria]);


  // --- Memoize the Context Value Object itself ---
  // This bundles all the state and functions to be provided by the context.
  // Memoizing ensures the value object reference is stable unless its contents change.
  const value = useMemo(() => ({
    criteria,        // Raw list (changes often)
    mustHaves,       // Memoized list (stable unless criteria changes)
    niceToHaves,     // Memoized list (stable unless criteria changes)
    dealBreakers,    // Memoized list (stable unless criteria changes)
    uniqueCategories,// Memoized list (stable unless criteria changes)
    addCriterion,    // Memoized function (stable reference)
    deleteCriterion, // Memoized function (stable reference)
    updateCriterion, // Memoized function (stable reference)
    RATING_TYPES     // Expose the allowed rating types array (constant, so stable)
  }), [
      criteria, // Include raw list as it's provided
      mustHaves, niceToHaves, dealBreakers, uniqueCategories, // Include memoized lists
      addCriterion, deleteCriterion, updateCriterion // Include memoized functions
      // RATING_TYPES is constant, no need to list as dependency
  ]);

  // Provide the memoized value object to consuming components via the Provider
  return (
    <CriteriaContext.Provider value={value}>
      {children}
    </CriteriaContext.Provider>
  );
}

// 3. Custom Hook for easy consumption
export function useCriteria() {
  const context = useContext(CriteriaContext);
  if (context === undefined) {
    throw new Error('useCriteria must be used within a CriteriaProvider');
  }
  return context;
}