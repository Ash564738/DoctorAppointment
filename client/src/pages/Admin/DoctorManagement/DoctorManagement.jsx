import React, { useEffect, useState } from 'react';
import NavbarWrapper from '../../../components/Common/NavbarWrapper/NavbarWrapper';
import Footer from '../../../components/Common/Footer/Footer';
import { apiCall } from '../../../helper/apiCall';
import './DoctorManagement.css';

const DoctorManagement = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const data = await apiCall.get('/doctor/getalldoctors');
        setDoctors(data || []);
      } catch (err) {
        setError('Failed to fetch doctors');
      } finally {
        setLoading(false);
      }
    };
    fetchDoctors();
  }, []);

  const handleStatusFilter = (status) => {
    setFilter(status);
  };

  const filteredDoctors = filter === 'all' ? doctors : doctors.filter(doctor => {
    if (filter === 'approved') return doctor.isDoctor === true;
    if (filter === 'pending') return doctor.isDoctor === false;
    return doctor.status?.toLowerCase() === filter;
  });

  const searchFilteredDoctors = filteredDoctors.filter(doctor => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      doctor.userId?.firstname?.toLowerCase().includes(searchLower) ||
      doctor.userId?.lastname?.toLowerCase().includes(searchLower) ||
      doctor.userId?.email?.toLowerCase().includes(searchLower) ||
      doctor.specialization?.toLowerCase().includes(searchLower)
    );
  });

  const totalRows = searchFilteredDoctors.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const paginatedDoctors = searchFilteredDoctors.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Reset to first page if search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchTerm]);

  const handleDeleteDoctor = async (doctorId, userId) => {
    if (window.confirm('Are you sure you want to delete this doctor? This will remove their doctor privileges but keep their user account.')) {
      try {
        await apiCall.put('/doctor/deletedoctor', { userId: userId });
        setDoctors(doctors.filter(doctor => doctor._id !== doctorId));
      } catch (err) {
        alert('Failed to delete doctor');
      }
    }
  };

  const handleApproveDoctor = async (doctor) => {
    try {
      await apiCall.put('/doctor/acceptdoctor', { id: doctor.userId._id });
      setDoctors(doctors.map(d => 
        d._id === doctor._id ? { ...d, isDoctor: true } : d
      ));
    } catch (err) {
      console.error('Approve doctor error:', err);
      alert('Failed to approve doctor');
    }
  };

  const handleRejectDoctor = async (doctor) => {
    if (window.confirm('Are you sure you want to reject this doctor application?')) {
      try {
        await apiCall.put('/doctor/rejectdoctor', { id: doctor.userId._id });
        setDoctors(doctors.filter(d => d._id !== doctor._id));
      } catch (err) {
        console.error('Reject doctor error:', err);
        alert('Failed to reject doctor application');
      }
    }
  };

  const handleEditDoctor = (doctor) => {
    setEditingDoctor(doctor);
    setEditFormData({
      // User information
      firstname: doctor.userId?.firstname || '',
      lastname: doctor.userId?.lastname || '',
      email: doctor.userId?.email || '',
      mobile: doctor.userId?.mobile || '',
      address: doctor.userId?.address || '',
      age: doctor.userId?.age || '',
      gender: doctor.userId?.gender || '',
      // Doctor specific information
      specialization: doctor.specialization || '',
      experience: doctor.experience || '',
      fees: doctor.fees || '',
      department: doctor.department || ''
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      // Update user information first
      const userUpdateData = {
        firstname: editFormData.firstname,
        lastname: editFormData.lastname,
        email: editFormData.email,
        mobile: editFormData.mobile,
        address: editFormData.address,
        age: editFormData.age,
        gender: editFormData.gender
      };

      // Update doctor specific information
      const doctorUpdateData = {
        specialization: editFormData.specialization,
        experience: parseInt(editFormData.experience),
        fees: parseInt(editFormData.fees),
        department: editFormData.department
      };

      // Call admin user update endpoint
      await apiCall.put(`/user/admin-update/${editingDoctor.userId._id}`, userUpdateData);
      
      // Call doctor info update endpoint
      await apiCall.put(`/doctor/admin-update/${editingDoctor._id}`, doctorUpdateData);

      // Update local state
      setDoctors(doctors.map(doctor => 
        doctor._id === editingDoctor._id 
          ? { 
              ...doctor, 
              ...doctorUpdateData,
              userId: { ...doctor.userId, ...userUpdateData }
            }
          : doctor
      ));
      
      setShowEditModal(false);
      setEditingDoctor(null);
      setEditFormData({});
      alert('Doctor updated successfully');
    } catch (err) {
      console.error('Edit doctor error:', err);
      alert('Failed to update doctor. Some changes may have been saved.');
    }
  };

  return (
    <div className="doctorManagement_page">
      <NavbarWrapper />
      <div className="doctorManagement_container">
        <div className="doctorManagement_header">
          <h1 className="doctorManagement_title">Doctor Management</h1>
          <p className="doctorManagement_description">
            Manage doctors, approve applications, and edit/delete doctor profiles.
          </p>
          
          {/* Search functionality */}
          <div className="doctorManagement_searchContainer">
            <input
              type="text"
              placeholder="Search doctors by name, email, or specialty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="doctorManagement_searchInput"
            />
          </div>
        </div>

        <div className="doctorManagement_section">
          <div className="doctorManagement_sectionHeader">
            <div className="doctorManagement_filters">
              <button 
                className={`doctorManagement_filterButton ${filter === 'all' ? 'doctorManagement_filterActive' : ''}`}
                onClick={() => handleStatusFilter('all')}
              >
                All ({doctors.length})
              </button>
              <button 
                className={`doctorManagement_filterButton ${filter === 'approved' ? 'doctorManagement_filterActive' : ''}`}
                onClick={() => handleStatusFilter('approved')}
              >
                Approved ({doctors.filter(d => d.isDoctor === true).length})
              </button>
              <button 
                className={`doctorManagement_filterButton ${filter === 'pending' ? 'doctorManagement_filterActive' : ''}`}
                onClick={() => handleStatusFilter('pending')}
              >
                Pending ({doctors.filter(d => d.isDoctor === false).length})
              </button>
            </div>
          </div>

          {loading ? (
            <div className="doctorManagement_loadingContainer">
              <div className="doctorManagement_spinner"></div>
              <p className="doctorManagement_loadingText">Loading doctors...</p>
            </div>
          ) : error ? (
            <div className="doctorManagement_errorContainer">
              <p className="doctorManagement_errorMessage">{error}</p>
              <button 
                className="doctorManagement_retryButton"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </div>
          ) : filteredDoctors.length > 0 ? (
            <div className="doctorManagement_tableContainer">
              <table className="doctorManagement_table">
                <thead className="doctorManagement_tableHeader">
                  <tr>
                    <th className="doctorManagement_tableHeaderCell">Doctor Info</th>
                    <th className="doctorManagement_tableHeaderCell">Specialty</th>
                    <th className="doctorManagement_tableHeaderCell">Contact</th>
                    <th className="doctorManagement_tableHeaderCell">Experience</th>
                    <th className="doctorManagement_tableHeaderCell">Status</th>
                    <th className="doctorManagement_tableHeaderCell">Actions</th>
                  </tr>
                </thead>
                <tbody className="doctorManagement_tableBody">
                  {paginatedDoctors.map((doctor) => (
                    <tr key={doctor._id} className="doctorManagement_tableRow">
                      <td className="doctorManagement_tableCell">
                        <div className="doctorManagement_doctorInfo">
                          <span className="doctorManagement_doctorName">
                            Dr. {doctor.userId?.firstname} {doctor.userId?.lastname}
                          </span>
                          <span className="doctorManagement_doctorEmail">
                            {doctor.userId?.email}
                          </span>
                        </div>
                      </td>
                      <td className="doctorManagement_tableCell">
                        <span className="doctorManagement_specialty">
                          {doctor.specialization || 'General Practice'}
                        </span>
                      </td>
                      <td className="doctorManagement_tableCell">
                        <div className="doctorManagement_contactInfo">
                          <span className="doctorManagement_phone">
                            {doctor.userId?.mobile || 'N/A'}
                          </span>
                          <span className="doctorManagement_address">
                            {doctor.userId?.address || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="doctorManagement_tableCell">
                        <span className="doctorManagement_experience">
                          {doctor.experience || 'N/A'} years
                        </span>
                      </td>
                      <td className="doctorManagement_tableCell">
                        <span className={`doctorManagement_statusBadge ${
                          doctor.isDoctor ? 'doctorManagement_statusApproved' : 'doctorManagement_statusPending'
                        }`}>
                          {doctor.isDoctor ? 'Approved' : 'Pending'}
                        </span>
                      </td>
                      <td className="doctorManagement_tableCell">
                        <div className="doctorManagement_actionButtons">
                          {!doctor.isDoctor && (
                            <>
                              <button 
                                className="doctorManagement_approveButton"
                                onClick={() => handleApproveDoctor(doctor)}
                              >
                                Approve
                              </button>
                              <button 
                                className="doctorManagement_rejectButton"
                                onClick={() => handleRejectDoctor(doctor)}
                              >
                                Reject
                              </button>
                            </>
                          )}
                          <button 
                            className="doctorManagement_editButton"
                            onClick={() => handleEditDoctor(doctor)}
                          >
                            Edit
                          </button>
                          <button 
                            className="doctorManagement_deleteButton"
                            onClick={() => handleDeleteDoctor(doctor._id, doctor.userId._id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div className="doctorManagement_pagination">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    Previous
                  </button>
                  {[...Array(totalPages)].map((_, idx) => (
                    <button
                      key={idx + 1}
                      className={currentPage === idx + 1 ? 'active' : ''}
                      onClick={() => setCurrentPage(idx + 1)}
                    >
                      {idx + 1}
                    </button>
                  ))}
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="doctorManagement_noDataContainer">
              <p className="doctorManagement_noDataMessage">
                {searchTerm ? 'No doctors found matching your search.' : 'No doctors found for the selected filter.'}
              </p>
            </div>
          )}
        </div>
        
        {/* Edit Doctor Modal */}
        {showEditModal && (
          <div className="doctorManagement_modalOverlay">
            <div className="doctorManagement_modalContent">
              <div className="doctorManagement_modalHeader">
                <h3 className="doctorManagement_modalTitle">Edit Doctor</h3>
                <button 
                  className="doctorManagement_modalCloseButton"
                  onClick={() => setShowEditModal(false)}
                >
                  ×
                </button>
              </div>
              
              <div className="doctorManagement_modalBody">
                <div className="doctorManagement_formSections">
                  {/* Personal Information Section */}
                  <div className="doctorManagement_formSection">
                    <h4 className="doctorManagement_sectionTitle">Personal Information</h4>
                    <div className="doctorManagement_formGrid">
                      <div className="doctorManagement_formGroup">
                        <label className="doctorManagement_formLabel">First Name</label>
                        <input
                          type="text"
                          value={editFormData.firstname}
                          onChange={(e) => setEditFormData({...editFormData, firstname: e.target.value})}
                          className="doctorManagement_formInput"
                        />
                      </div>
                      
                      <div className="doctorManagement_formGroup">
                        <label className="doctorManagement_formLabel">Last Name</label>
                        <input
                          type="text"
                          value={editFormData.lastname}
                          onChange={(e) => setEditFormData({...editFormData, lastname: e.target.value})}
                          className="doctorManagement_formInput"
                        />
                      </div>
                      
                      <div className="doctorManagement_formGroup">
                        <label className="doctorManagement_formLabel">Email</label>
                        <input
                          type="email"
                          value={editFormData.email}
                          onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                          className="doctorManagement_formInput"
                        />
                      </div>
                      
                      <div className="doctorManagement_formGroup">
                        <label className="doctorManagement_formLabel">Mobile</label>
                        <input
                          type="tel"
                          value={editFormData.mobile}
                          onChange={(e) => setEditFormData({...editFormData, mobile: e.target.value})}
                          className="doctorManagement_formInput"
                        />
                      </div>
                      
                      <div className="doctorManagement_formGroup">
                        <label className="doctorManagement_formLabel">Age</label>
                        <input
                          type="number"
                          value={editFormData.age}
                          onChange={(e) => setEditFormData({...editFormData, age: e.target.value})}
                          className="doctorManagement_formInput"
                        />
                      </div>
                      
                      <div className="doctorManagement_formGroup">
                        <label className="doctorManagement_formLabel">Gender</label>
                        <select
                          value={editFormData.gender}
                          onChange={(e) => setEditFormData({...editFormData, gender: e.target.value})}
                          className="doctorManagement_formSelect"
                        >
                          <option value="">Select Gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      
                      <div className="doctorManagement_formGroup doctorManagement_formGroupFull">
                        <label className="doctorManagement_formLabel">Address</label>
                        <textarea
                          value={editFormData.address}
                          onChange={(e) => setEditFormData({...editFormData, address: e.target.value})}
                          className="doctorManagement_formTextarea"
                          rows="2"
                        ></textarea>
                      </div>
                    </div>
                  </div>
                  
                  {/* Professional Information Section */}
                  <div className="doctorManagement_formSection">
                    <h4 className="doctorManagement_sectionTitle">Professional Information</h4>
                    <div className="doctorManagement_formGrid">
                      <div className="doctorManagement_formGroup">
                        <label className="doctorManagement_formLabel">Specialization</label>
                        <input
                          type="text"
                          value={editFormData.specialization}
                          onChange={(e) => setEditFormData({...editFormData, specialization: e.target.value})}
                          className="doctorManagement_formInput"
                          placeholder="e.g., Cardiology, Dermatology"
                        />
                      </div>
                      
                      <div className="doctorManagement_formGroup">
                        <label className="doctorManagement_formLabel">Experience (years)</label>
                        <input
                          type="number"
                          value={editFormData.experience}
                          onChange={(e) => setEditFormData({...editFormData, experience: e.target.value})}
                          className="doctorManagement_formInput"
                          min="0"
                        />
                      </div>
                      
                      <div className="doctorManagement_formGroup">
                        <label className="doctorManagement_formLabel">Consultation Fees ($)</label>
                        <input
                          type="number"
                          value={editFormData.fees}
                          onChange={(e) => setEditFormData({...editFormData, fees: e.target.value})}
                          className="doctorManagement_formInput"
                          min="0"
                        />
                      </div>
                      
                      <div className="doctorManagement_formGroup">
                        <label className="doctorManagement_formLabel">Department</label>
                        <input
                          type="text"
                          value={editFormData.department}
                          onChange={(e) => setEditFormData({...editFormData, department: e.target.value})}
                          className="doctorManagement_formInput"
                          placeholder="e.g., Internal Medicine, Surgery"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="doctorManagement_modalFooter">
                <button 
                  className="doctorManagement_modalCancelButton"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="doctorManagement_modalSaveButton"
                  onClick={handleSaveEdit}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default DoctorManagement;