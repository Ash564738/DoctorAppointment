import React, { useState, useEffect } from 'react';
import { CalendarOutlined, TeamOutlined, ClockCircleOutlined, DollarOutlined, TrophyOutlined } from '../../../components/Common/Icons/Icons';
import NavbarWrapper from '../../../components/Common/NavbarWrapper/NavbarWrapper';
import Footer from '../../../components/Common/Footer/Footer';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import './DoctorAnalytics.css';
import { apiCall } from '../../../helper/apiCall';

const DoctorAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState({
    stats: {
      totalAppointments: 0,
      completedAppointments: 0,
      cancelledAppointments: 0,
      totalRevenue: 0,
      avgRating: 0,
      totalPatients: 0
    },
    monthlyTrend: [],
    statusDistribution: [],
    timeSlotPopularity: [],
    patientDemographics: [],
    recentAppointments: []
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await apiCall.get('/doctor/analytics/dashboard');
      
      if (response && response.success) {
        setAnalyticsData(response.data);
      } else {
        // Set default data if no backend data available
        setAnalyticsData({
          stats: {
            totalAppointments: 0,
            completedAppointments: 0,
            cancelledAppointments: 0,
            totalRevenue: 0,
            avgRating: 0,
            totalPatients: 0
          },
          monthlyTrend: [],
          statusDistribution: [],
          timeSlotPopularity: [],
          patientDemographics: [],
          recentAppointments: []
        });
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Set default data on error
      setAnalyticsData({
        stats: {
          totalAppointments: 0,
          completedAppointments: 0,
          cancelledAppointments: 0,
          totalRevenue: 0,
          avgRating: 0,
          totalPatients: 0
        },
        monthlyTrend: [],
        statusDistribution: [],
        timeSlotPopularity: [],
        patientDemographics: [],
        recentAppointments: []
      });
    } finally {
      setLoading(false);
    }
  };

  const completionRate = analyticsData.stats.totalAppointments > 0 
    ? Math.round((analyticsData.stats.completedAppointments / analyticsData.stats.totalAppointments) * 100)
    : 0;

  const cancellationRate = analyticsData.stats.totalAppointments > 0 
    ? Math.round((analyticsData.stats.cancelledAppointments / analyticsData.stats.totalAppointments) * 100)
    : 0;

  return (
    <div className="doctorAnalytics_page">
      <NavbarWrapper />
        <div className="doctorAnalytics_container">
          <div className="doctorAnalytics_header">
            <h2 className="doctorAnalytics_title">Doctor Analytics Dashboard</h2>
            <p className="doctorAnalytics_subtitle">Comprehensive overview of your practice performance</p>
            <div className="doctorAnalytics_dateRange">
              <span className="doctorAnalytics_dateLabel">Date Range: Last 30 days</span>
            </div>
          </div>

          {loading ? (
            <div className="doctorAnalytics_loading">
              <div className="doctorAnalytics_spinner"></div>
              <p className="doctorAnalytics_loadingText">Loading analytics data...</p>
            </div>
          ) : (
            <>
              {/* Key Statistics */}
              <div className="doctorAnalytics_statsSection">
                <h3 className="doctorAnalytics_sectionTitle">Key Performance Metrics</h3>
                <div className="doctorAnalytics_statsGrid">
                  <div className="doctorAnalytics_statCard">
                    <div className="doctorAnalytics_statIcon doctorAnalytics_statIcon--blue">
                      <CalendarOutlined />
                    </div>
                    <div className="doctorAnalytics_statContent">
                      <h4 className="doctorAnalytics_statValue">{analyticsData.stats.totalAppointments}</h4>
                      <p className="doctorAnalytics_statLabel">Total Appointments</p>
                    </div>
                  </div>

                  <div className="doctorAnalytics_statCard">
                    <div className="doctorAnalytics_statIcon doctorAnalytics_statIcon--green">
                      <ClockCircleOutlined />
                    </div>
                    <div className="doctorAnalytics_statContent">
                      <h4 className="doctorAnalytics_statValue">{analyticsData.stats.completedAppointments}</h4>
                      <p className="doctorAnalytics_statLabel">Completed</p>
                    </div>
                  </div>

                  <div className="doctorAnalytics_statCard">
                    <div className="doctorAnalytics_statIcon doctorAnalytics_statIcon--purple">
                      <TeamOutlined />
                    </div>
                    <div className="doctorAnalytics_statContent">
                      <h4 className="doctorAnalytics_statValue">{analyticsData.stats.totalPatients}</h4>
                      <p className="doctorAnalytics_statLabel">Total Patients</p>
                    </div>
                  </div>

                  <div className="doctorAnalytics_statCard">
                    <div className="doctorAnalytics_statIcon doctorAnalytics_statIcon--orange">
                      <DollarOutlined />
                    </div>
                    <div className="doctorAnalytics_statContent">
                      <h4 className="doctorAnalytics_statValue">${analyticsData.stats.totalRevenue.toFixed(2)}</h4>
                      <p className="doctorAnalytics_statLabel">Revenue</p>
                    </div>
                  </div>

                  <div className="doctorAnalytics_statCard">
                    <div className="doctorAnalytics_statIcon doctorAnalytics_statIcon--pink">
                      <TrophyOutlined />
                    </div>
                    <div className="doctorAnalytics_statContent">
                      <h4 className="doctorAnalytics_statValue">{analyticsData.stats.avgRating.toFixed(1)}/5</h4>
                      <p className="doctorAnalytics_statLabel">Avg Rating</p>
                    </div>
                  </div>

                  <div className="doctorAnalytics_statCard">
                    <div className={`doctorAnalytics_statIcon ${completionRate >= 80 ? 'doctorAnalytics_statIcon--green' : 'doctorAnalytics_statIcon--red'}`}>
                      <ClockCircleOutlined />
                    </div>
                    <div className="doctorAnalytics_statContent">
                      <h4 className="doctorAnalytics_statValue">{completionRate}%</h4>
                      <p className="doctorAnalytics_statLabel">Completion Rate</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="doctorAnalytics_performanceSection">
                <h3 className="doctorAnalytics_sectionTitle">Performance Analysis</h3>
                <div className="doctorAnalytics_progressGrid">
                  <div className="doctorAnalytics_progressCard">
                    <div className="doctorAnalytics_progressHeader">
                      <h4 className="doctorAnalytics_progressTitle">Completion Rate</h4>
                      <span className={`doctorAnalytics_progressValue ${completionRate >= 80 ? 'doctorAnalytics_progressValue--success' : 'doctorAnalytics_progressValue--warning'}`}>
                        {completionRate}%
                      </span>
                    </div>
                    <div className="doctorAnalytics_progressBarContainer">
                      <div 
                        className={`doctorAnalytics_progressBar ${completionRate >= 80 ? 'doctorAnalytics_progressBar--success' : 'doctorAnalytics_progressBar--warning'}`}
                        style={{ width: `${completionRate}%` }}
                      ></div>
                    </div>
                    <p className="doctorAnalytics_progressDescription">
                      {completionRate >= 80 ? 'Excellent completion rate!' : 'Room for improvement'}
                    </p>
                  </div>

                  <div className="doctorAnalytics_progressCard">
                    <div className="doctorAnalytics_progressHeader">
                      <h4 className="doctorAnalytics_progressTitle">Cancellation Rate</h4>
                      <span className={`doctorAnalytics_progressValue ${cancellationRate <= 20 ? 'doctorAnalytics_progressValue--success' : 'doctorAnalytics_progressValue--danger'}`}>
                        {cancellationRate}%
                      </span>
                    </div>
                    <div className="doctorAnalytics_progressBarContainer">
                      <div 
                        className={`doctorAnalytics_progressBar ${cancellationRate <= 20 ? 'doctorAnalytics_progressBar--success' : 'doctorAnalytics_progressBar--danger'}`}
                        style={{ width: `${cancellationRate}%` }}
                      ></div>
                    </div>
                    <p className="doctorAnalytics_progressDescription">
                      {cancellationRate <= 20 ? 'Low cancellation rate' : 'High cancellation rate'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="doctorAnalytics_chartsSection">
                <h3 className="doctorAnalytics_sectionTitle">Analytics Charts</h3>
                <div className="doctorAnalytics_chartsGrid">
                  <div className="doctorAnalytics_chartCard">
                    <div className="doctorAnalytics_chartHeader">
                      <h4 className="doctorAnalytics_chartTitle">Monthly Appointment Trend</h4>
                    </div>
                    <div className="doctorAnalytics_chartContainer">
                      <div className="doctorAnalytics_chartPlaceholder">
                        <div className="doctorAnalytics_chartIcon">📈</div>
                        <p className="doctorAnalytics_chartText">Monthly trend chart will be displayed here</p>
                        <small className="doctorAnalytics_chartSubtext">Integration with charting library in progress</small>
                      </div>
                    </div>
                  </div>

                  <div className="doctorAnalytics_chartCard">
                    <div className="doctorAnalytics_chartHeader">
                      <h4 className="doctorAnalytics_chartTitle">Appointment Status Distribution</h4>
                    </div>
                    <div className="doctorAnalytics_chartContainer">
                      <div className="doctorAnalytics_chartPlaceholder">
                        <div className="doctorAnalytics_chartIcon">🥧</div>
                        <p className="doctorAnalytics_chartText">Status distribution chart will be displayed here</p>
                        <small className="doctorAnalytics_chartSubtext">Pie chart showing appointment statuses</small>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="doctorAnalytics_fullWidthChart">
                  <div className="doctorAnalytics_chartCard">
                    <div className="doctorAnalytics_chartHeader">
                      <h4 className="doctorAnalytics_chartTitle">Time Slot Popularity</h4>
                    </div>
                    <div className="doctorAnalytics_chartContainer">
                      <div className="doctorAnalytics_chartPlaceholder">
                        <div className="doctorAnalytics_chartIcon">📊</div>
                        <p className="doctorAnalytics_chartText">Time slot popularity chart will be displayed here</p>
                        <small className="doctorAnalytics_chartSubtext">Bar chart showing preferred appointment times</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        <Footer/>
      </div>
  );
};

export default DoctorAnalytics;
