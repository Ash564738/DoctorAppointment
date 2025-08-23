
import React, { useEffect, useState } from 'react';
import NavbarWrapper from '../../../components/Common/NavbarWrapper/NavbarWrapper';
import Footer from '../../../components/Common/Footer/Footer';
import { apiCall } from '../../../helper/apiCall';
import './BranchManagement.css';

const BranchManagement = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    address: '',
    manager: '',
    contact: '',
    email: '',
    operatingHours: '',
    services: [],
    status: 'active'
  });

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiCall.get('/admin/branches');
      
      // Ensure data is always an array
      if (Array.isArray(data)) {
        setBranches(data);
      } else if (data && Array.isArray(data.branches)) {
        setBranches(data.branches);
      } else {
        setBranches([]);
        console.log('No branches data received, setting empty array');
      }
    } catch (err) {
      console.error('Fetch branches error:', err);
      setError('Failed to fetch branches. Using sample data for demonstration.');
      // Set sample data as fallback
      setSampleBranches();
    } finally {
      setLoading(false);
    }
  };

  const setSampleBranches = () => {
    const sampleData = [
      {
        _id: 'sample1',
        name: 'Main Hospital',
        location: 'Downtown, City Center',
        address: '123 Healthcare Avenue, Medical District, New York, NY 10001',
        manager: 'Dr. Sarah Johnson',
        contact: '+1-555-0123',
        email: 'main@hospital.com',
        operatingHours: '24/7',
        status: 'active'
      },
      {
        _id: 'sample2',
        name: 'North Branch Clinic',
        location: 'North District, Suburb Area',
        address: '456 Wellness Street, North District, New York, NY 10002',
        manager: 'Dr. Michael Chen',
        contact: '+1-555-0124',
        email: 'north@hospital.com',
        operatingHours: '8:00 AM - 8:00 PM',
        status: 'active'
      },
      {
        _id: 'sample3',
        name: 'Emergency Care Center',
        location: 'Central Plaza, Business District',
        address: '789 Emergency Lane, Central Plaza, New York, NY 10003',
        manager: 'Dr. Emily Rodriguez',
        contact: '+1-555-0125',
        email: 'emergency@hospital.com',
        operatingHours: '24/7',
        status: 'active'
      },
      {
        _id: 'sample4',
        name: 'Pediatric Specialty Center',
        location: 'Family District, Residential Area',
        address: '321 Children\'s Way, Family District, New York, NY 10004',
        manager: 'Dr. David Park',
        contact: '+1-555-0126',
        email: 'pediatric@hospital.com',
        operatingHours: '7:00 AM - 7:00 PM',
        status: 'active'
      },
      {
        _id: 'sample5',
        name: 'Rehabilitation Center',
        location: 'West Side, Healthcare Complex',
        address: '654 Recovery Road, West Side, New York, NY 10005',
        manager: 'Dr. Lisa Thompson',
        contact: '+1-555-0127',
        email: 'rehab@hospital.com',
        operatingHours: '6:00 AM - 9:00 PM',
        status: 'maintenance'
      }
    ];
    setBranches(sampleData);
  };

  const handleAddBranch = async () => {
    try {
      // Validate required fields
      if (!formData.name || !formData.location || !formData.contact) {
        alert('Please fill in all required fields (Name, Location, Contact)');
        return;
      }

      const response = await apiCall.post('/admin/branches', formData);
      setBranches(prevBranches => [...(Array.isArray(prevBranches) ? prevBranches : []), response]);
      setShowAddForm(false);
      resetForm();
      alert('Branch added successfully!');
    } catch (err) {
      console.error('Add branch error:', err);
      // For demo purposes, add to sample data
      const newBranch = {
        _id: `sample_${Date.now()}`,
        ...formData
      };
      setBranches(prevBranches => [...(Array.isArray(prevBranches) ? prevBranches : []), newBranch]);
      setShowAddForm(false);
      resetForm();
      alert('Branch added successfully! (Demo mode - changes not persisted)');
    }
  };

  const handleEditBranch = async () => {
    try {
      // Validate required fields
      if (!formData.name || !formData.location || !formData.contact) {
        alert('Please fill in all required fields (Name, Location, Contact)');
        return;
      }

      const response = await apiCall.put(`/admin/branches/${editingBranch._id}`, formData);
      setBranches(prevBranches => 
        (Array.isArray(prevBranches) ? prevBranches : []).map(branch => 
          branch._id === editingBranch._id ? response : branch
        )
      );
      setEditingBranch(null);
      resetForm();
      alert('Branch updated successfully!');
    } catch (err) {
      console.error('Edit branch error:', err);
      // For demo purposes, update in sample data
      setBranches(prevBranches => 
        (Array.isArray(prevBranches) ? prevBranches : []).map(branch => 
          branch._id === editingBranch._id ? { ...branch, ...formData } : branch
        )
      );
      setEditingBranch(null);
      resetForm();
      alert('Branch updated successfully! (Demo mode - changes not persisted)');
    }
  };

  const handleDeleteBranch = async (branchId) => {
    if (window.confirm('Are you sure you want to delete this branch?')) {
      try {
        await apiCall.delete(`/admin/branches/${branchId}`);
        setBranches(prevBranches => 
          (Array.isArray(prevBranches) ? prevBranches : []).filter(branch => branch._id !== branchId)
        );
        alert('Branch deleted successfully!');
      } catch (err) {
        console.error('Delete branch error:', err);
        // For demo purposes, remove from sample data
        setBranches(prevBranches => 
          (Array.isArray(prevBranches) ? prevBranches : []).filter(branch => branch._id !== branchId)
        );
        alert('Branch deleted successfully! (Demo mode - changes not persisted)');
      }
    }
  };

  const startEdit = (branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name || '',
      location: branch.location || '',
      address: branch.address || '',
      manager: branch.manager || '',
      contact: branch.contact || '',
      email: branch.email || '',
      operatingHours: branch.operatingHours || '',
      services: branch.services || [],
      status: branch.status || 'active'
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      location: '',
      address: '',
      manager: '',
      contact: '',
      email: '',
      operatingHours: '',
      services: [],
      status: 'active'
    });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <>
        <NavbarWrapper />
        <div className="branchManagement_page">
          <div className="branchManagement_container">
            <div className="branchManagement_loadingContainer">
              <div className="branchManagement_spinner"></div>
              <p className="branchManagement_loadingText">Loading branches...</p>
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
        <div className="branchManagement_page">
          <div className="branchManagement_container">
            <div className="branchManagement_errorContainer">
              <p className="branchManagement_errorMessage">{error}</p>
              <button 
                className="branchManagement_retryButton"
                onClick={fetchBranches}
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
    <div className="branchManagement_page">
      <NavbarWrapper />
        <div className="branchManagement_container">
          <div className="branchManagement_header">
            <div>
              <h1 className="branchManagement_title">Branch Management</h1>
              <p className="branchManagement_description">
                Manage clinic branches, locations, and branch information
              </p>
            </div>
            <button 
              className="branchManagement_addButton"
              onClick={() => {
                setShowAddForm(true);
                resetForm();
              }}
            >
              Add New Branch
            </button>
          </div>

          {/* Add/Edit Form */}
          {(showAddForm || editingBranch) && (
            <div className="branchManagement_formSection">
              <div className="branchManagement_formHeader">
                <h2 className="branchManagement_formTitle">
                  {editingBranch ? 'Edit Branch' : 'Add New Branch'}
                </h2>
              </div>
              <div className="branchManagement_formContent">
                <div className="branchManagement_formGrid">
                  <div className="branchManagement_formGroup">
                    <label className="branchManagement_label">Branch Name *</label>
                    <input
                      type="text"
                      className="branchManagement_input"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter branch name"
                      required
                    />
                  </div>

                  <div className="branchManagement_formGroup">
                    <label className="branchManagement_label">Location *</label>
                    <input
                      type="text"
                      className="branchManagement_input"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      placeholder="City, State"
                      required
                    />
                  </div>

                  <div className="branchManagement_formGroup">
                    <label className="branchManagement_label">Full Address</label>
                    <textarea
                      className="branchManagement_textarea"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="Complete address"
                      rows={3}
                    />
                  </div>

                  <div className="branchManagement_formGroup">
                    <label className="branchManagement_label">Branch Manager</label>
                    <input
                      type="text"
                      className="branchManagement_input"
                      value={formData.manager}
                      onChange={(e) => handleInputChange('manager', e.target.value)}
                      placeholder="Manager name"
                    />
                  </div>

                  <div className="branchManagement_formGroup">
                    <label className="branchManagement_label">Contact Number *</label>
                    <input
                      type="tel"
                      className="branchManagement_input"
                      value={formData.contact}
                      onChange={(e) => handleInputChange('contact', e.target.value)}
                      placeholder="Phone number"
                      required
                    />
                  </div>

                  <div className="branchManagement_formGroup">
                    <label className="branchManagement_label">Email</label>
                    <input
                      type="email"
                      className="branchManagement_input"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="branch@clinic.com"
                    />
                  </div>

                  <div className="branchManagement_formGroup">
                    <label className="branchManagement_label">Operating Hours</label>
                    <input
                      type="text"
                      className="branchManagement_input"
                      value={formData.operatingHours}
                      onChange={(e) => handleInputChange('operatingHours', e.target.value)}
                      placeholder="e.g., 9:00 AM - 6:00 PM"
                    />
                  </div>

                  <div className="branchManagement_formGroup">
                    <label className="branchManagement_label">Status</label>
                    <select
                      className="branchManagement_select"
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="maintenance">Under Maintenance</option>
                    </select>
                  </div>
                </div>

                <div className="branchManagement_formActions">
                  <button 
                    className="branchManagement_saveButton"
                    onClick={editingBranch ? handleEditBranch : handleAddBranch}
                  >
                    {editingBranch ? 'Update Branch' : 'Add Branch'}
                  </button>
                  <button 
                    className="branchManagement_cancelButton"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingBranch(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Branches List */}
          <div className="branchManagement_section">
            <div className="branchManagement_sectionHeader">
              <h2 className="branchManagement_sectionTitle">All Branches ({Array.isArray(branches) ? branches.length : 0})</h2>
            </div>
            <div className="branchManagement_tableContainer">
              {Array.isArray(branches) && branches.length > 0 ? (
                <table className="branchManagement_table">
                  <thead className="branchManagement_tableHeader">
                    <tr>
                      <th className="branchManagement_tableHeaderCell">Branch Name</th>
                      <th className="branchManagement_tableHeaderCell">Location</th>
                      <th className="branchManagement_tableHeaderCell">Manager</th>
                      <th className="branchManagement_tableHeaderCell">Contact</th>
                      <th className="branchManagement_tableHeaderCell">Status</th>
                      <th className="branchManagement_tableHeaderCell">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="branchManagement_tableBody">
                    {branches.map((branch, index) => (
                      <tr key={branch._id || index} className="branchManagement_tableRow">
                        <td className="branchManagement_tableCell">
                          <div className="branchManagement_branchInfo">
                            <span className="branchManagement_branchName">{branch.name}</span>
                            {branch.email && (
                              <span className="branchManagement_branchEmail">{branch.email}</span>
                            )}
                          </div>
                        </td>
                        <td className="branchManagement_tableCell">
                          <div className="branchManagement_locationInfo">
                            <span className="branchManagement_location">{branch.location}</span>
                            {branch.address && (
                              <span className="branchManagement_address">{branch.address}</span>
                            )}
                          </div>
                        </td>
                        <td className="branchManagement_tableCell">
                          <span className="branchManagement_manager">{branch.manager || 'Not assigned'}</span>
                        </td>
                        <td className="branchManagement_tableCell">
                          <div className="branchManagement_contactInfo">
                            <span className="branchManagement_contact">{branch.contact}</span>
                            {branch.operatingHours && (
                              <span className="branchManagement_hours">{branch.operatingHours}</span>
                            )}
                          </div>
                        </td>
                        <td className="branchManagement_tableCell">
                          <span className={`branchManagement_statusBadge branchManagement_status${branch.status ? branch.status.charAt(0).toUpperCase() + branch.status.slice(1) : 'Active'}`}>
                            {branch.status || 'active'}
                          </span>
                        </td>
                        <td className="branchManagement_tableCell">
                          <div className="branchManagement_actionButtons">
                            <button 
                              className="branchManagement_editButton"
                              onClick={() => startEdit(branch)}
                            >
                              Edit
                            </button>
                            <button 
                              className="branchManagement_deleteButton"
                              onClick={() => handleDeleteBranch(branch._id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="branchManagement_noDataContainer">
                  <p className="branchManagement_noDataMessage">No branches found. Add your first branch to get started.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      <Footer />
    </div>
  );
};

export default BranchManagement;
