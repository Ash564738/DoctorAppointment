import React, { useEffect, useState } from 'react';
import NavbarWrapper from '../../../components/Common/NavbarWrapper/NavbarWrapper';
import Footer from '../../../components/Common/Footer/Footer';
import { apiCall } from '../../../helper/apiCall';
import useAdminDoctorRequests from '../../../hooks/useAdminDoctorRequests';
import './DoctorScheduling.css';

const DEFAULT_SHIFT_CONFIG = {
  day: {
    startTime: "08:00",
    endTime: "16:00",
    breakStart: "12:00",
    breakEnd: "13:00",
    slotDuration: 30,
    maxPatientsPerHour: 4,
  },
  night: {
    startTime: "16:00",
    endTime: "00:00",
    breakStart: "20:00",
    breakEnd: "21:00",
    slotDuration: 30,
    maxPatientsPerHour: 4,
  }
};

function calculateSlotAndMaxPatients(startTime, endTime, breakStart, breakEnd) {
  const toMinutes = t => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  let start = toMinutes(startTime);
  let end = toMinutes(endTime);
  if (end <= start) end += 24 * 60;
  let total = end - start;
  if (breakStart && breakEnd) {
    let bStart = toMinutes(breakStart);
    let bEnd = toMinutes(breakEnd);
    if (bEnd <= bStart) bEnd += 24 * 60;
    total -= (bEnd - bStart);
  }
  const slotDuration = 30;
  const maxPatientsPerHour = 4;
  return { slotDuration, maxPatientsPerHour };
}

const DoctorScheduling = () => {
  const [doctors, setDoctors] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    doctorId: '',
    title: '',
    startTime: '',
    endTime: '',
    daysOfWeek: [],
    breakStart: '',
    breakEnd: '',
    maxPatientsPerHour: 4,
    slotDuration: 30,
    department: 'General',
    specialNotes: ''
  });
  const [departments, setDepartments] = useState([]);
  const [shiftType, setShiftType] = useState("");
  const [manualOverride, setManualOverride] = useState(false);
  const [activeTab, setActiveTab] = useState('schedule');

  const {
    leaveRequests,
    overtimeRequests,
    swapRequests,
    loading: requestsLoading,
    error: requestsError,
    refetch: refetchRequests
  } = useAdminDoctorRequests();

  useEffect(() => {
    fetchDoctors();
    fetchSchedules();
  }, []);

  useEffect(() => {
    if (doctors.length > 0) {
      const deptList = [...new Set(doctors.map(doc => doc.department).filter(Boolean))];
      setDepartments(deptList);
    }
  }, [doctors]);

  useEffect(() => {
    if (selectedDoctor) {
      fetchSchedules();
    }
  }, [selectedDoctor, selectedWeek]);
  useEffect(() => {
    if (!showScheduleForm) return;
    if (scheduleForm.doctorId && doctors.length > 0) {
      const doc = doctors.find(d => d._id === scheduleForm.doctorId);
      if (doc && doc.department && scheduleForm.department !== doc.department) {
        setScheduleForm(prev => ({ ...prev, department: doc.department }));
      }
    }
  }, [scheduleForm.doctorId, doctors, showScheduleForm]);
  useEffect(() => {
    if (!showScheduleForm || manualOverride) return;
    if (shiftType === "day" || shiftType === "night") {
      const config = DEFAULT_SHIFT_CONFIG[shiftType];
      setScheduleForm(prev => ({
        ...prev,
        startTime: config.startTime,
        endTime: config.endTime,
        breakStart: config.breakStart,
        breakEnd: config.breakEnd,
        slotDuration: config.slotDuration,
        maxPatientsPerHour: config.maxPatientsPerHour,
      }));
    } else if (shiftType === "both") {
      setScheduleForm(prev => ({
        ...prev,
        startTime: DEFAULT_SHIFT_CONFIG.day.startTime,
        endTime: DEFAULT_SHIFT_CONFIG.night.endTime,
        breakStart: DEFAULT_SHIFT_CONFIG.day.breakStart,
        breakEnd: DEFAULT_SHIFT_CONFIG.day.breakEnd,
        slotDuration: DEFAULT_SHIFT_CONFIG.day.slotDuration,
        maxPatientsPerHour: DEFAULT_SHIFT_CONFIG.day.maxPatientsPerHour,
      }));
    } else if (shiftType === "custom") {
    }
  }, [shiftType, manualOverride, showScheduleForm]);
  useEffect(() => {
    if (!showScheduleForm || manualOverride) return;
    if (scheduleForm.startTime && scheduleForm.endTime) {
      const { slotDuration, maxPatientsPerHour } = calculateSlotAndMaxPatients(
        scheduleForm.startTime,
        scheduleForm.endTime,
        scheduleForm.breakStart,
        scheduleForm.breakEnd
      );
      setScheduleForm(prev => ({
        ...prev,
        slotDuration,
        maxPatientsPerHour,
      }));
    }
  }, [scheduleForm.startTime, scheduleForm.endTime, scheduleForm.breakStart, scheduleForm.breakEnd, manualOverride, showScheduleForm]);

  function getCurrentWeek() {
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const result = startOfWeek.toISOString().split('T')[0];
    console.log('📅 Current week start:', result);
    return result;
  }

  const fetchDoctors = async () => {
    try {
      const data = await apiCall.get('/doctor/getalldoctors');
      if (Array.isArray(data)) {
        setDoctors(data);
      } else if (data && Array.isArray(data.doctors)) {
        setDoctors(data.doctors);
      } else {
        setDoctors([]);
      }
    } catch (err) {
      console.error('Fetch doctors error:', err);
      setDoctors([]);
    }
  };

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      let url = '/shift/all';
      
      const data = await apiCall.get(url);
      console.log('🔍 API Response:', data);
      
      if (Array.isArray(data)) {
        setSchedules(data);
      } else if (data && Array.isArray(data.shifts)) {
        setSchedules(data.shifts);
      } else {
        setSchedules([]);
      }
    } catch (err) {
      setError('Failed to fetch schedules');
      console.error('Fetch schedules error:', err);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchedule = async () => {
    try {
      if (!scheduleForm.doctorId || !scheduleForm.title || !scheduleForm.startTime || !scheduleForm.endTime || scheduleForm.daysOfWeek.length === 0) {
        alert('Please fill in all required fields');
        return;
      }
      const shiftData = {
        title: scheduleForm.title,
        startTime: scheduleForm.startTime,
        endTime: scheduleForm.endTime,
        daysOfWeek: scheduleForm.daysOfWeek,
        maxPatientsPerHour: scheduleForm.maxPatientsPerHour,
        slotDuration: scheduleForm.slotDuration,
        department: scheduleForm.department,
        specialNotes: scheduleForm.specialNotes,
        breakTime: {
          start: scheduleForm.breakStart,
          end: scheduleForm.breakEnd
        }
      };

      const response = await apiCall.post(`/shift/admin-create/${scheduleForm.doctorId}`, shiftData);
      
      await fetchSchedules();
      
      setShowScheduleForm(false);
      resetScheduleForm();
      alert('Schedule added successfully!');
    } catch (err) {
      console.error('Add schedule error:', err);
      alert(`Failed to add schedule: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleDeleteSchedule = async (scheduleId, shiftId) => {
    if (window.confirm('Are you sure you want to delete this schedule?')) {
      try {
        await apiCall.delete(`/shift/admin-delete/${shiftId || scheduleId}`);
        await fetchSchedules();
        alert('Schedule deleted successfully!');
      } catch (err) {
        console.error('Delete schedule error:', err);
        alert(`Failed to delete schedule: ${err.response?.data?.message || err.message}`);
      }
    }
  };

  const resetScheduleForm = () => {
    setScheduleForm({
      doctorId: '',
      title: '',
      startTime: '',
      endTime: '',
      daysOfWeek: [],
      breakStart: '',
      breakEnd: '',
      maxPatientsPerHour: 4,
      slotDuration: 30,
      department: 'General',
      specialNotes: ''
    });
    setShiftType("");
    setManualOverride(false);
  };

  const handleFormChange = (field, value) => {
    setManualOverride(true);
    setScheduleForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDayChange = (day, checked) => {
    setScheduleForm(prev => ({
      ...prev,
      daysOfWeek: checked 
        ? [...prev.daysOfWeek, day]
        : prev.daysOfWeek.filter(d => d !== day)
    }));
  };

  const getWeekDays = (weekStart) => {
    const days = [];
    const start = new Date(weekStart);
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getScheduleForDay = (date, doctorId) => {
    const dateStr = date.toISOString().split('T')[0];
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    console.log(`🗓️ Getting schedules for ${dateStr} (${dayName}), total schedules:`, schedules.length);
    
    // Ensure schedules is always an array before filtering
    if (!Array.isArray(schedules)) {
      console.log('❌ Schedules is not an array:', schedules);
      return [];
    }
    
    const filtered = schedules.filter(schedule => {
      // Check if this schedule applies to the current day
      const matchesDay = schedule.daysOfWeek && schedule.daysOfWeek.includes(dayName);
      const matchesDoctor = !doctorId || schedule.doctorId === doctorId;
      
      const matches = matchesDay && matchesDoctor;
      if (matches) {
        console.log(`✅ Found schedule for ${dateStr} (${dayName}):`, schedule);
      }
      return matches;
    });
    
    console.log(`📅 Schedules for ${dateStr}:`, filtered.length);
    return filtered;
  };

  const formatTime = (time) => {
    if (!time) return '';
    return new Date(`1970-01-01T${time}`).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Approve/Reject/Cancel handlers for admin actions
  const handleApproveLeave = async (id) => {
    await apiCall.patch(`/leave/${id}/process`, { status: 'approved' });
    refetchRequests();
  };
  const handleRejectLeave = async (id, reason) => {
    await apiCall.patch(`/leave/${id}/process`, { status: 'rejected', rejectionReason: reason });
    refetchRequests();
  };
  const handleCancelLeave = async (id) => {
    await apiCall.patch(`/leave/${id}/cancel`, {});
    refetchRequests();
  };
  const handleApproveOvertime = async (id) => {
    await apiCall.patch(`/overtime/${id}/status`, { status: 'approved' });
    refetchRequests();
  };
  const handleRejectOvertime = async (id, reason) => {
    await apiCall.patch(`/overtime/${id}/status`, { status: 'rejected', adminComment: reason });
    refetchRequests();
  };
  const handleApproveSwap = async (id) => {
    await apiCall.patch(`/shift-swap/${id}/status`, { status: 'approved' });
    refetchRequests();
  };
  const handleRejectSwap = async (id, reason) => {
    await apiCall.patch(`/shift-swap/${id}/status`, { status: 'rejected', adminComment: reason });
    refetchRequests();
  };

  if (loading && schedules.length === 0) {
    return (
      <>
        <NavbarWrapper />
        <div className="doctorScheduling_page">
          <div className="doctorScheduling_container">
            <div className="doctorScheduling_loadingContainer">
              <div className="doctorScheduling_spinner"></div>
              <p className="doctorScheduling_loadingText">Loading schedules...</p>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <NavbarWrapper />
        <div className="doctorScheduling_page">
          <div className="doctorScheduling_container">
            <div className="doctorScheduling_errorContainer">
              <p className="doctorScheduling_errorMessage">{error}</p>
              <button 
                className="doctorScheduling_retryButton"
                onClick={fetchSchedules}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <div className="doctorScheduling_page">
      <NavbarWrapper />
      <div className="doctorScheduling_container">
        <div className="doctorScheduling_header">
          <div>
            <h1 className="doctorScheduling_title">Doctor Scheduling</h1>
            <p className="doctorScheduling_description">
              Manage doctor schedules, availability, and time slots
            </p>
          </div>
          <button 
            className="doctorScheduling_addButton"
            onClick={() => {
              setShowScheduleForm(true);
              resetScheduleForm();
            }}
          >
            Add Schedule
          </button>
        </div>
        {/* Tabs for admin management */}
        <div className="doctorScheduling_tabs">
          <button className={`doctorScheduling_tabButton${activeTab === 'schedule' ? ' active' : ''}`} onClick={() => setActiveTab('schedule')}>Schedules</button>
          <button className={`doctorScheduling_tabButton${activeTab === 'leave' ? ' active' : ''}`} onClick={() => setActiveTab('leave')}>Leave Requests</button>
          <button className={`doctorScheduling_tabButton${activeTab === 'overtime' ? ' active' : ''}`} onClick={() => setActiveTab('overtime')}>Overtime Requests</button>
          <button className={`doctorScheduling_tabButton${activeTab === 'swap' ? ' active' : ''}`} onClick={() => setActiveTab('swap')}>Shift Swap Requests</button>
        </div>
        {/* Tab Content */}
        {activeTab === 'schedule' && (
          <>
            {/* Schedule Calendar */}
            <div className="doctorScheduling_section">
              <div className="doctorScheduling_sectionHeader">
                <h2 className="doctorScheduling_sectionTitle">Weekly Schedule</h2>
              </div>
              <div className="doctorScheduling_calendar">
                <div className="doctorScheduling_calendarHeader">
                  {getWeekDays(selectedWeek).map((day, index) => (
                    <div key={index} className="doctorScheduling_dayHeader">
                      <div className="doctorScheduling_dayName">
                        {day.toLocaleDateString([], { weekday: 'short' })}
                      </div>
                      <div className="doctorScheduling_dayDate">
                        {day.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="doctorScheduling_calendarBody">
                  {getWeekDays(selectedWeek).map((day, dayIndex) => (
                    <div key={dayIndex} className="doctorScheduling_dayColumn">
                      {getScheduleForDay(day, selectedDoctor).map((schedule, scheduleIndex) => (
                        <div key={scheduleIndex} className="doctorScheduling_scheduleCard">
                          <div className="doctorScheduling_scheduleHeader">
                            <span className="doctorScheduling_doctorName">
                              {schedule.doctorId?.firstname && schedule.doctorId?.lastname 
                                ? `Dr. ${schedule.doctorId.firstname} ${schedule.doctorId.lastname}`
                                : schedule.doctorName || 'Unknown Doctor'}
                            </span>
                            <span className="doctorScheduling_scheduleTitle">
                              {schedule.title}
                            </span>
                          </div>
                          <div className="doctorScheduling_scheduleTime">
                            {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                          </div>
                          {schedule.breakStart && schedule.breakEnd && (
                            <div className="doctorScheduling_breakTime">
                              Break: {formatTime(schedule.breakStart)} - {formatTime(schedule.breakEnd)}
                            </div>
                          )}
                          <div className="doctorScheduling_scheduleInfo">
                            <div className="doctorScheduling_infoRow">
                              Max: {schedule.maxPatientsPerHour || schedule.maxPatients || 'N/A'}/hour
                            </div>
                            <div className="doctorScheduling_infoRow">
                              Slot: {schedule.slotDuration || 30} min
                            </div>
                            {schedule.department && (
                              <div className="doctorScheduling_infoRow">
                                Dept: {schedule.department}
                              </div>
                            )}
                          </div>
                          {schedule.specialNotes && (
                            <div className="doctorScheduling_scheduleNotes">
                              {schedule.specialNotes}
                            </div>
                          )}
                          <div className="doctorScheduling_scheduleActions">
                            <button 
                              className="doctorScheduling_deleteButton"
                              onClick={() => handleDeleteSchedule(schedule._id, schedule.shiftId)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                      {getScheduleForDay(day, selectedDoctor).length === 0 && (
                        <div className="doctorScheduling_noSchedule">
                          No schedules
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
        {activeTab === 'leave' && (
          <div>
            {requestsLoading ? <div className="doctorScheduling_requestsLoading">Loading...</div> : null}
            {requestsError ? <div className="doctorScheduling_requestsError">{requestsError}</div> : null}
            <table className="doctorScheduling_requestsTable">
              <thead>
                <tr>
                  <th>Doctor</th><th>Type</th><th>From</th><th>To</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.map(lr => (
                  <tr key={lr._id}>
                    <td>{lr.doctorId?.firstname} {lr.doctorId?.lastname}</td>
                    <td>{lr.leaveType}</td>
                    <td>{new Date(lr.startDate).toLocaleDateString()}</td>
                    <td>{new Date(lr.endDate).toLocaleDateString()}</td>
                    <td>{lr.status}</td>
                    <td>
                      {lr.status === 'pending' && <>
                        <button className="doctorScheduling_actionButton" onClick={() => handleApproveLeave(lr._id)}>Approve</button>
                        <button className="doctorScheduling_actionButton reject" onClick={() => handleRejectLeave(lr._id, prompt('Rejection reason?'))}>Reject</button>
                      </>}
                      {lr.status === 'approved' && <button className="doctorScheduling_actionButton cancel" onClick={() => handleCancelLeave(lr._id)}>Cancel</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {activeTab === 'overtime' && (
          <div>
            {requestsLoading ? <div className="doctorScheduling_requestsLoading">Loading...</div> : null}
            {requestsError ? <div className="doctorScheduling_requestsError">{requestsError}</div> : null}
            <table className="doctorScheduling_requestsTable">
              <thead>
                <tr>
                  <th>Doctor</th><th>Date</th><th>Hours</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {overtimeRequests.map(ot => (
                  <tr key={ot._id}>
                    <td>{ot.doctorId?.firstname} {ot.doctorId?.lastname}</td>
                    <td>{new Date(ot.date).toLocaleDateString()}</td>
                    <td>{ot.hours}</td>
                    <td>{ot.status}</td>
                    <td>
                      {ot.status === 'pending' && <>
                        <button className="doctorScheduling_actionButton" onClick={() => handleApproveOvertime(ot._id)}>Approve</button>
                        <button className="doctorScheduling_actionButton reject" onClick={() => handleRejectOvertime(ot._id, prompt('Rejection reason?'))}>Reject</button>
                      </>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {activeTab === 'swap' && (
          <div>
            {requestsLoading ? <div className="doctorScheduling_requestsLoading">Loading...</div> : null}
            {requestsError ? <div className="doctorScheduling_requestsError">{requestsError}</div> : null}
            <table className="doctorScheduling_requestsTable">
              <thead>
                <tr>
                  <th>Requester</th><th>Swap With</th><th>Original Shift</th><th>Requested Shift</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {swapRequests.map(sw => (
                  <tr key={sw._id}>
                    <td>{sw.requesterId?.firstname} {sw.requesterId?.lastname}</td>
                    <td>{sw.swapWithId?.firstname} {sw.swapWithId?.lastname}</td>
                    <td>{sw.originalShiftId?.title}</td>
                    <td>{sw.requestedShiftId?.title}</td>
                    <td>{sw.status}</td>
                    <td>
                      {sw.status === 'pending' && <>
                        <button className="doctorScheduling_actionButton" onClick={() => handleApproveSwap(sw._id)}>Approve</button>
                        <button className="doctorScheduling_actionButton reject" onClick={() => handleRejectSwap(sw._id, prompt('Rejection reason?'))}>Reject</button>
                      </>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default DoctorScheduling;