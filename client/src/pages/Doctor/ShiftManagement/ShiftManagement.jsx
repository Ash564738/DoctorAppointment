import React, { useEffect, useState } from 'react';
import NavbarWrapper from '../../../components/Common/NavbarWrapper/NavbarWrapper';
import Footer from '../../../components/Common/Footer/Footer';
import { apiCall } from '../../../helper/apiCall';
import toast from 'react-hot-toast';
import './ShiftManagement.css';

const ShiftManagement = () => {
  const [shifts, setShifts] = useState([]);
  const [swapRequests, setSwapRequests] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [overtimeRecords, setOvertimeRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [swapForm, setSwapForm] = useState({ shiftId: '', withUser: '', reason: '' });
  const [leaveForm, setLeaveForm] = useState({ type: '', from: '', to: '', reason: '' });
  const [overtimeForm, setOvertimeForm] = useState({ date: '', hours: '', reason: '' });
  const [availableShifts, setAvailableShifts] = useState([]);
  const [colleagues, setColleagues] = useState([]);

  useEffect(() => {
    fetchShiftData();
    fetchAvailableShifts();
    fetchColleagues();
  }, []);

  const fetchShiftData = async () => {
    setLoading(true);
    try {
      const [shiftsRes, swapsRes, leavesRes, overtimeRes] = await Promise.all([
        apiCall.get('/shift/mydoctorshifts'),
        apiCall.get('/shift-swap/my-swaps'),
        apiCall.get('/leave'),
        apiCall.get('/overtime/my-overtime')
      ]);
      setShifts(shiftsRes?.shifts || []);
      setSwapRequests(swapsRes?.data || []);
      setLeaveRequests(leavesRes?.leaveRequests || []);
      setOvertimeRecords(overtimeRes?.data || []);
    } catch (error) {
      console.error('Error fetching shift data:', error);
      toast.error('Failed to fetch shift management data');
      setShifts([]);
      setSwapRequests([]);
      setLeaveRequests([]);
      setOvertimeRecords([]);
    }
    setLoading(false);
  };

  // Fetch available shifts for swap/overtime dropdowns
  const fetchAvailableShifts = async () => {
    try {
      const res = await apiCall.get('/shift/mydoctorshifts');
      setAvailableShifts(res?.shifts || []);
    } catch {
      setAvailableShifts([]);
    }
  };

  // Fetch colleagues (other doctors) for swap dropdown
  const fetchColleagues = async () => {
    try {
      const res = await apiCall.get('/doctor/getalldoctors');
      setColleagues(res?.doctors || res || []);
    } catch {
      setColleagues([]);
    }
  };

  // Form handlers
  const handleSwapSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiCall.post('/shift-swap/create', {
        originalShiftId: swapForm.shiftId,
        requestedShiftId: swapForm.shiftId, // or allow selection of another shift
        swapWithId: swapForm.withUser,
        reason: swapForm.reason
      });
      toast.success('Swap request submitted successfully');
      setShowSwapModal(false);
      setSwapForm({ shiftId: '', withUser: '', reason: '' });
      fetchShiftData();
    } catch (error) {
      toast.error('Failed to submit swap request');
    }
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiCall.post('/leave/request', {
        leaveType: leaveForm.type,
        startDate: leaveForm.from,
        endDate: leaveForm.to,
        reason: leaveForm.reason
      });
      toast.success('Leave request submitted successfully');
      setShowLeaveModal(false);
      setLeaveForm({ type: '', from: '', to: '', reason: '' });
      fetchShiftData();
    } catch (error) {
      toast.error('Failed to submit leave request');
    }
  };

  const handleOvertimeSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiCall.post('/overtime/create', {
        shiftId: overtimeForm.shiftId || '', // allow selection if needed
        date: overtimeForm.date,
        hours: overtimeForm.hours,
        reason: overtimeForm.reason
      });
      toast.success('Overtime record submitted successfully');
      setShowOvertimeModal(false);
      setOvertimeForm({ date: '', hours: '', reason: '' });
      fetchShiftData();
    } catch (error) {
      toast.error('Failed to submit overtime record');
    }
  };

  return (
    <div className="shiftManagement_page">
      <NavbarWrapper />
      <div className="shiftManagement_container">
        <div className="shiftManagement_content">
          <div className="shiftManagement_header">
            <h1 className="shiftManagement_title">Shift Management</h1>
            <p className="shiftManagement_subtitle">Manage your shifts, leave requests, and overtime records</p>
          </div>

          {/* Stats Row */}
          <div className="shiftManagement_statsRow">
            <div className="shiftManagement_statCard">
              <p className="shiftManagement_statTitle">Total Shifts</p>
              <h3 className="shiftManagement_statValue">{shifts.length}</h3>
            </div>
            <div className="shiftManagement_statCard">
              <p className="shiftManagement_statTitle">Pending Swaps</p>
              <h3 className="shiftManagement_statValue">{swapRequests.filter(r => r.status === 'Pending').length}</h3>
            </div>
            <div className="shiftManagement_statCard">
              <p className="shiftManagement_statTitle">Leave Requests</p>
              <h3 className="shiftManagement_statValue">{leaveRequests.length}</h3>
            </div>
            <div className="shiftManagement_statCard">
              <p className="shiftManagement_statTitle">Overtime Hours</p>
              <h3 className="shiftManagement_statValue">{overtimeRecords.reduce((sum, record) => sum + parseInt(record.hours || 0), 0)}h</h3>
            </div>
          </div>

          <div className="shiftManagement_mainGrid">
            {/* My Shifts Section */}
            <div className="shiftManagement_section">
              <div className="shiftManagement_sectionHeader">
                <h3 className="shiftManagement_sectionTitle">My Shifts</h3>
                <button 
                  className="shiftManagement_actionButton"
                  onClick={() => setShowSwapModal(true)}
                >
                  Request Swap
                </button>
              </div>
              <div className="shiftManagement_tableContainer">
                {loading ? (
                  <div className="shiftManagement_loading">
                    <p className="shiftManagement_loadingText">Loading shifts...</p>
                  </div>
                ) : (
                  <table className="shiftManagement_table">
                    <thead className="shiftManagement_tableHeader">
                      <tr>
                        <th className="shiftManagement_headerCell">Time</th>
                        <th className="shiftManagement_headerCell">Department</th>
                        <th className="shiftManagement_headerCell">Status</th>
                      </tr>
                    </thead>
                    <tbody className="shiftManagement_tableBody">
                      {shifts.map(shift => (
                        <tr key={shift._id || shift.id} className="shiftManagement_tableRow">
                          <td className="shiftManagement_tableCell">{shift.startTime} - {shift.endTime}</td>
                          <td className="shiftManagement_tableCell">{shift.department}</td>
                          <td className="shiftManagement_tableCell">
                            <span className={`shiftManagement_statusBadge shiftManagement_statusBadge--${(shift.status || 'Scheduled').toLowerCase()}`}>
                              {shift.status || 'Scheduled'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Leave Requests Section */}
            <div className="shiftManagement_section">
              <div className="shiftManagement_sectionHeader">
                <h3 className="shiftManagement_sectionTitle">Leave Requests</h3>
                <button 
                  className="shiftManagement_actionButton"
                  onClick={() => setShowLeaveModal(true)}
                >
                  Apply for Leave
                </button>
              </div>
              <div className="shiftManagement_tableContainer">
                {loading ? (
                  <div className="shiftManagement_loading">
                    <p className="shiftManagement_loadingText">Loading leave requests...</p>
                  </div>
                ) : (
                  <table className="shiftManagement_table">
                    <thead className="shiftManagement_tableHeader">
                      <tr>
                        <th className="shiftManagement_headerCell">Type</th>
                        <th className="shiftManagement_headerCell">From</th>
                        <th className="shiftManagement_headerCell">To</th>
                        <th className="shiftManagement_headerCell">Status</th>
                      </tr>
                    </thead>
                    <tbody className="shiftManagement_tableBody">
                      {leaveRequests.map(request => (
                        <tr key={request._id || request.id} className="shiftManagement_tableRow">
                          <td className="shiftManagement_tableCell">{request.leaveType}</td>
                          <td className="shiftManagement_tableCell">{request.startDate?.slice(0,10) || request.from}</td>
                          <td className="shiftManagement_tableCell">{request.endDate?.slice(0,10) || request.to}</td>
                          <td className="shiftManagement_tableCell">
                            <span className={`shiftManagement_statusBadge shiftManagement_statusBadge--${(request.status || '').toLowerCase()}`}>
                              {request.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* Additional Sections */}
          <div className="shiftManagement_section">
            <div className="shiftManagement_sectionHeader">
              <h3 className="shiftManagement_sectionTitle">Swap Requests</h3>
              <button 
                className="shiftManagement_actionButton"
                onClick={() => setShowSwapModal(true)}
              >
                New Request
              </button>
            </div>
            <div className="shiftManagement_tableContainer">
              {loading ? (
                <div className="shiftManagement_loading">
                  <p className="shiftManagement_loadingText">Loading swap requests...</p>
                </div>
              ) : (
                <table className="shiftManagement_table">
                  <thead className="shiftManagement_tableHeader">
                    <tr>
                      <th className="shiftManagement_headerCell">Shift</th>
                      <th className="shiftManagement_headerCell">With</th>
                      <th className="shiftManagement_headerCell">Status</th>
                    </tr>
                  </thead>
                  <tbody className="shiftManagement_tableBody">
                    {swapRequests.map(request => (
                      <tr key={request._id || request.id} className="shiftManagement_tableRow">
                        <td className="shiftManagement_tableCell">{request.originalShiftId?.title || request.originalShiftId || ''}</td>
                        <td className="shiftManagement_tableCell">
                          {request.swapWithId?.firstname
                            ? `${request.swapWithId.firstname} ${request.swapWithId.lastname}`
                            : request.swapWithId || ''}
                        </td>
                        <td className="shiftManagement_tableCell">
                          <span className={`shiftManagement_statusBadge shiftManagement_statusBadge--${(request.status || '').toLowerCase()}`}>
                            {request.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="shiftManagement_section">
            <div className="shiftManagement_sectionHeader">
              <h3 className="shiftManagement_sectionTitle">Overtime Records</h3>
              <button 
                className="shiftManagement_actionButton"
                onClick={() => setShowOvertimeModal(true)}
              >
                Log Overtime
              </button>
            </div>
            <div className="shiftManagement_tableContainer">
              {loading ? (
                <div className="shiftManagement_loading">
                  <p className="shiftManagement_loadingText">Loading overtime records...</p>
                </div>
              ) : (
                <table className="shiftManagement_table">
                  <thead className="shiftManagement_tableHeader">
                    <tr>
                      <th className="shiftManagement_headerCell">Date</th>
                      <th className="shiftManagement_headerCell">Hours</th>
                      <th className="shiftManagement_headerCell">Reason</th>
                      <th className="shiftManagement_headerCell">Status</th>
                    </tr>
                  </thead>
                  <tbody className="shiftManagement_tableBody">
                    {overtimeRecords.map(record => (
                      <tr key={record._id || record.id} className="shiftManagement_tableRow">
                        <td className="shiftManagement_tableCell">{record.date?.slice(0,10) || ''}</td>
                        <td className="shiftManagement_tableCell">{record.hours}h</td>
                        <td className="shiftManagement_tableCell">{record.reason}</td>
                        <td className="shiftManagement_tableCell">
                          <span className={`shiftManagement_statusBadge shiftManagement_statusBadge--${(record.status || '').toLowerCase()}`}>
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Swap Modal */}
      {showSwapModal && (
        <div className="shiftManagement_modalOverlay">
          <div className="shiftManagement_modal">
            <div className="shiftManagement_modalHeader">
              <h3 className="shiftManagement_modalTitle">Request Shift Swap</h3>
              <button 
                className="shiftManagement_closeButton"
                onClick={() => setShowSwapModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSwapSubmit} className="shiftManagement_form">
              <div className="shiftManagement_formGroup">
                <label className="shiftManagement_label">Shift</label>
                <select
                  className="shiftManagement_select"
                  value={swapForm.shiftId}
                  onChange={(e) => setSwapForm({...swapForm, shiftId: e.target.value})}
                  required
                >
                  <option value="">Select shift</option>
                  {availableShifts.map(shift => (
                    <option key={shift._id} value={shift._id}>
                      {shift.title} ({shift.startTime}-{shift.endTime})
                    </option>
                  ))}
                </select>
              </div>
              <div className="shiftManagement_formGroup">
                <label className="shiftManagement_label">Swap With (Doctor)</label>
                <select
                  className="shiftManagement_select"
                  value={swapForm.withUser}
                  onChange={(e) => setSwapForm({...swapForm, withUser: e.target.value})}
                  required
                >
                  <option value="">Select colleague</option>
                  {colleagues
                    .filter(doc => doc.userId?._id !== undefined)
                    .map(doc => (
                      <option key={doc.userId._id} value={doc.userId._id}>
                        Dr. {doc.userId.firstname} {doc.userId.lastname}
                      </option>
                    ))}
                </select>
              </div>
              <div className="shiftManagement_formGroup">
                <label className="shiftManagement_label">Reason</label>
                <textarea
                  className="shiftManagement_textarea"
                  value={swapForm.reason}
                  onChange={(e) => setSwapForm({...swapForm, reason: e.target.value})}
                  placeholder="Explain the reason for swap request"
                  rows="4"
                  required
                />
              </div>
              <div className="shiftManagement_formActions">
                <button 
                  type="button"
                  className="shiftManagement_actionButton shiftManagement_actionButton--secondary"
                  onClick={() => setShowSwapModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="shiftManagement_actionButton shiftManagement_actionButton--primary"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave Modal */}
      {showLeaveModal && (
        <div className="shiftManagement_modalOverlay">
          <div className="shiftManagement_modal">
            <div className="shiftManagement_modalHeader">
              <h3 className="shiftManagement_modalTitle">Apply for Leave</h3>
              <button 
                className="shiftManagement_closeButton"
                onClick={() => setShowLeaveModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleLeaveSubmit} className="shiftManagement_form">
              <div className="shiftManagement_formGroup">
                <label className="shiftManagement_label">Leave Type</label>
                <select
                  className="shiftManagement_select"
                  value={leaveForm.type}
                  onChange={(e) => setLeaveForm({...leaveForm, type: e.target.value})}
                  required
                >
                  <option value="">Select leave type</option>
                  <option value="sick">Sick Leave</option>
                  <option value="vacation">Vacation</option>
                  <option value="personal">Personal Leave</option>
                  <option value="emergency">Emergency Leave</option>
                </select>
              </div>
              <div className="shiftManagement_formRow">
                <div className="shiftManagement_formGroup">
                  <label className="shiftManagement_label">From Date</label>
                  <input
                    className="shiftManagement_input"
                    type="date"
                    value={leaveForm.from}
                    onChange={(e) => setLeaveForm({...leaveForm, from: e.target.value})}
                    required
                  />
                </div>
                <div className="shiftManagement_formGroup">
                  <label className="shiftManagement_label">To Date</label>
                  <input
                    className="shiftManagement_input"
                    type="date"
                    value={leaveForm.to}
                    onChange={(e) => setLeaveForm({...leaveForm, to: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="shiftManagement_formGroup">
                <label className="shiftManagement_label">Reason</label>
                <textarea
                  className="shiftManagement_textarea"
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({...leaveForm, reason: e.target.value})}
                  placeholder="Explain the reason for leave"
                  rows="4"
                  required
                />
              </div>
              <div className="shiftManagement_formActions">
                <button 
                  type="button"
                  className="shiftManagement_actionButton shiftManagement_actionButton--secondary"
                  onClick={() => setShowLeaveModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="shiftManagement_actionButton shiftManagement_actionButton--primary"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Overtime Modal */}
      {showOvertimeModal && (
        <div className="shiftManagement_modalOverlay">
          <div className="shiftManagement_modal">
            <div className="shiftManagement_modalHeader">
              <h3 className="shiftManagement_modalTitle">Log Overtime</h3>
              <button 
                className="shiftManagement_closeButton"
                onClick={() => setShowOvertimeModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleOvertimeSubmit} className="shiftManagement_form">
              <div className="shiftManagement_formGroup">
                <label className="shiftManagement_label">Shift</label>
                <select
                  className="shiftManagement_select"
                  value={overtimeForm.shiftId || ''}
                  onChange={(e) => setOvertimeForm({...overtimeForm, shiftId: e.target.value})}
                >
                  <option value="">Select shift (optional)</option>
                  {availableShifts.map(shift => (
                    <option key={shift._id} value={shift._id}>
                      {shift.title} ({shift.startTime}-{shift.endTime})
                    </option>
                  ))}
                </select>
              </div>
              <div className="shiftManagement_formGroup">
                <label className="shiftManagement_label">Date</label>
                <input
                  className="shiftManagement_input"
                  type="date"
                  value={overtimeForm.date}
                  onChange={(e) => setOvertimeForm({...overtimeForm, date: e.target.value})}
                  required
                />
              </div>
              <div className="shiftManagement_formGroup">
                <label className="shiftManagement_label">Hours</label>
                <input
                  className="shiftManagement_input"
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={overtimeForm.hours}
                  onChange={(e) => setOvertimeForm({...overtimeForm, hours: e.target.value})}
                  placeholder="Number of overtime hours"
                  required
                />
              </div>
              <div className="shiftManagement_formGroup">
                <label className="shiftManagement_label">Reason</label>
                <textarea
                  className="shiftManagement_textarea"
                  value={overtimeForm.reason}
                  onChange={(e) => setOvertimeForm({...overtimeForm, reason: e.target.value})}
                  placeholder="Explain the reason for overtime"
                  rows="4"
                  required
                />
              </div>
              <div className="shiftManagement_formActions">
                <button 
                  type="button"
                  className="shiftManagement_actionButton shiftManagement_actionButton--secondary"
                  onClick={() => setShowOvertimeModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="shiftManagement_actionButton shiftManagement_actionButton--primary"
                >
                  Log Overtime
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <Footer/>
    </div>
  );
};

export default ShiftManagement;