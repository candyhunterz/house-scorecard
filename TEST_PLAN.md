# House Scorecard - Comprehensive Test Plan

## Overview
This test plan covers end-to-end testing of the House Scorecard application, ensuring all core workflows function correctly from user authentication through property management and analysis.

## Test Environment
- **Application URL**: `http://localhost:5173`
- **Test Credentials**: 
  - Username: `admin`
  - Password: `password`

## Test Categories

### 1. Authentication & Navigation Tests

#### 1.1 Login Functionality
**Objective**: Verify user authentication works correctly

**Steps**:
1. Navigate to `http://localhost:5173`
2. Verify redirect to login page if not authenticated
3. Enter test credentials:
   - Username: `admin`
   - Password: `password`
4. Click "Login" button
5. Verify successful redirect to dashboard

**Expected Results**:
- ✅ Login form displays correctly
- ✅ Valid credentials authenticate successfully
- ✅ User redirected to dashboard after login
- ✅ Navigation menu becomes accessible

#### 1.2 Navigation Menu
**Objective**: Test all navigation links function correctly

**Steps**:
1. From dashboard, click each navigation item:
   - Dashboard
   - Properties
   - Compare
   - My Criteria
   - Map
   - Settings
2. Verify each page loads correctly
3. Test logout functionality

**Expected Results**:
- ✅ All navigation links work
- ✅ Page content loads correctly for each section
- ✅ Logout returns user to login screen

---

### 2. Dashboard Tests

#### 2.1 Dashboard Statistics
**Objective**: Verify dashboard displays accurate property statistics

**Steps**:
1. Navigate to dashboard
2. Verify "Quick Stats" section displays:
   - Total Properties count
   - Average Score
   - Rated Properties count
   - Interested properties count
3. Check "Top Scoring Properties" section
4. Verify "Properties by Status" breakdown

**Expected Results**:
- ✅ Statistics display correctly
- ✅ Numbers match actual property data
- ✅ Top properties list shows highest-rated items
- ✅ Status breakdown is accurate

#### 2.2 Quick Actions
**Objective**: Test dashboard quick action buttons

**Steps**:
1. Click "Add Property" button
2. Click "View All Properties" button
3. Click "Compare Properties" button
4. Click "Manage Criteria" button
5. Verify each redirects to correct page

**Expected Results**:
- ✅ All quick action buttons function
- ✅ Correct pages load for each action

---

### 3. Property Management Tests

#### 3.1 Property List View
**Objective**: Test property listing functionality

**Steps**:
1. Navigate to Properties page
2. Verify property count display
3. Test search functionality with sample addresses
4. Test status filters
5. Test sorting options (Score, Price, Address)
6. Verify property cards display correct information

**Expected Results**:
- ✅ All properties display correctly
- ✅ Search filters work properly
- ✅ Sorting changes order as expected
- ✅ Property details are accurate

#### 3.2 Add Property - Manual Entry
**Objective**: Test manual property addition

**Steps**:
1. Click "Add Property" button
2. Fill in required fields manually:
   - Address: "123 Test Street, Vancouver, BC"
   - Asking Price: $800,000
   - Beds: 2
   - Baths: 2
   - SqFt: 1200
3. Add optional notes
4. Click "Save Property"

**Expected Results**:
- ✅ Form validates required fields
- ✅ Property saves successfully
- ✅ Redirects to properties list
- ✅ New property appears in list

#### 3.3 Add Property - Auto-Fill (Zealty.ca)
**Objective**: Test auto-fill functionality with Zealty.ca URLs

**Test URLs**:
- `https://www.zealty.ca/mls-R3034077/18-3303-ROSEMARY-HEIGHTS-CRESCENT-Surrey-BC/`
- `https://www.zealty.ca/mls-R3034156/98-15677-28-AVENUE-Surrey-BC/`

**Steps**:
1. Click "Add Property"
2. Paste test URL in "Listing URL" field
3. Click "Auto-Fill" button
4. Wait for scraping to complete
5. Verify all fields populated correctly
6. Save property

**Expected Results**:
- ✅ Auto-fill button activates when URL entered
- ✅ Property details scraped correctly
- ✅ Images extracted successfully
- ✅ Description populated in notes field

#### 3.4 Add Property - Auto-Fill (Realtor.ca)
**Objective**: Test auto-fill with Realtor.ca URLs

**Test URLs**:
- `https://www.realtor.ca/real-estate/28695300/4605-fraser-street-vancouver`

**Steps**:
1. Follow same auto-fill process as 3.3
2. Verify Realtor.ca scraping works correctly

**Expected Results**:
- ✅ Realtor.ca URLs process correctly
- ✅ Data extraction matches listing

#### 3.5 Add Property - Auto-Fill (Redfin.ca)
**Objective**: Test auto-fill with Redfin.ca URLs

**Test URLs**:
- `https://www.redfin.ca/bc/vancouver/717-Jervis-St-V6E-4L5/unit-3102/home/155108033`

**Steps**:
1. Follow same auto-fill process as 3.3
2. Verify Redfin.ca scraping works correctly

**Expected Results**:
- ✅ Redfin.ca URLs process correctly
- ✅ Data extraction matches listing

#### 3.6 AI Property Analysis
**Objective**: Test AI analysis functionality

**Steps**:
1. Add property with images (using auto-fill)
2. Click "Run AI Analysis" button
3. Wait for analysis to complete
4. Review AI analysis results:
   - Confidence score
   - Grade assessment
   - Price evaluation
   - Positive features list
   - Any issues identified
5. Save property with analysis

**Expected Results**:
- ✅ AI analysis processes successfully
- ✅ Results display clearly
- ✅ Analysis provides meaningful insights
- ✅ Analysis data saves with property

---

### 4. Property Rating & Scoring Tests

#### 4.1 Property Rating
**Objective**: Test property scoring against criteria

**Steps**:
1. Navigate to a property detail page
2. Access rating functionality
3. Rate property against defined criteria
4. Save ratings
5. Verify score updates in property list

**Expected Results**:
- ✅ Rating interface loads correctly
- ✅ Criteria display properly
- ✅ Ratings save successfully
- ✅ Calculated score appears correctly

#### 4.2 Property Status Management
**Objective**: Test property status updates

**Steps**:
1. From property list, test status changes:
   - Set Status → Interested
   - Set Status → Not Interested
   - Set Status → Viewed
2. Verify status filters work with new statuses
3. Check dashboard statistics update

**Expected Results**:
- ✅ Status changes save correctly
- ✅ Status filters work properly
- ✅ Dashboard stats reflect changes

---

### 5. Criteria Management Tests

#### 5.1 View Existing Criteria
**Objective**: Test criteria viewing and organization

**Steps**:
1. Navigate to "My Criteria" page
2. Verify criteria are organized by category
3. Check criteria types (Must Have, Nice to Have, Deal Breaker)
4. Test category filtering

**Expected Results**:
- ✅ Criteria display correctly
- ✅ Categories are properly organized
- ✅ Filtering works as expected

#### 5.2 Add New Criteria
**Objective**: Test adding custom criteria

**Steps**:
1. Click "Add Criteria" or equivalent
2. Create new criterion:
   - Name: "Test Criterion"
   - Category: "Location"
   - Type: "Nice to Have"
   - Weight: 5
3. Save and verify it appears in list

**Expected Results**:
- ✅ New criteria form works
- ✅ Criteria saves successfully
- ✅ Appears in appropriate category

#### 5.3 Edit/Delete Criteria
**Objective**: Test criteria modification

**Steps**:
1. Edit existing criterion
2. Change weight/type/category
3. Save changes
4. Test deletion of criteria
5. Verify changes affect property scoring

**Expected Results**:
- ✅ Editing works correctly
- ✅ Changes save properly
- ✅ Deletion removes criteria
- ✅ Property scores update accordingly

---

### 6. Property Comparison Tests

#### 6.1 Compare Multiple Properties
**Objective**: Test property comparison functionality

**Steps**:
1. Navigate to Compare page
2. Select 2-3 properties for comparison
3. Verify side-by-side comparison displays:
   - Property details
   - Images
   - Scores
   - Criteria ratings
4. Test comparison export/sharing

**Expected Results**:
- ✅ Properties load in comparison view
- ✅ All details display correctly
- ✅ Scores and ratings are accurate
- ✅ Comparison is easy to understand

---

### 7. Map Integration Tests

#### 7.1 Property Map View
**Objective**: Test map visualization of properties

**Steps**:
1. Navigate to Map page
2. Verify properties appear as markers
3. Test marker interactions (click, hover)
4. Test map controls (zoom, pan)
5. Test property filtering on map

**Expected Results**:
- ✅ Map loads correctly
- ✅ Property markers display accurately
- ✅ Map interactions work smoothly
- ✅ Filters affect map display

---

### 8. Bulk Operations Tests

#### 8.1 Bulk Import
**Objective**: Test bulk property import functionality

**Steps**:
1. Click "Bulk Import" button
2. Test file upload process
3. Verify import validation
4. Check imported properties appear correctly
5. Test error handling for invalid data

**Expected Results**:
- ✅ Import interface works correctly
- ✅ Valid data imports successfully
- ✅ Invalid data shows appropriate errors
- ✅ Imported properties display properly

---

### 9. Settings & Configuration Tests

#### 9.1 User Settings
**Objective**: Test settings configuration

**Steps**:
1. Navigate to Settings page
2. Test various configuration options
3. Save changes
4. Verify settings persist across sessions

**Expected Results**:
- ✅ Settings page loads correctly
- ✅ Changes save successfully
- ✅ Settings persist after logout/login

---

### 10. Error Handling & Edge Cases

#### 10.1 Network Error Handling
**Objective**: Test application behavior during network issues

**Steps**:
1. Test auto-fill with invalid URLs
2. Test saving while offline
3. Test large file uploads
4. Test concurrent user sessions

**Expected Results**:
- ✅ Graceful error messages display
- ✅ No data loss occurs
- ✅ Application remains stable

#### 10.2 Data Validation
**Objective**: Test form validation throughout app

**Steps**:
1. Submit forms with missing required fields
2. Enter invalid data formats
3. Test field length limits
4. Test special characters in text fields

**Expected Results**:
- ✅ Validation messages are clear
- ✅ Invalid data is rejected
- ✅ User can correct errors easily

---

### 11. Performance Tests

#### 11.1 Large Dataset Handling
**Objective**: Test app performance with many properties

**Steps**:
1. Add 50+ properties via bulk import
2. Test list loading performance
3. Test search/filter performance
4. Test map rendering with many markers

**Expected Results**:
- ✅ Pages load within acceptable time
- ✅ Search remains responsive
- ✅ No memory leaks or crashes

---

### 12. Mobile Responsiveness Tests

#### 12.1 Mobile Interface
**Objective**: Test application on mobile devices

**Steps**:
1. Test on various screen sizes
2. Verify touch interactions work
3. Test mobile-specific features
4. Verify all functionality accessible

**Expected Results**:
- ✅ Layout adapts to screen size
- ✅ Touch interactions are responsive
- ✅ All features remain accessible

---

## Test Execution Checklist

### Pre-Test Setup
- [ ] Application is running on `http://localhost:5173`
- [ ] Test data is prepared
- [ ] Browser developer tools available
- [ ] Test credentials confirmed working

### Test Execution
- [ ] Authentication tests completed
- [ ] Navigation tests completed
- [ ] Dashboard tests completed
- [ ] Property management tests completed
- [ ] Rating/scoring tests completed
- [ ] Criteria management tests completed
- [ ] Comparison tests completed
- [ ] Map tests completed
- [ ] Bulk operations tests completed
- [ ] Settings tests completed
- [ ] Error handling tests completed
- [ ] Performance tests completed
- [ ] Mobile tests completed

### Post-Test
- [ ] All critical bugs documented
- [ ] Performance metrics recorded
- [ ] Test results summarized
- [ ] Follow-up actions identified

---

## Bug Reporting Template

When bugs are found during testing, use this template:

**Bug ID**: [Unique identifier]
**Severity**: [Critical/High/Medium/Low]
**Summary**: [Brief description]
**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result**: [What should happen]
**Actual Result**: [What actually happened]
**Browser/Environment**: [Browser version, OS]
**Screenshot**: [If applicable]
**Additional Notes**: [Any other relevant information]

---

## Test Coverage Goals

- **Functional Coverage**: 100% of core features tested
- **User Journey Coverage**: All major workflows tested end-to-end
- **Browser Coverage**: Chrome, Firefox, Safari, Edge
- **Device Coverage**: Desktop, tablet, mobile
- **Data Coverage**: Various property types and sources tested

---

## Automation Opportunities

Consider automating these test scenarios:
1. Login/logout flow
2. Property CRUD operations
3. Auto-fill functionality with sample URLs
4. Basic navigation tests
5. Form validation tests

This can be implemented using tools like:
- Playwright (already integrated in project)
- Cypress
- Jest for unit tests