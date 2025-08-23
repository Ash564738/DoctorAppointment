// ...existing code...
import React, { useEffect, useState } from 'react';
import { apiCall } from '../../../helper/apiCall';
import NavbarWrapper from '../../../components/Common/NavbarWrapper/NavbarWrapper';
import Footer from '../../../components/Common/Footer/Footer';
import { MdErrorOutline, MdOutlineEventBusy, MdOutlineEventNote } from 'react-icons/md';
import { FaClipboardList } from 'react-icons/fa';
import './AppointmentManagement.css';
import { MdCheckCircle } from 'react-icons/md';

const rowsPerPage = 20;

const AppointmentManagement = () => {
  const [appointments, setAppointments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchAppointments = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: rowsPerPage,
      };
      if (searchTerm) params.search = searchTerm;
      const res = await apiCall.get('/appointment/getallappointments', { params });
      if (res && res.success && Array.isArray(res.appointments)) {
        setAppointments(res.appointments);
        setPagination(res.pagination || { page: 1, totalPages: 1, total: res.appointments.length });
      } else {
        setAppointments([]);
        setPagination({ page: 1, totalPages: 1, total: 0 });
      }
    } catch (err) {
      setError('Failed to fetch appointments');
      setAppointments([]);
      setPagination({ page: 1, totalPages: 1, total: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchTerm, dateFilter]);

  useEffect(() => {
    fetchAppointments(currentPage);
  }, [currentPage, searchTerm]);
  const filteredAppointments = appointments.filter(appt => {
    if (filter !== 'all' && appt.status?.toLowerCase() !== filter.toLowerCase()) {
      return false;
    }
    if (dateFilter) {
      const apptDate = new Date(appt.date).toISOString().split('T')[0];
      if (apptDate !== dateFilter) {
        return false;
      }
    }
    return true;
  });

  const getStatusStats = () => {
    return {
      total: pagination.total,
      pending: appointments.filter(a => a.status?.toLowerCase() === 'pending').length,
      confirmed: appointments.filter(a => a.status?.toLowerCase() === 'confirmed').length,
      completed: appointments.filter(a => a.status?.toLowerCase() === 'completed').length,
      cancelled: appointments.filter(a => a.status?.toLowerCase() === 'cancelled').length,
    };
  };

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      await apiCall.put(`/appointment/update/${appointmentId}`, {
        status: newStatus
      });
      setAppointments(appointments.map(appt =>
        appt._id === appointmentId ? { ...appt, status: newStatus } : appt
      ));
      alert(`Appointment ${newStatus} successfully!`);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update appointment status';
      alert(errorMessage);
    }
  };

  const getStatusClassName = (status) => {
    const baseClass = 'appointmentManagement_status';
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return `${baseClass} appointmentManagement_statusConfirmed`;
      case 'pending':
        return `${baseClass} appointmentManagement_statusPending`;
      case 'cancelled':
        return `${baseClass} appointmentManagement_statusCancelled`;
      case 'completed':
        return `${baseClass} appointmentManagement_statusCompleted`;
      default:
        return `${baseClass} appointmentManagement_statusPending`;
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchAppointments(page);
  };

  const PaymentStatusIcon = ({ status }) => {
    switch (status) {
      case 'Paid':
        return <MdCheckCircle size={18} color="#155724" style={{ marginRight: 4 }} />;
      case 'Pending':
        return (
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{ marginRight: 4 }}>
            <circle cx="10" cy="10" r="10" fill="#fff3cd" />
            <path d="M10 5v5l3 3" stroke="#856404" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'Failed':
        return (
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{ marginRight: 4 }}>
            <circle cx="10" cy="10" r="10" fill="#f8d7da" />
            <path d="M7 7l6 6M13 7l-6 6" stroke="#721c24" strokeWidth="2" fill="none" strokeLinecap="round"/>
          </svg>
        );
      case 'Refunded':
        return (
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{ marginRight: 4 }}>
            <circle cx="10" cy="10" r="10" fill="#d1ecf1" />
            <path d="M13 7v3a3 3 0 01-3 3H7" stroke="#0c5460" strokeWidth="2" fill="none" strokeLinecap="round"/>
            <path d="M7 13l2-2-2-2" stroke="#0c5460" strokeWidth="2" fill="none" strokeLinecap="round"/>
          </svg>
        );
      default:
        return (
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{ marginRight: 4 }}>
            <circle cx="10" cy="10" r="10" fill="#fff3cd" />
            <path d="M10 5v5l3 3" stroke="#856404" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
    }
  };

  return (
    <div className="appointmentManagement_page">
      <NavbarWrapper />
      <div className="appointmentManagement_container">
        <div className="appointmentManagement_header">
          <div className="appointmentManagement_titleSection">
            <h2 className="appointmentManagement_title">Appointment Management</h2>
            <p className="appointmentManagement_description">
              Manage all patient appointments, update statuses, and monitor appointment workflow.
            </p>
          </div>
          {!loading && !error && (
            <div className="appointmentManagement_statsContainer">
              {(() => {
                const stats = getStatusStats();
                return (
                  <>
                    <div className="appointmentManagement_statCard">
                      <span className="appointmentManagement_statNumber">{stats.total}</span>
                      <span className="appointmentManagement_statLabel">Total</span>
                    </div>
                    <div className="appointmentManagement_statCard appointmentManagement_statPending">
                      <span className="appointmentManagement_statNumber">{stats.pending}</span>
                      <span className="appointmentManagement_statLabel">Pending</span>
                    </div>
                    <div className="appointmentManagement_statCard appointmentManagement_statConfirmed">
                      <span className="appointmentManagement_statNumber">{stats.confirmed}</span>
                      <span className="appointmentManagement_statLabel">Confirmed</span>
                    </div>
                    <div className="appointmentManagement_statCard appointmentManagement_statCompleted">
                      <span className="appointmentManagement_statNumber">{stats.completed}</span>
                      <span className="appointmentManagement_statLabel">Completed</span>
                    </div>
                    <div className="appointmentManagement_statCard appointmentManagement_statCancelled">
                      <span className="appointmentManagement_statNumber">{stats.cancelled}</span>
                      <span className="appointmentManagement_statLabel">Cancelled</span>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Filters Section */}
        <div className="appointmentManagement_filtersSection">
          <div className="appointmentManagement_filterGroup">
            <label className="appointmentManagement_filterLabel">Search:</label>
            <input
              type="text"
              placeholder="Search by patient, doctor, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="appointmentManagement_searchInput"
            />
          </div>
          <div className="appointmentManagement_filterGroup">
            <label className="appointmentManagement_filterLabel">Status:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="appointmentManagement_filterSelect"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="appointmentManagement_filterGroup">
            <label className="appointmentManagement_filterLabel">Date:</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="appointmentManagement_dateInput"
            />
          </div>
          <div className="appointmentManagement_filterGroup">
            <button
              className="appointmentManagement_clearFiltersButton"
              onClick={() => {
                setSearchTerm('');
                setFilter('all');
                setDateFilter('');
              }}
            >
              Clear Filters
            </button>
          </div>
        </div>

        {loading ? (
          <div className="appointmentManagement_loadingContainer">
            <p>Loading appointments...</p>
          </div>
        ) : error ? (
          <div className="appointmentManagement_errorMessage">
            <div className="appointmentManagement_errorIcon">
              <MdErrorOutline size={48} color="#dc2626" />
            </div>
            <div className="appointmentManagement_errorText">
              <h3>Error Loading Appointments</h3>
              <p>{error}</p>
              <button
                className="appointmentManagement_retryButton"
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  fetchAppointments(currentPage);
                }}
              >
                Retry
              </button>
            </div>
          </div>
        ) : filteredAppointments.length > 0 ? (
          <div className="appointmentManagement_tableSection">
            <div className="appointmentManagement_tableHeader">
              <h3 className="appointmentManagement_sectionTitle">
                Appointments ({filteredAppointments.length} of {pagination.total})
              </h3>
            </div>
            <div className="appointmentManagement_tableContainer">
              <table className="appointmentManagement_table">
                <thead className="appointmentManagement_tableHead">
                  <tr>
                    <th className="appointmentManagement_tableHeaderCell">Patient Info</th>
                    <th className="appointmentManagement_tableHeaderCell">Doctor</th>
                    <th className="appointmentManagement_tableHeaderCell">Date & Time</th>
                    <th className="appointmentManagement_tableHeaderCell">Status</th>
                    <th className="appointmentManagement_tableHeaderCell">Payment</th>
                    <th className="appointmentManagement_tableHeaderCell">Actions</th>
                  </tr>
                </thead>
                <tbody className="appointmentManagement_tableBody">
                  {filteredAppointments.map((appt, idx) => (
                    <tr key={appt._id || idx} className="appointmentManagement_tableRow">
                      <td className="appointmentManagement_tableCell">
                        <div className="appointmentManagement_patientInfo">
                          <span className="appointmentManagement_patientName">
                            {appt.userId ?
                              `${appt.userId.firstname || ''} ${appt.userId.lastname || ''}`.trim() || 'N/A'
                              : appt.patientName || 'N/A'
                            }
                          </span>
                          <span className="appointmentManagement_patientEmail">
                            {appt.userId?.email || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="appointmentManagement_tableCell">
                        <span className="appointmentManagement_doctorName">
                          {appt.doctorId ?
                            `Dr. ${appt.doctorId.firstname || ''} ${appt.doctorId.lastname || ''}`.trim() || 'N/A'
                            : appt.doctorName || 'N/A'
                          }
                        </span>
                      </td>
                      <td className="appointmentManagement_tableCell">
                        <div className="appointmentManagement_dateTimeInfo">
                          <span className="appointmentManagement_appointmentDate">
                            {appt.date ? new Date(appt.date).toLocaleDateString() : 'N/A'}
                          </span>
                          {appt.time && (
                            <span className="appointmentManagement_appointmentTime">
                              {appt.time}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="appointmentManagement_tableCell">
                        <span className={getStatusClassName(appt.status)}>
                          {appt.status || 'Pending'}
                        </span>
                      </td>
                      <td className="appointmentManagement_tableCell">
                        <span className={`appointmentManagement_paymentStatus ${(appt.paymentStatus || 'Pending').toLowerCase()}`}>
                          <PaymentStatusIcon status={appt.paymentStatus || 'Pending'} />
                          {(() => {
                            switch (appt.paymentStatus) {
                              case 'Paid': return 'Paid';
                              case 'Pending': return 'Pending';
                              case 'Failed': return 'Failed';
                              case 'Refunded': return 'Refunded';
                              default: return 'Pending';
                            }
                          })()}
                        </span>
                      </td>
                      <td className="appointmentManagement_tableCell">
                        <div className="appointmentManagement_actionButtons">
                          {appt.status === 'pending' && (
                            <button
                              className="appointmentManagement_approveButton"
                              onClick={() => handleStatusChange(appt._id, 'confirmed')}
                            >
                              Approve
                            </button>
                          )}
                          {appt.status === 'confirmed' && (
                            <button
                              className="appointmentManagement_completeButton"
                              onClick={() => handleStatusChange(appt._id, 'completed')}
                            >
                              Complete
                            </button>
                          )}
                          {(appt.status === 'pending' || appt.status === 'confirmed') && (
                            <button
                              className="appointmentManagement_cancelButton"
                              onClick={() => handleStatusChange(appt._id, 'cancelled')}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {pagination.totalPages > 1 && (
                <div className="appointmentManagement_pagination" style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
                  <button
                    disabled={currentPage === 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                  >
                    Previous
                  </button>
                  {[...Array(pagination.totalPages)].map((_, idx) => (
                    <button
                      key={idx + 1}
                      className={currentPage === idx + 1 ? 'active' : ''}
                      onClick={() => handlePageChange(idx + 1)}
                    >
                      {idx + 1}
                    </button>
                  ))}
                  <button
                    disabled={currentPage === pagination.totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="appointmentManagement_noDataContainer">
            <div className="appointmentManagement_noDataMessage">
              <div className="appointmentManagement_noDataIcon">
                <FaClipboardList size={48} color="#bdbdbd" />
              </div>
              <h3 className="appointmentManagement_noDataTitle">No Appointments Found</h3>
              <p className="appointmentManagement_noDataText">
                {searchTerm || filter !== 'all' || dateFilter
                  ? 'No appointments match your current filters. Try adjusting your search criteria.'
                  : 'No appointments have been scheduled yet.'
                }
              </p>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default AppointmentManagement;