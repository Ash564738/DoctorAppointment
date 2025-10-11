import React, { useEffect, useMemo, useState } from 'react';
import NavbarWrapper from '../../../components/Common/NavbarWrapper/NavbarWrapper';
import Footer from '../../../components/Common/Footer/Footer';
import { apiCall } from '../../../helper/apiCall';
import useAdminDoctorRequests from '../../../hooks/useAdminDoctorRequests';
import './DoctorScheduling.css';

import { getCurrentWeek, getWeekDays } from './schedulingUtils';
import FiltersBar from './FiltersBar';
import TabsHeader from './TabsHeader';
import ScheduleMatrix from './ScheduleMatrix';
import LeaveRequestsTable from './LeaveRequestsTable';
import OvertimeRequestsTable from './OvertimeRequestsTable';
import SwapRequestsTable from './SwapRequestsTable';
import ShiftRequestsTable from './ShiftRequestsTable';
import CreateShiftModal from './CreateShiftModal';
import PageHeader from '../../../components/Common/PageHeader/PageHeader';

const DoctorScheduling = () => {
  const [doctors, setDoctors] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(getCurrentWeek() && '');
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
  const [shiftRequests, setShiftRequests] = useState([]);
  const [shiftReqLoading, setShiftReqLoading] = useState(false);
  const [shiftReqError, setShiftReqError] = useState(null);
  
  const {
    leaveRequests,
    overtimeRequests,
    swapRequests,
    loading: requestsLoading,
    error: requestsError,
    refetch: refetchRequests
  } = useAdminDoctorRequests();

  const weekDays = useMemo(() => getWeekDays(selectedWeek), [selectedWeek]);

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
    fetchSchedules();
  }, [selectedDoctor, selectedWeek]);

  useEffect(() => {
    if (activeTab === 'leave' || activeTab === 'overtime' || activeTab === 'swap') {
      refetchRequests();
    }
    if (activeTab === 'shiftRequests') {
      fetchShiftRequests();
    }
  }, [activeTab]);

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
      const params = new URLSearchParams();
      if (selectedWeek) params.set('weekStart', selectedWeek);
      if (selectedDoctor) params.set('doctorId', selectedDoctor);
      const data = await apiCall.get(`/shift?${params.toString()}`);
      const list = Array.isArray(data?.schedules) ? data.schedules : [];
      setSchedules(list);
    } catch (err) {
      setError('Failed to fetch schedules');
      console.error('Fetch schedules error:', err);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchShiftRequests = async () => {
    try {
      setShiftReqLoading(true);
      const res = await apiCall.get('/shift/pending');
      setShiftRequests(Array.isArray(res?.shifts) ? res.shifts : []);
      setShiftReqError(null);
    } catch (e) {
      console.error('Fetch shift requests error:', e);
      setShiftRequests([]);
      setShiftReqError('Failed to fetch shift requests');
    } finally {
      setShiftReqLoading(false);
    }
  };

  const handleAddSchedule = async () => {
    try {
      if (!scheduleForm.doctorId || !scheduleForm.title || !scheduleForm.startTime || !scheduleForm.endTime || scheduleForm.daysOfWeek.length === 0) {
        alert('Please fill in all required fields');
        return;
      }
      const basePayload = {
        title: scheduleForm.title,
        startTime: scheduleForm.startTime,
        endTime: scheduleForm.endTime,
        daysOfWeek: scheduleForm.daysOfWeek,
        maxPatientsPerHour: scheduleForm.maxPatientsPerHour,
        slotDuration: scheduleForm.slotDuration,
        department: scheduleForm.department,
        specialNotes: scheduleForm.specialNotes,
        breakTime: (scheduleForm.breakStart && scheduleForm.breakEnd) ? { start: scheduleForm.breakStart, end: scheduleForm.breakEnd } : undefined,
      };

      const toMin = (t) => { const [h,m] = t.split(':').map(Number); return h*60+m; };
      const startM = toMin(scheduleForm.startTime);
      const endM = toMin(scheduleForm.endTime);

      if (endM <= startM) {
        const nextDayMap = {
          Monday: 'Tuesday',
          Tuesday: 'Wednesday',
          Wednesday: 'Thursday',
          Thursday: 'Friday',
          Friday: 'Saturday',
          Saturday: 'Sunday',
          Sunday: 'Monday',
        };
        const nextDays = (basePayload.daysOfWeek || []).map(d => nextDayMap[d]).filter(Boolean);

        const firstSegment = { ...basePayload, endTime: '23:59' };
        if (basePayload.breakTime) {
          const bS = toMin(basePayload.breakTime.start);
          const bE = toMin(basePayload.breakTime.end);
          const breakInFirst = bS >= startM && bE > bS; // same-day window
          firstSegment.breakTime = breakInFirst ? basePayload.breakTime : undefined;
        }
        const createSecond = endM !== 0 && nextDays.length > 0;
        const secondSegment = createSecond ? { ...basePayload, startTime: '00:00', endTime: basePayload.endTime, daysOfWeek: nextDays } : null;
        if (secondSegment && basePayload.breakTime) {
          const bS = toMin(basePayload.breakTime.start);
          const bE = toMin(basePayload.breakTime.end);
          const breakLikelySecond = bS < startM || bS === 0;
          secondSegment.breakTime = breakLikelySecond ? basePayload.breakTime : undefined;
        }

        await apiCall.post(`/shift/admin-create/${scheduleForm.doctorId}`, firstSegment);
        if (secondSegment) {
          await apiCall.post(`/shift/admin-create/${scheduleForm.doctorId}`, secondSegment);
        }
      } else {
        await apiCall.post(`/shift/admin-create/${scheduleForm.doctorId}`, basePayload);
      }

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

  const handleApproveLeave = async (id) => {
    await apiCall.patch(`/leave/${id}/process`, { status: 'approved' });
    refetchRequests();
    fetchSchedules();
  };
  const handleRejectLeave = async (id, reason) => {
    await apiCall.patch(`/leave/${id}/process`, { status: 'rejected', rejectionReason: reason });
    refetchRequests();
    fetchSchedules();
  };
  const handleCancelLeave = async (id) => {
    await apiCall.patch(`/leave/${id}/cancel`, {});
    refetchRequests();
    fetchSchedules();
  };
  const handleApproveOvertime = async (id) => {
    try {
      await apiCall.patch(`/overtime/${id}/status`, { status: 'approved' });
      refetchRequests();
      fetchSchedules();
    } catch (e) {
      console.error('Approve overtime error:', e);
      alert(`Failed to approve overtime: ${e.response?.data?.message || e.message}`);
    }
  };
  const handleRejectOvertime = async (id, reason) => {
    try {
      await apiCall.patch(`/overtime/${id}/status`, { status: 'rejected', adminComment: reason || '' });
      refetchRequests();
      fetchSchedules();
    } catch (e) {
      console.error('Reject overtime error:', e);
      alert(`Failed to reject overtime: ${e.response?.data?.message || e.message}`);
    }
  };
  const handleApproveSwap = async (id) => {
    try {
      await apiCall.patch(`/shift-swap/${id}/status`, { status: 'approved' });
      refetchRequests();
      fetchSchedules();
    } catch (e) {
      console.error('Approve swap error:', e);
      alert(`Failed to approve swap: ${e.response?.data?.message || e.message}`);
    }
  };

  const handleApproveShiftRequest = async (id) => {
    try {
      await apiCall.patch(`/shift/request/${id}`, { decision: 'approved' });
      fetchShiftRequests();
      fetchSchedules();
    } catch (e) {
      console.error('Approve shift request error:', e);
      alert(`Failed to approve shift request: ${e.response?.data?.message || e.message}`);
    }
  };

  const handleRejectShiftRequest = async (id, reason) => {
    try {
      await apiCall.patch(`/shift/request/${id}`, { decision: 'rejected', adminComment: reason || '' });
      fetchShiftRequests();
    } catch (e) {
      console.error('Reject shift request error:', e);
      alert(`Failed to reject shift request: ${e.response?.data?.message || e.message}`);
    }
  };
  const handleRejectSwap = async (id, reason) => {
    try {
      await apiCall.patch(`/shift-swap/${id}/status`, { status: 'rejected', adminComment: reason || '' });
      refetchRequests();
      fetchSchedules();
    } catch (e) {
      console.error('Reject swap error:', e);
      alert(`Failed to reject swap: ${e.response?.data?.message || e.message}`);
    }
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
        <PageHeader
          title="Doctor Scheduling"
          subtitle="Manage doctor schedules, availability, and time slots"
          className="doctorScheduling_header"
          actions={(
            <button 
              className="doctorScheduling_addButton"
              onClick={() => {
                setShowScheduleForm(true);
                resetScheduleForm();
              }}
            >
              Add Schedule
            </button>
          )}
        />

        <FiltersBar
          doctors={doctors}
          selectedDoctor={selectedDoctor}
          onDoctorChange={setSelectedDoctor}
          selectedWeek={selectedWeek}
          onWeekChange={setSelectedWeek}
        />

        <div className="doctorScheduling_section">
          <TabsHeader activeTab={activeTab} onChange={setActiveTab} />

          {activeTab === 'schedule' && (
            <>
              <ScheduleMatrix
                doctors={(selectedDoctor ? doctors.filter(d => d.userId?._id === selectedDoctor) : doctors)}
                leaveRequests={leaveRequests}
                overtimeRequests={overtimeRequests}
                swapRequests={swapRequests}
                weekDays={weekDays}
                schedules={schedules}
                onDeleteSchedule={handleDeleteSchedule}
              />
            </>
          )}

          {activeTab === 'leave' && (
            <>
              {requestsLoading ? <div className="doctorScheduling_requestsLoading">Loading...</div> : null}
              {requestsError ? <div className="doctorScheduling_requestsError">{requestsError}</div> : null}
              <LeaveRequestsTable leaveRequests={leaveRequests} onApprove={handleApproveLeave} onReject={handleRejectLeave} />
            </>
          )}

          {activeTab === 'overtime' && (
            <>
              {requestsLoading ? <div className="doctorScheduling_requestsLoading">Loading...</div> : null}
              {requestsError ? <div className="doctorScheduling_requestsError">{requestsError}</div> : null}
              <OvertimeRequestsTable overtimeRequests={overtimeRequests} onApprove={handleApproveOvertime} onReject={handleRejectOvertime} />
            </>
          )}

          {activeTab === 'swap' && (
            <>
              {requestsLoading ? <div className="doctorScheduling_requestsLoading">Loading...</div> : null}
              {requestsError ? <div className="doctorScheduling_requestsError">{requestsError}</div> : null}
              <SwapRequestsTable swapRequests={swapRequests} onApprove={handleApproveSwap} onReject={handleRejectSwap} />
            </>
          )}

          {activeTab === 'shiftRequests' && (
            <>
              {shiftReqLoading ? <div className="doctorScheduling_requestsLoading">Loading...</div> : null}
              {shiftReqError ? <div className="doctorScheduling_requestsError">{shiftReqError}</div> : null}
              <ShiftRequestsTable requests={shiftRequests} onApprove={handleApproveShiftRequest} onReject={handleRejectShiftRequest} loading={shiftReqLoading} />
            </>
          )}
        </div>
      </div>
      <Footer />

      <CreateShiftModal
        open={showScheduleForm}
        onClose={() => setShowScheduleForm(false)}
        doctors={doctors}
        scheduleForm={scheduleForm}
        setScheduleForm={setScheduleForm}
        shiftType={shiftType}
        setShiftType={setShiftType}
        manualOverride={manualOverride}
        setManualOverride={setManualOverride}
        onCreate={handleAddSchedule}
      />
    </div>
  );
};

export default DoctorScheduling;