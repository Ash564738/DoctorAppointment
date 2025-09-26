import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  FaCalendarAlt, 
  FaUsers, 
  FaClock, 
  FaStar,
  FaVideo, 
  FaComments
} from 'react-icons/fa';
import NavbarWrapper from '../../../components/Common/NavbarWrapper/NavbarWrapper';
import Footer from '../../../components/Common/Footer/Footer';
import { apiCall } from '../../../helper/apiCall';


import './DoctorDashboard.css';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

const DoctorDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [activeTab, setActiveTab] = useState('appointments');

  const { userInfo } = useSelector(state => state.root);
  const [stats, setStats] = useState({
    totalAppointments: 0,
    todayAppointments: 0,
    pendingAppointments: 0,
    totalPatients: 0,
    monthlyEarnings: 0,
    averageRating: 0,
    totalPrescriptions: 0,
    activeVideoSessions: 0
  });
  // Analytics-specific state
  const [completionRate, setCompletionRate] = useState(0);
  const [cancellationRate, setCancellationRate] = useState(0);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [statusDistribution, setStatusDistribution] = useState([]);
  const [timeSlotPopularity, setTimeSlotPopularity] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const statsRes = await apiCall.get('/doctor/analytics');
        const analytics = statsRes?.analytics || {};
        setStats({
          totalAppointments: analytics.totalAppointments || 0,
          todayAppointments: analytics.todayAppointments || 0,
          pendingAppointments: analytics.pendingAppointments || 0,
          totalPatients: analytics.totalPatients || 0,
          monthlyEarnings: analytics.monthlyEarnings || 0,
          averageRating: analytics.averageRating || 0,
          totalPrescriptions: analytics.totalPrescriptions || 0,
          activeVideoSessions: analytics.activeVideoSessions || 0
        });
        setCompletionRate(analytics.completionRate || 0);
        setCancellationRate(analytics.cancellationRate || 0);
        setMonthlyTrend(analytics.monthlyTrend || []);
        // Convert statusDistribution object to array for PieChart
        setStatusDistribution(
          analytics.statusDistribution
            ? Object.entries(analytics.statusDistribution).map(([status, value]) => ({ name: status, value }))
            : []
        );
        setTimeSlotPopularity(analytics.timeSlotPopularity || []);

        const appointmentsRes = await apiCall.get('/appointment/doctor-appointments');
        setUpcomingAppointments(
          (appointmentsRes.appointments || []).map(a => ({
            id: a._id,
            time: a.time,
            patientName: a.userId ? `${a.userId.firstname} ${a.userId.lastname}` : 'Unknown',
            symptoms: a.symptoms
          }))
        );

        const activityRes = await apiCall.get('/doctor/recent-activity');
        setRecentActivity(activityRes.activities || []);
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const renderStats = () => (
    <>
      <div className="doctorDashboard_statsSection">
        <h3 className="doctorDashboard_sectionTitle">Key Statistics</h3>
        <div className="doctorDashboard_stats">
          <div className="doctorDashboard_statCard doctorDashboard_statCard--primary">
            <div className="doctorDashboard_statIcon">
              <FaCalendarAlt />
            </div>
            <div className="doctorDashboard_statContent">
              <h3 className="doctorDashboard_statNumber">{stats.totalAppointments}</h3>
              <p className="doctorDashboard_statLabel">Total Appointments</p>
            </div>
          </div>
          <div className="doctorDashboard_statCard doctorDashboard_statCard--success">
            <div className="doctorDashboard_statIcon">
              <FaUsers />
            </div>
            <div className="doctorDashboard_statContent">
              <h3 className="doctorDashboard_statNumber">{stats.totalPatients}</h3>
              <p className="doctorDashboard_statLabel">Total Patients</p>
            </div>
          </div>
          <div className="doctorDashboard_statCard doctorDashboard_statCard--warning">
            <div className="doctorDashboard_statIcon">
              <FaClock />
            </div>
            <div className="doctorDashboard_statContent">
              <h3 className="doctorDashboard_statNumber">{stats.todayAppointments}</h3>
              <p className="doctorDashboard_statLabel">Today's Appointments</p>
            </div>
          </div>
          <div className="doctorDashboard_statCard doctorDashboard_statCard--info">
            <div className="doctorDashboard_statIcon">
              <FaStar />
            </div>
            <div className="doctorDashboard_statContent">
              <h3 className="doctorDashboard_statNumber">{stats.averageRating.toFixed(1)}</h3>
              <p className="doctorDashboard_statLabel">Average Rating</p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Section */}
      <div className="doctorDashboard_performanceSection">
        <h3 className="doctorDashboard_sectionTitle">Performance Overview</h3>
        <div className="doctorDashboard_progressGrid">
          <div className="doctorDashboard_progressCard">
            <div className="doctorDashboard_progressHeader">
              <h4 className="doctorDashboard_progressTitle">Completion Rate</h4>
              <span className={`doctorDashboard_progressValue ${completionRate >= 80 ? 'doctorDashboard_progressValue--success' : 'doctorDashboard_progressValue--warning'}`}>{completionRate}%</span>
            </div>
            <div className="doctorDashboard_progressBarContainer" style={{ '--progress-width': `${completionRate}%` }}>
              <div className={`doctorDashboard_progressBar ${completionRate >= 80 ? 'doctorDashboard_progressBar--success' : 'doctorDashboard_progressBar--warning'}`}></div>
            </div>
            <p className="doctorDashboard_progressDescription">
              {completionRate >= 80 ? 'Excellent completion rate!' : 'Room for improvement'}
            </p>
          </div>
          <div className="doctorDashboard_progressCard">
            <div className="doctorDashboard_progressHeader">
              <h4 className="doctorDashboard_progressTitle">Cancellation Rate</h4>
              <span className={`doctorDashboard_progressValue ${cancellationRate <= 20 ? 'doctorDashboard_progressValue--success' : 'doctorDashboard_progressValue--danger'}`}>{cancellationRate}%</span>
            </div>
            <div className="doctorDashboard_progressBarContainer" style={{ '--progress-width': `${cancellationRate}%` }}>
              <div className={`doctorDashboard_progressBar ${cancellationRate <= 20 ? 'doctorDashboard_progressBar--success' : 'doctorDashboard_progressBar--danger'}`}></div>
            </div>
            <p className="doctorDashboard_progressDescription">
              {cancellationRate <= 20 ? 'Low cancellation rate' : 'High cancellation rate'}
            </p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="doctorDashboard_chartsSection">
        <h3 className="doctorDashboard_sectionTitle">Analytics Charts</h3>
        <div className="doctorDashboard_chartsGrid">
          <div className="doctorDashboard_chartCard">
            <div className="doctorDashboard_chartHeader">
              <h4 className="doctorDashboard_chartTitle">Monthly Appointment Trend</h4>
            </div>
            <div className="doctorDashboard_chartContainer">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="appointments" stroke="var(--primary-color)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="doctorDashboard_chartCard">
            <div className="doctorDashboard_chartHeader">
              <h4 className="doctorDashboard_chartTitle">Appointment Status Distribution</h4>
            </div>
            <div className="doctorDashboard_chartContainer">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {statusDistribution.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={['var(--primary-color)', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'][idx % 5]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="doctorDashboard_fullWidthChart">
          <div className="doctorDashboard_chartCard">
            <div className="doctorDashboard_chartHeader">
              <h4 className="doctorDashboard_chartTitle">Time Slot Popularity</h4>
            </div>
            <div className="doctorDashboard_chartContainer">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={timeSlotPopularity} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#4bc0c0" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // Only two tabs now: Appointments and Recent Activity
  const renderTabContent = () => {
    switch (activeTab) {
      case 'appointments':
        return (
          <div className="doctorDashboard_appointments">
            <h3>Today's Appointments</h3>
            {upcomingAppointments.length > 0 ? (
              <div className="doctorDashboard_appointmentList">
                {upcomingAppointments.map(appointment => (
                  <div key={appointment.id} className="doctorDashboard_appointmentItem">
                    <div className="doctorDashboard_appointmentTime">
                      {appointment.time}
                    </div>
                    <div className="doctorDashboard_appointmentInfo">
                      <h4>{appointment.patientName}</h4>
                      <p>{appointment.symptoms || 'General consultation'}</p>
                    </div>
                    <div className="doctorDashboard_appointmentActions">
                      <button className="doctorDashboard_actionBtn doctorDashboard_actionBtn--video">
                        <FaVideo />
                        Join Video
                      </button>
                      <button className="doctorDashboard_actionBtn doctorDashboard_actionBtn--chat">
                        <FaComments />
                        Chat
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="doctorDashboard_emptyState">
                <p>No appointments scheduled for today</p>
              </div>
            )}
          </div>
        );
      case 'activity':
        return (
          <div className="doctorDashboard_activity">
            <h3>Recent Activity</h3>
            <div className="doctorDashboard_activityList">
              {recentActivity.map(activity => (
                <div key={activity.id} className="doctorDashboard_activityItem">
                  <div className="doctorDashboard_activityIcon">
                    {activity.icon}
                  </div>
                  <div className="doctorDashboard_activityInfo">
                    <p>{activity.message}</p>
                    <span className="doctorDashboard_activityTime">{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="doctorDashboard_page">
      <NavbarWrapper />
      <div className="doctorDashboard_container">
        <div className="doctorDashboard_header">
          <div className="doctorDashboard_welcome">
            <h1>Welcome back, Dr. {userInfo?.firstname}!</h1>
            <p>Here's your practice overview for today</p>
          </div>
          <div className="doctorDashboard_headerStats">
            <div className="doctorDashboard_headerStat">
              <span className="doctorDashboard_headerStatValue">{stats.todayAppointments}</span>
              <span className="doctorDashboard_headerStatLabel">Today's Appointments</span>
            </div>
            <div className="doctorDashboard_headerStat">
              <span className="doctorDashboard_headerStatValue">${stats.monthlyEarnings}</span>
              <span className="doctorDashboard_headerStatLabel">Monthly Earnings</span>
            </div>
          </div>
        </div>

        {renderStats()}

        <div className="doctorDashboard_mainContent">
          <div className="doctorDashboard_tabs">
            <button
              className={`doctorDashboard_tab ${activeTab === 'appointments' ? 'doctorDashboard_tab--active' : ''}`}
              onClick={() => setActiveTab('appointments')}
            >
              Appointments
            </button>
            <button
              className={`doctorDashboard_tab ${activeTab === 'activity' ? 'doctorDashboard_tab--active' : ''}`}
              onClick={() => setActiveTab('activity')}
            >
              Recent Activity
            </button>
          </div>
          <div className="doctorDashboard_tabContent">
            {loading ? (
              <div className="doctorDashboard_loading">Loading dashboard data...</div>
            ) : (
              renderTabContent()
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default DoctorDashboard;