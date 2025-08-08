import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProperties } from '../contexts/PropertyContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import AIInsights from '../components/AIInsights';
import './AddProperty.css'; // Re-use the styling from AddProperty

function EditProperty() {
    const { propertyId } = useParams();
    const navigate = useNavigate();
    const { getPropertyById, updateProperty } = useProperties();
    const { showSuccess, showError, showWarning } = useToast();
    const { authenticatedFetch } = useAuth();

    const [property, setProperty] = useState(null);
    const [formData, setFormData] = useState({
        address: '',
        listingUrl: '',
        price: '',
        beds: '',
        baths: '',
        sqft: '',
        notes: '',
        imageUrlsString: '', // For displaying/editing existing image URLs
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isAutoFilling, setIsAutoFilling] = useState(false);
    const [aiAnalysisData, setAiAnalysisData] = useState(null);

    useEffect(() => {
        const fetchedProperty = getPropertyById(propertyId);
        if (fetchedProperty) {
            setProperty(fetchedProperty);
            setFormData({
                address: fetchedProperty.address || '',
                listingUrl: fetchedProperty.listingUrl || '',
                price: fetchedProperty.price || '',
                beds: fetchedProperty.beds || '',
                baths: fetchedProperty.baths || '',
                sqft: fetchedProperty.sqft || '',
                notes: fetchedProperty.notes || '',
                imageUrlsString: (fetchedProperty.imageUrls || []).join('\n'), // Join array back to string
            });
        } else {
            setError('Property not found.');
        }
        setLoading(false);
    }, [propertyId, getPropertyById]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: value
        }));
    };

    // --- Auto-Fill Handler ---
    const handleAutoFill = async () => {
        if (!formData.listingUrl.trim()) {
            showWarning('Please enter a listing URL first.');
            return;
        }

        setIsAutoFilling(true);
        
        try {
            const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
            const response = await authenticatedFetch(`${API_BASE_URL}/properties/scrape_listing/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: formData.listingUrl.trim() }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Scraping failed');
            }

            const data = await response.json();
            
            // Auto-fill form fields with scraped data, but only if the field is empty
            const updatedFormData = { ...formData };
            
            if (data.address && !updatedFormData.address.trim()) {
                updatedFormData.address = data.address;
            }
            if (data.price && !updatedFormData.price.toString().trim()) {
                updatedFormData.price = data.price.toString();
            }
            if (data.beds && !updatedFormData.beds.toString().trim()) {
                updatedFormData.beds = data.beds.toString();
            }
            if (data.baths && !updatedFormData.baths.toString().trim()) {
                updatedFormData.baths = data.baths.toString();
            }
            if (data.sqft && !updatedFormData.sqft.toString().trim()) {
                updatedFormData.sqft = data.sqft.toString();
            }
            if (data.images && data.images.length > 0 && !updatedFormData.imageUrlsString.trim()) {
                updatedFormData.imageUrlsString = data.images.join('\n');
            }

            setFormData(updatedFormData);
            
            // Handle AI analysis if available
            if (data.ai_analysis) {
                setAiAnalysisData(data.ai_analysis);
                const grade = data.ai_analysis.overall_grade || 'Unknown';
                const redFlagsCount = data.ai_analysis.red_flags?.length || 0;
                
                if (redFlagsCount > 0) {
                    showSuccess(`✅ Auto-filled property data! Found ${data.images?.length || 0} images.\n🤖 AI Analysis: Grade ${grade} with ${redFlagsCount} potential issues detected.`);
                } else {
                    showSuccess(`✅ Auto-filled property data! Found ${data.images?.length || 0} images.\n🤖 AI Analysis: Grade ${grade} - No major issues detected!`);
                }
            } else {
                showSuccess(`Auto-filled property data! Found ${data.images?.length || 0} images.`);
            }
            
        } catch (error) {
            console.error('Auto-fill error:', error);
            const errorMsg = error.message;
            
            // Show helpful message for anti-bot protection
            if (errorMsg.includes('blocked') || errorMsg.includes('security') || errorMsg.includes('automated requests') || errorMsg.includes('anti-bot protection') || errorMsg.includes('Incapsula') || errorMsg.includes('too small')) {
                showError(`🚫 ${errorMsg}\n\n💡 How to get the data manually:\n1. Open the listing URL in your browser\n2. Copy the address, price, beds, baths, sqft\n3. Right-click on photos → "Copy image address" for each photo\n4. Paste the details into the form below`);
            } else {
                showError(`Auto-fill failed: ${errorMsg}`);
            }
        } finally {
            setIsAutoFilling(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!property) {
            setError('Property data not loaded.');
            return;
        }

        // Prepare data for API call
        const updatedData = {
            ...formData,
            price: formData.price ? parseFloat(formData.price) : null,
            beds: formData.beds ? parseInt(formData.beds, 10) : null,
            baths: formData.baths ? parseFloat(formData.baths) : null,
            sqft: formData.sqft ? parseInt(formData.sqft, 10) : null,
            // Parse imageUrlsString back to an array
            imageUrls: formData.imageUrlsString
                .split(/[\n,]+/) // Split by newline OR comma
                .map(url => url.trim())
                .filter(url => url && url.length > 5), // Basic validation
            // Include AI analysis data if available
            ...(aiAnalysisData && {
                aiAnalysis: aiAnalysisData,
                aiOverallGrade: aiAnalysisData.overall_grade,
                aiRedFlags: aiAnalysisData.red_flags,
                aiPositiveIndicators: aiAnalysisData.positive_indicators,
                aiPriceAssessment: aiAnalysisData.price_assessment,
                aiBuyerRecommendation: aiAnalysisData.buyer_recommendation,
                aiConfidenceScore: aiAnalysisData.confidence_score,
                aiAnalysisSummary: aiAnalysisData.analysis_summary,
                aiAnalysisDate: new Date().toISOString()
            }),
        };

        try {
            await updateProperty(property.id, updatedData);
            showSuccess('Property updated successfully!');
            navigate(`/properties/${property.id}`); // Go back to detail page
        } catch (err) {
            console.error('Failed to update property:', err);
            showError('Failed to update property. Please try again.');
        }
    };

    if (loading) {
        return <div className="loading-message">Loading property for editing...</div>;
    }

    if (error) {
        return <div className="error-message"><h2>Error</h2><p>{error}</p><button onClick={() => navigate('/properties')} className="btn btn-secondary">Back to Dashboard</button></div>;
    }

    if (!property) {
        return <div className="error-message"><h2>Property Not Found</h2><p>Could not load property details for editing.</p><button onClick={() => navigate('/properties')} className="btn btn-secondary">Back to Dashboard</button></div>;
    }

    return (
        <div className="add-property-container">
            <h2>Edit Property: {property.address}</h2>
            {error && <p className="error-message">{error}</p>}
            <form onSubmit={handleSubmit} className="add-property-form">
                <div className="form-group">
                    <label htmlFor="address">Address:</label>
                    <input
                        type="text"
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="listingUrl">Listing URL:</label>
                    <div className="url-input-group">
                        <input
                            type="url"
                            id="listingUrl"
                            name="listingUrl"
                            value={formData.listingUrl}
                            onChange={handleChange}
                            placeholder="e.g., https://www.realtor.ca/... or https://zealty.ca/..."
                        />
                        <button 
                            type="button" 
                            className="btn btn-auto-fill" 
                            onClick={handleAutoFill}
                            disabled={isAutoFilling || !formData.listingUrl.trim()}
                        >
                            {isAutoFilling ? 'Auto-Filling...' : '🔄 Auto-Fill'}
                        </button>
                    </div>
                    {isAutoFilling && <small className="auto-fill-status">Scraping listing data, please wait...</small>}
                    {!isAutoFilling && <small className="auto-fill-help">📋 Paste a Realtor.ca, Redfin.ca, Zealty.ca, HouseSigma.com, or MLS listing URL above, then click Auto-Fill to extract property details automatically.</small>}
                </div>
                <div className="form-group">
                    <label htmlFor="price">Price:</label>
                    <input
                        type="number"
                        id="price"
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="beds">Beds:</label>
                    <input
                        type="number"
                        id="beds"
                        name="beds"
                        value={formData.beds}
                        onChange={handleChange}
                        min="0"
                        step="1"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="baths">Baths:</label>
                    <input
                        type="number"
                        id="baths"
                        name="baths"
                        value={formData.baths}
                        onChange={handleChange}
                        min="0"
                        step="0.5"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="sqft">SqFt:</label>
                    <input
                        type="number"
                        id="sqft"
                        name="sqft"
                        value={formData.sqft}
                        onChange={handleChange}
                        min="0"
                        step="1"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="notes">Notes:</label>
                    <textarea
                        id="notes"
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows="5"
                    ></textarea>
                </div>
                <div className="form-group">
                    <label htmlFor="imageUrlsString">Image URLs (one per line or comma-separated):</label>
                    <textarea
                        id="imageUrlsString"
                        name="imageUrlsString"
                        value={formData.imageUrlsString}
                        onChange={handleChange}
                        rows="5"
                        placeholder="Paste image URLs here"
                    ></textarea>
                </div>
                
                {/* AI Analysis Preview */}
                {aiAnalysisData && (
                    <div className="ai-analysis-preview">
                        <h3>🤖 AI Analysis Preview</h3>
                        <AIInsights property={{
                            aiAnalysis: aiAnalysisData,
                            aiOverallGrade: aiAnalysisData.overall_grade,
                            aiRedFlags: aiAnalysisData.red_flags,
                            aiPositiveIndicators: aiAnalysisData.positive_indicators,
                            aiPriceAssessment: aiAnalysisData.price_assessment,
                            aiBuyerRecommendation: aiAnalysisData.buyer_recommendation,
                            aiConfidenceScore: aiAnalysisData.confidence_score,
                            aiAnalysisSummary: aiAnalysisData.analysis_summary
                        }} />
                    </div>
                )}
                
                <div className="form-actions">
                    <button type="submit" className="btn btn-primary">Save Changes</button>
                    <button type="button" onClick={() => navigate(`/properties/${propertyId}`)} className="btn btn-secondary">Cancel</button>
                </div>
            </form>
        </div>
    );
}

export default EditProperty;
