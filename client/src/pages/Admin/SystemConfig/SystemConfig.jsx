
import React, { useEffect, useState } from 'react';
import NavbarWrapper from '../../../components/Common/NavbarWrapper/NavbarWrapper';
import Footer from '../../../components/Common/Footer/Footer';
import { apiCall } from '../../../helper/apiCall';
import './SystemConfig.css';

const SystemConfig = () => {
  const [config, setConfig] = useState({
    clinicHours: '',
    serviceTypes: [],
    holidays: [],
    appointmentSlots: [],
    emergencyContact: '',
    maxBookingDays: 30,
    autoReminderDays: 1,
    systemMaintenance: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newServiceType, setNewServiceType] = useState('');
  const [newHoliday, setNewHoliday] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const data = await apiCall.get('/admin/config');
      setConfig(prevConfig => ({
        ...prevConfig,
        ...data
      }));
    } catch (err) {
      setError('Failed to fetch system configuration');
      console.error('Config fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      await apiCall.put('/admin/config', config);
      setEditMode(false);
      alert('Configuration saved successfully!');
    } catch (err) {
      console.error('Save config error:', err);
      alert('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const addServiceType = () => {
    if (newServiceType.trim()) {
      setConfig(prev => ({
        ...prev,
        serviceTypes: [...prev.serviceTypes, newServiceType.trim()]
      }));
      setNewServiceType('');
    }
  };

  const removeServiceType = (index) => {
    setConfig(prev => ({
      ...prev,
      serviceTypes: prev.serviceTypes.filter((_, i) => i !== index)
    }));
  };

  const addHoliday = () => {
    if (newHoliday.trim()) {
      setConfig(prev => ({
        ...prev,
        holidays: [...prev.holidays, newHoliday.trim()]
      }));
      setNewHoliday('');
    }
  };

  const removeHoliday = (index) => {
    setConfig(prev => ({
      ...prev,
      holidays: prev.holidays.filter((_, i) => i !== index)
    }));
  };

  const handleInputChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <>
        <NavbarWrapper />
        <div className="systemConfig_page">
          <div className="systemConfig_container">
            <div className="systemConfig_loadingContainer">
              <div className="systemConfig_spinner"></div>
              <p className="systemConfig_loadingText">Loading system configuration...</p>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <NavbarWrapper />
        <div className="systemConfig_page">
          <div className="systemConfig_container">
            <div className="systemConfig_errorContainer">
              <p className="systemConfig_errorMessage">{error}</p>
              <button 
                className="systemConfig_retryButton"
                onClick={fetchConfig}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <div className="systemConfig_page">
      <NavbarWrapper />
        <div className="systemConfig_container">
          <div className="systemConfig_header">
            <h1 className="systemConfig_title">System Configuration</h1>
            <p className="systemConfig_description">
              Manage clinic settings, service types, holidays, and system preferences
            </p>
            <div className="systemConfig_headerActions">
              {!editMode ? (
                <button 
                  className="systemConfig_editButton"
                  onClick={() => setEditMode(true)}
                >
                  Edit Configuration
                </button>
              ) : (
                <div className="systemConfig_editActions">
                  <button 
                    className="systemConfig_saveButton"
                    onClick={handleSaveConfig}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button 
                    className="systemConfig_cancelButton"
                    onClick={() => {
                      setEditMode(false);
                      fetchConfig();
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="systemConfig_content">
            {/* Basic Settings */}
            <div className="systemConfig_section">
              <div className="systemConfig_sectionHeader">
                <h2 className="systemConfig_sectionTitle">Basic Settings</h2>
              </div>
              <div className="systemConfig_sectionContent">
                <div className="systemConfig_formGrid">
                  <div className="systemConfig_formGroup">
                    <label className="systemConfig_label">Clinic Hours</label>
                    {editMode ? (
                      <input
                        type="text"
                        className="systemConfig_input"
                        value={config.clinicHours}
                        onChange={(e) => handleInputChange('clinicHours', e.target.value)}
                        placeholder="e.g., 9:00 AM - 6:00 PM"
                      />
                    ) : (
                      <p className="systemConfig_value">{config.clinicHours || 'Not set'}</p>
                    )}
                  </div>

                  <div className="systemConfig_formGroup">
                    <label className="systemConfig_label">Emergency Contact</label>
                    {editMode ? (
                      <input
                        type="text"
                        className="systemConfig_input"
                        value={config.emergencyContact}
                        onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                        placeholder="Emergency phone number"
                      />
                    ) : (
                      <p className="systemConfig_value">{config.emergencyContact || 'Not set'}</p>
                    )}
                  </div>

                  <div className="systemConfig_formGroup">
                    <label className="systemConfig_label">Max Booking Days Ahead</label>
                    {editMode ? (
                      <input
                        type="number"
                        className="systemConfig_input"
                        value={config.maxBookingDays}
                        onChange={(e) => handleInputChange('maxBookingDays', parseInt(e.target.value))}
                        min="1"
                        max="365"
                      />
                    ) : (
                      <p className="systemConfig_value">{config.maxBookingDays} days</p>
                    )}
                  </div>

                  <div className="systemConfig_formGroup">
                    <label className="systemConfig_label">Auto Reminder (Days Before)</label>
                    {editMode ? (
                      <input
                        type="number"
                        className="systemConfig_input"
                        value={config.autoReminderDays}
                        onChange={(e) => handleInputChange('autoReminderDays', parseInt(e.target.value))}
                        min="0"
                        max="7"
                      />
                    ) : (
                      <p className="systemConfig_value">{config.autoReminderDays} day(s)</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Service Types */}
            <div className="systemConfig_section">
              <div className="systemConfig_sectionHeader">
                <h2 className="systemConfig_sectionTitle">Service Types</h2>
              </div>
              <div className="systemConfig_sectionContent">
                {editMode && (
                  <div className="systemConfig_addItemContainer">
                    <input
                      type="text"
                      className="systemConfig_addInput"
                      value={newServiceType}
                      onChange={(e) => setNewServiceType(e.target.value)}
                      placeholder="Add new service type"
                      onKeyPress={(e) => e.key === 'Enter' && addServiceType()}
                    />
                    <button 
                      className="systemConfig_addButton"
                      onClick={addServiceType}
                    >
                      Add Service
                    </button>
                  </div>
                )}
                <div className="systemConfig_itemList">
                  {config.serviceTypes && config.serviceTypes.length > 0 ? (
                    config.serviceTypes.map((type, index) => (
                      <div key={index} className="systemConfig_listItem">
                        <span className="systemConfig_itemText">{type}</span>
                        {editMode && (
                          <button 
                            className="systemConfig_removeButton"
                            onClick={() => removeServiceType(index)}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="systemConfig_emptyMessage">No service types configured</p>
                  )}
                </div>
              </div>
            </div>

            {/* Holidays */}
            <div className="systemConfig_section">
              <div className="systemConfig_sectionHeader">
                <h2 className="systemConfig_sectionTitle">Holidays & Closed Days</h2>
              </div>
              <div className="systemConfig_sectionContent">
                {editMode && (
                  <div className="systemConfig_addItemContainer">
                    <input
                      type="text"
                      className="systemConfig_addInput"
                      value={newHoliday}
                      onChange={(e) => setNewHoliday(e.target.value)}
                      placeholder="Add holiday (e.g., Christmas - Dec 25)"
                      onKeyPress={(e) => e.key === 'Enter' && addHoliday()}
                    />
                    <button 
                      className="systemConfig_addButton"
                      onClick={addHoliday}
                    >
                      Add Holiday
                    </button>
                  </div>
                )}
                <div className="systemConfig_itemList">
                  {config.holidays && config.holidays.length > 0 ? (
                    config.holidays.map((holiday, index) => (
                      <div key={index} className="systemConfig_listItem">
                        <span className="systemConfig_itemText">{holiday}</span>
                        {editMode && (
                          <button 
                            className="systemConfig_removeButton"
                            onClick={() => removeHoliday(index)}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="systemConfig_emptyMessage">No holidays configured</p>
                  )}
                </div>
              </div>
            </div>

            {/* System Status */}
            <div className="systemConfig_section">
              <div className="systemConfig_sectionHeader">
                <h2 className="systemConfig_sectionTitle">System Status</h2>
              </div>
              <div className="systemConfig_sectionContent">
                <div className="systemConfig_statusContainer">
                  <div className="systemConfig_statusItem">
                    <span className="systemConfig_statusLabel">Maintenance Mode</span>
                    {editMode ? (
                      <label className="systemConfig_toggle">
                        <input
                          type="checkbox"
                          checked={config.systemMaintenance}
                          onChange={(e) => handleInputChange('systemMaintenance', e.target.checked)}
                        />
                        <span className="systemConfig_toggleSlider"></span>
                      </label>
                    ) : (
                      <span className={`systemConfig_statusBadge ${config.systemMaintenance ? 'systemConfig_statusActive' : 'systemConfig_statusInactive'}`}>
                        {config.systemMaintenance ? 'ON' : 'OFF'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      <Footer />
    </div>
  );
};

export default SystemConfig;
