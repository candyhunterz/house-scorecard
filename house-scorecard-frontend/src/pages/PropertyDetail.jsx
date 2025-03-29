// src/pages/PropertyDetail.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
// Make sure updatePropertyImages is imported from context
import { useProperties } from '../contexts/PropertyContext';
// Import context hook and rating type constants
import { useCriteria, RATING_TYPE_STARS, RATING_TYPE_YES_NO, RATING_TYPE_SCALE_10 } from '../contexts/CriteriaContext';
import ScoreBreakdown from '../components/ScoreBreakdown'; // Import the breakdown component
import './PropertyDetail.css'; // Ensure CSS is imported

// --- Reusable Rating Input Component ---
// Renders the appropriate input (checkbox, stars, number) based on criterion type and ratingType
function RatingInput({ criterion, rating, onChange }) {

    /** Handler for Checkbox changes */
    const handleCheckboxChange = (e) => { onChange(criterion.id, e.target.checked); };
    /** Handler for Star Rating changes */
    const handleStarRatingChange = (newRatingValue) => {
        const currentRating = rating || 0;
        const finalValue = newRatingValue === currentRating ? 0 : newRatingValue;
        onChange(criterion.id, finalValue);
    };
    /** Handler for Scale (1-10) Number Input changes */
    const handleScale10Change = (e) => {
        let valueStr = e.target.value;
        let value = parseInt(valueStr, 10);
        if (valueStr === '') { value = 0; } // Treat empty as 0
        else if (isNaN(value)) { value = rating || 0; }
        else { value = Math.max(0, Math.min(10, value)); } // Clamp 0-10
        onChange(criterion.id, value);
    };

    // Determine which input to render
    switch (criterion.type) {
        case 'mustHave':
        case 'dealBreaker':
            const labelText = criterion.type === 'dealBreaker' ? `${criterion.text} (Is Present?)` : criterion.text;
            return (
                <div className="rating-input checkbox-rating">
                    <input type="checkbox" id={`rating-${criterion.id}`} checked={!!rating} onChange={handleCheckboxChange}/>
                    <label htmlFor={`rating-${criterion.id}`}>{labelText}</label>
                </div>);
        case 'niceToHave':
            const ratingType = criterion.ratingType || RATING_TYPE_STARS;
            switch (ratingType) {
                case RATING_TYPE_YES_NO:
                    return (
                        <div className="rating-input checkbox-rating nice-to-have-yesno">
                            <input type="checkbox" id={`rating-${criterion.id}`} checked={!!rating} onChange={handleCheckboxChange}/>
                            <label htmlFor={`rating-${criterion.id}`}>{criterion.text}<span className="weight-label">(W: {criterion.weight})</span></label>
                        </div>);
                case RATING_TYPE_SCALE_10:
                    return (
                         <div className="rating-input scale10-rating">
                            <label htmlFor={`rating-${criterion.id}`}>{criterion.text}<span className="weight-label">(W: {criterion.weight})</span></label>
                            <input type="number" id={`rating-${criterion.id}`} value={rating === undefined || rating === null || rating === 0 ? '' : rating} onChange={handleScale10Change} min="0" max="10" step="1" placeholder="0-10" aria-label={`${criterion.text} rating 0-10`}/>
                         </div>);
                case RATING_TYPE_STARS: default:
                    return (
                        <div className="rating-input star-rating">
                            <label>{criterion.text} <span className="weight-label">(W: {criterion.weight})</span></label>
                            <div className="stars">
                                {[1, 2, 3, 4, 5].map(starValue => (<i key={starValue} className={`fas fa-star ${rating >= starValue ? 'rated' : ''}`} onClick={() => handleStarRatingChange(starValue)} onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && handleStarRatingChange(starValue)} tabIndex={0} role="button" aria-label={`Rate ${starValue} stars`} aria-pressed={rating === starValue}/>))}
                                {rating > 0 && (<button onClick={() => handleStarRatingChange(0)} className="clear-rating" title="Clear rating (0 stars)"><i className="fas fa-times-circle"></i></button>)}
                            </div>
                        </div>);
            }
        default: return null;
    }
} // End RatingInput Component


// --- Scoring Logic Function ---
// Calculates a score (0-100) based on ratings against criteria
const calculateScore = (ratings, mustHaves, niceToHaves, dealBreakers) => {
    const currentRatings = ratings || {};
    for (const db of dealBreakers) { if (currentRatings[db.id] === true) { return 0; } } // Deal Breaker check
    for (const mh of mustHaves) { if (!currentRatings[mh.id]) { return 0; } } // Must-Have check

    let pointsEarned = 0;
    let maxPossiblePoints = 0;
    const MAX_NORMALIZED_RATING = 5;
    for (const nth of niceToHaves) { // Nice-to-Have calculation
        const ratingValue = currentRatings[nth.id];
        const weight = nth.weight || 1;
        const ratingType = nth.ratingType || RATING_TYPE_STARS;
        let normalizedRatingValue = 0;
        switch (ratingType) {
            case RATING_TYPE_YES_NO: normalizedRatingValue = ratingValue === true ? MAX_NORMALIZED_RATING : 0; break;
            case RATING_TYPE_SCALE_10: normalizedRatingValue = Math.max(0, Math.min(10, Number(ratingValue) || 0)) / 2; break;
            case RATING_TYPE_STARS: default: normalizedRatingValue = Math.max(0, Math.min(5, Number(ratingValue) || 0)); break;
        }
        pointsEarned += normalizedRatingValue * weight;
        maxPossiblePoints += MAX_NORMALIZED_RATING * weight;
    }
    if (maxPossiblePoints <= 0) { return 100; } // Handle no nice-to-haves
    const finalScore = Math.round((pointsEarned / maxPossiblePoints) * 100);
    console.log(`CALC SCORE: Final Score: ${finalScore}`);
    return finalScore;
}; // End calculateScore


// --- Main PropertyDetail Component ---
function PropertyDetail() {
    const { propertyId } = useParams();
    // Get context functions including updatePropertyImages
    const { getPropertyById, updatePropertyRatingsAndScore, updatePropertyImages } = useProperties();
    const { mustHaves, niceToHaves, dealBreakers } = useCriteria();
    const navigate = useNavigate();

    // --- Component State ---
    const [property, setProperty] = useState(null);
    const [loading, setLoading] = useState(true);
    const [ratings, setRatings] = useState({}); // Local ratings state for inputs
    const [calculatedScore, setCalculatedScore] = useState(null); // Displayed score
    // State for the "Add More Image URLs" input field
    const [newImageUrlsString, setNewImageUrlsString] = useState('');

    // --- Effects ---
    // Effect 1: Load property data and set INITIAL state when propertyId changes
    useEffect(() => {
        console.log(`EFFECT 1 (Load): Running for propertyId: ${propertyId}`);
        setLoading(true);
        setProperty(null); setRatings({}); setCalculatedScore(null); // Clear previous state
        const fetchedProperty = getPropertyById(propertyId); // Get data from context
        if (fetchedProperty) {
            setProperty(fetchedProperty); // Set the main property object
            const initialRatings = fetchedProperty.ratings || {}; // Get ratings (or empty obj)
            setRatings(initialRatings); // Set local ratings state for inputs
            // Set initial score display (prefer saved, else calculate)
            const initialScore = fetchedProperty.score ?? calculateScore(initialRatings, mustHaves, niceToHaves, dealBreakers);
            setCalculatedScore(initialScore);
            console.log(`EFFECT 1 (Load): Initial load complete for ${propertyId}. Score: ${initialScore}`);
        } else {
             console.error(`EFFECT 1 (Load): Property with ID ${propertyId} not found.`);
        }
        setLoading(false); // Loading finished
    }, [propertyId, getPropertyById, mustHaves, niceToHaves, dealBreakers]); // Dependencies


    // Effect 2: Calculate score and update context whenever LOCAL 'ratings' state changes
    useEffect(() => {
        if (!loading && property) { // Only run if loaded and property exists
            console.log(`EFFECT 2 (Score Update): Ratings changed for property ${property.id}. Recalculating...`);
            const newScore = calculateScore(ratings, mustHaves, niceToHaves, dealBreakers);
            setCalculatedScore(newScore); // Update score displayed on this page
            // Update the central context (PropertyContext)
            console.log(`EFFECT 2 (Score Update): Calling context update for score ${newScore}`);
            updatePropertyRatingsAndScore(property.id, ratings, newScore);
        }
    }, [ratings, loading, property, mustHaves, niceToHaves, dealBreakers, updatePropertyRatingsAndScore]); // Dependencies


    // --- Event Handlers ---

    /** Handler for changes from RatingInput components. Updates ONLY local 'ratings' state. */
    const handleRatingChange = (criterionId, value) => {
        setRatings(prevRatings => ({ ...prevRatings, [criterionId]: value }));
    };

    /** Handler for the new image URLs textarea input */
    const handleNewImageUrlsChange = (e) => {
        setNewImageUrlsString(e.target.value);
    };

    /** Handler for adding the new image URLs */
    const handleAddImages = () => {
        if (!newImageUrlsString.trim()) {
            alert("Please enter one or more image URLs.");
            return; // Exit if input is empty
        }
        if (!property) return; // Exit if property data isn't loaded

        // Parse the input string into an array of valid-looking URLs
        const parsedNewUrls = newImageUrlsString
            .split(/[\n,]+/) // Split by newline or comma
            .map(url => url.trim()) // Trim whitespace
            .filter(url => url && url.length > 5); // Basic filter for non-empty strings

        if (parsedNewUrls.length === 0) {
             alert("No valid URLs found in the input.");
             return; // Exit if parsing results in empty array
        }

        // Get the current list of image URLs from the property state
        const existingUrls = property.imageUrls || [];

        // Combine existing and new URLs, ensuring uniqueness
        const combinedUrls = [...existingUrls]; // Start with existing URLs
        let addedCount = 0;
        parsedNewUrls.forEach(newUrl => {
            // Add the new URL only if it's not already present
            if (!combinedUrls.includes(newUrl)) {
                combinedUrls.push(newUrl);
                addedCount++;
            }
        });

        // Provide feedback if no genuinely new URLs were added
        if (addedCount === 0) {
            alert("All entered URLs are already associated with this property.");
            setNewImageUrlsString(''); // Clear input even if nothing new added
            return;
        }

        console.log(`Adding ${addedCount} new image URLs to property ${property.id}`);
        // Call the context function to update the property's imageUrls array
        updatePropertyImages(property.id, combinedUrls);

        // Clear the input field after successful addition
        setNewImageUrlsString('');
        alert(`${addedCount} new image URL(s) added!`); // Success feedback
    }; // End handleAddImages

    // --- Helper Functions ---
    const formatPrice = (price) => {
       if (price == null || isNaN(Number(price))) { return 'N/A'; }
       try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0, }).format(Number(price)); }
       catch (error) { console.error("Error formatting price:", error, "Input:", price); return 'Error'; }
    };
    const getScoreClass = (score) => {
        if (score === null || score === undefined) return 'score-unknown';
        if (score >= 75) return 'score-high';
        if (score >= 50) return 'score-medium';
        return 'score-low';
    };

    // --- Render Logic ---
    // Handle Loading State
    if (loading) { return <div className="loading-message">Loading property details...</div>; }
    // Handle Property Not Found State
    if (!property) { return (<div className="error-message"><h2>Property Not Found</h2><p>Sorry, we couldn't find details for property ID: {propertyId}.</p><button onClick={() => navigate('/properties')} className="btn btn-secondary">Back to Dashboard</button></div>); }

    // --- Render property details ---
    return (
        <div className="property-detail-container">
            {/* Back Button */}
            <button onClick={() => navigate('/properties')} className="btn btn-back"><i className="fas fa-arrow-left"></i> Back to Dashboard</button>
            {/* Header */}
            <h1>{property.address}</h1>
            {/* Main Details Grid */}
            <div className="detail-grid">

                {/* --- Image Section --- */}
                <div className="detail-image-section">
                    <h4>Images</h4>
                    {/* Image Gallery: Render if imageUrls exist and array is not empty */}
                    {(property.imageUrls && property.imageUrls.length > 0) ? (
                        <div className="image-gallery">
                            {property.imageUrls.map((url, index) => (
                                <div key={index} className="gallery-item">
                                    {/* Link opens image in new tab */}
                                    <a href={url} target="_blank" rel="noopener noreferrer" title="View full size">
                                        <img src={url} alt={`Property view ${index + 1}`} loading="lazy"/>
                                    </a>
                                    {/* Placeholder for future delete image button */}
                                    {/* <button className="delete-image-btn">×</button> */}
                                </div>
                            ))}
                        </div>
                    ) : (
                        // Placeholder if no images
                        <div className="detail-image-placeholder">
                            <i className="fas fa-camera"></i>
                            <span>No Images Added</span>
                        </div>
                    )}

                    {/* Form to Add More Image URLs */}
                    <div className="add-images-form">
                        <h5>Add More Image URLs:</h5>
                        <textarea
                            value={newImageUrlsString}
                            onChange={handleNewImageUrlsChange}
                            rows="3"
                            placeholder="Paste new URLs here (one per line or comma-separated)"
                            aria-label="Add more image URLs"
                        />
                         <button onClick={handleAddImages} className="btn btn-secondary btn-add-images">
                            <i className="fas fa-plus"></i> Add Images
                         </button>
                    </div>

                    {/* Link to original listing */}
                    {property.listingUrl && (
                        <a href={property.listingUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline listing-link">
                            <i className="fas fa-external-link-alt"></i> View Original Listing
                        </a>
                    )}
                </div>
                {/* --- End Image Section --- */}


                {/* Information Column */}
                <div className="detail-info-section">
                    {/* Basic Info */}
                    <div className="detail-item price"><strong>Price:</strong>{formatPrice(property.price)}</div>
                    <div className="detail-item"><strong>Beds:</strong> {property.beds ?? 'N/A'}</div>
                    <div className="detail-item"><strong>Baths:</strong> {property.baths ?? 'N/A'}</div>
                    <div className="detail-item"><strong>SqFt:</strong> {property.sqft ? `${property.sqft}` : 'N/A'}</div>
                    {/* Calculated Score Display */}
                    <div className="detail-item score-display">
                        <strong>Score:</strong>
                        <span className={`score-badge ${getScoreClass(calculatedScore)}`}>
                            {(calculatedScore !== null && calculatedScore !== undefined) ? calculatedScore : '--'}
                        </span>
                    </div>
                    {/* Notes */}
                    <div className="detail-notes">
                        <h3>Notes / Red Flags</h3>
                        {property.notes ? <p>{property.notes}</p> : <p><i>No notes added yet.</i></p>}
                    </div>
                    {/* Action Buttons */}
                    <div className="detail-actions">
                        {/* Placeholder functionality for buttons */}
                        <button className="btn btn-primary" onClick={() => alert('Edit property details (notes, price, etc.) - To Be Implemented')}><i className="fas fa-edit"></i> Edit Details</button>
                        <button className="btn btn-danger" onClick={() => alert('Delete property - To Be Implemented')}><i className="fas fa-trash-alt"></i> Delete Property</button>
                    </div>
                </div>
                {/* End Information Column */}

            </div> {/* End detail-grid */}


            {/* --- Criteria Rating Section --- */}
            <div className="detail-section criteria-rating-section">
                <h2>Rate Property Against Your Criteria</h2>
                {/* Render rating inputs for each category */}
                <div className="rating-category">
                    <h3><i className="fas fa-star"></i> Must-Haves</h3>
                    {mustHaves.length === 0 ? <p><i>No must-have criteria defined.</i></p> :
                        mustHaves.map(criterion => (<RatingInput key={criterion.id} criterion={criterion} rating={ratings[criterion.id]} onChange={handleRatingChange}/>))
                    }
                </div>
                <div className="rating-category">
                    <h3><i className="fas fa-thumbs-up"></i> Nice-to-Haves</h3>
                     {niceToHaves.length === 0 ? <p><i>No nice-to-have criteria defined.</i></p> :
                        niceToHaves.map(criterion => (<RatingInput key={criterion.id} criterion={criterion} rating={ratings[criterion.id]} onChange={handleRatingChange}/>))
                    }
                </div>
                 <div className="rating-category">
                    <h3><i className="fas fa-ban"></i> Deal Breakers</h3>
                     {dealBreakers.length === 0 ? <p><i>No deal breaker criteria defined.</i></p> :
                        dealBreakers.map(criterion => (<RatingInput key={criterion.id} criterion={criterion} rating={ratings[criterion.id]} onChange={handleRatingChange}/>))
                    }
                 </div>
            </div>
            {/* --- End Criteria Rating Section --- */}

            {/* --- Score Breakdown Section --- */}
            {/* Render only when score has been calculated */}
            {calculatedScore !== null && (
                 <div className="detail-section score-breakdown-section">
                     <ScoreBreakdown
                         ratings={ratings} // Pass current local ratings state
                         mustHaves={mustHaves}
                         niceToHaves={niceToHaves}
                         dealBreakers={dealBreakers}
                         finalScore={calculatedScore} // Pass the currently displayed score
                     />
                 </div>
            )}
            {/* --- End Score Breakdown Section --- */}

        </div> // End property-detail-container
    );
}

export default PropertyDetail;