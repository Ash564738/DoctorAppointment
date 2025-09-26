// ...existing code...

import React, { useEffect, useState } from 'react';
import { apiCall } from '../../../helper/apiCall';
import NavbarWrapper from '../../../components/Common/NavbarWrapper/NavbarWrapper';
import Footer from '../../../components/Common/Footer/Footer';
import { MdErrorOutline, MdOutlineEventBusy, MdOutlineEventNote } from 'react-icons/md';
import { FaClipboardList } from 'react-icons/fa';
import './AppointmentManagement.css';
import { MdCheckCircle } from 'react-icons/md';

const AppointmentManagement = () => {
  const [appointments, setAppointments] = useState([]);
  const [dateFilter, setDateFilter] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const rowsPerPage = 20;
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
    if (filter !== 'all' && appt.status?.toLowerCase() !== filter) {
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

  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchAppointments(page);
  };

  const PaymentStatusIcon = ({ status }) => {
    switch (status) {
      case 'Paid':
        return <MdCheckCircle size={18} color="#155724" style={{ marginRight: 4 }} />;
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
        </div>

        {/* Filters Section - search and date only */}
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
          {(() => {
            const statusCounts = appointments.reduce(
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
            return (
              <>
                <button
                  className={filter === 'all' ? 'appointmentManagement_filterButton appointmentManagement_filterActive' : 'appointmentManagement_filterButton'}
                  onClick={() => setFilter('all')}
                >All ({statusCounts.all})</button>
                <button
                  className={filter === 'confirmed' ? 'appointmentManagement_filterButton appointmentManagement_filterActive' : 'appointmentManagement_filterButton'}
                  onClick={() => setFilter('confirmed')}
                >Confirmed ({statusCounts.confirmed})</button>
                <button
                  className={filter === 'completed' ? 'appointmentManagement_filterButton appointmentManagement_filterActive' : 'appointmentManagement_filterButton'}
                  onClick={() => setFilter('completed')}
                >Completed ({statusCounts.completed})</button>
                <button
                  className={filter === 'cancelled' ? 'appointmentManagement_filterButton appointmentManagement_filterActive' : 'appointmentManagement_filterButton'}
                  onClick={() => setFilter('cancelled')}
                >Cancelled ({statusCounts.cancelled})</button>
              </>
            );
          })()}
          </div>
        </div>

          <div className="appointmentManagement_tableContainer">
            <table className="appointmentManagement_table">
              <thead>
                <tr>
                  <th className="appointmentManagement_tableHeaderCell">Patient</th>
                  <th className="appointmentManagement_tableHeaderCell">Doctor</th>
                  <th className="appointmentManagement_tableHeaderCell">Date</th>
                  <th className="appointmentManagement_tableHeaderCell">Time</th>
                  <th className="appointmentManagement_tableHeaderCell">Status</th>
                  <th className="appointmentManagement_tableHeaderCell">Payment</th>
                  <th className="appointmentManagement_tableHeaderCell">Actions</th>
                </tr>
              </thead>
              <tbody className="appointmentManagement_tableBody">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="appointmentManagement_tableCell appointmentManagement_loadingContainer">
                      Loading...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="7" className="appointmentManagement_tableCell appointmentManagement_errorMessage">
                      {error}
                    </td>
                  </tr>
                ) : filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="appointmentManagement_tableCell appointmentManagement_noDataMessage">
                      No appointments found.
                    </td>
                  </tr>
                ) : (
                  filteredAppointments
                    .slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
                    .map((appointment) => (
                      <tr key={appointment._id} className="appointmentManagement_tableRow">
                        <td className="appointmentManagement_tableCell">
                          <div className="appointmentManagement_patientInfo">
                            <span className="appointmentManagement_patientName">{appointment.patient?.name || '-'}</span>
                            <span className="appointmentManagement_patientEmail">{appointment.patient?.email || '-'}</span>
                          </div>
                        </td>
                        <td className="appointmentManagement_tableCell">
                          <div className="appointmentManagement_doctorName">{appointment.doctor?.name || '-'}</div>
                          <div className="appointmentManagement_doctorEmail">{appointment.doctor?.email || '-'}</div>
                        </td>
                        <td className="appointmentManagement_tableCell">
                          <span className="appointmentManagement_appointmentDate">{appointment.date}</span>
                        </td>
                        <td className="appointmentManagement_tableCell">
                          <span className="appointmentManagement_appointmentTime">{appointment.time}</span>
                        </td>
                        <td className="appointmentManagement_tableCell">
                          <span className={`appointmentManagement_status appointmentManagement_status${appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}`}>{appointment.status}</span>
                        </td>
                        <td className="appointmentManagement_tableCell">
                          <span className={`appointmentManagement_paymentStatus ${appointment.paymentStatus?.toLowerCase()}`.trim()}>
                            <PaymentStatusIcon status={appointment.paymentStatus} />
                            {appointment.paymentStatus}
                          </span>
                        </td>
                        <td className="appointmentManagement_tableCell">
                          {/* Actions here */}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
          <div className="appointmentManagement_pagination">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >Previous</button>
            {Array.from({ length: Math.ceil(filteredAppointments.length / rowsPerPage) }, (_, i) => (
              <button
                key={i + 1}
                className={currentPage === i + 1 ? 'active' : ''}
                onClick={() => handlePageChange(i + 1)}
              >{i + 1}</button>
            ))}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === Math.ceil(filteredAppointments.length / rowsPerPage) || filteredAppointments.length === 0}
            >Next</button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default AppointmentManagement;