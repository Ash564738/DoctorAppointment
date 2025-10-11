import React, { useEffect, useState } from 'react';
import NavbarWrapper from '../../../components/Common/NavbarWrapper/NavbarWrapper';
import Footer from '../../../components/Common/Footer/Footer';
import { apiCall } from '../../../helper/apiCall';
import toast from 'react-hot-toast';
import './ShiftManagement.css';
import StatsRow from './StatsRow';
import MyShiftsSection from './MyShiftsSection';
import LeaveRequestsSection from './LeaveRequestsSection';
import SwapRequestsSection from './SwapRequestsSection';
import CoverageRequestsSection from './CoverageRequestsSection';
import OvertimeRecordsSection from './OvertimeRecordsSection';
import SwapModal from './SwapModal';
import LeaveModal from './LeaveModal';
import OvertimeModal from './OvertimeModal';
import PageHeader from '../../../components/Common/PageHeader/PageHeader';
import CreateShiftModal from './CreateShiftModal';

const ShiftManagement = () => {
  const [shifts, setShifts] = useState([]);
  const [swapRequests, setSwapRequests] = useState([]);
  const [coverageRequests, setCoverageRequests] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [overtimeRecords, setOvertimeRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [showCreateShift, setShowCreateShift] = useState(false);
  const [swapForm, setSwapForm] = useState({ originalShiftId: '', requestedShiftId: '', withUser: '', swapDate: '', swapStartDate: '', swapEndDate: '', reason: '', swapType: 'trade' });
  const [leaveForm, setLeaveForm] = useState({ type: '', from: '', to: '', reason: '', isEmergency: false, coveringStaffIds: [], attachments: [] });
  const [overtimeForm, setOvertimeForm] = useState({ shiftId: '', date: '', hours: '', reason: '' });
  const [scheduleForm, setScheduleForm] = useState({
    title: '',
    startTime: '',
    endTime: '',
    breakStart: '',
    breakEnd: '',
    slotDuration: 30,
    maxPatientsPerHour: 4,
    daysOfWeek: [],
    department: '',
    specialNotes: ''
  });
  const [shiftType, setShiftType] = useState('');
  const [manualOverride, setManualOverride] = useState(false);
  const [availableShifts, setAvailableShifts] = useState([]);
  const [colleagues, setColleagues] = useState([]);
  const [colleagueShifts, setColleagueShifts] = useState([]);
  const [doctorShiftsCache, setDoctorShiftsCache] = useState({}); // cache requester (RD) shifts for coverage time display
  
  // helpers moved to utils/shiftUtils

  useEffect(() => {
    fetchShiftData();
    fetchAvailableShifts();
    fetchColleagues();
  }, []);

  const fetchShiftData = async () => {
    setLoading(true);
    try {
      const [shiftsRes, swapsRes, leavesRes, overtimeRes, myCoverageRes] = await Promise.all([
        apiCall.get('/shift/mydoctorshifts'),
        apiCall.get('/shift-swap/my-swaps'),
        apiCall.get('/leave'),
        apiCall.get('/overtime/my-overtime'),
        apiCall.get('/leave/my-coverage-requests')
      ]);
      setShifts(shiftsRes?.shifts || []);
      setSwapRequests(swapsRes?.data || []);
      setLeaveRequests(leavesRes?.leaveRequests || []);
      setOvertimeRecords(overtimeRes?.data || []);
      setCoverageRequests(myCoverageRes?.data || []);
    } catch (error) {
      console.error('Error fetching shift data:', error);
      toast.error('Failed to fetch shift management data');
      setShifts([]);
      setSwapRequests([]);
      setLeaveRequests([]);
      setOvertimeRecords([]);
      setCoverageRequests([]);
    }
    setLoading(false);
  };

  const fetchAvailableShifts = async () => {
    try {
      const res = await apiCall.get('/shift/mydoctorshifts');
      setAvailableShifts(res?.shifts || []);
    } catch {
      setAvailableShifts([]);
    }
  };

  const fetchColleagues = async () => {
    try {
      const res = await apiCall.get('/doctor/getalldoctors');
      setColleagues(res?.doctors || res || []);
    } catch {
      setColleagues([]);
    }
  };

  useEffect(() => {
    const fetch = async () => {
      if (!swapForm.withUser) { setColleagueShifts([]); return; }
      try {
        const res = await apiCall.get(`/shift/doctor/${swapForm.withUser}`);
        setColleagueShifts(res?.shifts || []);
      } catch {
        setColleagueShifts([]);
      }
    };
    fetch();
  }, [swapForm.withUser]);

  // Prefetch requester (RD) shifts for coverage requests to display time windows
  useEffect(() => {
    if (!Array.isArray(coverageRequests) || coverageRequests.length === 0) return;
    const ids = Array.from(new Set(coverageRequests
      .map(req => (req.doctorId?._id) || req.doctorId)
      .filter(Boolean)));
    const toFetch = ids.filter(id => !doctorShiftsCache[id]);
    if (toFetch.length === 0) return;
    (async () => {
      try {
        const results = await Promise.all(toFetch.map(async (id) => {
          try {
            const res = await apiCall.get(`/shift/doctor/${id}`);
            return { id, shifts: res?.shifts || [] };
          } catch {
            return { id, shifts: [] };
          }
        }));
        setDoctorShiftsCache(prev => {
          const next = { ...prev };
          results.forEach(r => { next[r.id] = r.shifts; });
          return next;
        });
      } catch {
        // ignore
      }
    })();
  }, [coverageRequests, doctorShiftsCache]);
  const filteredColleagueShifts = React.useMemo(() => {
    if (swapForm.swapType !== 'trade') return colleagueShifts;
    const getDayName = (d) => new Date(d).toLocaleDateString('en-US', { weekday: 'long' });
    const requiredDays = new Set();
    if (swapForm.swapDate) {
      requiredDays.add(getDayName(swapForm.swapDate));
    } else if (swapForm.swapStartDate && swapForm.swapEndDate) {
      const s = new Date(swapForm.swapStartDate);
      const e = new Date(swapForm.swapEndDate);
      if (!isNaN(s) && !isNaN(e) && e >= s) {
        const cur = new Date(s);
        while (cur <= e) {
          requiredDays.add(getDayName(cur));
          cur.setDate(cur.getDate() + 1);
        }
      }
    }
    if (requiredDays.size === 0) return colleagueShifts;
    return colleagueShifts.filter(s => {
      const sDays = new Set(s.daysOfWeek || []);
      for (const d of requiredDays) { if (sDays.has(d)) return true; }
      return false;
    });
  }, [swapForm.swapType, swapForm.swapDate, swapForm.swapStartDate, swapForm.swapEndDate, colleagueShifts]);
  useEffect(() => {
    if (swapForm.swapType !== 'trade') return;
    if (!swapForm.requestedShiftId) return;
    const stillValid = filteredColleagueShifts.some(s => (s._id || s.id) === swapForm.requestedShiftId);
    if (!stillValid) {
      setSwapForm(prev => ({ ...prev, requestedShiftId: '' }));
    }
  }, [filteredColleagueShifts, swapForm.swapType, swapForm.requestedShiftId]);
  const requestedShiftCoverageNote = React.useMemo(() => {
    if (swapForm.swapType !== 'trade' || !swapForm.requestedShiftId) return null;
    const getDayName = (d) => new Date(d).toLocaleDateString('en-US', { weekday: 'long' });
    const requiredDays = new Set();
    if (swapForm.swapDate) {
      requiredDays.add(getDayName(swapForm.swapDate));
    } else if (swapForm.swapStartDate && swapForm.swapEndDate) {
      const s = new Date(swapForm.swapStartDate);
      const e = new Date(swapForm.swapEndDate);
      if (!isNaN(s) && !isNaN(e) && e >= s) {
        const cur = new Date(s);
        while (cur <= e) {
          requiredDays.add(getDayName(cur));
          cur.setDate(cur.getDate() + 1);
        }
      }
    }
    if (requiredDays.size === 0) return null;
    const sel = colleagueShifts.find(s => (s._id || s.id) === swapForm.requestedShiftId);
    if (!sel) return null;
    const sDays = new Set(sel.daysOfWeek || []);
    const missing = Array.from(requiredDays).filter(d => !sDays.has(d));
    if (missing.length === 0) return null;
    const short = (name) => ({ Sunday:'Sun', Monday:'Mon', Tuesday:'Tue', Wednesday:'Wed', Thursday:'Thu', Friday:'Fri', Saturday:'Sat' }[name] || name);
    const missingLabel = missing.map(short).join(', ');
    return `Note: selected shift doesn’t include ${missingLabel}. Those days will be covered (not traded).`;
  }, [swapForm.swapType, swapForm.requestedShiftId, swapForm.swapDate, swapForm.swapStartDate, swapForm.swapEndDate, colleagueShifts]);

  const showApiError = (error, fallback = 'Action failed') => {
    const msg = error?.response?.data?.message
      || error?.response?.data?.error
      || (Array.isArray(error?.response?.data?.errors) && error.response.data.errors.map(e => e.msg || e.message).join('; '))
      || error?.message
      || fallback;
    toast.error(msg);
  };

  const currentUserId = React.useMemo(() => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      const base64 = token.split('.')[1];
      const payload = JSON.parse(atob(base64));
      return payload?.userId || null;
    } catch { return null; }
  }, []);

  const currentDoctor = React.useMemo(() => {
    return (colleagues || []).find(c => (c.userId?._id) === currentUserId);
  }, [colleagues, currentUserId]);

  const coverageEligibleColleagues = React.useMemo(() => {
    if (!Array.isArray(colleagues) || colleagues.length === 0) return [];
    if (!currentDoctor) return colleagues; // fallback until we know current doctor
    const myDept = (currentDoctor.department || '').trim().toLowerCase();
    const mySpec = (currentDoctor.specialization || '').trim().toLowerCase();
    return colleagues.filter(c => {
      const uid = c.userId?._id;
      if (!uid || uid === currentUserId) return false; // exclude self or invalid
      const dept = (c.department || '').trim().toLowerCase();
      const spec = (c.specialization || '').trim().toLowerCase();
      const deptMatch = myDept && dept && dept === myDept;
      const specMatch = mySpec && spec && spec === mySpec;
      return deptMatch || specMatch;
    });
  }, [colleagues, currentDoctor, currentUserId]);
  const swapEligibleColleagues = React.useMemo(() => coverageEligibleColleagues, [coverageEligibleColleagues]);

  const respondSwapPartner = async (swapId, decision) => {
    try {
      await apiCall.post(`/shift-swap/${swapId}/respond`, { decision });
      toast.success(`Swap ${decision}`);
      fetchShiftData();
    } catch (error) {
      showApiError(error, `Failed to ${decision} swap`);
    }
  };

  const respondCoverage = async (requestId, decision, shiftDate) => {
    try {
      await apiCall.post(`/leave/${requestId}/cover/respond`, shiftDate ? { decision, shiftDate } : { decision });
      toast.success(`Coverage ${decision}`);
      fetchShiftData();
    } catch (error) {
      showApiError(error, `Failed to ${decision} coverage`);
    }
  };

  const handleSwapSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!swapForm.swapDate && !(swapForm.swapStartDate && swapForm.swapEndDate)) {
        toast.error('Select a swap date or a date range');
        return;
      }
      if (swapForm.swapType === 'trade' && !swapForm.requestedShiftId) {
        toast.error('Select the colleague\'s shift to trade with');
        return;
      }
      if (swapForm.swapType === 'cover') {
      }
      if (swapForm.swapStartDate && swapForm.swapEndDate) {
        const s = new Date(swapForm.swapStartDate);
        const ed = new Date(swapForm.swapEndDate);
        if (ed < s) {
          toast.error('Swap end date must be after or equal to start date');
          return;
        }
      }
      const myDaysSet = new Set([].concat(...(availableShifts || []).map(sh => sh.daysOfWeek || [])));
      const isWorkingDay = (d) => myDaysSet.has(new Date(d).toLocaleDateString('en-US', { weekday: 'long' }));
      if (swapForm.swapDate && !isWorkingDay(swapForm.swapDate)) {
        toast.error('You can only swap on days you are scheduled to work');
        return;
      }
      if (swapForm.swapStartDate && swapForm.swapEndDate) {
        let cur = new Date(swapForm.swapStartDate);
        const end = new Date(swapForm.swapEndDate);
        while (cur <= end) {
          if (!isWorkingDay(cur)) {
            toast.error('Range includes days you are not scheduled to work');
            return;
          }
          cur.setDate(cur.getDate() + 1);
        }
      }
      await apiCall.post('/shift-swap/create', {
        originalShiftId: swapForm.originalShiftId,
        requestedShiftId: swapForm.swapType === 'trade' ? swapForm.requestedShiftId : undefined,
        swapWithId: swapForm.withUser,
        swapType: swapForm.swapType || 'trade',
        swapDate: swapForm.swapDate,
        swapStartDate: swapForm.swapStartDate || undefined,
        swapEndDate: swapForm.swapEndDate || undefined,
        reason: swapForm.reason
      });
      toast.success('Swap request submitted successfully');
      setShowSwapModal(false);
      setSwapForm({ originalShiftId: '', requestedShiftId: '', withUser: '', swapDate: '', swapStartDate: '', swapEndDate: '', reason: '', swapType: 'trade' });
      fetchShiftData();
    } catch (error) {
      showApiError(error, 'Failed to submit swap request');
    }
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!leaveForm.type) {
        toast.error('Please select a leave type');
        return;
      }
      if (!leaveForm.from || !leaveForm.to) {
        toast.error('Please select a valid date range');
        return;
      }
      const fromDate = new Date(leaveForm.from);
      const toDate = new Date(leaveForm.to);
      if (toDate < fromDate) {
        toast.error('End date must be after or equal to start date');
        return;
      }
      if ((leaveForm.reason || '').trim().length < 10) {
        toast.error('Reason must be at least 10 characters');
        return;
      }
      const myDaysSet = new Set([].concat(...(availableShifts || []).map(sh => sh.daysOfWeek || [])));
      const isWorkingDay = (d) => myDaysSet.has(new Date(d).toLocaleDateString('en-US', { weekday: 'long' }));
      let cur = new Date(leaveForm.from);
      const end = new Date(leaveForm.to);
      while (cur <= end) {
        if (!isWorkingDay(cur)) {
          toast.error('Leave includes a day you are not scheduled to work');
          return;
        }
        cur.setDate(cur.getDate() + 1);
      }
      const hasFiles = Array.isArray(leaveForm.attachments) && leaveForm.attachments.length > 0;
      const hasCovering = Array.isArray(leaveForm.coveringStaffIds) && leaveForm.coveringStaffIds.length > 0;
      if (hasFiles || hasCovering) {
        const form = new FormData();
        form.append('leaveType', leaveForm.type);
        form.append('startDate', leaveForm.from);
        form.append('endDate', leaveForm.to);
        form.append('reason', leaveForm.reason);
        form.append('isEmergency', String(!!leaveForm.isEmergency));
        if (hasCovering) form.append('coveringStaffIds', JSON.stringify(leaveForm.coveringStaffIds));
        if (hasFiles) {
          leaveForm.attachments.forEach(f => form.append('attachments', f));
        }
        await apiCall.post('/leave/request', form, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      } else {
        await apiCall.post('/leave/request', {
          leaveType: leaveForm.type,
          startDate: leaveForm.from,
          endDate: leaveForm.to,
          reason: leaveForm.reason,
          isEmergency: !!leaveForm.isEmergency
        });
      }
      toast.success('Leave request submitted successfully');
      setShowLeaveModal(false);
      setLeaveForm({ type: '', from: '', to: '', reason: '', isEmergency: false, coveringStaffIds: [], attachments: [] });
      fetchShiftData();
    } catch (error) {
      showApiError(error, 'Failed to submit leave request');
    }
  };

  const handleOvertimeSubmit = async (e) => {
    e.preventDefault();
    try {
      const myDaysSet = new Set([].concat(...(availableShifts || []).map(sh => sh.daysOfWeek || [])));
      const isWorkingDay = (d) => myDaysSet.has(new Date(d).toLocaleDateString('en-US', { weekday: 'long' }));
      if (!isWorkingDay(overtimeForm.date)) {
        toast.error('You can only request overtime on a working day');
        return;
      }
      await apiCall.post('/overtime/create', {
        shiftId: overtimeForm.shiftId,
        date: overtimeForm.date,
        hours: overtimeForm.hours,
        reason: overtimeForm.reason
      });
      toast.success('Overtime record submitted successfully');
      setShowOvertimeModal(false);
      setOvertimeForm({ shiftId: '', date: '', hours: '', reason: '' });
      fetchShiftData();
    } catch (error) {
      showApiError(error, 'Failed to submit overtime record');
    }
  };

  const handleCreateShift = async () => {
    try {
      if (!scheduleForm.title || scheduleForm.title.trim().length < 3) {
        toast.error('Title must be at least 3 characters');
        return;
      }
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(scheduleForm.startTime) || !timeRegex.test(scheduleForm.endTime)) {
        toast.error('Start/End time must be in HH:MM');
        return;
      }
      if (!Array.isArray(scheduleForm.daysOfWeek) || scheduleForm.daysOfWeek.length === 0) {
        toast.error('Select at least one day');
        return;
      }
      const payload = {
        title: scheduleForm.title.trim(),
        startTime: scheduleForm.startTime,
        endTime: scheduleForm.endTime,
        daysOfWeek: scheduleForm.daysOfWeek,
        maxPatientsPerHour: scheduleForm.maxPatientsPerHour,
        slotDuration: scheduleForm.slotDuration,
        department: scheduleForm.department || undefined,
        specialNotes: scheduleForm.specialNotes || undefined,
        breakTime: (scheduleForm.breakStart && scheduleForm.breakEnd) ? { start: scheduleForm.breakStart, end: scheduleForm.breakEnd } : undefined
      };
      await apiCall.post('/shift/create', payload);
      toast.success('Shift created');
      setShowCreateShift(false);
      setScheduleForm({ title: '', startTime: '', endTime: '', breakStart: '', breakEnd: '', slotDuration: 30, maxPatientsPerHour: 4, daysOfWeek: [], department: '', specialNotes: '' });
      setShiftType('');
      setManualOverride(false);
      fetchShiftData();
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to create shift';
      toast.error(msg);
    }
  };

  return (
    <div className="shiftManagement_page">
      <NavbarWrapper />
      <div className="shiftManagement_container">
        <div className="shiftManagement_content">
          <PageHeader
            title="Shift Management"
            subtitle="Manage your shifts, leave requests, and overtime records"
            className="shiftManagement_header"
            actions={(
              <button
                className="shiftManagement_actionButton shiftManagement_actionButton--primary"
                onClick={() => { setShowCreateShift(true); setManualOverride(false); }}
              >
                Create Shift
              </button>
            )}
          />

          <StatsRow
            shiftsCount={shifts.length}
            swapRequests={swapRequests}
            leaveCount={leaveRequests.length}
            overtimeRecords={overtimeRecords}
          />

          <div className="shiftManagement_mainGrid">
            <MyShiftsSection shifts={shifts} loading={loading} onOpenSwap={() => setShowSwapModal(true)} />
            <LeaveRequestsSection leaveRequests={leaveRequests} loading={loading} onOpenLeave={() => setShowLeaveModal(true)} />
          </div>

          <SwapRequestsSection
            swapRequests={swapRequests}
            loading={loading}
            currentUserId={currentUserId}
            colleagues={colleagues}
            onRespond={respondSwapPartner}
          />

          <CoverageRequestsSection
            coverageRequests={coverageRequests}
            loading={loading}
            doctorShiftsCache={doctorShiftsCache}
            onRespond={respondCoverage}
          />

          <OvertimeRecordsSection
            overtimeRecords={overtimeRecords}
            loading={loading}
            onOpenOvertime={() => setShowOvertimeModal(true)}
          />
        </div>
      </div>
      <SwapModal
        show={showSwapModal}
        onClose={() => setShowSwapModal(false)}
        onSubmit={handleSwapSubmit}
        swapForm={swapForm}
        setSwapForm={setSwapForm}
        availableShifts={availableShifts}
        swapEligibleColleagues={swapEligibleColleagues}
        filteredColleagueShifts={filteredColleagueShifts}
        requestedShiftCoverageNote={requestedShiftCoverageNote}
        currentDoctor={currentDoctor}
      />

      <LeaveModal
        show={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        onSubmit={handleLeaveSubmit}
        leaveForm={leaveForm}
        setLeaveForm={setLeaveForm}
        coverageEligibleColleagues={coverageEligibleColleagues}
        colleagues={colleagues}
        currentDoctor={currentDoctor}
      />

      <OvertimeModal
        show={showOvertimeModal}
        onClose={() => setShowOvertimeModal(false)}
        onSubmit={handleOvertimeSubmit}
        overtimeForm={overtimeForm}
        setOvertimeForm={setOvertimeForm}
        availableShifts={availableShifts}
      />
      <CreateShiftModal
        open={showCreateShift}
        onClose={() => setShowCreateShift(false)}
        scheduleForm={scheduleForm}
        setScheduleForm={setScheduleForm}
        shiftType={shiftType}
        setShiftType={setShiftType}
        manualOverride={manualOverride}
        setManualOverride={setManualOverride}
        onCreate={handleCreateShift}
        currentDoctor={currentDoctor}
      />
      <Footer/>
    </div>
  );
};

export default ShiftManagement;