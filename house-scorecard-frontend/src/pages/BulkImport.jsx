import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import './BulkImport.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

function BulkImport() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState(null);
  const [fieldMappings, setFieldMappings] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Available property fields
  const propertyFields = [
    { value: '', label: 'Don\'t import' },
    { value: 'address', label: 'Address' },
    { value: 'price', label: 'Price' },
    { value: 'beds', label: 'Bedrooms' },
    { value: 'baths', label: 'Bathrooms' },
    { value: 'sqft', label: 'Square Feet' },
    { value: 'listing_url', label: 'Listing URL' },
    { value: 'notes', label: 'Notes' }
  ];

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        showToast('Please select a CSV file', 'error');
        return;
      }
      setFile(selectedFile);
      previewCSV(selectedFile);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current.click();
  };

  const previewCSV = async (file) => {
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/properties/preview_csv/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setCsvData(data);
      
      // Set initial mappings from suggestions
      setFieldMappings(data.suggested_mapping || {});
      setStep(2);
      
    } catch (error) {
      console.error('Preview failed:', error);
      showToast('Failed to preview CSV file', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleMappingChange = (csvField, propertyField) => {
    setFieldMappings(prev => ({
      ...prev,
      [csvField]: propertyField
    }));
  };

  const handleImport = async () => {
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mapping', JSON.stringify(fieldMappings));

      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/properties/bulk_import/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setImportResult(result);
      setStep(3);

      if (result.success) {
        showToast(
          `Import completed! Created ${result.created}, updated ${result.updated} properties`,
          'success'
        );
      }
      
    } catch (error) {
      console.error('Import failed:', error);
      showToast('Failed to import properties', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const resetImport = () => {
    setStep(1);
    setFile(null);
    setCsvData(null);
    setFieldMappings({});
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getCanadianExampleFormats = () => [
    {
      platform: 'Realtor.ca / MLS',
      headers: 'Address, List Price, Bedrooms, Bathrooms, Square Feet, MLS Number',
      example: '123 Main St Toronto ON M5V 1A1, $599,000, 3, 2, 1200, C1234567'
    },
    {
      platform: 'ViewPoint.ca',
      headers: 'Property Address, Asking Price, BR, BA, Living Area, URL',
      example: '456 Oak Ave Halifax NS B3H 2R2, CAD $475,000, 2, 1.5, 950, https://...'
    },
    {
      platform: 'HouseSigma.com',
      headers: 'Address, Price, Bedrooms, Bathrooms, Square Feet, Listing URL',
      example: '789 Pine St Vancouver BC V6B 1A1, $750,000, 2, 2, 1100, https://housesigma.com/...'
    },
    {
      platform: 'Zealty.ca',
      headers: 'Address, Price, Bedrooms, Bathrooms, Square Feet, MLS Number',
      example: '123 Oak St Richmond BC V6Y 1A1, $599,000, 3, 2, 1200, R1234567'
    }
  ];

  return (
    <div className="bulk-import-page">
      <header className="page-header">
        <button 
          className="btn btn-ghost btn-sm"
          onClick={() => navigate('/properties')}
        >
          <i className="fas fa-arrow-left"></i> Back to Properties
        </button>
        <h1>Bulk Import Properties</h1>
        <p>Import multiple properties from a CSV file</p>
      </header>

      {/* Step Indicator */}
      <div className="steps-indicator">
        <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
          <div className="step-number">1</div>
          <span>Upload CSV</span>
        </div>
        <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
          <div className="step-number">2</div>
          <span>Map Fields</span>
        </div>
        <div className={`step ${step >= 3 ? 'active' : ''}`}>
          <div className="step-number">3</div>
          <span>Import Results</span>
        </div>
      </div>

      {/* Step 1: File Upload */}
      {step === 1 && (
        <div className="step-content">
          <div className="upload-section">
            <div className="upload-area">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="file-input"
                id="csv-file"
              />
              <label htmlFor="csv-file" className="upload-label">
                <i className="fas fa-cloud-upload-alt"></i>
                <h3>Choose CSV File</h3>
                <p>Select a CSV file exported from Canadian real estate platforms</p>
                <button type="button" className="btn btn-primary" onClick={handleBrowseClick}>
                  Browse Files
                </button>
              </label>
            </div>

            {isUploading && (
              <div className="loading-indicator">
                <i className="fas fa-spinner fa-spin"></i>
                <span>Analyzing CSV file...</span>
              </div>
            )}
          </div>

          {/* Format Examples */}
          <div className="format-examples">
            <h3>Supported Canadian Formats</h3>
            <p>Your CSV should work with exports from these platforms:</p>
            
            {getCanadianExampleFormats().map((format, index) => (
              <div key={index} className="format-example">
                <h4>{format.platform}</h4>
                <div className="example-headers">
                  <strong>Headers:</strong> {format.headers}
                </div>
                <div className="example-data">
                  <strong>Example:</strong> {format.example}
                </div>
              </div>
            ))}
            
            <div className="format-tips">
              <h4>Tips for Best Results:</h4>
              <ul>
                <li>Include an "Address" column (required)</li>
                <li>Price can include CAD symbols ($599,000 CAD)</li>
                <li>Square footage should be in sq ft (Canada uses sq ft for real estate)</li>
                <li>Postal codes in A1A 1A1 format are supported</li>
                <li>Empty cells are handled automatically</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Field Mapping */}
      {step === 2 && csvData && (
        <div className="step-content">
          <div className="mapping-section">
            <h3>Map CSV Fields to Properties</h3>
            <p>Match your CSV columns to property fields. We've suggested mappings based on your headers.</p>

            <div className="mapping-grid">
              <div className="mapping-header">
                <div>CSV Column</div>
                <div>Sample Data</div>
                <div>Maps To</div>
              </div>

              {csvData.headers.map((header, index) => (
                <div key={header} className="mapping-row">
                  <div className="csv-column">
                    <strong>{header}</strong>
                  </div>
                  <div className="sample-data">
                    {csvData.preview_rows[0] && csvData.preview_rows[0][header] 
                      ? csvData.preview_rows[0][header] 
                      : '(empty)'}
                  </div>
                  <div className="property-field">
                    <select
                      value={fieldMappings[header] || ''}
                      onChange={(e) => handleMappingChange(header, e.target.value)}
                      className="mapping-select"
                    >
                      {propertyFields.map(field => (
                        <option key={field.value} value={field.value}>
                          {field.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            {/* Preview Section */}
            <div className="preview-section">
              <h4>Data Preview</h4>
              <div className="preview-table">
                <table>
                  <thead>
                    <tr>
                      {csvData.headers.map(header => (
                        <th key={header}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.preview_rows.map((row, index) => (
                      <tr key={index}>
                        {csvData.headers.map(header => (
                          <td key={header}>{row[header] || '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="step-actions">
              <button 
                className="btn btn-secondary"
                onClick={resetImport}
              >
                Start Over
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleImport}
                disabled={isUploading || !Object.values(fieldMappings).some(v => v)}
              >
                {isUploading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Importing...
                  </>
                ) : (
                  'Import Properties'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Results */}
      {step === 3 && importResult && (
        <div className="step-content">
          <div className="results-section">
            <div className="results-summary">
              <h3>Import Complete!</h3>
              
              <div className="results-stats">
                <div className="stat-item success">
                  <i className="fas fa-plus-circle"></i>
                  <div>
                    <strong>{importResult.created}</strong>
                    <span>Properties Created</span>
                  </div>
                </div>
                
                <div className="stat-item info">
                  <i className="fas fa-edit"></i>
                  <div>
                    <strong>{importResult.updated}</strong>
                    <span>Properties Updated</span>
                  </div>
                </div>
                
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="stat-item error">
                    <i className="fas fa-exclamation-triangle"></i>
                    <div>
                      <strong>{importResult.errors.length}</strong>
                      <span>Errors</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {importResult.errors && importResult.errors.length > 0 && (
              <div className="errors-section">
                <h4>Import Errors</h4>
                <div className="error-list">
                  {importResult.errors.map((error, index) => (
                    <div key={index} className="error-item">
                      <strong>Row {error.row}:</strong> {error.error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="results-actions">
              <button 
                className="btn btn-secondary"
                onClick={resetImport}
              >
                Import Another File
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/properties')}
              >
                View Properties
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BulkImport;