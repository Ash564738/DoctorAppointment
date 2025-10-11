// ...existing code...

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiCall } from '../../../helper/apiCall';
import NavbarWrapper from '../../../components/Common/NavbarWrapper/NavbarWrapper';
import Footer from '../../../components/Common/Footer/Footer';
import './AppointmentManagement.css';
import { MdCheckCircle, MdCancel, MdHourglass, MdHourglassEmpty, MdAttachMoney, MdCreditCard, MdUndo } from 'react-icons/md';
import { FaEye, FaSpinner } from 'react-icons/fa';
import PageHeader from '../../../components/Common/PageHeader/PageHeader';

const AppointmentManagement = () => {
  const [appointments, setAppointments] = useState([]);
  const [payments, setPayments] = useState({});
  const [dateFilter, setDateFilter] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  
  // Refund-specific state
  const [refundProcessing, setRefundProcessing] = useState({});
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundAmount, setRefundAmount] = useState(0);
  
  // Rows per page (fixed at 20 as per current UX)
  const [rowsPerPage] = useState(20);

  // Global counts returned by API (totals across all records, not just page)
  const [globalCounts, setGlobalCounts] = useState(null);

  // Keep last non-loading counts to avoid UI twitching
  const lastCountsRef = useRef({ all: 0, confirmed: 0, completed: 0, cancelled: 0 });

  const handleRefundProcessed = (appointmentId, refundData) => {
    setAppointments(prev => prev.map(apt => 
      apt._id === appointmentId 
        ? { ...apt, paymentStatus: 'Refunded' }
        : apt
    ));
      setPayments(prev => ({
      ...prev,
      [appointmentId]: {
        ...prev[appointmentId],
        refundAmount: refundData.refund?.amount || refundData.amount,
        refundReason: refundData.refund?.reason || refundData.reason,
        refundDate: refundData.refund?.processedDate || new Date(),
        status: 'Refunded'
      }
    }));
  };

  const processRefund = async (appointmentId, amount, reason) => {
    setRefundProcessing(prev => ({ ...prev, [appointmentId]: true }));
    
    const attemptRefund = async (opts = {}) => {
      return apiCall.post('/refunds/process', {
        appointmentId,
        amount: parseFloat(amount),
        reason,
        ...opts
      });
    };

    try {
      const response = await attemptRefund();
      if (response.success) {
        handleRefundProcessed(appointmentId, { amount: parseFloat(amount), reason });
        setShowRefundModal(false);
        setSelectedRefund(null);
        setRefundReason('');
        setRefundAmount(0);
        alert('Refund processed successfully!');
      } else {
        alert('Failed to process refund: ' + (response.message || 'Unexpected response'));
      }
    } catch (error) {
      const status = error?.response?.status;
      const code = error?.response?.data?.code;
      const message = error?.response?.data?.message;
      if (status === 422 && code === 'MISSING_STRIPE_REFERENCE') {
        const proceed = window.confirm(
          `${message}\n\nIf you have already refunded this payment outside Stripe (e.g., cash or other method), you can record it manually.\n\nDo you want to mark this refund as manually processed?`
        );
        if (proceed) {
          try {
            const manual = await attemptRefund({ allowManual: true });
            if (manual.success) {
              handleRefundProcessed(appointmentId, { amount: parseFloat(amount), reason: `${reason} (manual)` });
              setShowRefundModal(false);
              setSelectedRefund(null);
              setRefundReason('');
              setRefundAmount(0);
              alert('Manual refund recorded successfully.');
            } else {
              alert('Failed to record manual refund: ' + (manual.message || 'Unexpected response'));
            }
          } catch (e2) {
            console.error('Manual refund record failed:', e2);
            alert('Failed to record manual refund.');
          } finally {
            setRefundProcessing(prev => ({ ...prev, [appointmentId]: false }));
          }
          return;
        }
      } else {
        console.error('Refund processing error:', error);
        alert('Error processing refund. Please try again.');
      }
    } finally {
      setRefundProcessing(prev => ({ ...prev, [appointmentId]: false }));
    }
  };

  // Open refund modal
  const openRefundModal = (appointment) => {
    setSelectedRefund(appointment);
    setRefundAmount(payments[appointment._id]?.amount || 100);
    setShowRefundModal(true);
  };

  // Close refund modal
  const closeRefundModal = () => {
    setShowRefundModal(false);
    setSelectedRefund(null);
    setRefundReason('');
    setRefundAmount(0);
  };
  const fetchAppointments = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: rowsPerPage,
        status: filter, // server will ignore when 'all'
        ...(dateFilter ? { date: dateFilter } : {})
      };
      const res = await apiCall.get('/appointment/getallappointments', { params });
      if (res && res.success && Array.isArray(res.appointments)) {
        const mappedAppointments = res.appointments.map(appt => ({
          ...appt,
          patient: appt.userId
            ? {
                name: [appt.userId.firstname, appt.userId.lastname].filter(Boolean).join(' '),
                email: appt.userId.email || '-',
              }
            : { name: '-', email: '-' },
          doctor: appt.doctorId
            ? {
                name: [appt.doctorId.firstname, appt.doctorId.lastname].filter(Boolean).join(' '),
                email: appt.doctorId.email || '-',
              }
            : { name: '-', email: '-' },
        }));
        setAppointments(mappedAppointments);
        setPagination(res.pagination || { page: 1, totalPages: 1, total: mappedAppointments.length });
        if (res.statusCounts) setGlobalCounts(res.statusCounts);
      } else {
        setAppointments([]);
        setPagination({ page: 1, totalPages: 1, total: 0 });
        setGlobalCounts(null);
      }
    } catch (err) {
      setError('Failed to fetch appointments');
      setAppointments([]);
      setPagination({ page: 1, totalPages: 1, total: 0 });
      setGlobalCounts(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Reset to first page on client-side filters
    setCurrentPage(1);
  }, [filter, searchTerm, dateFilter]);

  useEffect(() => {
    // Fetch whenever page or server-side filters change
    fetchAppointments(currentPage);
  }, [currentPage, filter, dateFilter]);
  const filteredAppointments = appointments.filter(appt => {
    // Server handles status and date filters; only apply client search here
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      const fields = [
        appt.patient?.name?.toLowerCase() || '',
        appt.patient?.email?.toLowerCase() || '',
        appt.doctor?.name?.toLowerCase() || '',
        appt.doctor?.email?.toLowerCase() || '',
      ];
      return fields.some(f => f.includes(s));
    }
    return true;
  });

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Compute status counts for current page
  const computedStatusCounts = useMemo(() => {
    return appointments.reduce(
      (acc, appt) => {
        const status = (appt.status || '').toLowerCase();
        if (status === 'confirmed') acc.confirmed += 1;
        else if (status === 'completed') acc.completed += 1;
        else if (status === 'cancelled') acc.cancelled += 1;
        acc.all += 1;
        return acc;
      },
      { all: 0, confirmed: 0, completed: 0, cancelled: 0 }
    );
  }, [appointments]);

  // When not loading, persist the latest counts to avoid flicker during the next load
  useEffect(() => {
    if (!loading) {
      lastCountsRef.current = computedStatusCounts;
    }
  }, [loading, computedStatusCounts]);

  const statusCounts = loading ? lastCountsRef.current : computedStatusCounts;

  const PaymentStatusIcon = ({ status }) => {
    const cls = 'appointmentManagement_paymentStatusIcon';
    switch (status) {
      case 'Paid':
        return <MdCheckCircle className={cls} />;
      case 'Refunded':
        return <MdUndo className={cls} />;
      default:
        return <MdHourglassEmpty className={cls} />;
    }
  };


  return (
    <div className="appointmentManagement_page">
      <NavbarWrapper />
      <div className="appointmentManagement_container">
        <PageHeader
          title="Appointment Management"
          subtitle="Manage all patient appointments, update statuses, and monitor appointment workflow."
          className="appointmentManagement_header"
        />
        <div className="appointmentManagement_filtersSection">
          <div className="appointmentManagement_filters">
            <input
              type="text"
              placeholder="Search by patient, doctor, or email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="appointmentManagement_searchInput"
            />
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="appointmentManagement_dateInput"
            />
            <button
              className="appointmentManagement_clearFiltersButton"
              onClick={() => {
                setSearchTerm('');
                setFilter('all');
                setDateFilter('');
              }}
            >Clear Filters</button>
          </div>
        </div>
      <div className="appointmentManagement_tableSection">
        <div className="appointmentManagement_sectionHeader">
          <div className="appointmentManagement_filters">
            <button
              className={filter === 'all' ? 'appointmentManagement_filterButton appointmentManagement_filterActive' : 'appointmentManagement_filterButton'}
              onClick={() => setFilter('all')}
            >
              All ({globalCounts?.all ?? pagination?.total ?? statusCounts.all})
            </button>
            <button
              className={filter === 'confirmed' ? 'appointmentManagement_filterButton appointmentManagement_filterActive' : 'appointmentManagement_filterButton'}
              onClick={() => setFilter('confirmed')}
            >
              Confirmed ({globalCounts?.confirmed ?? statusCounts.confirmed})
            </button>
            <button
              className={filter === 'completed' ? 'appointmentManagement_filterButton appointmentManagement_filterActive' : 'appointmentManagement_filterButton'}
              onClick={() => setFilter('completed')}
            >
              Completed ({globalCounts?.completed ?? statusCounts.completed})
            </button>
            <button
              className={filter === 'cancelled' ? 'appointmentManagement_filterButton appointmentManagement_filterActive' : 'appointmentManagement_filterButton'}
              onClick={() => setFilter('cancelled')}
            >
              Cancelled ({globalCounts?.cancelled ?? statusCounts.cancelled})
            </button>
          </div>
        </div>

          <div className="appointmentManagement_tableContainer" data-name="appointmentManagement_tableContainer">
            <table className="appointmentManagement_table">
              <thead>
                <tr>
                  <th className="appointmentManagement_th">Patient</th>
                  <th className="appointmentManagement_th">Doctor</th>
                  <th className="appointmentManagement_th">Date</th>
                  <th className="appointmentManagement_th">Time</th>
                  <th className="appointmentManagement_th">Status</th>
                  <th className="appointmentManagement_th">Payment</th>
                  <th className="appointmentManagement_th">Actions</th>
                </tr>
              </thead>
              <tbody className="appointmentManagement_tbody">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="appointmentManagement_td appointmentManagement_loadingContainer">
                      Loading...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="8" className="appointmentManagement_td appointmentManagement_errorMessage">
                      {error}
                    </td>
                  </tr>
                ) : filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="appointmentManagement_td appointmentManagement_noDataMessage">
                      No appointments found.
                    </td>
                  </tr>
                ) : (
                  filteredAppointments
                    .map((appointment) => (
                      <tr key={appointment._id} className="appointmentManagement_tr" data-name="appointmentManagement_row">
                        <td className="appointmentManagement_td">
                          <div className="appointmentManagement_patientInfo">
                            <span className="appointmentManagement_patientName">{appointment.patient?.name || '-'}</span>
                            <span className="appointmentManagement_patientEmail">{appointment.patient?.email || '-'}</span>
                          </div>
                        </td>
                        <td className="appointmentManagement_td">
                          <div className="appointmentManagement_doctorName">{appointment.doctor?.name || '-'}</div>
                          <div className="appointmentManagement_doctorEmail">{appointment.doctor?.email || '-'}</div>
                        </td>
                        <td className="appointmentManagement_td">
                          <span className="appointmentManagement_appointmentDate">{appointment.date}</span>
                        </td>
                        <td className="appointmentManagement_td">
                          <span className="appointmentManagement_appointmentTime">{appointment.time}</span>
                        </td>
                        <td className="appointmentManagement_td">
                          <span className={`appointmentManagement_status appointmentManagement_status${appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}`}>{appointment.status}</span>
                        </td>
                        <td className="appointmentManagement_td">
                          <span className={`appointmentManagement_paymentStatus ${appointment.paymentStatus?.toLowerCase()}`.trim()}>
                            <PaymentStatusIcon status={appointment.paymentStatus} />
                            {appointment.paymentStatus}
                          </span>
                        </td>
                        <td className="appointmentManagement_td">
                          <div className="appointmentManagement_actions">
                            {appointment.status === 'Cancelled' && appointment.paymentStatus === 'Paid' && (
                              <button 
                                className="appointmentManagement_button appointmentManagement_buttonRefund"
                                onClick={() => openRefundModal(appointment)}
                                disabled={refundProcessing[appointment._id]}
                                title="Process Refund"
                              >
                                {refundProcessing[appointment._id] ? (
                                  <>
                                    <FaSpinner className="appointmentManagement_iconSpin" size={14} />
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <MdUndo className="appointmentManagement_buttonIcon" />
                                    Refund
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
          <div className="appointmentManagement_pagination" data-name="appointmentManagement_pagination">
            <button
              className="appointmentManagement_paginationButton"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || loading}
            >Previous</button>
            {Array.from({ length: pagination.totalPages || 1 }, (_, i) => (
              <button
                key={i + 1}
                className={`appointmentManagement_paginationButton ${currentPage === i + 1 ? 'active' : ''}`}
                onClick={() => handlePageChange(i + 1)}
                disabled={loading}
              >{i + 1}</button>
            ))}
            <button
              className="appointmentManagement_paginationButton"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= (pagination.totalPages || 1) || loading}
            >Next</button>
          </div>
        </div>
      </div>

      {/* Refund Modal */}
      {showRefundModal && selectedRefund && (
        <div className="appointmentManagement_modalOverlay">
          <div className="appointmentManagement_modal">
            <div className="appointmentManagement_modalHeader">
              <h3>Process Refund</h3>
              <button 
                className="appointmentManagement_modalClose"
                onClick={closeRefundModal}
              >
                ×
              </button>
            </div>
            <div className="appointmentManagement_modalContent">
              <div className="appointmentManagement_refundDetails">
                <p><strong>Patient:</strong> {selectedRefund.patient?.name}</p>
                <p><strong>Doctor:</strong> {selectedRefund.doctor?.name}</p>
                <p><strong>Date:</strong> {selectedRefund.date}</p>
                <p><strong>Time:</strong> {selectedRefund.time}</p>
              </div>
              
              <div className="appointmentManagement_formGroup">
                <label htmlFor="refundAmount">Refund Amount ($):</label>
                <input
                  id="refundAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={payments[selectedRefund._id]?.amount || 500}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="appointmentManagement_input"
                />
              </div>
              
              <div className="appointmentManagement_formGroup">
                <label htmlFor="refundReason">Reason for Refund:</label>
                <select
                  id="refundReason"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="appointmentManagement_select"
                >
                  <option value="">Select a reason</option>
                  <option value="Patient cancellation">Patient cancellation</option>
                  <option value="Doctor unavailable">Doctor unavailable</option>
                  <option value="Medical emergency">Medical emergency</option>
                  <option value="Technical issues">Technical issues</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div className="appointmentManagement_modalActions">
                <button 
                  className="appointmentManagement_btnCancel"
                  onClick={closeRefundModal}
                >
                  Cancel
                </button>
                <button 
                  className="appointmentManagement_btnProcess"
                  onClick={() => processRefund(selectedRefund._id, refundAmount, refundReason)}
                  disabled={!refundAmount || !refundReason || refundProcessing[selectedRefund._id]}
                >
                  {refundProcessing[selectedRefund._id] ? 'Processing...' : 'Process Refund'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default AppointmentManagement;