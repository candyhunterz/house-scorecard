import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../hooks/useConfirm';
import ConfirmDialog from '../components/ConfirmDialog';
import './Settings.css';

function Settings() {
    const { user, logout } = useAuth();
    const { showSuccess, showError, showWarning } = useToast();
    const { showConfirm, confirmDialog } = useConfirm();
    
    // Profile settings state
    const [profileData, setProfileData] = useState({
        username: user?.username || '',
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
    });

    // Application preferences state
    const [preferences, setPreferences] = useState({
        defaultSortBy: localStorage.getItem('defaultSortBy') || 'score',
        showScoreBreakdown: localStorage.getItem('showScoreBreakdown') !== 'false',
        autoSaveRatings: localStorage.getItem('autoSaveRatings') !== 'false',
        confirmDeletions: localStorage.getItem('confirmDeletions') !== 'false',
        theme: localStorage.getItem('theme') || 'light'
    });

    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handlePreferenceChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? checked : value;
        
        setPreferences(prev => ({
            ...prev,
            [name]: newValue
        }));

        // Save to localStorage immediately
        localStorage.setItem(name, newValue.toString());
        
        if (name === 'theme') {
            // Apply theme immediately (you can expand this later)
            document.body.className = newValue === 'dark' ? 'dark-theme' : '';
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        
        if (!profileData.currentPassword) {
            showError('Current password is required');
            return;
        }
        
        if (profileData.newPassword !== profileData.confirmNewPassword) {
            showError('New passwords do not match');
            return;
        }
        
        if (profileData.newPassword.length < 6) {
            showError('New password must be at least 6 characters long');
            return;
        }

        try {
            const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
            const response = await fetch(`${API_BASE_URL}/change-password/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({
                    current_password: profileData.currentPassword,
                    new_password: profileData.newPassword
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to change password');
            }

            showSuccess('Password changed successfully');
            setProfileData(prev => ({
                ...prev,
                currentPassword: '',
                newPassword: '',
                confirmNewPassword: ''
            }));
        } catch (error) {
            showError(error.message);
        }
    };

    const handleExportData = async () => {
        try {
            const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
            const response = await fetch(`${API_BASE_URL}/export-data/`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to export data');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `house-scorecard-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            showSuccess('Data exported successfully');
        } catch (error) {
            showError('Failed to export data: ' + error.message);
        }
    };

    const handleDeleteAccount = async () => {
        const confirmed = await showConfirm({
            title: "Delete Account",
            message: "Are you sure you want to delete your account? This will permanently delete all your properties, criteria, and ratings. This action cannot be undone.",
            confirmText: "Delete Account",
            cancelText: "Cancel",
            type: "danger"
        });

        if (confirmed) {
            const doubleConfirmed = await showConfirm({
                title: "Final Confirmation",
                message: "This is your final warning. Deleting your account will permanently erase all your data. Type your username to confirm:",
                confirmText: "Delete Forever",
                cancelText: "Cancel",
                type: "danger"
            });

            if (doubleConfirmed) {
                try {
                    const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
                    const response = await fetch(`${API_BASE_URL}/delete-account/`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                        }
                    });

                    if (!response.ok) {
                        throw new Error('Failed to delete account');
                    }

                    showSuccess('Account deleted successfully');
                    logout();
                } catch (error) {
                    showError('Failed to delete account: ' + error.message);
                }
            }
        }
    };

    const resetPreferences = async () => {
        const confirmed = await showConfirm({
            title: "Reset Preferences",
            message: "Are you sure you want to reset all preferences to their default values?",
            confirmText: "Reset",
            cancelText: "Cancel",
            type: "warning"
        });

        if (confirmed) {
            const defaultPrefs = {
                defaultSortBy: 'score',
                showScoreBreakdown: true,
                autoSaveRatings: true,
                confirmDeletions: true,
                theme: 'light'
            };

            setPreferences(defaultPrefs);
            
            // Clear localStorage and set defaults
            Object.keys(defaultPrefs).forEach(key => {
                localStorage.setItem(key, defaultPrefs[key].toString());
            });

            document.body.className = '';
            showSuccess('Preferences reset to defaults');
        }
    };

    return (
        <div className="settings-container">
            <h1>Settings</h1>
            
            <div className="settings-sections">
                {/* Profile Section */}
                <section className="settings-section">
                    <h2><i className="fas fa-user"></i> Profile</h2>
                    
                    <div className="setting-item">
                        <label>Username</label>
                        <input 
                            type="text" 
                            value={profileData.username} 
                            disabled 
                            className="disabled-input"
                        />
                        <small>Username cannot be changed</small>
                    </div>

                    <form onSubmit={handlePasswordChange} className="password-form">
                        <h3>Change Password</h3>
                        <div className="setting-item">
                            <label htmlFor="currentPassword">Current Password</label>
                            <input 
                                type="password" 
                                id="currentPassword"
                                name="currentPassword"
                                value={profileData.currentPassword}
                                onChange={handleProfileChange}
                                placeholder="Enter current password"
                            />
                        </div>
                        
                        <div className="setting-item">
                            <label htmlFor="newPassword">New Password</label>
                            <input 
                                type="password" 
                                id="newPassword"
                                name="newPassword"
                                value={profileData.newPassword}
                                onChange={handleProfileChange}
                                placeholder="Enter new password"
                            />
                        </div>
                        
                        <div className="setting-item">
                            <label htmlFor="confirmNewPassword">Confirm New Password</label>
                            <input 
                                type="password" 
                                id="confirmNewPassword"
                                name="confirmNewPassword"
                                value={profileData.confirmNewPassword}
                                onChange={handleProfileChange}
                                placeholder="Confirm new password"
                            />
                        </div>
                        
                        <button type="submit" className="btn btn-primary">
                            Change Password
                        </button>
                    </form>
                </section>

                {/* Preferences Section */}
                <section className="settings-section">
                    <h2><i className="fas fa-cog"></i> Preferences</h2>
                    
                    <div className="setting-item">
                        <label htmlFor="defaultSortBy">Default Property Sort</label>
                        <select 
                            id="defaultSortBy"
                            name="defaultSortBy"
                            value={preferences.defaultSortBy}
                            onChange={handlePreferenceChange}
                        >
                            <option value="score">Score (Highest First)</option>
                            <option value="price">Price (Lowest First)</option>
                            <option value="address">Address (A-Z)</option>
                            <option value="dateAdded">Date Added (Newest First)</option>
                        </select>
                        <small>How properties are sorted by default on the dashboard</small>
                    </div>

                    <div className="setting-item checkbox-item">
                        <label>
                            <input 
                                type="checkbox"
                                name="showScoreBreakdown"
                                checked={preferences.showScoreBreakdown}
                                onChange={handlePreferenceChange}
                            />
                            Show score breakdown by default
                        </label>
                        <small>Display detailed score calculations on property pages</small>
                    </div>

                    <div className="setting-item checkbox-item">
                        <label>
                            <input 
                                type="checkbox"
                                name="autoSaveRatings"
                                checked={preferences.autoSaveRatings}
                                onChange={handlePreferenceChange}
                            />
                            Auto-save ratings
                        </label>
                        <small>Automatically save ratings as you rate properties</small>
                    </div>

                    <div className="setting-item checkbox-item">
                        <label>
                            <input 
                                type="checkbox"
                                name="confirmDeletions"
                                checked={preferences.confirmDeletions}
                                onChange={handlePreferenceChange}
                            />
                            Confirm before deleting
                        </label>
                        <small>Show confirmation dialogs before deleting items</small>
                    </div>

                    <div className="setting-item">
                        <label htmlFor="theme">Theme</label>
                        <select 
                            id="theme"
                            name="theme"
                            value={preferences.theme}
                            onChange={handlePreferenceChange}
                        >
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                            <option value="auto">Auto (System)</option>
                        </select>
                        <small>Choose your preferred color theme</small>
                    </div>

                    <button onClick={resetPreferences} className="btn btn-secondary">
                        Reset to Defaults
                    </button>
                </section>

                {/* Data Management Section */}
                <section className="settings-section">
                    <h2><i className="fas fa-database"></i> Data Management</h2>
                    
                    <div className="setting-item">
                        <h3>Export Data</h3>
                        <p>Download all your properties, criteria, and ratings as a JSON file.</p>
                        <button onClick={handleExportData} className="btn btn-primary">
                            <i className="fas fa-download"></i> Export Data
                        </button>
                    </div>

                    <div className="setting-item danger-zone">
                        <h3>Danger Zone</h3>
                        <p>Once you delete your account, there is no going back. Please be certain.</p>
                        <button onClick={handleDeleteAccount} className="btn btn-danger">
                            <i className="fas fa-exclamation-triangle"></i> Delete Account
                        </button>
                    </div>
                </section>
            </div>

            <ConfirmDialog {...confirmDialog} />
        </div>
    );
}

export default Settings;