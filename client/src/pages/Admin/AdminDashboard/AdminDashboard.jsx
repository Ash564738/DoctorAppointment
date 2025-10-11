import React, { useEffect, useState, useCallback } from "react";
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  FaUsers, 
  FaUserMd, 
  FaCalendarAlt, 
  FaDollarSign, 
  FaClock, 
  FaCheckCircle,
  FaTimesCircle
} from 'react-icons/fa';
import {
  LineChart, Line as ReLine, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import "./AdminDashboard.css";
import NavbarWrapper from "../../../components/Common/NavbarWrapper/NavbarWrapper";
import Footer from "../../../components/Common/Footer/Footer";
import { apiCall } from "../../../helper/apiCall";
import PageHeader from "../../../components/Common/PageHeader/PageHeader";

const AdminDashboard = () => {
  const { userInfo } = useSelector(state => state.root);
  const [adminDetails, setAdminDetails] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAdminDetails();
  }, []);

  const fetchAdminDetails = async () => {
    try {
      if (userInfo?.userId) {
        const response = await apiCall.get(`/user/getuser/${userInfo.userId}`);
        if (response && response.firstname) {
          setAdminDetails(response);
        }
      }
    } catch (error) {
      console.error('Error fetching admin details:', error);
    }
  };

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiCall.get(`/admin/analytics/dashboard?period=${period}`);
      if (response?.success) {
        setAnalytics(response.data);
      } else {
        setError(response?.message || 'Failed to fetch analytics');
      }
    } catch (err) {
      setError('Failed to fetch analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Main statistics cards
  const getAnalyticsCards = () => {
    if (!analytics?.overview) return [];
    return [
      {
        title: 'Total Users',
        value: analytics.overview.totalUsers || 0,
        icon: <FaUsers />,
        color: 'var(--primary-color)',
        description: 'All registered users',
        change: analytics.overview.recentRegistrations ? `+${analytics.overview.recentRegistrations} this ${period === '7' ? 'week' : period === '30' ? 'month' : 'period'}` : null,
        path: '/admin/users'
      },
      {
        title: 'Total Doctors',
        value: analytics.overview.totalDoctors || 0,
        icon: <FaUserMd />,
        color: '#10b981',
        description: 'Active doctors',
        percentage: analytics.overview.totalUsers > 0 ? `${((analytics.overview.totalDoctors / analytics.overview.totalUsers) * 100).toFixed(1)}% of users` : null,
        path: '/admin/doctors'
      },
      {
        title: 'Total Patients',
        value: analytics.overview.totalPatients || 0,
        icon: <FaUsers />,
        color: '#3b82f6',
        description: 'Registered patients',
        percentage: analytics.overview.totalUsers > 0 ? `${((analytics.overview.totalPatients / analytics.overview.totalUsers) * 100).toFixed(1)}% of users` : null,
        path: '/admin/users'
      },
      {
        title: 'Total Appointments',
        value: analytics.overview.totalAppointments || 0,
        icon: <FaCalendarAlt />,
        color: '#f59e0b',
        description: 'All time appointments',
        change: analytics.overview.recentAppointments ? `${analytics.overview.recentAppointments} recent` : null,
        path: '/admin/appointments'
      },
      {
        title: 'Monthly Revenue',
        value: formatCurrency(analytics.revenueData?.[0]?.totalRevenue || 0),
        icon: <FaDollarSign />,
        color: '#8b5cf6',
        description: 'This month',
        change: null,
        path: '/admin/billing'
      }
    ];
  };

  // Appointment status stats
  const getAppointmentStats = () => {
    if (!analytics?.appointmentStats || !Array.isArray(analytics.appointmentStats)) {
      return [];
    }
    const totalAppointments = analytics?.overview?.totalAppointments || 0;
    return analytics.appointmentStats.map(stat => ({
      status: stat._id,
      count: stat.count,
      percentage: totalAppointments > 0 ? ((stat.count / totalAppointments) * 100).toFixed(1) : '0'
    }));
  };

  // Chart data generators
  const getMonthlyGrowthChartData = () => {
    if (!analytics?.monthlyGrowth || !Array.isArray(analytics.monthlyGrowth) || analytics.monthlyGrowth.length === 0) {
      return null;
    }
    const labels = analytics.monthlyGrowth
      .slice(0, 6)
      .reverse()
      .map(month => `${month._id.month}/${month._id.year}`);
    return {
      labels,
      datasets: [
        {
          label: 'Total Users',
          data: analytics.monthlyGrowth.slice(0, 6).reverse().map(month => month.userCount),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.1)',
          borderWidth: 3,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: 'rgb(75, 192, 192)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          tension: 0.4,
          fill: true,
        },
        {
          label: 'Doctors',
          data: analytics.monthlyGrowth.slice(0, 6).reverse().map(month => month.doctorCount),
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          borderWidth: 3,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: 'rgb(54, 162, 235)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          tension: 0.4,
          fill: true,
        },
        {
          label: 'Patients',
          data: analytics.monthlyGrowth.slice(0, 6).reverse().map(month => month.patientCount),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          borderWidth: 3,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: 'rgb(255, 99, 132)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          tension: 0.4,
          fill: true,
        },
      ],
    };
  };

  const getAppointmentStatusChartData = () => {
    if (!analytics?.appointmentStats || !Array.isArray(analytics.appointmentStats) || analytics.appointmentStats.length === 0) {
      return null;
    }
    const labels = analytics.appointmentStats.map(stat => 
      stat._id.charAt(0).toUpperCase() + stat._id.slice(1)
    );
    const data = analytics.appointmentStats.map(stat => stat.count);
    const colors = [
      '#FF6384',
      '#36A2EB', 
      '#FFCE56',
      '#4BC0C0',
      '#9966FF',
      '#FF9F40'
    ];
    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: colors.slice(0, labels.length),
          borderWidth: 1,
        },
      ],
    };
  };

  const getRevenueChartData = () => {
    if (!analytics?.revenueData || !Array.isArray(analytics.revenueData) || analytics.revenueData.length === 0) {
      return null;
    }
    const labels = analytics.revenueData
      .slice(0, 6)
      .reverse()
      .map(revenue => `${revenue._id.month}/${revenue._id.year}`);
    return {
      labels,
      datasets: [
        {
          label: 'Revenue ($)',
          data: analytics.revenueData.slice(0, 6).reverse().map(revenue => revenue.totalRevenue || 0),
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.1)',
          borderWidth: 3,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: 'rgba(75, 192, 192, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          tension: 0.4,
          fill: true,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: '500'
          }
        }
      },
      title: {
        display: true,
        text: 'Chart Title',
        font: {
          size: 16,
          weight: 'bold'
        },
        padding: {
          top: 10,
          bottom: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 12
        },
        cornerRadius: 8,
        displayColors: true,
        boxPadding: 6
      }
    },
    scales: {
      x: {
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)',
          lineWidth: 1
        },
        ticks: {
          font: {
            size: 11
          }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)',
          lineWidth: 1
        },
        ticks: {
          font: {
            size: 11
          }
        }
      },
    },
    elements: {
      line: {
        tension: 0.4
      }
    }
  };

  return (
    <div className="adminDashboard_page">
      <NavbarWrapper />
      <div className="adminDashboard_container">
        <PageHeader 
          title="Admin Dashboard" 
          subtitle={`Welcome back, ${adminDetails?.firstname || 'Admin'}! Here's what's happening today.`}
          className="adminDashboard_header"
        />
        <div className="adminDashboard_periodSelector">
          <label htmlFor="adminDashboard_periodSelect" className="adminDashboard_periodLabel">Analytics Period: </label>
          <select 
            id="adminDashboard_periodSelect" 
            className="adminDashboard_periodSelect"
            value={period} 
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          <button 
            className="adminDashboard_refreshButton"
            onClick={fetchAnalytics}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
        {loading ? (
          <div className="adminDashboard_loadingContainer">
            <div className="adminDashboard_spinner"></div>
            <p className="adminDashboard_loadingText">Loading dashboard...</p>
          </div>
        ) : error ? (
          <div className="adminDashboard_errorContainer">
            <p className="adminDashboard_errorText">{error}</p>
            <button className="adminDashboard_retryButton" onClick={fetchAnalytics}>Retry</button>
          </div>
        ) : (
          <>
            <div className="adminDashboard_statsGrid">
              {getAnalyticsCards().map((stat, index) => (
                <div 
                  key={index} 
                  className="adminDashboard_statCard"
                  style={{ borderLeftColor: stat.color, cursor: 'pointer' }}
                  onClick={() => stat.path && navigate(stat.path)}
                >
                  <div className="adminDashboard_statIcon" style={{ backgroundColor: stat.color }}>
                    {stat.icon}
                  </div>
                  <div className="adminDashboard_statContent">
                    <h3 className="adminDashboard_statValue">{stat.value}</h3>
                    <p className="adminDashboard_statTitle">{stat.title}</p>
                    {stat.change && <span className="adminDashboard_statChange">{stat.change}</span>}
                    {stat.percentage && <span className="adminDashboard_statChange adminDashboard_statPercentage">{stat.percentage}</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="adminDashboard_chartsSection">
              <h2 className="adminDashboard_chartsTitle">Visual Analytics</h2>
              <div className="adminDashboard_chartsGrid">

                {getMonthlyGrowthChartData() && (
                  <div className="adminDashboard_chartContainer">
                    <h3 className="adminDashboard_chartTitle">Monthly Growth Trends</h3>
                    <div className="adminDashboard_chartInner">
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={getMonthlyGrowthChartData().labels.map((label, idx) => ({
                          month: label,
                          users: getMonthlyGrowthChartData().datasets[0].data[idx],
                          doctors: getMonthlyGrowthChartData().datasets[1].data[idx],
                          patients: getMonthlyGrowthChartData().datasets[2].data[idx],
                        }))} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Legend />
                          <ReLine type="monotone" dataKey="users" stroke="#4bc0c0" strokeWidth={2} name="Total Users" />
                          <ReLine type="monotone" dataKey="doctors" stroke="#36a2eb" strokeWidth={2} name="Doctors" />
                          <ReLine type="monotone" dataKey="patients" stroke="#ff6384" strokeWidth={2} name="Patients" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}


                {getAppointmentStatusChartData() && (
                  <div className="adminDashboard_chartContainer">
                    <h3 className="adminDashboard_chartTitle">Appointment Status Distribution</h3>
                    <div className="adminDashboard_chartInner">
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={getAppointmentStatusChartData().labels.map((label, idx) => ({
                              name: label,
                              value: getAppointmentStatusChartData().datasets[0].data[idx]
                            }))}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label
                          >
                            {getAppointmentStatusChartData().labels.map((_, idx) => (
                              <Cell key={`cell-${idx}`} fill={getAppointmentStatusChartData().datasets[0].backgroundColor[idx % getAppointmentStatusChartData().datasets[0].backgroundColor.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}


                {getRevenueChartData() && (
                  <div className="adminDashboard_chartContainer">
                    <h3 className="adminDashboard_chartTitle">Revenue Analytics</h3>
                    <div className="adminDashboard_chartInner">
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={getRevenueChartData().labels.map((label, idx) => ({
                          month: label,
                          revenue: getRevenueChartData().datasets[0].data[idx]
                        }))} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Legend />
                          <ReLine type="monotone" dataKey="revenue" stroke="#4bc0c0" strokeWidth={2} name="Revenue ($)" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default AdminDashboard;