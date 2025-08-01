// src/pages/AddProperty.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProperties } from '../contexts/PropertyContext'; // Import context hook
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../hooks/useConfirm';
import ConfirmDialog from '../components/ConfirmDialog';
import './AddProperty.css'; // Make sure styles are imported

function AddProperty() {
  const navigate = useNavigate();
  const { addProperty } = useProperties(); // Get add function from context
  const { showSuccess, showError, showWarning } = useToast();
  const { showConfirm, confirmDialog } = useConfirm();

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

  // --- Form Submission Handler ---
  const handleSubmit = (e) => {
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
      notes: notes.trim(), // Use trimmed notes
      // latitude: parseFloat(latitude) || null, // If adding lat/lon inputs
      // longitude: parseFloat(longitude) || null,
    };

    try {
        addProperty(newPropertyData); // Call context function to add the property
        showSuccess('Property added successfully!'); // Provide user feedback
        navigate('/properties'); // Navigate back to the dashboard after successful add
    } catch (error) {
        console.error("Error adding property:", error);
        showError("An error occurred while adding the property. Please try again."); // Error feedback
    }
  }; // End handleSubmit

  // --- Cancel Handler ---
  // Checks if any fields have data before navigating away
  const handleCancel = async () => {
    // List of all state values that indicate user input
    const formHasData = [
        address, listingUrl, price, beds, baths, sqft, imageUrlsString, notes
        // latitude, longitude // Add if using lat/lon state
    ].some(value => value && value.trim()); // Check if any value is truthy after trimming

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
  }; // End handleCancel


  // --- Render the Form ---
  return (
    <div className="add-property-container">
      <h1>Add New Property</h1>
      <p className="add-property-description">Enter the details of a property you visited.</p>

      <form onSubmit={handleSubmit} className="add-property-form" action="">

        {/* Address Input (Required) */}
        <div className="form-group">
          <label htmlFor="address">Address *</label>
          <input type="text" id="address" value={address} onChange={handleAddressChange} required aria-required="true"/>
        </div>

        {/* Listing URL Input (Optional) */}
        <div className="form-group">
          <label htmlFor="listingUrl">Listing URL</label>
          <input type="url" id="listingUrl" value={listingUrl} onChange={handleListingUrlChange} placeholder="https://www.zillow.com/..."/>
        </div>

        {/* Asking Price Input (Required, Number) */}
        <div className="form-group">
          <label htmlFor="price">Asking Price *</label>
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