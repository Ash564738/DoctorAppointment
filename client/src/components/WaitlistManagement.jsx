import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import Navbar from './Navbar';
import Loading from './Loading';
import './WaitlistManagement.css';

const WaitlistManagement = () => {
  const { user } = useSelector(state => state.root.user);
  const [loading, setLoading] = useState(false);
  const [waitlistEntries, setWaitlistEntries] = useState([]);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    status: '',
    date: '',
    doctorId: ''
  });
  const [activeTab, setActiveTab] = useState('user');
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinFormData, setJoinFormData] = useState({
    doctorId: '',
    date: '',
    time: '',
    symptoms: '',
    appointmentType: 'regular',
    priority: 'normal',
    isFlexibleTime: false,
    flexibleTimeRange: { startTime: '', endTime: '' },
    isFlexibleDate: false,
    flexibleDateRange: { startDate: '', endDate: '' }
  });
  const [doctors, setDoctors] = useState([]);
  const [statistics, setStatistics] = useState({});

  useEffect(() => {
    fetchWaitlistData();
    if (user.role === 'Patient') {
      fetchDoctors();
    }
  }, [activeTab, filters]);

  const fetchWaitlistData = async () => {
    try {
      setLoading(true);
      let endpoint = '';
      let params = {};

      switch (activeTab) {
        case 'user':
          endpoint = 'http://localhost:5015/api/waitlist/user';
          if (filters.status) params.status = filters.status;
          break;
        case 'doctor':
          endpoint = 'http://localhost:5015/api/waitlist/doctor';
          if (filters.date) params.date = filters.date;
          if (filters.status) params.status = filters.status;
          break;
        case 'admin':
          endpoint = 'http://localhost:5015/api/waitlist/admin/all';
          params = filters;
          break;
        default:
          return;
      }

      const response = await axios.get(endpoint, {
        params,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.data.success) {
        setWaitlistEntries(response.data.waitlist);
        setPagination(response.data.pagination);
        if (response.data.statistics) {
          setStatistics(response.data.statistics);
        }
      }
    } catch (error) {
      console.error('Error fetching waitlist:', error);
      toast.error('Failed to fetch waitlist data');
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const response = await axios.get('http://localhost:5015/api/doctor/getalldoctors');
      setDoctors(response.data);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const joinWaitlist = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const response = await axios.post(
        'http://localhost:5015/api/waitlist/join',
        joinFormData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data.success) {
        toast.success('Successfully joined waitlist!');
        setShowJoinForm(false);
        setJoinFormData({
          doctorId: '',
          date: '',
          time: '',
          symptoms: '',
          appointmentType: 'regular',
          priority: 'normal',
          isFlexibleTime: false,
          flexibleTimeRange: { startTime: '', endTime: '' },
          isFlexibleDate: false,
          flexibleDateRange: { startDate: '', endDate: '' }
        });
        fetchWaitlistData();
      }
    } catch (error) {
      console.error('Error joining waitlist:', error);
      toast.error(error.response?.data?.message || 'Failed to join waitlist');
    } finally {
      setLoading(false);
    }
  };

  const convertToAppointment = async (waitlistId) => {
    try {
      setLoading(true);
      
      const response = await axios.post(
        `http://localhost:5015/api/waitlist/convert/${waitlistId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data.success) {
        toast.success('Appointment booked successfully!');
        fetchWaitlistData();
      }
    } catch (error) {
      console.error('Error converting waitlist:', error);
      toast.error(error.response?.data?.message || 'Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  const removeFromWaitlist = async (waitlistId) => {
    try {
      setLoading(true);
      
      const response = await axios.delete(
        `http://localhost:5015/api/waitlist/${waitlistId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data.success) {
        toast.success('Removed from waitlist successfully');
        fetchWaitlistData();
      }
    } catch (error) {
      console.error('Error removing from waitlist:', error);
      toast.error('Failed to remove from waitlist');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'waiting': return '#ffc107';
      case 'notified': return '#28a745';
      case 'booked': return '#17a2b8';
      case 'expired': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'normal': return '#28a745';
      case 'low': return '#6c757d';
      default: return '#6c757d';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeUntilExpiry = (expiryDate) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diff = expiry - now;
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  return (
    <>
      <Navbar />
      <div className="waitlist-management">
        <div className="container">
          <div className="waitlist-header">
            <h2>Waitlist Management</h2>
            {user.role === 'Patient' && (
              <button 
                className="btn btn-primary"
                onClick={() => setShowJoinForm(true)}
              >
                Join Waitlist
              </button>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="tab-navigation">
            {user.role === 'Patient' && (
              <button
                className={`tab-btn ${activeTab === 'user' ? 'active' : ''}`}
                onClick={() => setActiveTab('user')}
              >
                My Waitlist
              </button>
            )}
            {user.role === 'Doctor' && (
              <button
                className={`tab-btn ${activeTab === 'doctor' ? 'active' : ''}`}
                onClick={() => setActiveTab('doctor')}
              >
                My Patients' Waitlist
              </button>
            )}
            {user.role === 'Admin' && (
              <>
                <button
                  className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
                  onClick={() => setActiveTab('admin')}
                >
                  All Waitlists
                </button>
                <button
                  className={`tab-btn ${activeTab === 'statistics' ? 'active' : ''}`}
                  onClick={() => setActiveTab('statistics')}
                >
                  Statistics
                </button>
              </>
            )}
          </div>

          {/* Filters */}
          <div className="filters-section">
            <div className="filters">
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="filter-select"
              >
                <option value="">All Status</option>
                <option value="waiting">Waiting</option>
                <option value="notified">Notified</option>
                <option value="booked">Booked</option>
                <option value="expired">Expired</option>
              </select>

              <input
                type="date"
                value={filters.date}
                onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
                className="filter-input"
              />

              {user.role === 'Admin' && (
                <select
                  value={filters.doctorId}
                  onChange={(e) => setFilters(prev => ({ ...prev, doctorId: e.target.value }))}
                  className="filter-select"
                >
                  <option value="">All Doctors</option>
                  {doctors.map(doctor => (
                    <option key={doctor._id} value={doctor.userId._id}>
                      Dr. {doctor.userId.firstname} {doctor.userId.lastname}
                    </option>
                  ))}
                </select>
              )}

              <button onClick={fetchWaitlistData} className="btn btn-secondary">
                Apply Filters
              </button>
            </div>
          </div>

          {/* Statistics Dashboard */}
          {activeTab === 'statistics' && user.role === 'Admin' && (
            <div className="statistics-dashboard">
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>{statistics.total || 0}</h3>
                  <p>Total Waitlist Entries</p>
                </div>
                {statistics.statuses?.map(stat => (
                  <div key={stat.status} className="stat-card">
                    <h3>{stat.count}</h3>
                    <p style={{ color: getStatusColor(stat.status) }}>
                      {stat.status.charAt(0).toUpperCase() + stat.status.slice(1)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Waitlist Table */}
          {loading ? (
            <Loading />
          ) : (
            <div className="waitlist-table-container">
              {waitlistEntries.length > 0 ? (
                <table className="waitlist-table">
                  <thead>
                    <tr>
                      <th>Position</th>
                      <th>Patient</th>
                      <th>Doctor</th>
                      <th>Date & Time</th>
                      <th>Type</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Created</th>
                      {activeTab === 'user' && <th>Expires In</th>}
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {waitlistEntries.map(entry => (
                      <tr key={entry._id}>
                        <td>
                          <span className="position-badge">
                            #{entry.positionInQueue}
                          </span>
                        </td>
                        <td>
                          {entry.userId ? 
                            `${entry.userId.firstname} ${entry.userId.lastname}` : 
                            'N/A'
                          }
                        </td>
                        <td>
                          {entry.doctorId ? 
                            `Dr. ${entry.doctorId.firstname} ${entry.doctorId.lastname}` : 
                            'N/A'
                          }
                        </td>
                        <td>
                          <div className="date-time">
                            <div>{formatDate(entry.date)}</div>
                            <div className="time">{entry.time}</div>
                          </div>
                        </td>
                        <td>
                          <span className="type-badge">
                            {entry.appointmentType}
                          </span>
                        </td>
                        <td>
                          <span 
                            className="priority-badge"
                            style={{ backgroundColor: getPriorityColor(entry.priority) }}
                          >
                            {entry.priority}
                          </span>
                        </td>
                        <td>
                          <span 
                            className="status-badge"
                            style={{ backgroundColor: getStatusColor(entry.status) }}
                          >
                            {entry.status}
                          </span>
                        </td>
                        <td>{formatDate(entry.createdAt)}</td>
                        {activeTab === 'user' && (
                          <td>
                            {entry.status === 'notified' && entry.expiryDate ? 
                              <span className="expiry-time">
                                {getTimeUntilExpiry(entry.expiryDate)}
                              </span> : 
                              '-'
                            }
                          </td>
                        )}
                        <td>
                          <div className="actions">
                            {entry.status === 'notified' && activeTab === 'user' && (
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => convertToAppointment(entry._id)}
                              >
                                Book Now
                              </button>
                            )}
                            {(entry.status === 'waiting' || entry.status === 'notified') && (
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => removeFromWaitlist(entry._id)}
                              >
                                Remove
                              </button>
                            )}
                            {entry.status === 'booked' && (
                              <span className="text-success">✓ Booked</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">
                  <h3>No waitlist entries found</h3>
                  <p>
                    {activeTab === 'user' 
                      ? 'You haven\'t joined any waitlists yet.' 
                      : 'No patients are currently on your waitlist.'
                    }
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-outline"
                onClick={() => {/* Previous page logic */}}
                disabled={pagination.page === 1}
              >
                Previous
              </button>
              
              <span className="page-info">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              
              <button
                className="btn btn-outline"
                onClick={() => {/* Next page logic */}}
                disabled={pagination.page === pagination.totalPages}
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Join Waitlist Modal */}
        {showJoinForm && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h3>Join Waitlist</h3>
                <button 
                  className="close-btn"
                  onClick={() => setShowJoinForm(false)}
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={joinWaitlist} className="join-form">
                <div className="form-group">
                  <label>Doctor *</label>
                  <select
                    value={joinFormData.doctorId}
                    onChange={(e) => setJoinFormData(prev => ({ ...prev, doctorId: e.target.value }))}
                    required
                  >
                    <option value="">Select a doctor</option>
                    {doctors.map(doctor => (
                      <option key={doctor._id} value={doctor.userId._id}>
                        Dr. {doctor.userId.firstname} {doctor.userId.lastname} - {doctor.specialization}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Preferred Date *</label>
                    <input
                      type="date"
                      value={joinFormData.date}
                      onChange={(e) => setJoinFormData(prev => ({ ...prev, date: e.target.value }))}
                      required
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div className="form-group">
                    <label>Preferred Time *</label>
                    <input
                      type="time"
                      value={joinFormData.time}
                      onChange={(e) => setJoinFormData(prev => ({ ...prev, time: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Symptoms/Reason for Visit *</label>
                  <textarea
                    value={joinFormData.symptoms}
                    onChange={(e) => setJoinFormData(prev => ({ ...prev, symptoms: e.target.value }))}
                    placeholder="Describe your symptoms or reason for the appointment..."
                    required
                    rows="3"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Appointment Type</label>
                    <select
                      value={joinFormData.appointmentType}
                      onChange={(e) => setJoinFormData(prev => ({ ...prev, appointmentType: e.target.value }))}
                    >
                      <option value="regular">Regular</option>
                      <option value="emergency">Emergency</option>
                      <option value="follow-up">Follow-up</option>
                      <option value="consultation">Consultation</option>
                      <option value="telemedicine">Telemedicine</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Priority</label>
                    <select
                      value={joinFormData.priority}
                      onChange={(e) => setJoinFormData(prev => ({ ...prev, priority: e.target.value }))}
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="flexibility-options">
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={joinFormData.isFlexibleTime}
                        onChange={(e) => setJoinFormData(prev => ({ ...prev, isFlexibleTime: e.target.checked }))}
                      />
                      I'm flexible with time
                    </label>
                    
                    {joinFormData.isFlexibleTime && (
                      <div className="flexible-time-range">
                        <input
                          type="time"
                          placeholder="From"
                          value={joinFormData.flexibleTimeRange.startTime}
                          onChange={(e) => setJoinFormData(prev => ({
                            ...prev,
                            flexibleTimeRange: { ...prev.flexibleTimeRange, startTime: e.target.value }
                          }))}
                        />
                        <span>to</span>
                        <input
                          type="time"
                          placeholder="To"
                          value={joinFormData.flexibleTimeRange.endTime}
                          onChange={(e) => setJoinFormData(prev => ({
                            ...prev,
                            flexibleTimeRange: { ...prev.flexibleTimeRange, endTime: e.target.value }
                          }))}
                        />
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={joinFormData.isFlexibleDate}
                        onChange={(e) => setJoinFormData(prev => ({ ...prev, isFlexibleDate: e.target.checked }))}
                      />
                      I'm flexible with date
                    </label>
                    
                    {joinFormData.isFlexibleDate && (
                      <div className="flexible-date-range">
                        <input
                          type="date"
                          placeholder="From"
                          value={joinFormData.flexibleDateRange.startDate}
                          onChange={(e) => setJoinFormData(prev => ({
                            ...prev,
                            flexibleDateRange: { ...prev.flexibleDateRange, startDate: e.target.value }
                          }))}
                          min={new Date().toISOString().split('T')[0]}
                        />
                        <span>to</span>
                        <input
                          type="date"
                          placeholder="To"
                          value={joinFormData.flexibleDateRange.endDate}
                          onChange={(e) => setJoinFormData(prev => ({
                            ...prev,
                            flexibleDateRange: { ...prev.flexibleDateRange, endDate: e.target.value }
                          }))}
                          min={joinFormData.flexibleDateRange.startDate || new Date().toISOString().split('T')[0]}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowJoinForm(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Joining...' : 'Join Waitlist'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default WaitlistManagement;
