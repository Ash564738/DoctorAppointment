import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import '../styles/leavemanagement.css';

const LeaveManagement = ({ userRole }) => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const [formData, setFormData] = useState({
    leaveType: 'vacation',
    startDate: '',
    endDate: '',
    reason: '',
    isEmergency: false
  });

  useEffect(() => {
    fetchLeaveRequests();
    fetchLeaveStatistics();
  }, [filterStatus]);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = filterStatus !== 'all' ? `?status=${filterStatus}` : '';
      
      const response = await axios.get(
        `${process.env.REACT_APP_SERVER_DOMAIN}/api/leave/${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setLeaveRequests(response.data.leaveRequests);
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      toast.error('Failed to fetch leave requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveStatistics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_SERVER_DOMAIN}/api/leave/statistics`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setStatistics(response.data.statistics);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${process.env.REACT_APP_SERVER_DOMAIN}/api/leave/request`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        toast.success('Leave request submitted successfully');
        setShowRequestForm(false);
        resetForm();
        fetchLeaveRequests();
      }
    } catch (error) {
      console.error('Error submitting leave request:', error);
      toast.error(error.response?.data?.message || 'Failed to submit leave request');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (requestId, status, rejectionReason = '') => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.patch(
        `${process.env.REACT_APP_SERVER_DOMAIN}/api/leave/${requestId}/process`,
        { status, rejectionReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        toast.success(`Leave request ${status} successfully`);
        fetchLeaveRequests();
      }
    } catch (error) {
      console.error('Error processing leave request:', error);
      toast.error('Failed to process leave request');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (requestId, reason = '') => {
    if (!window.confirm('Are you sure you want to cancel this leave request?')) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.patch(
        `${process.env.REACT_APP_SERVER_DOMAIN}/api/leave/${requestId}/cancel`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        toast.success('Leave request cancelled successfully');
        fetchLeaveRequests();
      }
    } catch (error) {
      console.error('Error cancelling leave request:', error);
      toast.error('Failed to cancel leave request');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      leaveType: 'vacation',
      startDate: '',
      endDate: '',
      reason: '',
      isEmergency: false
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'approved': return 'status-approved';
      case 'rejected': return 'status-rejected';
      case 'cancelled': return 'status-cancelled';
      default: return 'status-pending';
    }
  };

  const calculateDuration = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const leaveTypes = [
    { value: 'vacation', label: 'Vacation' },
    { value: 'sick', label: 'Sick Leave' },
    { value: 'personal', label: 'Personal' },
    { value: 'emergency', label: 'Emergency' },
    { value: 'maternity', label: 'Maternity' },
    { value: 'paternity', label: 'Paternity' },
    { value: 'bereavement', label: 'Bereavement' }
  ];

  return (
    <div className="leave-management-container">
      <div className="page-header">
        <h2>Leave Management</h2>
        <div className="header-actions">
          {userRole !== 'Admin' && (
            <button 
              className="btn-primary"
              onClick={() => setShowRequestForm(true)}
            >
              Request Leave
            </button>
          )}
        </div>
      </div>

      {/* Statistics Section */}
      {statistics && (
        <div className="statistics-section">
          <h3>Leave Statistics ({statistics.year})</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{statistics.totalLeaves}</div>
              <div className="stat-label">Total Leaves</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{statistics.pendingLeaves}</div>
              <div className="stat-label">Pending Requests</div>
            </div>
            {statistics.byType.map(type => (
              <div key={type._id} className="stat-card">
                <div className="stat-number">{Math.round(type.totalDays)}</div>
                <div className="stat-label">{type._id} Days</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Filter by Status:</label>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Requests</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Leave Request Form Modal */}
      {showRequestForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Submit Leave Request</h3>
              <button 
                className="close-btn"
                onClick={() => {
                  setShowRequestForm(false);
                  resetForm();
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="leave-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Leave Type *</label>
                  <select
                    name="leaveType"
                    value={formData.leaveType}
                    onChange={handleInputChange}
                    required
                  >
                    {leaveTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="isEmergency"
                      checked={formData.isEmergency}
                      onChange={handleInputChange}
                    />
                    Emergency Leave
                  </label>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Date *</label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    min={getTodayDate()}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>End Date *</label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    min={formData.startDate || getTodayDate()}
                    required
                  />
                </div>
              </div>

              {formData.startDate && formData.endDate && (
                <div className="duration-info">
                  <p>Duration: {calculateDuration(formData.startDate, formData.endDate)} day(s)</p>
                </div>
              )}

              <div className="form-group">
                <label>Reason *</label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  placeholder="Please provide a detailed reason for your leave request"
                  rows="4"
                  required
                  minLength="10"
                  maxLength="500"
                />
                <small className="char-count">
                  {formData.reason.length}/500 characters
                </small>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowRequestForm(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave Requests List */}
      <div className="requests-section">
        <h3>
          {userRole === 'Admin' ? 'All Leave Requests' : 'My Leave Requests'}
        </h3>

        {loading && <div className="loading">Loading leave requests...</div>}

        {leaveRequests.length === 0 && !loading ? (
          <div className="empty-state">
            <p>No leave requests found.</p>
          </div>
        ) : (
          <div className="requests-grid">
            {leaveRequests.map(request => (
              <div key={request._id} className="request-card">
                <div className="card-header">
                  <div className="request-info">
                    {userRole === 'Admin' && (
                      <h4>{request.staffId.firstname} {request.staffId.lastname}</h4>
                    )}
                    <div className="leave-type-badge">
                      {leaveTypes.find(t => t.value === request.leaveType)?.label}
                      {request.isEmergency && <span className="emergency-badge">Emergency</span>}
                    </div>
                  </div>
                  <div className={`status-badge ${getStatusBadgeClass(request.status)}`}>
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </div>
                </div>

                <div className="card-content">
                  <div className="date-range">
                    <span className="date-label">From:</span>
                    <span className="date-value">
                      {new Date(request.startDate).toLocaleDateString()}
                    </span>
                    <span className="date-label">To:</span>
                    <span className="date-value">
                      {new Date(request.endDate).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="duration">
                    Duration: {calculateDuration(request.startDate, request.endDate)} day(s)
                  </div>

                  <div className="reason">
                    <strong>Reason:</strong> {request.reason}
                  </div>

                  {request.rejectionReason && (
                    <div className="rejection-reason">
                      <strong>Rejection Reason:</strong> {request.rejectionReason}
                    </div>
                  )}

                  {request.approvedBy && (
                    <div className="approval-info">
                      <small>
                        {request.status === 'approved' ? 'Approved' : 'Processed'} by {request.approvedBy.firstname} {request.approvedBy.lastname} 
                        on {new Date(request.approvalDate).toLocaleDateString()}
                      </small>
                    </div>
                  )}
                </div>

                <div className="card-actions">
                  {userRole === 'Admin' && request.status === 'pending' && (
                    <>
                      <button
                        className="btn-success"
                        onClick={() => handleApproval(request._id, 'approved')}
                        disabled={loading}
                      >
                        Approve
                      </button>
                      <button
                        className="btn-danger"
                        onClick={() => {
                          const reason = prompt('Rejection reason (optional):');
                          handleApproval(request._id, 'rejected', reason || '');
                        }}
                        disabled={loading}
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {request.status === 'pending' && userRole !== 'Admin' && (
                    <button
                      className="btn-danger"
                      onClick={() => handleCancel(request._id)}
                      disabled={loading}
                    >
                      Cancel Request
                    </button>
                  )}

                  {request.status === 'approved' && (
                    <button
                      className="btn-warning"
                      onClick={() => {
                        const reason = prompt('Cancellation reason:');
                        if (reason) handleCancel(request._id, reason);
                      }}
                      disabled={loading}
                    >
                      Cancel Leave
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaveManagement;
