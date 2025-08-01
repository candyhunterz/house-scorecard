import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProperties } from '../contexts/PropertyContext';
import './AddProperty.css'; // Re-use the styling from AddProperty

function EditProperty() {
    const { propertyId } = useParams();
    const navigate = useNavigate();
    const { getPropertyById, updateProperty } = useProperties();

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
        };

        try {
            await updateProperty(property.id, updatedData);
            alert('Property updated successfully!');
            navigate(`/properties/${property.id}`); // Go back to detail page
        } catch (err) {
            console.error('Failed to update property:', err);
            setError('Failed to update property. Please try again.');
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
                    <input
                        type="url"
                        id="listingUrl"
                        name="listingUrl"
                        value={formData.listingUrl}
                        onChange={handleChange}
                        placeholder="e.g., https://www.zillow.com/homedetails/"
                    />
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
                <div className="form-actions">
                    <button type="submit" className="btn btn-primary">Save Changes</button>
                    <button type="button" onClick={() => navigate(`/properties/${propertyId}`)} className="btn btn-secondary">Cancel</button>
                </div>
            </form>
        </div>
    );
}

export default EditProperty;
