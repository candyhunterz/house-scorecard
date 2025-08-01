// src/pages/Criteria.jsx
import React, { useState } from 'react'; // Import necessary hooks
import { useCriteria } from '../contexts/CriteriaContext'; // Import the custom hook to access criteria state and functions
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../hooks/useConfirm';
import ConfirmDialog from '../components/ConfirmDialog';
import './Criteria.css'; // Import styles for this page

// Define helper to get display names for rating types
const getRatingTypeDisplayName = (rt) => {
     return rt === 'stars' ? 'Stars (1-5)' : rt === 'yesNo' ? 'Yes/No' : rt === 'scale10' ? 'Scale (1-10)' : rt;
}

// --- Reusable Form Component for Adding a New Criterion ---
// Handles input for text, category, weight (if niceToHave), and ratingType (if niceToHave)
function AddCriterionForm({ type, onAdd, existingCategories }) {
  // Local state for the form inputs
  const [text, setText] = useState('');
  const [weight, setWeight] = useState(5); // Default weight
  const [category, setCategory] = useState('');
  const [ratingType, setRatingType] = useState('stars'); // Default rating type

  // Get available rating types from context
  const { RATING_TYPES: availableRatingTypes } = useCriteria();
  const { showWarning } = useToast();

  /** Handles form submission */
  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent default page reload
    const trimmedText = text.trim();
    if (!trimmedText) {
        showWarning("Criterion text cannot be empty.");
        return; // Validate: text is required
    }

    // Validate weight if the type is 'niceToHave'
    let criterionWeight = weight; // Use let as it might be reassigned
    if (type === 'niceToHave') {
        const numWeight = parseInt(weight, 10);
        if (isNaN(numWeight) || numWeight < 1 || numWeight > 10) {
            showWarning("Weight must be a number between 1 and 10.");
            return; // Prevent submission if weight is invalid
        }
        criterionWeight = numWeight;
    }

    // Prepare the new criterion object payload
    const newCriterion = {
      text: trimmedText,
      type: type,
      category: category.trim() || null, // Use null if category is empty/whitespace
      // Conditionally add weight and ratingType only for 'niceToHave'
      ...(type === 'niceToHave' && {
          weight: criterionWeight,
          ratingType: ratingType // Include selected rating type from state
      })
    };

    onAdd(newCriterion); // Call the context function (passed as prop) to add the item

    // Reset form fields after successful submission
    setText('');
    setWeight(5);
    setCategory('');
    setRatingType('stars'); // Reset rating type to default
  }; // End handleSubmit

  // Helper function for placeholder text
  const getPlaceholderText = (criterionType) => {
      switch(criterionType) {
          case 'mustHave': return 'e.g., Minimum 3 bedrooms';
          case 'niceToHave': return 'e.g., Updated kitchen';
          case 'dealBreaker': return 'e.g., On a busy main road';
          default: return 'Add new criterion...';
      }
  }

  // Unique ID for the category datalist
  const categoryListId = `categories-${type}`;

  return (
    <form onSubmit={handleSubmit} className="add-criterion-form">
      {/* Text Input */}
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={getPlaceholderText(type)}
        aria-label={`Add new ${type} criterion text`}
        required
        className="add-input-text"
      />

      {/* Category Input with Datalist */}
       <input
        type="text"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="Category (Optional)"
        list={categoryListId} // Link to datalist suggestions
        className="add-input-category"
        aria-label="Criterion category"
      />
      <datalist id={categoryListId}>
        {/* Populate suggestions from context */}
        {existingCategories.map(cat => <option key={cat} value={cat} />)}
      </datalist>

      {/* Conditional Inputs only for 'Nice-to-Have' type */}
      {type === 'niceToHave' && (
        <>
          {/* Rating Type Select Dropdown */}
          <div className="rating-type-select">
             <label htmlFor={`ratingType-${type}`}>Rating Type:</label>
             <select
                id={`ratingType-${type}`}
                value={ratingType} // Controlled component
                onChange={(e) => setRatingType(e.target.value)} // Update state on change
                aria-label="Select rating type"
             >
                 {/* Map over available types from context */}
                 {availableRatingTypes.map(rt => (
                    <option key={rt} value={rt}>
                        {getRatingTypeDisplayName(rt)} {/* Use helper for display name */}
                    </option>
                 ))}
             </select>
          </div>

          {/* Weight Input */}
          <div className="weight-input">
             <label htmlFor={`weight-${type}`}>Weight (1-10):</label>
             <input
                type="number"
                id={`weight-${type}`}
                value={weight} // Controlled component
                onChange={(e) => setWeight(e.target.value)} // Update state on change
                min="1" max="10" required
                aria-label="Criterion weight (1-10)"
            />
          </div>
        </>
      )}

      {/* Submit Button */}
      <button type="submit" className="btn btn-add-small" title={`Add ${type} criterion`}>
        <i className="fas fa-plus"></i> Add
      </button>
    </form>
  );
} // End AddCriterionForm


// --- Main Criteria Page Component ---
// Displays lists of criteria grouped by category and allows management.
function Criteria() {
  // Get data and functions from CriteriaContext
  const {
    mustHaves,       // Array of mustHave criteria objects
    niceToHaves,     // Array of niceToHave criteria objects
    dealBreakers,    // Array of dealBreaker criteria objects
    uniqueCategories,// Array of unique category strings
    addCriterion,    // Function to add a new criterion
    deleteCriterion, // Function to delete a criterion
    updateCriterion, // Function to update an existing criterion
    RATING_TYPES: availableRatingTypes // Array of allowed rating types
  } = useCriteria();
  const { showConfirm, confirmDialog } = useConfirm();

  // --- State for managing inline editing ---
  const [editingCriterionId, setEditingCriterionId] = useState(null); // ID of the item being edited
  const [editText, setEditText] = useState(''); // Temp text during edit
  const [editWeight, setEditWeight] = useState(5); // Temp weight during edit
  const [editCategory, setEditCategory] = useState(''); // Temp category during edit
  const [editRatingType, setEditRatingType] = useState('stars'); // Temp rating type during edit

  // --- Event Handlers ---

  /** Initiates editing mode for a specific criterion */
  const handleEdit = (criterion) => {
    console.log("EDIT: Starting edit for criterion:", criterion);
    setEditingCriterionId(criterion.id);
    setEditText(criterion.text);
    setEditCategory(criterion.category || ''); // Use empty string if category is null/undefined
    // Set initial edit state specific to 'niceToHave'
    if (criterion.type === 'niceToHave') {
      setEditWeight(criterion.weight || 5); // Use existing weight or default
      setEditRatingType(criterion.ratingType || 'stars'); // Use existing type or default
    }
  };

  /** Cancels the current editing mode */
  const handleCancelEdit = () => {
    console.log("EDIT: Cancelling edit for ID:", editingCriterionId);
    setEditingCriterionId(null); // Clear the editing ID
  };

  /** Saves the changes made during editing */
  const handleSaveEdit = (id, type) => {
    const trimmedText = editText.trim();
    if (!trimmedText) {
        showWarning("Criterion text cannot be empty.");
        return; // Validate text
    }

    // Prepare the payload object for the update function
    const updatedData = {
        text: trimmedText,
        category: editCategory.trim() || null // Trim category or set null
    };

    // Validate and add weight/ratingType only if it's a 'niceToHave' criterion
    if (type === 'niceToHave') {
        const newWeight = parseInt(editWeight, 10);
        if (isNaN(newWeight) || newWeight < 1 || newWeight > 10) {
            showWarning("Weight must be a number between 1 and 10.");
            return; // Validate weight
        }
        updatedData.weight = newWeight;
        // Validate ratingType before adding (ensure it's one of the allowed types)
        if (availableRatingTypes.includes(editRatingType)) {
             updatedData.ratingType = editRatingType;
        } else {
            console.warn(`Attempted to save invalid rating type "${editRatingType}". Reverting to default.`);
            updatedData.ratingType = 'stars'; // Fallback or keep original? Defaulting here.
        }
    }

    console.log("EDIT: Saving changes for ID:", id, "Data:", updatedData);
    updateCriterion(id, updatedData); // Call context function to save changes
    handleCancelEdit(); // Exit editing mode
  }; // End handleSaveEdit

  /** Deletes a criterion after user confirmation */
  const handleDelete = async (id) => {
    if (editingCriterionId === id) { // Cancel edit if deleting the item being edited
        handleCancelEdit();
    }
    
    const confirmed = await showConfirm({
      title: "Delete Criterion",
      message: "Are you sure you want to delete this criterion? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger"
    });
    
    if (confirmed) {
      console.log("DELETE: Deleting criterion ID:", id);
      deleteCriterion(id); // Call context function
    } else {
       console.log("DELETE: Deletion cancelled for ID:", id);
    }
  }; // End handleDelete


  // --- Helper function to render a single list item ---
  // Conditionally renders display or edit view based on editingCriterionId
  const renderCriterionItem = (criterion) => {
    const isEditing = editingCriterionId === criterion.id;
    const categoryListId = `edit-categories-${criterion.type}-${criterion.id}`; // Unique datalist ID

    return (
      <li key={criterion.id} className={`criterion-item ${isEditing ? 'editing' : ''}`}>
        {isEditing ? (
          // --- Editing View ---
          <div className="edit-form">
            {/* Edit Text Input */}
            <input type="text" value={editText} onChange={(e) => setEditText(e.target.value)} className="edit-input-text" autoFocus aria-label="Edit criterion text"/>
             {/* Edit Category Input */}
             <input type="text" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} placeholder="Category" list={categoryListId} className="edit-input-category" aria-label="Edit criterion category"/>
             <datalist id={categoryListId}>{uniqueCategories.map(cat => <option key={cat} value={cat} />)}</datalist>

            {/* Conditional Edit Inputs for Nice-to-Have */}
            {criterion.type === 'niceToHave' && (
             <>
               {/* Edit Rating Type Select */}
               <div className="edit-rating-type">
                   <label htmlFor={`edit-ratingType-${criterion.id}`}>Type:</label>
                   <select
                        id={`edit-ratingType-${criterion.id}`}
                        value={editRatingType} // Controlled component
                        onChange={(e) => setEditRatingType(e.target.value)} // Update state
                        aria-label="Edit rating type"
                   >
                       {availableRatingTypes.map(rt => ( // Use available types from context
                          <option key={rt} value={rt}>{getRatingTypeDisplayName(rt)}</option>
                       ))}
                   </select>
               </div>
               {/* Edit Weight Input */}
               <div className="edit-weight">
                  <label htmlFor={`edit-weight-${criterion.id}`}>Weight:</label>
                  <input
                    type="number"
                    id={`edit-weight-${criterion.id}`}
                    value={editWeight} // Controlled component
                    onChange={(e) => setEditWeight(e.target.value)} // Update state
                    min="1" max="10"
                    className="edit-input-weight"
                    aria-label="Edit criterion weight (1-10)"
                  />
               </div>
             </>
            )}
            {/* Save and Cancel Action Buttons */}
            <div className="edit-actions">
                <button onClick={() => handleSaveEdit(criterion.id, criterion.type)} className="btn-save small" title="Save Changes"><i className="fas fa-check"></i></button>
                <button onClick={handleCancelEdit} className="btn-cancel small" title="Cancel Editing"><i className="fas fa-times"></i></button>
            </div>
          </div> // End edit-form
        ) : (
          // --- Display View (REVISED STRUCTURE from fix) ---
          <>
            {/* 1. Criterion Text (Handles growth) */}
            <span className="criterion-text">{criterion.text}</span>

            {/* 2. Container for details & actions (doesn't shrink) */}
            <div className="criterion-details-actions">
                {/* Display Category Tag (if category exists) */}
                {criterion.category && <span className="category-tag">{criterion.category}</span>}

                {/* Display Rating Type Tag and Weight (if niceToHave) */}
                {criterion.type === 'niceToHave' && (
                 <>
                   <span className="rating-type-tag">({getRatingTypeDisplayName(criterion.ratingType || 'stars')})</span>
                   <span className="weight-display">(W:{criterion.weight})</span>
                 </>
                )}

                {/* Edit and Delete Action Buttons (visible on hover) */}
                <div className="item-actions">
                  <button onClick={() => handleEdit(criterion)} className="btn-edit" title="Edit Criterion"><i className="fas fa-pencil-alt"></i></button>
                  <button onClick={() => handleDelete(criterion.id)} className="btn-delete" title="Delete Criterion"><i className="fas fa-trash-alt"></i></button>
                </div>
            </div>
            {/* --- End Details/Actions Container --- */}
          </>
          // --- End Display View ---
        )}
      </li> // End criterion-item li
    );
  }; // End renderCriterionItem


  // --- Helper function to group a flat list of criteria by category ---
  const groupByCategory = (criteriaList) => {
    return criteriaList.reduce((accumulator, criterion) => {
        const category = criterion.category || 'Uncategorized';
        if (!accumulator[category]) { accumulator[category] = []; }
        accumulator[category].push(criterion);
        return accumulator;
    }, {});
  }; // End groupByCategory


  // --- Main Component Render ---
  return (
    <div className="criteria-container">
      <h1>My Criteria</h1>
      <p className="criteria-description">
        Organize your criteria by category. Define Must-Haves, Nice-to-Haves (with rating type and weight), and Deal Breakers.
      </p>

      {/* Grid for the three sections */}
      <div className="criteria-sections">

        {/* Dynamically generate sections */}
        {[
            { title: 'Must-Haves', icon: 'fa-star', list: mustHaves, type: 'mustHave', description: 'Conditions that absolutely must be met.' },
            { title: 'Nice-to-Haves', icon: 'fa-thumbs-up', list: niceToHaves, type: 'niceToHave', description: 'Desirable features, weighted by importance (1-10).' },
            { title: 'Deal Breakers', icon: 'fa-ban', list: dealBreakers, type: 'dealBreaker', description: 'Conditions that automatically disqualify a property.' },
        ].map(section => {
            // Group criteria for the current section
            const groupedCriteria = groupByCategory(section.list);
            // Get sorted category names ('Uncategorized' last)
            const categoryNames = Object.keys(groupedCriteria).sort((a, b) =>
                a === 'Uncategorized' ? 1 : b === 'Uncategorized' ? -1 : a.localeCompare(b)
            );

            return (
                // Render the section card
                <section key={section.title} className="criteria-section">
                    {/* Section Header */}
                    <h2><i className={`fas ${section.icon}`}></i> {section.title}</h2>
                    <p>{section.description}</p>

                    {/* Check if section is empty */}
                    {section.list.length === 0 ? (
                        <ul className="criteria-list"><li className="empty-list">No {section.title.toLowerCase()} defined yet.</li></ul>
                    ) : (
                        // Render category groups if criteria exist
                        categoryNames.map(categoryName => (
                            <div key={categoryName} className="category-group">
                                {/* Show category header only if there are multiple categories */}
                                {categoryNames.length > 1 && <h3 className="category-header">{categoryName}</h3>}
                                {/* List of criteria within the category */}
                                <ul className="criteria-list">
                                    {groupedCriteria[categoryName].map(renderCriterionItem)}
                                </ul>
                            </div>
                        ))
                    )}
                    {/* Add Form for this section */}
                    <AddCriterionForm
                        type={section.type}
                        onAdd={addCriterion}
                        existingCategories={uniqueCategories} // Pass category suggestions
                    />
                </section> // End criteria-section
            );
        })} {/* End mapping over sections */}

      </div> {/* End criteria-sections grid */}
      
      {/* Confirmation Dialog */}
      <ConfirmDialog {...confirmDialog} />
    </div> // End criteria-container
  );
}

export default Criteria;