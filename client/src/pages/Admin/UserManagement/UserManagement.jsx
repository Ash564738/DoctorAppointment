import React, { useEffect, useState } from 'react';
import NavbarWrapper from '../../../components/Common/NavbarWrapper/NavbarWrapper';
import Footer from '../../../components/Common/Footer/Footer';
import { apiCall } from '../../../helper/apiCall';
import './UserManagement.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [doctorApplications, setDoctorApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const usersData = await apiCall.get('/user/getallusers');
        console.log('=== FRONTEND UserManagement DEBUG ===');
        console.log('Received users data:', usersData);
        console.log('Users length:', usersData?.length);
        console.log('Users with roles:', usersData?.map(u => ({ 
          email: u.email, 
          role: u.role, 
          roleType: typeof u.role,
          roleLowercase: u.role?.toLowerCase() 
        })));
        
        setUsers(usersData || []);
        const applicationsData = await apiCall.get('/doctor/getnotdoctors');
        setDoctorApplications(applicationsData || []);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Failed to fetch data');
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleRoleFilter = (role) => {
    setFilter(role);
  };

  const filteredUsers = filter === 'all' ? users : users.filter(user => {
    const userRole = user.role?.toLowerCase();
    return userRole === filter;
  });

  const searchFilteredUsers = filteredUsers.filter(user => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      user.firstname?.toLowerCase().includes(searchLower) ||
      user.lastname?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.role?.toLowerCase().includes(searchLower)
    );
  });

  const roleStats = {
    all: users.length,
    patient: users.filter(u => u.role?.toLowerCase() === 'patient').length,
    doctor: users.filter(u => u.role?.toLowerCase() === 'doctor').length,
    admin: users.filter(u => u.role?.toLowerCase() === 'admin').length
  };

  console.log('=== FRONTEND Role Stats Calculation ===');
  console.log('Users array:', users);
  console.log('Users length:', users.length);
  console.log('Admin users:', users.filter(u => u.role?.toLowerCase() === 'admin'));
  console.log('Admin count:', users.filter(u => u.role?.toLowerCase() === 'admin').length);
  console.log('Role stats:', roleStats);
  console.log('=== END FRONTEND DEBUG ===');

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await apiCall.delete(`/user/deleteuser/${userId}`);
        setUsers(users.filter(user => user._id !== userId));
      } catch (err) {
        alert('Failed to delete user');
      }
    }
  };

  const handleApproveDoctor = async (userId) => {
    try {
      await apiCall.put('/doctor/acceptdoctor', { id: userId });
      setDoctorApplications(doctorApplications.filter(app => app._id !== userId));
      // Refresh users data
      const usersData = await apiCall.get('/user/getallusers');
      setUsers(usersData || []);
    } catch (err) {
      alert('Failed to approve doctor application');
    }
  };

  const handleRejectDoctor = async (userId) => {
    if (window.confirm('Are you sure you want to reject this doctor application?')) {
      try {
        await apiCall.put('/doctor/rejectdoctor', { id: userId });
        setDoctorApplications(doctorApplications.filter(app => app._id !== userId));
      } catch (err) {
        alert('Failed to reject doctor application');
      }
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setEditFormData({
      firstname: user.firstname || '',
      lastname: user.lastname || '',
      email: user.email || '',
      role: user.role || 'Patient',
      status: user.status || 'Active',
      age: user.age || '',
      mobile: user.mobile || '',
      address: user.address || '',
      gender: user.gender || ''
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      // Create a new user update endpoint specifically for admin
      await apiCall.put(`/user/admin-update/${editingUser._id}`, editFormData);
      
      // Update local state
      setUsers(users.map(user => 
        user._id === editingUser._id 
          ? { ...user, ...editFormData }
          : user
      ));
      
      setShowEditModal(false);
      setEditingUser(null);
      setEditFormData({});
      alert('User updated successfully');
    } catch (err) {
      console.error('Edit user error:', err);
      alert('Failed to update user. Using profile update endpoint...');
      
      // Fallback to existing updateprofile endpoint (limited functionality)
      try {
        const limitedData = {
          firstname: editFormData.firstname,
          lastname: editFormData.lastname,
          age: editFormData.age,
          mobile: editFormData.mobile,
          address: editFormData.address,
          gender: editFormData.gender
        };
        
        // Note: This won't update email or role due to security restrictions
        await apiCall.put('/user/updateprofile', limitedData);
        alert('User updated successfully (limited fields due to security)');
        
        // Refresh users data
        const usersData = await apiCall.get('/user/getallusers');
        setUsers(usersData || []);
        
        setShowEditModal(false);
        setEditingUser(null);
        setEditFormData({});
      } catch (fallbackErr) {
        alert('Failed to update user');
      }
    }
  };

  const getUserStatus = (user) => {
    // Priority: user.status from User model, then check doctor-specific status
    if (user.status) {
      return user.status;
    }
    
    // For doctors, check if they're approved through isDoctor flag
    if (user.role?.toLowerCase() === 'doctor') {
      return user.isDoctor ? 'Active' : 'Pending';
    }
    
    // Default status for other users
    return 'Active';
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'userManagement_statusActive';
      case 'pending':
        return 'userManagement_statusPending';
      case 'suspended':
      case 'inactive':
        return 'userManagement_statusInactive';
      default:
        return 'userManagement_statusActive';
    }
  };

  const totalRows = searchFilteredUsers.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const paginatedUsers = searchFilteredUsers.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchTerm]);

  return (
    <div className="userManagement_page">
      <NavbarWrapper />
      <div className="userManagement_container">
        <div className="userManagement_header">
          <h1 className="userManagement_title">User Management</h1>
          <p className="userManagement_description">
            Manage users, approve doctor applications, and edit/delete user accounts.
          </p>
          
          <div className="userManagement_searchContainer">
            <input
              type="text"
              placeholder="Search users by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="userManagement_searchInput"
            />
          </div>
        </div>

        {doctorApplications.length > 0 && (
          <div className="userManagement_section">
            <h2 className="userManagement_sectionTitle">Pending Doctor Applications</h2>
            <div className="userManagement_applicationsGrid">
              {doctorApplications.map((application) => (
                <div key={application._id} className="userManagement_applicationCard">
                  <div className="userManagement_applicationInfo">
                    <h3 className="userManagement_applicationName">
                      {application.firstname} {application.lastname}
                    </h3>
                    <p className="userManagement_applicationEmail">{application.email}</p>
                    <p className="userManagement_applicationSpecialty">
                      Specialty: {application.specialization || 'Not specified'}
                    </p>
                  </div>
                  <div className="userManagement_applicationActions">
                    <button 
                      className="userManagement_approveButton"
                      onClick={() => handleApproveDoctor(application._id)}
                    >
                      Approve
                    </button>
                    <button 
                      className="userManagement_rejectButton"
                      onClick={() => handleRejectDoctor(application._id)}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users Management Section */}
        <div className="userManagement_section">
          <div className="userManagement_sectionHeader">
            <h2 className="userManagement_sectionTitle">All Users</h2>
            <div className="userManagement_filters">
              <button 
                className={`userManagement_filterButton ${filter === 'all' ? 'userManagement_filterActive' : ''}`}
                onClick={() => handleRoleFilter('all')}
              >
                All ({roleStats.all})
              </button>
              <button 
                className={`userManagement_filterButton ${filter === 'patient' ? 'userManagement_filterActive' : ''}`}
                onClick={() => handleRoleFilter('patient')}
              >
                Patients ({roleStats.patient})
              </button>
              <button 
                className={`userManagement_filterButton ${filter === 'doctor' ? 'userManagement_filterActive' : ''}`}
                onClick={() => handleRoleFilter('doctor')}
              >
                Doctors ({roleStats.doctor})
              </button>
              <button 
                className={`userManagement_filterButton ${filter === 'admin' ? 'userManagement_filterActive' : ''}`}
                onClick={() => handleRoleFilter('admin')}
              >
                Admins ({roleStats.admin})
              </button>
            </div>
          </div>

          {loading ? (
            <div className="userManagement_loadingContainer">
              <div className="userManagement_spinner"></div>
              <p className="userManagement_loadingText">Loading users...</p>
            </div>
          ) : error ? (
            <div className="userManagement_errorContainer">
              <p className="userManagement_errorMessage">{error}</p>
              <button 
                className="userManagement_retryButton"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="userManagement_tableContainer">
              <table className="userManagement_table">
                <thead className="userManagement_tableHeader">
                  <tr>
                    <th className="userManagement_tableHeaderCell">Name</th>
                    <th className="userManagement_tableHeaderCell">Email</th>
                    <th className="userManagement_tableHeaderCell">Role</th>
                    <th className="userManagement_tableHeaderCell">Status</th>
                    <th className="userManagement_tableHeaderCell">Joined</th>
                    <th className="userManagement_tableHeaderCell">Actions</th>
                  </tr>
                </thead>
                <tbody className="userManagement_tableBody">
                  {paginatedUsers.map((user) => (
                    <tr key={user._id} className="userManagement_tableRow">
                      <td className="userManagement_tableCell">
                        <div className="userManagement_userInfo">
                          <span className="userManagement_userName">
                            {user.firstname} {user.lastname}
                          </span>
                          {user.age && (
                            <span className="userManagement_userAge">
                              Age: {user.age}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="userManagement_tableCell">
                        <span className="userManagement_userEmail">{user.email}</span>
                      </td>
                      <td className="userManagement_tableCell">
                        <span className={`userManagement_roleTag userManagement_role${user.role || 'Patient'}`}>
                          {user.role || 'Patient'}
                        </span>
                      </td>
                      <td className="userManagement_tableCell">
                        <span className={getStatusColor(getUserStatus(user))}>
                          {getUserStatus(user)}
                        </span>
                      </td>
                      <td className="userManagement_tableCell">
                        <span className="userManagement_joinDate">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                        </span>
                      </td>
                      <td className="userManagement_tableCell">
                        <div className="userManagement_actionButtons">
                          <button 
                            className="userManagement_editButton"
                            onClick={() => handleEditUser(user)}
                          >
                            Edit
                          </button>
                          <button 
                            className="userManagement_deleteButton"
                            onClick={() => handleDeleteUser(user._id)}
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
                <div className="userManagement_pagination">
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
            <div className="userManagement_noDataContainer">
              <p className="userManagement_noDataMessage">
                {searchTerm ? 'No users found matching your search.' : 'No users found for the selected filter.'}
              </p>
            </div>
          )}
        </div>
        
        {showEditModal && (
          <div className="userManagement_modalOverlay">
            <div className="userManagement_modalContent">
              <div className="userManagement_modalHeader">
                <h3 className="userManagement_modalTitle">Edit User</h3>
                <button 
                  className="userManagement_modalCloseButton"
                  onClick={() => setShowEditModal(false)}
                >
                  ×
                </button>
              </div>
              
              <div className="userManagement_modalBody">
                <div className="userManagement_formGrid">
                  <div className="userManagement_formGroup">
                    <label className="userManagement_formLabel">First Name</label>
                    <input
                      type="text"
                      value={editFormData.firstname}
                      onChange={(e) => setEditFormData({...editFormData, firstname: e.target.value})}
                      className="userManagement_formInput"
                    />
                  </div>
                  
                  <div className="userManagement_formGroup">
                    <label className="userManagement_formLabel">Last Name</label>
                    <input
                      type="text"
                      value={editFormData.lastname}
                      onChange={(e) => setEditFormData({...editFormData, lastname: e.target.value})}
                      className="userManagement_formInput"
                    />
                  </div>
                  
                  <div className="userManagement_formGroup">
                    <label className="userManagement_formLabel">Email</label>
                    <input
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                      className="userManagement_formInput"
                    />
                  </div>
                  
                  <div className="userManagement_formGroup">
                    <label className="userManagement_formLabel">Role</label>
                    <select
                      value={editFormData.role}
                      onChange={(e) => setEditFormData({...editFormData, role: e.target.value})}
                      className="userManagement_formSelect"
                    >
                      <option value="Patient">Patient</option>
                      <option value="Doctor">Doctor</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                  
                  <div className="userManagement_formGroup">
                    <label className="userManagement_formLabel">Status</label>
                    <select
                      value={editFormData.status}
                      onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                      className="userManagement_formSelect"
                    >
                      <option value="Active">Active</option>
                      <option value="Pending">Pending</option>
                      <option value="Suspended">Suspended</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  
                  <div className="userManagement_formGroup">
                    <label className="userManagement_formLabel">Age</label>
                    <input
                      type="number"
                      value={editFormData.age}
                      onChange={(e) => setEditFormData({...editFormData, age: e.target.value})}
                      className="userManagement_formInput"
                    />
                  </div>
                  
                  <div className="userManagement_formGroup">
                    <label className="userManagement_formLabel">Mobile</label>
                    <input
                      type="tel"
                      value={editFormData.mobile}
                      onChange={(e) => setEditFormData({...editFormData, mobile: e.target.value})}
                      className="userManagement_formInput"
                    />
                  </div>
                  
                  <div className="userManagement_formGroup userManagement_formGroupFull">
                    <label className="userManagement_formLabel">Address</label>
                    <textarea
                      value={editFormData.address}
                      onChange={(e) => setEditFormData({...editFormData, address: e.target.value})}
                      className="userManagement_formTextarea"
                      rows="2"
                    ></textarea>
                  </div>
                  
                  <div className="userManagement_formGroup">
                    <label className="userManagement_formLabel">Gender</label>
                    <select
                      value={editFormData.gender}
                      onChange={(e) => setEditFormData({...editFormData, gender: e.target.value})}
                      className="userManagement_formSelect"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="userManagement_modalFooter">
                <button 
                  className="userManagement_modalCancelButton"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="userManagement_modalSaveButton"
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

export default UserManagement;
