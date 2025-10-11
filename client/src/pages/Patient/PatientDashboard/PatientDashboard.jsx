import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { FaUserMd, FaStar, FaUsers,FaChartBar,FaClock,FaCheckCircle,FaFileMedical} from 'react-icons/fa';
import NavbarWrapper from '../../../components/Common/NavbarWrapper/NavbarWrapper';
import Footer from '../../../components/Common/Footer/Footer';
import { apiCall } from '../../../helper/apiCall';
import './PatientDashboard.css';
import PageHeader from '../../../components/Common/PageHeader/PageHeader';
function PatientDashboard() {
  const navigate = useNavigate();
  const { userInfo } = useSelector(state => state.root);
  const [stats, setStats] = useState({
    totalAppointments: 0,
    upcomingAppointments: 0,
    completedAppointments: 0,
    totalDoctors: 0
  });
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [medicalRecordCount, setMedicalRecordCount] = useState(0);
  const [familyCount, setFamilyCount] = useState(0);
  const [ratingsCount, setRatingsCount] = useState(0);
  useEffect(() => {
    const fetchPatientStats = async () => {
      try {
        const appointmentsData = await apiCall.get('/appointment/patient-stats');
        const doctorsData = await apiCall.get('/doctor/getalldoctors');
        setStats({
          totalAppointments: appointmentsData.totalAppointments || 0,
          upcomingAppointments: appointmentsData.upcomingAppointments || 0,
          completedAppointments: appointmentsData.completedAppointments || 0,
          totalDoctors: doctorsData.length || 0
        });
        setRecentAppointments(appointmentsData.recentAppointments || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching patient stats:', error);
        setLoading(false);
      }
    };
    const fetchCounts = async () => {
      try {
        const medicalRecordsData = await apiCall.get('/medical-record/patient');
        if (medicalRecordsData && medicalRecordsData.medicalRecords) {
          setMedicalRecordCount(medicalRecordsData.medicalRecords.length);
        }
        // Use correct family members endpoint and response shape
        const familyResp = await apiCall.get('/family-members');
        const familyMembers = familyResp?.data?.familyMembers;
        if (Array.isArray(familyMembers)) {
          setFamilyCount(familyMembers.length);
        } else if (Array.isArray(familyResp)) {
          // Fallback in case API returns a list directly
          setFamilyCount(familyResp.length);
        }
        const ratingsData = await apiCall.get('/ratings/my-ratings');
        if (ratingsData && ratingsData.data && Array.isArray(ratingsData.data.ratings)) {
          setRatingsCount(ratingsData.data.ratings.length);
        }
      } catch (error) {
        console.error('Error fetching counts:', error);
      }
    };
    if (userInfo) {
      fetchPatientStats();
      fetchCounts();
    }
  }, [userInfo]);
  const now = new Date();
  const nextAppointment = recentAppointments
    .filter(a => a.status && a.status.toLowerCase() === 'confirmed' && new Date(a.date) >= now)
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  const doctorVisitCounts = {};
  recentAppointments.forEach(a => {
    const docId = a.doctorId?._id || a.doctorId?.id;
    if (docId) {
      doctorVisitCounts[docId] = (doctorVisitCounts[docId] || 0) + 1;
    }
  });
  const statCards = [
    {
      label: 'Total Appointments',
      value: stats.totalAppointments,
      icon: <FaChartBar />,
      color: '#3b82f6',
      path: '/patient/appointments'
    },
    {
      label: 'Upcoming',
      value: stats.upcomingAppointments,
      icon: <FaClock />,
      color: '#10b981',
      path: '/patient/appointments'
    },
    {
      label: 'Completed',
      value: stats.completedAppointments,
      icon: <FaCheckCircle />,
      color: '#ff9900ff',
      path: '/patient/appointments'
    },
    {
      label: 'Available Doctors',
      value: stats.totalDoctors,
      icon: <FaUserMd />,
      color: '#8b5cf6',
      path: '/patient/book'
    },
    {
      label: 'Medical Records',
      value: medicalRecordCount,
      icon: <FaFileMedical />,
      color: '#ec4899',
      path: '/patient/medical-records'
    },
    {
      label: 'Family Profiles',
      value: familyCount,
      icon: <FaUsers />,
      color: '#06b6d4',
      path: '/patient/family'
    },
    {
      label: 'Ratings',
      value: ratingsCount,
      icon: <FaStar />,
      color: '#fbbf24',
      path: '/patient/ratings'
    }
  ];
  return (
    <div className="patientDashboard_page">
      <NavbarWrapper />
        <div className="patientDashboard_container">
          {!userInfo && (
            <div className="patientDashboard_loginWarning">
              <p>Not logged in. Please <Link to="/login" className="patientDashboard_loginLink">login</Link> to access full features.</p>
            </div>
          )}
          <PageHeader
            title={`Welcome back, ${userInfo?.firstname || 'Guest'}!`}
            subtitle="Manage your health and appointments"
            className="patientDashboard_header"
          />
          <div className="patientDashboard_stats">
            {statCards.map((card, idx) => (
              <div
                key={idx}
                className="patientDashboard_statCard"
                style={{ borderLeftColor: card.color, cursor: 'pointer' }}
                onClick={() => navigate(card.path)}
              >
                <div
                  className="patientDashboard_statIcon"
                  style={{
                    backgroundColor: card.color,
                  }}
                >
                  {card.icon}
                </div>
                <div className="patientDashboard_statContent">
                  <h3 className="patientDashboard_statNumber">{card.value}</h3>
                  <p className="patientDashboard_statLabel">{card.label}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="patientDashboard_nextAppointment">
            <h2 className="patientDashboard_sectionTitle">Your Next Appointment</h2>
            {nextAppointment ? (
              <div className="patientDashboard_nextAppointmentCard">
                <div>
                  <h4 className="patientDashboard_appointmentDoctor">
                    Dr. {nextAppointment.doctorId?.firstname} {nextAppointment.doctorId?.lastname}
                  </h4>
                  <p className="patientDashboard_appointmentDate">
                    {new Date(nextAppointment.date).toLocaleDateString()} at {nextAppointment.time}
                  </p>
                  <span className={`patientDashboard_appointmentStatus patientDashboard_appointmentStatus--${nextAppointment.status?.toLowerCase?.() || 'unknown'}`}>
                    {nextAppointment.status || 'Unknown'}
                  </span>
                </div>
                <button
                  className="patientDashboard_ctaButton"
                  onClick={() => navigate('/patient/appointments')}
                >
                  View All Appointments
                </button>
              </div>
            ) : (
              <div className="patientDashboard_emptyState">
                <p>No upcoming appointments scheduled.</p>
                <button
                  className="patientDashboard_ctaButton"
                  onClick={() => navigate('/patient/book')}
                >
                  Book Appointment
                </button>
              </div>
            )}
          </div>
          <div className="patientDashboard_recent">
            <h2 className="patientDashboard_sectionTitle">Recent Appointments</h2>
            {recentAppointments.length > 0 ? (
              <div className="patientDashboard_appointmentList">
                {recentAppointments.slice(0, 3).map((appointment, index) => (
                  <div key={index} className="patientDashboard_appointmentCard">
                    <div className="patientDashboard_appointmentInfo">
                      <h4 className="patientDashboard_appointmentDoctor">
                        Dr. {appointment.doctorId?.firstname} {appointment.doctorId?.lastname}
                      </h4>
                      <p className="patientDashboard_appointmentDate">
                        {new Date(appointment.date).toLocaleDateString()} at {appointment.time}
                      </p>
                      <span className={`patientDashboard_appointmentStatus patientDashboard_appointmentStatus--${appointment.status?.toLowerCase?.() || 'unknown'}`}>
                        {appointment.status || 'Unknown'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="patientDashboard_emptyState">
                <p>No recent appointments found.</p>
                <button 
                  className="patientDashboard_ctaButton"
                  onClick={() => navigate('/patient/book')}
                >
                  Book Your First Appointment
                </button>
              </div>
            )}
          </div>
        </div>
      <Footer />
    </div>
  );
}

export default PatientDashboard;