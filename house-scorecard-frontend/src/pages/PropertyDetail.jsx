// src/pages/PropertyDetail.jsx
import React, { useEffect, useState, memo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
// Make sure updatePropertyImages is imported from context
import { useProperties } from '../contexts/PropertyContext';
// Import context hook and rating type constants
import { useCriteria, RATING_TYPE_STARS, RATING_TYPE_YES_NO, RATING_TYPE_SCALE_10 } from '../contexts/CriteriaContext';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../hooks/useConfirm';
import ConfirmDialog from '../components/ConfirmDialog';
import { StatusSelector, StatusHistory } from '../components/PropertyStatus';
import { PROPERTY_STATUSES } from '../constants/propertyStatus';
import ScoreBreakdown from '../components/ScoreBreakdown'; // Import the breakdown component
import AIInsights from '../components/AIInsights'; // Import AI insights component
import './PropertyDetail.css'; // Ensure CSS is imported

// --- Reusable Rating Input Component ---
// Renders the appropriate input (checkbox, stars, number) based on criterion type and ratingType
const RatingInput = memo(({ criterion, rating, onChange }) => {

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
            return (
                <div className="rating-input checkbox-rating">
                    <input type="checkbox" id={`rating-${criterion.id}`} checked={!!rating} onChange={handleCheckboxChange}/>
                    <label htmlFor={`rating-${criterion.id}`}>{criterion.text}</label>
                </div>);
        case 'niceToHave': {
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
        }
        default: return null;
    }
}); // End RatingInput Component


// --- Scoring Logic Function ---
// Calculates a score (0-100) based on ratings against criteria
const calculateScore = (ratings, mustHaves, niceToHaves, dealBreakers) => {
    const currentRatings = ratings || {};
    for (const db of dealBreakers) { if (currentRatings[db.id] === true) { return 0; } } // Deal Breaker check
    for (const mh of mustHaves) { 
        const rating = currentRatings[mh.id];
        // Must-have fails if it's explicitly false, or if it's undefined/null (not rated)
        if (rating !== true) { 
            return 0; 
        } 
    } // Must-Have check

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
    return finalScore;
}; // End calculateScore


// --- Main PropertyDetail Component ---
function PropertyDetail() {
    const { propertyId } = useParams();
    // Get context functions including updatePropertyImages and analyzePropertyWithAI
    const { properties, getPropertyById, updatePropertyRatingsAndScore, updatePropertyImages, deleteProperty, updatePropertyStatus, analyzePropertyWithAI } = useProperties();
    const { mustHaves, niceToHaves, dealBreakers } = useCriteria();
    const { showSuccess, showError, showWarning } = useToast();
    const { showConfirm, confirmDialog } = useConfirm();
    const navigate = useNavigate();

    // --- Component State ---
    const [property, setProperty] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false); // New state for deletion process
    const [ratings, setRatings] = useState({}); // Local ratings state for inputs
    const [calculatedScore, setCalculatedScore] = useState(null); // Displayed score
    const [initialRatingsLoaded, setInitialRatingsLoaded] = useState(false); // Track if we've loaded initial ratings
    // State for the "Add More Image URLs" input field
    const [newImageUrlsString, setNewImageUrlsString] = useState('');
    // Track previous ratings to prevent score updates when only status changes
    const [prevRatings, setPrevRatings] = useState({});
    // AI analysis state
    const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);

    // --- Effects ---
    // Effect 1: Load property data and set INITIAL state when propertyId changes
    useEffect(() => {
        console.log(`EFFECT 1 (Load): Running for propertyId: ${propertyId}`);
        setLoading(true);
        setProperty(null); setRatings({}); setCalculatedScore(null); setInitialRatingsLoaded(false); setPrevRatings({}); // Clear previous state
        const fetchedProperty = getPropertyById(propertyId); // Get data from context
        if (fetchedProperty) {
            console.log('PROPERTY DETAIL: Loaded property:', fetchedProperty);
            console.log('PROPERTY DETAIL: AI fields in property:', {
                aiAnalysis: fetchedProperty.aiAnalysis,
                aiOverallGrade: fetchedProperty.aiOverallGrade,
                aiRedFlags: fetchedProperty.aiRedFlags?.length
            });
            setProperty(fetchedProperty); // Set the main property object
            const initialRatings = fetchedProperty.ratings || {}; // Get ratings (or empty obj)
            setRatings(initialRatings); // Set local ratings state for inputs
            setPrevRatings(initialRatings); // Track initial ratings
            setInitialRatingsLoaded(true); // Mark that we've loaded initial ratings
            // Set initial score display (prefer saved, else calculate)
            const initialScore = fetchedProperty.score ?? calculateScore(initialRatings, mustHaves, niceToHaves, dealBreakers);
            setCalculatedScore(initialScore);
            setLoading(false); // Property found - stop loading
        } else {
            console.log(`EFFECT 1 (Load): Property with ID ${propertyId} not found in context yet.`);
            // Don't set loading to false yet - PropertyContext might still be fetching
            // We'll handle this in the properties dependency effect below
        }
    }, [propertyId]); // Only depend on propertyId changes

    // Effect 1.5: Handle case where PropertyContext loads properties after PropertyDetail mounts
    useEffect(() => {
        // Only run if we're currently loading and don't have a property yet
        if (loading && !property && propertyId && properties.length > 0) {
            console.log(`EFFECT 1.5: Properties loaded, checking for propertyId: ${propertyId}`);
            const fetchedProperty = getPropertyById(propertyId);
            if (fetchedProperty) {
                console.log(`EFFECT 1.5: Found property ${propertyId} after context loaded`);
                setProperty(fetchedProperty);
                const initialRatings = fetchedProperty.ratings || {};
                setRatings(initialRatings);
                setPrevRatings(initialRatings);
                setInitialRatingsLoaded(true);
                const initialScore = fetchedProperty.score ?? calculateScore(initialRatings, mustHaves, niceToHaves, dealBreakers);
                setCalculatedScore(initialScore);
                setLoading(false);
            } else {
                console.log(`EFFECT 1.5: Property ${propertyId} still not found after context loaded - showing error`);
                setLoading(false); // Stop loading and show error
            }
        }
    }, [properties, loading, property, propertyId, getPropertyById, mustHaves, niceToHaves, dealBreakers]);

    // Effect 2: Calculate score and update context whenever LOCAL 'ratings' state changes (user input only)
    useEffect(() => {
        // Only run if:
        // 1. Not loading and property exists
        // 2. Initial ratings have been loaded (not the first load)
        // 3. Criteria exist (to avoid division by zero)
        // 4. Ratings have actually changed (not just status updates)
        const ratingsChanged = JSON.stringify(ratings) !== JSON.stringify(prevRatings);
        
        if (!loading && property && initialRatingsLoaded && ratingsChanged && (mustHaves.length > 0 || niceToHaves.length > 0 || dealBreakers.length > 0)) {
            console.log('Ratings changed, updating score...');
            const newScore = calculateScore(ratings, mustHaves, niceToHaves, dealBreakers);
            setCalculatedScore(newScore); // Update score displayed on this page
            // Update the central context (PropertyContext)
            updatePropertyRatingsAndScore(property.id, ratings, newScore);
            setPrevRatings(ratings); // Update previous ratings
        }
    }, [ratings, loading, property?.id, initialRatingsLoaded, mustHaves, niceToHaves, dealBreakers, updatePropertyRatingsAndScore, prevRatings]); // Use property.id instead of full property object

    // Simple effect to sync property when context changes (but avoid overriding recent local changes)
    useEffect(() => {
        if (propertyId && !loading) {
            const contextProperty = getPropertyById(propertyId);
            if (contextProperty && property) {
                // Only sync if the context has a different status than what we currently have
                // This prevents the sync from overriding immediate local updates
                if (contextProperty.status !== property.status) {
                    console.log('PropertyDetail: Syncing with context. Status from context:', contextProperty.status);
                    setProperty(contextProperty);
                }
            } else if (contextProperty && !property) {
                // Initial load case
                setProperty(contextProperty);
            }
        }
    }, [properties, propertyId, loading, getPropertyById, property?.status]);


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
            showWarning("Please enter one or more image URLs.");
            return; // Exit if input is empty
        }
        if (!property) return; // Exit if property data isn't loaded

        // Parse the input string into an array of valid-looking URLs
        const parsedNewUrls = newImageUrlsString
            .split(/[\n,]+/) // Split by newline or comma
            .map(url => url.trim()) // Trim whitespace
            .filter(url => url && url.length > 5); // Basic filter for non-empty strings

        if (parsedNewUrls.length === 0) {
             showWarning("No valid URLs found in the input.");
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
            showWarning("All entered URLs are already associated with this property.");
            setNewImageUrlsString(''); // Clear input even if nothing new added
            return;
        }

        console.log(`Adding ${addedCount} new image URLs to property ${property.id}`);
        // Call the context function to update the property's imageUrls array
        updatePropertyImages(property.id, combinedUrls);

        // Clear the input field after successful addition
        setNewImageUrlsString('');
        showSuccess(`${addedCount} new image URL(s) added!`); // Success feedback
    }; // End handleAddImages

    const handleDeleteProperty = async () => {
        const confirmed = await showConfirm({
            title: "Delete Property",
            message: "Are you sure you want to delete this property? This action cannot be undone.",
            confirmText: "Delete",
            cancelText: "Cancel",
            type: "danger"
        });
        
        if (confirmed) {
            setIsDeleting(true); // Set deleting state to true
            try {
                await deleteProperty(property.id);
                showSuccess('Property deleted successfully!');
                navigate('/properties'); // Redirect to properties list after deletion
            } catch (error) {
                console.error('Error deleting property:', error);
                showError('Failed to delete property.');
                setIsDeleting(false); // Reset deleting state on error
            }
        }
    };

    const handleStatusChange = async (newStatus) => {
        if (property) {
            console.log('PropertyDetail: Changing status from', property.status, 'to', newStatus);
            
            // Update local state immediately for instant UI feedback
            setProperty(prevProperty => ({
                ...prevProperty,
                status: newStatus,
                statusHistory: [...(prevProperty.statusHistory || []), {
                    status: newStatus,
                    date: new Date().toISOString(),
                    notes: null
                }]
            }));
            
            // Then update the context in the background
            updatePropertyStatus(property.id, newStatus);
        }
    };

    const handleAIAnalysis = async () => {
        if (!property) return;
        
        // Check if property has images
        if (!property.imageUrls || property.imageUrls.length === 0) {
            showError('Property must have images for AI analysis');
            return;
        }
        
        setIsAnalyzingAI(true);
        
        try {
            showSuccess('AI analysis started... This may take a moment.');
            
            const result = await analyzePropertyWithAI(property.id);
            
            if (result.success) {
                // Update local property state with new AI data
                const updatedProperty = result.property;
                setProperty(prevProperty => ({
                    ...prevProperty,
                    aiAnalysis: updatedProperty.aiAnalysis,
                    aiOverallGrade: updatedProperty.aiOverallGrade,
                    aiRedFlags: updatedProperty.aiRedFlags,
                    aiPositiveIndicators: updatedProperty.aiPositiveIndicators,
                    aiPriceAssessment: updatedProperty.aiPriceAssessment,
                    aiBuyerRecommendation: updatedProperty.aiBuyerRecommendation,
                    aiConfidenceScore: updatedProperty.aiConfidenceScore,
                    aiAnalysisSummary: updatedProperty.aiAnalysisSummary,
                    aiAnalysisDate: updatedProperty.aiAnalysisDate
                }));
                
                showSuccess(`AI analysis completed! Grade: ${updatedProperty.aiOverallGrade || 'N/A'}`);
            }
        } catch (error) {
            console.error('AI analysis failed:', error);
            showError(`AI analysis failed: ${error.message}`);
        } finally {
            setIsAnalyzingAI(false);
        }
    };

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
    
    // Handle Deleting State
    if (isDeleting) {
        return <div className="loading-message">Deleting property...</div>;
    }

    // Handle Property Not Found State
    if (!property) { return (<div className="error-message"><h2>Property Not Found</h2><p>Sorry, we couldn't find details for property ID: ${propertyId}.</p><button onClick={() => navigate('/properties')} className="btn btn-secondary">Back to Dashboard</button></div>); }

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
                    {/* Property Status */}
                    <div className="detail-item status-display">
                        <strong>Status:</strong>
                        <StatusSelector
                            currentStatus={property.status}
                            onStatusChange={handleStatusChange}
                            size="small"
                        />
                    </div>
                    {/* Notes */}
                    <div className="detail-notes">
                        <h3>Notes / Red Flags</h3>
                        {property.notes ? <p>{property.notes}</p> : <p><i>No notes added yet.</i></p>}
                    </div>
                    {/* Action Buttons */}
                    <div className="detail-actions">
                        <button className="btn btn-primary" onClick={() => navigate(`/edit-property/${property.id}`)}><i className="fas fa-edit"></i> Edit Details</button>
                        <button className="btn btn-danger" onClick={handleDeleteProperty}><i className="fas fa-trash-alt"></i> Delete Property</button>
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

            {/* --- AI Insights Section --- */}
            <div className="detail-section ai-insights-section">
                <div className="ai-insights-header">
                    <h2><i className="fas fa-robot"></i> AI Property Analysis</h2>
                    {property.imageUrls && property.imageUrls.length > 0 && (
                        <button 
                            className={`btn ${property.aiAnalysis ? 'btn-secondary' : 'btn-primary'}`}
                            onClick={handleAIAnalysis}
                            disabled={isAnalyzingAI}
                        >
                            {isAnalyzingAI ? (
                                <>
                                    <i className="fas fa-spinner fa-spin"></i> Analyzing...
                                </>
                            ) : property.aiAnalysis ? (
                                <>
                                    <i className="fas fa-sync-alt"></i> Re-analyze with AI
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-magic"></i> Analyze with AI
                                </>
                            )}
                        </button>
                    )}
                </div>
                <AIInsights property={property} />
                {!property.aiAnalysis && (!property.imageUrls || property.imageUrls.length === 0) && (
                    <div className="ai-analysis-placeholder">
                        <p><i className="fas fa-info-circle"></i> Add property images to enable AI analysis</p>
                    </div>
                )}
                {!property.aiAnalysis && property.imageUrls && property.imageUrls.length > 0 && !isAnalyzingAI && (
                    <div className="ai-analysis-placeholder">
                        <p><i className="fas fa-lightbulb"></i> Click "Analyze with AI" to get insights about potential issues, property condition, and recommendations based on the property images.</p>
                    </div>
                )}
            </div>
            {/* --- End AI Insights Section --- */}

            {/* --- Status History Section --- */}
            {property.statusHistory && property.statusHistory.length > 0 && (
                <div className="detail-section status-history-section">
                    <StatusHistory statusHistory={property.statusHistory} />
                </div>
            )}
            {/* --- End Status History Section --- */}

            {/* Confirmation Dialog */}
            <ConfirmDialog {...confirmDialog} />

        </div> // End property-detail-container
    );
}

export default PropertyDetail;