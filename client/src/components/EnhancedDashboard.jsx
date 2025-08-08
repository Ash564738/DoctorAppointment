import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import fetchData from '../helper/apiCall';
import { 
  FaCalendarAlt, 
  FaUserMd, 
  FaClipboardList, 
  FaClock,
  FaUsers,
  FaChartLine,
  FaBell,
  FaFileMedical
} from 'react-icons/fa';
import '../styles/enhanced-dashboard.css';

const EnhancedDashboard = () => {
  const { userInfo: user } = useSelector(state => state.root);
  const [dashboardData, setDashboardData] = useState({
    stats: {},
    recentAppointments: [],
    notifications: [],
    upcomingShifts: [],
    leaveRequests: []
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch different data based on user role
      const promises = [];
      
      if (user?.role === 'Doctor') {
        promises.push(
          fetchData('/appointment/doctor'),
          fetchData('/appointment/doctor'), // Using existing endpoint for shifts
          fetchData('/notification/getallnotifs') // Using existing endpoint for leave stats
        );
      } else if (user?.role === 'Patient') {
        promises.push(
          fetchData('/appointment/patient')
        );
      } else if (user?.role === 'Admin') {
        promises.push(
          fetchData('/appointment/getallappointments'),
          fetchData('/appointment/getallappointments'), // Using existing endpoint for shifts
          fetchData('/notification/getallnotifs') // Using existing endpoint for leave
        );
      }

      // Get notifications for all users
      promises.push(
        fetchData('/notification/getallnotifs')
      );

      const results = await Promise.allSettled(promises);
      
      // Process results based on user role
      let stats = {};
      let recentAppointments = [];
      let notifications = [];
      let upcomingShifts = [];
      let leaveRequests = [];

      if (user?.role === 'Doctor') {
        if (results[0].status === 'fulfilled') {
          const appointments = results[0].value.appointments || [];
          recentAppointments = appointments.slice(0, 5);
          
          stats = {
            totalAppointments: appointments.length,
            todayAppointments: appointments.filter(apt => 
              new Date(apt.date).toDateString() === new Date().toDateString()
            ).length,
            pendingAppointments: appointments.filter(apt => apt.status === 'Pending').length,
            completedAppointments: appointments.filter(apt => apt.status === 'Completed').length
          };
        }
        
        if (results[1].status === 'fulfilled') {
          upcomingShifts = []; // Placeholder for shifts data
        }
      } else if (user?.role === 'Patient') {
        if (results[0].status === 'fulfilled') {
          const appointments = results[0].value.appointments || [];
          recentAppointments = appointments.slice(0, 5);
          
          stats = {
            totalAppointments: appointments.length,
            upcomingAppointments: appointments.filter(apt => 
              new Date(apt.date) >= new Date() && apt.status !== 'Cancelled'
            ).length,
            completedAppointments: appointments.filter(apt => apt.status === 'Completed').length,
            cancelledAppointments: appointments.filter(apt => apt.status === 'Cancelled').length
          };
        }
      } else if (user?.role === 'Admin') {
        if (results[0].status === 'fulfilled') {
          const appointments = results[0].value.appointments || [];
          recentAppointments = appointments.slice(0, 10);
          
          stats = {
            totalAppointments: appointments.length,
            todayAppointments: appointments.filter(apt => 
              new Date(apt.date).toDateString() === new Date().toDateString()
            ).length,
            pendingAppointments: appointments.filter(apt => apt.status === 'Pending').length,
            totalDoctors: new Set(appointments.map(apt => apt.doctorId?._id)).size
          };
        }
        
        if (results[2].status === 'fulfilled') {
          leaveRequests = []; // Placeholder for leave requests
        }
      }

      // Get notifications (last element in promises array)
      const notifIndex = promises.length - 1;
      if (results[notifIndex].status === 'fulfilled') {
        notifications = results[notifIndex].value?.slice(0, 5) || [];
      }

      setDashboardData({
        stats,
        recentAppointments,
        notifications,
        upcomingShifts,
        leaveRequests
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'status-completed';
      case 'confirmed': return 'status-confirmed';
      case 'pending': return 'status-pending';
      case 'cancelled': return 'status-cancelled';
      default: return 'status-default';
    }
  };

  if (loading) {
    return (
      <div className="enhanced-dashboard loading-state">
        <div className="loading-spinner">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="enhanced-dashboard">
      {/* Welcome Section */}
      <div className="welcome-section">
        <div className="welcome-content">
          <h1>{getGreeting()}, {user?.firstname}!</h1>
          <p>Welcome to your {user?.role} dashboard</p>
        </div>
        <div className="current-date">
          <FaCalendarAlt />
          <span>{new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</span>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-section">
        <div className="stats-grid">
          {user?.role === 'Doctor' && (
            <>
              <div className="stat-card">
                <div className="stat-icon">
                  <FaClipboardList />
                </div>
                <div className="stat-content">
                  <h3>{dashboardData.stats.totalAppointments || 0}</h3>
                  <p>Total Appointments</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <FaClock />
                </div>
                <div className="stat-content">
                  <h3>{dashboardData.stats.todayAppointments || 0}</h3>
                  <p>Today's Appointments</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <FaBell />
                </div>
                <div className="stat-content">
                  <h3>{dashboardData.stats.pendingAppointments || 0}</h3>
                  <p>Pending Appointments</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <FaFileMedical />
                </div>
                <div className="stat-content">
                  <h3>{dashboardData.stats.completedAppointments || 0}</h3>
                  <p>Completed Appointments</p>
                </div>
              </div>
            </>
          )}

          {user?.role === 'Patient' && (
            <>
              <div className="stat-card">
                <div className="stat-icon">
                  <FaClipboardList />
                </div>
                <div className="stat-content">
                  <h3>{dashboardData.stats.totalAppointments || 0}</h3>
                  <p>Total Appointments</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <FaClock />
                </div>
                <div className="stat-content">
                  <h3>{dashboardData.stats.upcomingAppointments || 0}</h3>
                  <p>Upcoming Appointments</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <FaFileMedical />
                </div>
                <div className="stat-content">
                  <h3>{dashboardData.stats.completedAppointments || 0}</h3>
                  <p>Completed Appointments</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <FaBell />
                </div>
                <div className="stat-content">
                  <h3>{dashboardData.stats.cancelledAppointments || 0}</h3>
                  <p>Cancelled Appointments</p>
                </div>
              </div>
            </>
          )}

          {user?.role === 'Admin' && (
            <>
              <div className="stat-card">
                <div className="stat-icon">
                  <FaClipboardList />
                </div>
                <div className="stat-content">
                  <h3>{dashboardData.stats.totalAppointments || 0}</h3>
                  <p>Total Appointments</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <FaUserMd />
                </div>
                <div className="stat-content">
                  <h3>{dashboardData.stats.totalDoctors || 0}</h3>
                  <p>Active Doctors</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <FaClock />
                </div>
                <div className="stat-content">
                  <h3>{dashboardData.stats.todayAppointments || 0}</h3>
                  <p>Today's Appointments</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <FaBell />
                </div>
                <div className="stat-content">
                  <h3>{dashboardData.leaveRequests.length || 0}</h3>
                  <p>Pending Leave Requests</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Recent Appointments */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>
              <FaClipboardList />
              Recent Appointments
            </h3>
          </div>
          <div className="card-content">
            {dashboardData.recentAppointments.length === 0 ? (
              <p className="empty-message">No appointments found</p>
            ) : (
              <div className="appointments-list">
                {dashboardData.recentAppointments.map(appointment => (
                  <div key={appointment._id} className="appointment-item">
                    <div className="appointment-info">
                      <div className="patient-name">
                        {user?.role === 'Doctor' ? 
                          `${appointment.userId?.firstname} ${appointment.userId?.lastname}` :
                          user?.role === 'Patient' ?
                          `Dr. ${appointment.doctorId?.firstname} ${appointment.doctorId?.lastname}` :
                          `${appointment.userId?.firstname} ${appointment.userId?.lastname} - Dr. ${appointment.doctorId?.firstname} ${appointment.doctorId?.lastname}`
                        }
                      </div>
                      <div className="appointment-date">
                        {formatDate(appointment.date)} at {appointment.time}
                      </div>
                    </div>
                    <div className={`status-badge ${getStatusBadgeClass(appointment.status)}`}>
                      {appointment.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>
              <FaBell />
              Recent Notifications
            </h3>
          </div>
          <div className="card-content">
            {dashboardData.notifications.length === 0 ? (
              <p className="empty-message">No notifications</p>
            ) : (
              <div className="notifications-list">
                {dashboardData.notifications.map(notification => (
                  <div key={notification._id} className="notification-item">
                    <div className="notification-content">
                      {notification.content}
                    </div>
                    <div className="notification-time">
                      {new Date(notification.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Doctor-specific: Upcoming Shifts */}
        {user?.role === 'Doctor' && (
          <div className="dashboard-card">
            <div className="card-header">
              <h3>
                <FaClock />
                Your Shifts
              </h3>
            </div>
            <div className="card-content">
              {dashboardData.upcomingShifts.length === 0 ? (
                <p className="empty-message">No shifts configured</p>
              ) : (
                <div className="shifts-list">
                  {dashboardData.upcomingShifts.map(shift => (
                    <div key={shift._id} className="shift-item">
                      <div className="shift-info">
                        <div className="shift-title">{shift.title}</div>
                        <div className="shift-time">
                          {shift.startTime} - {shift.endTime}
                        </div>
                        <div className="shift-days">
                          {shift.daysOfWeek.join(', ')}
                        </div>
                      </div>
                      <div className="shift-department">
                        {shift.department}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Admin-specific: Pending Leave Requests */}
        {user?.role === 'Admin' && dashboardData.leaveRequests.length > 0 && (
          <div className="dashboard-card">
            <div className="card-header">
              <h3>
                <FaUsers />
                Pending Leave Requests
              </h3>
            </div>
            <div className="card-content">
              <div className="leave-requests-list">
                {dashboardData.leaveRequests.map(request => (
                  <div key={request._id} className="leave-request-item">
                    <div className="request-info">
                      <div className="staff-name">
                        {request.staffId?.firstname} {request.staffId?.lastname}
                      </div>
                      <div className="leave-details">
                        {request.leaveType} - {formatDate(request.startDate)} to {formatDate(request.endDate)}
                      </div>
                    </div>
                    <div className="status-badge status-pending">
                      Pending
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>
              <FaChartLine />
              Quick Actions
            </h3>
          </div>
          <div className="card-content">
            <div className="quick-actions">
              {user?.role === 'Doctor' && (
                <>
                  <button className="action-btn">
                    <FaClipboardList />
                    View Today's Appointments
                  </button>
                  <button className="action-btn">
                    <FaClock />
                    Manage Shifts
                  </button>
                  <button className="action-btn">
                    <FaFileMedical />
                    Medical Records
                  </button>
                </>
              )}
              
              {user?.role === 'Patient' && (
                <>
                  <button className="action-btn">
                    <FaUserMd />
                    Find Doctors
                  </button>
                  <button className="action-btn">
                    <FaCalendarAlt />
                    Book Appointment
                  </button>
                  <button className="action-btn">
                    <FaFileMedical />
                    My Medical Records
                  </button>
                </>
              )}
              
              {user?.role === 'Admin' && (
                <>
                  <button className="action-btn">
                    <FaUsers />
                    Manage Users
                  </button>
                  <button className="action-btn">
                    <FaUserMd />
                    Doctor Applications
                  </button>
                  <button className="action-btn">
                    <FaChartLine />
                    System Analytics
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedDashboard;
