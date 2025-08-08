// src/pages/AddProperty.jsx
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProperties } from '../contexts/PropertyContext'; // Import context hook
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../hooks/useConfirm';
import { useAuth } from '../contexts/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';
import AIInsights from '../components/AIInsights';
import './AddProperty.css'; // Make sure styles are imported

function AddProperty() {
  const navigate = useNavigate();
  const { addProperty } = useProperties(); // Get add function from context
  const { showSuccess, showError, showWarning } = useToast();
  const { showConfirm, confirmDialog } = useConfirm();
  const { authenticatedFetch } = useAuth();

  // --- State for Form Inputs ---
  const [address, setAddress] = useState('');
  const [listingUrl, setListingUrl] = useState('');
  const [price, setPrice] = useState('');
  const [beds, setBeds] = useState('');
  const [baths, setBaths] = useState('');
  const [sqft, setSqft] = useState('');
  // State to store the multi-line/comma-separated string of image URLs
  const [imageUrlsString, setImageUrlsString] = useState('');
  const [notes, setNotes] = useState('');
  // Optional: Add state for latitude/longitude if you plan to add inputs for them
  // const [latitude, setLatitude] = useState('');
  // const [longitude, setLongitude] = useState('');

  // State for Auto-Fill functionality
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [autoFillStatus, setAutoFillStatus] = useState('');
  
  // State for AI analysis
  const [aiAnalysisData, setAiAnalysisData] = useState(null);
  const [canRunAnalysis, setCanRunAnalysis] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState('');
  const [scrapedDescription, setScrapedDescription] = useState('');

  // --- Input Change Handlers ---
  // Simple handlers to update state based on input changes
  const handleAddressChange = (e) => setAddress(e.target.value);
  const handleListingUrlChange = (e) => setListingUrl(e.target.value);
  const handlePriceChange = (e) => setPrice(e.target.value);
  const handleBedsChange = (e) => setBeds(e.target.value);
  const handleBathsChange = (e) => setBaths(e.target.value);
  const handleSqftChange = (e) => setSqft(e.target.value);
  // Handler for the image URLs textarea
  const handleImageUrlsStringChange = (e) => setImageUrlsString(e.target.value);
  const handleNotesChange = (e) => setNotes(e.target.value);
  // Optional handlers for lat/lon
  // const handleLatitudeChange = (e) => setLatitude(e.target.value);
  // const handleLongitudeChange = (e) => setLongitude(e.target.value);

  // --- Auto-Fill Handler ---
  const handleAutoFill = async () => {
    if (!listingUrl.trim()) {
      showWarning('Please enter a listing URL first.');
      return;
    }

    setIsAutoFilling(true);
    setAutoFillStatus('🌐 Connecting to listing website...');
    
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
      
      // Add a small delay to show the connecting status
      await new Promise(resolve => setTimeout(resolve, 500));
      setAutoFillStatus('🔍 Analyzing page content...');
      
      const response = await authenticatedFetch(`${API_BASE_URL}/properties/scrape_listing/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: listingUrl.trim() }),
      });

      setAutoFillStatus('📝 Processing property data...');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Scraping failed');
      }

      const data = await response.json();
      
      setAutoFillStatus('✨ Auto-filling form fields...');
      
      // Auto-fill form fields with scraped data
      if (data.address && !address.trim()) {
        setAddress(data.address);
      }
      if (data.price && !price.toString().trim()) {
        setPrice(data.price.toString());
      }
      if (data.beds && !beds.toString().trim()) {
        setBeds(data.beds.toString());
      }
      if (data.baths && !baths.toString().trim()) {
        setBaths(data.baths.toString());
      }
      if (data.sqft && !sqft.toString().trim()) {
        setSqft(data.sqft.toString());
      }
      if (data.images && data.images.length > 0 && !imageUrlsString.trim()) {
        setImageUrlsString(data.images.join('\n'));
      }

      // Store scraped description and add to notes field
      if (data.description) {
        setScrapedDescription(data.description);
        // Add scraped description to notes if notes field is empty
        if (!notes.trim()) {
          setNotes(`Listing Description:\n${data.description}`);
        } else {
          // Append to existing notes if there are already some
          setNotes(prevNotes => `${prevNotes}\n\nListing Description:\n${data.description}`);
        }
      }

      // Check if AI analysis can be run
      const hasImages = data.images && data.images.length > 0;
      setCanRunAnalysis(hasImages);
      
      if (hasImages) {
        showSuccess(`✅ Auto-filled property data! Found ${data.images?.length || 0} images.\n🤖 You can now run AI analysis to get insights about this property.`);
      } else {
        showSuccess(`✅ Auto-filled property data! No images found - AI analysis requires property images.`);
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
      setAutoFillStatus('');
    }
  };

  // --- AI Analysis Handler ---
  const handleRunAnalysis = async () => {
    // Validate required fields for analysis
    if (!address.trim()) {
      showWarning('Please fill in Address before running AI analysis.');
      return;
    }

    if (!imageUrlsString.trim()) {
      showWarning('Please add image URLs before running AI analysis.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStatus('🤖 Analyzing property images...');

    try {
      // Parse image URLs from string
      const imageUrlsArray = imageUrlsString
        .split(/[\n,]+/)
        .map(url => url.trim())
        .filter(url => url);

      if (imageUrlsArray.length === 0) {
        throw new Error('No valid image URLs found');
      }

      // Combine user notes with scraped description for comprehensive analysis
      const combinedDescription = [
        notes.trim(),
        scrapedDescription ? `\n\nListing Description:\n${scrapedDescription}` : ''
      ].filter(text => text).join('');

      // Prepare data for analysis (without saving)
      const propertyData = {
        address: address.trim(),
        price: parseFloat(price) || null,
        beds: parseInt(beds) || null,
        baths: parseFloat(baths) || null,
        sqft: parseInt(sqft) || null,
        notes: combinedDescription,
        imageUrls: imageUrlsArray
      };

      setAnalysisStatus('🔍 Processing images and generating insights...');

      // Run AI analysis without saving property
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
      const analysisResponse = await authenticatedFetch(`${API_BASE_URL}/properties/analyze_property_data/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(propertyData),
      });

      if (!analysisResponse.ok) {
        const errorData = await analysisResponse.json();
        throw new Error(errorData.error || 'AI analysis failed');
      }

      const analysisData = await analysisResponse.json();
      
      if (analysisData.success) {
        setAiAnalysisData(analysisData.analysis);
        const grade = analysisData.analysis?.overall_grade || 'Unknown';
        const redFlagsCount = analysisData.analysis?.red_flags?.length || 0;
        
        if (redFlagsCount > 0) {
          showSuccess(`🤖 AI Analysis Complete! Grade: ${grade} with ${redFlagsCount} potential issues detected. Review the results below before saving.`);
        } else {
          showSuccess(`🤖 AI Analysis Complete! Grade: ${grade} - No major issues detected! You can now save the property.`);
        }
      } else {
        throw new Error(analysisData.error || 'Analysis failed');
      }

    } catch (error) {
      console.error('AI analysis error:', error);
      showError(`AI analysis failed: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
      setAnalysisStatus('');
    }
  };

  // --- Form Submission Handler ---
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default browser form submission (page reload)

    // Basic validation (can be expanded)
    if (!address.trim() || !price.trim()) {
        showWarning('Please fill in at least Address and Asking Price.');
        return;
    }
    // More specific validation (e.g., check if price is a valid number)
    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice < 0) {
        showError('Please enter a valid, non-negative Asking Price.');
        return;
    }

    // Combine user notes with scraped description for storage
    const combinedNotes = [
      notes.trim(),
      scrapedDescription ? `\n\nListing Description:\n${scrapedDescription}` : ''
    ].filter(text => text).join('');

    // Prepare the data object to pass to the context's addProperty function
    const newPropertyData = {
      address: address.trim(), // Use trimmed address
      listingUrl: listingUrl.trim() || null, // Use null if empty/whitespace
      price: numericPrice, // Use validated numeric price
      // Parse other numeric fields, use null if invalid/empty
      beds: parseInt(beds) || null,
      baths: parseFloat(baths) || null,
      sqft: parseInt(sqft) || null,
      // Pass the raw string - the context's addProperty function will parse it
      imageUrlsString: imageUrlsString,
      notes: combinedNotes, // Use combined notes + scraped description
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
      // latitude: parseFloat(latitude) || null, // If adding lat/lon inputs
      // longitude: parseFloat(longitude) || null,
    };
    

    try {
        await addProperty(newPropertyData); // Call context function to add the property
        showSuccess('Property added successfully!'); // Provide user feedback
        navigate('/properties'); // Navigate back to the dashboard after successful add
    } catch (error) {
        console.error("Error adding property:", error);
        showError("An error occurred while adding the property. Please try again."); // Error feedback
    }
  }; // End handleSubmit

  // --- Cancel Handler ---
  // Checks if any fields have data before navigating away
  const handleCancel = useCallback(async () => {
    try {
      // List of all state values that indicate user input
      const formHasData = [
          address, listingUrl, price, beds, baths, sqft, imageUrlsString, notes, scrapedDescription
          // latitude, longitude // Add if using lat/lon state
      ].some(value => value && value.toString().trim()); // Check if any value is truthy after trimming

      if (formHasData) {
          // Ask for confirmation only if there's data
          const confirmed = await showConfirm({
            title: "Discard Changes",
            message: "You have unsaved changes. Are you sure you want to discard them and go back to the dashboard?",
            confirmText: "Discard",
            cancelText: "Stay",
            type: "warning"
          });
          
          if (confirmed) {
              navigate('/properties');
          }
          // If user clicks 'Stay' on the confirmation, do nothing.
      } else {
          // If no data, navigate back without confirmation
          navigate('/properties');
      }
    } catch (error) {
      console.error('Error in cancel handler:', error);
      // Fallback - just navigate away
      navigate('/properties');
    }
  }, [address, listingUrl, price, beds, baths, sqft, imageUrlsString, notes, scrapedDescription, showConfirm, navigate]); // End handleCancel


  // --- Render the Form ---
  return (
    <div className="add-property-container">
      <h1>Add New Property</h1>
      <p className="add-property-description">Enter the details of a property you visited.</p>

      <form onSubmit={handleSubmit} className="add-property-form" action="">

        {/* Address Input (Required) */}
        <div className="form-group">
          <label htmlFor="address">Address </label>
          <input type="text" id="address" value={address} onChange={handleAddressChange} required aria-required="true"/>
        </div>

        {/* Listing URL Input (Optional) */}
        <div className="form-group">
          <label htmlFor="listingUrl">Listing URL</label>
          <div className="url-input-group">
            <input type="url" id="listingUrl" value={listingUrl} onChange={handleListingUrlChange} placeholder="https://www.realtor.ca/... or https://zealty.ca/..."/>
            <button 
              type="button" 
              className="btn btn-auto-fill" 
              onClick={handleAutoFill}
              disabled={isAutoFilling || !listingUrl.trim()}
            >
              {isAutoFilling ? 'Auto-Filling...' : '🔄 Auto-Fill'}
            </button>
          </div>
          {isAutoFilling && <small className="auto-fill-status">{autoFillStatus}</small>}
          {!isAutoFilling && <small className="auto-fill-help">📋 Paste a Realtor.ca, Redfin.ca, Zealty.ca, HouseSigma.com, or MLS listing URL above, then click Auto-Fill to extract property details automatically.</small>}
        </div>

        {/* AI Analysis Section */}
        {canRunAnalysis && (
          <div className="form-group ai-analysis-section">
            <label>🤖 AI Property Analysis</label>
            <div className="ai-analysis-controls">
              <button 
                type="button" 
                className="btn btn-ai-analysis" 
                onClick={handleRunAnalysis}
                disabled={isAnalyzing || !address.trim() || !imageUrlsString.trim()}
              >
                {isAnalyzing ? 'Analyzing...' : '🧠 Run AI Analysis'}
              </button>
              <small className="ai-analysis-help">
                Get AI insights about potential issues, property condition, and price assessment based on the property images.
              </small>
            </div>
            {isAnalyzing && <small className="analysis-status">{analysisStatus}</small>}
          </div>
        )}

        {/* Asking Price Input (Required, Number) */}
        <div className="form-group">
          <label htmlFor="price">Asking Price </label>
          <input type="number" id="price" value={price} onChange={handlePriceChange} min="0" step="1" placeholder="e.g., 450000" required aria-required="true"/>
        </div>

        {/* Beds, Baths, SqFt Inputs (Row Layout) */}
        <div className="form-row">
             <div className="form-group">
                <label htmlFor="beds">Beds</label>
                <input type="number" id="beds" value={beds} onChange={handleBedsChange} min="0" step="1"/>
             </div>
             <div className="form-group">
                <label htmlFor="baths">Baths</label>
                {/* Allow decimals for baths */}
                <input type="number" id="baths" value={baths} onChange={handleBathsChange} min="0" step="0.5"/>
             </div>
             <div className="form-group">
                <label htmlFor="sqft">SqFt</label>
                <input type="number" id="sqft" value={sqft} onChange={handleSqftChange} min="0" step="1"/>
             </div>
        </div>
        {/* Optional Lat/Lon Inputs - Add later if needed */}
        {/*
        <div className="form-row">
             <div className="form-group">
                <label htmlFor="latitude">Latitude</label>
                <input type="number" id="latitude" value={latitude} onChange={handleLatitudeChange} step="any" />
             </div>
             <div className="form-group">
                <label htmlFor="longitude">Longitude</label>
                <input type="number" id="longitude" value={longitude} onChange={handleLongitudeChange} step="any" />
             </div>
        </div>
        */}

        {/* Image URLs Textarea Input */}
        <div className="form-group">
          <label htmlFor="imageUrlsString">Image URLs (Optional)</label>
          {/* Textarea allows multiple lines */}
          <textarea
            id="imageUrlsString"
            value={imageUrlsString} // Bind to the string state
            onChange={handleImageUrlsStringChange} // Update the string state
            rows="5" // Adjust number of visible rows
            placeholder="Enter image URLs, one per line or separated by commas..."
            aria-describedby="imageUrlsHelp"
          />
          {/* Help text */}
          <small id="imageUrlsHelp">Paste image URLs (e.g., from Zillow, Redfin). Separate multiple URLs with a new line or a comma.</small>
        </div>

         {/* Notes Textarea Input */}
        <div className="form-group">
          <label htmlFor="notes">Initial Notes / Red Flags</label>
          <textarea
            id="notes"
            value={notes}
            onChange={handleNotesChange}
            rows="4"
            placeholder="e.g., Roof looks old, noisy street, great natural light..."
          />
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

        {/* Action Buttons (Submit and Cancel) */}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">Save Property</button>
          {/* Use type="button" for cancel to prevent accidental form submission */}
          <button type="button" className="btn btn-secondary" onClick={handleCancel}>Cancel</button>
        </div>
      </form>
      
      {/* Confirmation Dialog */}
      <ConfirmDialog {...confirmDialog} />
    </div> // End add-property-container
  );
}

export default AddProperty;