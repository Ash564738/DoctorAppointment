import React, { useEffect } from 'react';
import { DEFAULT_SHIFT_CONFIG, calculateSlotAndMaxPatients } from './schedulingUtils';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

const CreateShiftModal = ({
  open,
  onClose,
  doctors,
  scheduleForm,
  setScheduleForm,
  shiftType,
  setShiftType,
  manualOverride,
  setManualOverride,
  onCreate
}) => {
  useEffect(() => {
    if (!open) return;
    if (scheduleForm.doctorId && doctors.length > 0) {
      const doc = doctors.find(d => d._id === scheduleForm.doctorId);
      if (doc && doc.department && scheduleForm.department !== doc.department) {
        setScheduleForm(prev => ({ ...prev, department: doc.department }));
      }
    }
  }, [scheduleForm.doctorId, doctors, open]);

  useEffect(() => {
    if (!open || manualOverride) return;
    if (shiftType && DEFAULT_SHIFT_CONFIG[shiftType]) {
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
    }
  }, [shiftType, manualOverride, open]);

  useEffect(() => {
    if (!open || manualOverride) return;
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
  }, [scheduleForm.startTime, scheduleForm.endTime, scheduleForm.breakStart, scheduleForm.breakEnd, manualOverride, open]);

  const handleFormChange = (field, value, isManual = true) => {
    if (isManual) setManualOverride(true);
    setScheduleForm(prev => ({ ...prev, [field]: value }));
  };

  const handleDayChange = (day, checked) => {
    setScheduleForm(prev => ({
      ...prev,
      daysOfWeek: checked 
        ? [...prev.daysOfWeek, day]
        : prev.daysOfWeek.filter(d => d !== day)
    }));
  };

  if (!open) return null;

  return (
    <div className="doctorScheduling_modalOverlay">
      <div className="doctorScheduling_modal">
        <div className="doctorScheduling_modalHeader">
          <h3>Create Shift</h3>
          <button className="doctorScheduling_closeButton" onClick={onClose}>✕</button>
        </div>
        <div className="doctorScheduling_modalBody">
          <div className="doctorScheduling_formRow">
            <label>Doctor<span className="req">*</span></label>
            <select
              className="doctorScheduling_select"
              value={scheduleForm.doctorId}
              onChange={(e) => handleFormChange('doctorId', e.target.value, false)}
            >
              <option value="">Select doctor</option>
              {doctors.map((doc) => (
                <option key={doc._id} value={doc._id}>
                  {doc.userId?.firstname && doc.userId?.lastname ? `Dr. ${doc.userId.firstname} ${doc.userId.lastname}` : doc._id}
                </option>
              ))}
            </select>
          </div>
          <div className="doctorScheduling_formRow">
            <label>Title<span className="req">*</span></label>
            <input
              className="doctorScheduling_input"
              type="text"
              value={scheduleForm.title}
              onChange={(e) => handleFormChange('title', e.target.value, false)}
              placeholder="e.g., Day Shift"
            />
          </div>
          <div className="doctorScheduling_formRow">
            <label>Preset</label>
            <select
              className="doctorScheduling_select"
              value={shiftType}
              onChange={(e) => setShiftType(e.target.value)}
            >
              <option value="">None</option>
              <option value="day8">Day 8h (08:00–16:00)</option>
              <option value="evening8">Evening 8h (16:00–23:00)</option>
              <option value="night8">Night 8h (23:00–07:00)</option>
              <option value="day12">Day 12h (07:00–19:00)</option>
              <option value="night12">Night 12h (19:00–07:00)</option>
              <option value="full24">Full 24h (07:00–07:00)</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div className="doctorScheduling_grid2">
            <div className="doctorScheduling_formRow">
              <label>Start Time<span className="req">*</span></label>
              <input
                className="doctorScheduling_input"
                type="time"
                value={scheduleForm.startTime}
                onChange={(e) => handleFormChange('startTime', e.target.value)}
              />
            </div>
            <div className="doctorScheduling_formRow">
              <label>End Time<span className="req">*</span></label>
              <input
                className="doctorScheduling_input"
                type="time"
                value={scheduleForm.endTime}
                onChange={(e) => {
                  const v = e.target.value;
                  if ((shiftType === 'night8' || shiftType === 'night12') && v === '00:00') {
                    handleFormChange('endTime', '23:00');
                  } else {
                    handleFormChange('endTime', v);
                  }
                }}
              />
            </div>
          </div>
          <div className="doctorScheduling_grid2">
            <div className="doctorScheduling_formRow">
              <label>Break Start</label>
              <input
                className="doctorScheduling_input"
                type="time"
                value={scheduleForm.breakStart}
                onChange={(e) => handleFormChange('breakStart', e.target.value)}
              />
            </div>
            <div className="doctorScheduling_formRow">
              <label>Break End</label>
              <input
                className="doctorScheduling_input"
                type="time"
                value={scheduleForm.breakEnd}
                onChange={(e) => handleFormChange('breakEnd', e.target.value)}
              />
            </div>
          </div>
          <div className="doctorScheduling_grid2">
            <div className="doctorScheduling_formRow">
              <label>Slot Duration</label>
              <select
                className="doctorScheduling_select"
                value={scheduleForm.slotDuration}
                onChange={(e) => handleFormChange('slotDuration', Number(e.target.value))}
              >
                {[15,30,45,60].map(v => <option key={v} value={v}>{v} min</option>)}
              </select>
            </div>
            <div className="doctorScheduling_formRow">
              <label>Max Patients / hour</label>
              <input
                className="doctorScheduling_input"
                type="number"
                min={1}
                max={20}
                value={scheduleForm.maxPatientsPerHour}
                onChange={(e) => handleFormChange('maxPatientsPerHour', Number(e.target.value))}
              />
            </div>
          </div>
          <div className="doctorScheduling_days">
            <label>Days of Week<span className="req">*</span></label>
            <div className="doctorScheduling_daysGrid">
              {DAYS.map((day) => (
                <label key={day} className="doctorScheduling_dayItem">
                  <input
                    type="checkbox"
                    checked={scheduleForm.daysOfWeek.includes(day)}
                    onChange={(e) => handleDayChange(day, e.target.checked)}
                  />
                  {day}
                </label>
              ))}
            </div>
          </div>
          <div className="doctorScheduling_grid2">
            <div className="doctorScheduling_formRow">
              <label>Department</label>
              <input
                className="doctorScheduling_input"
                type="text"
                value={scheduleForm.department}
                onChange={(e) => handleFormChange('department', e.target.value, false)}
              />
            </div>
            <div className="doctorScheduling_formRow">
              <label>Notes</label>
              <input
                className="doctorScheduling_input"
                type="text"
                maxLength={200}
                value={scheduleForm.specialNotes}
                onChange={(e) => handleFormChange('specialNotes', e.target.value, false)}
                placeholder="Optional"
              />
            </div>
          </div>
        </div>
        <div className="doctorScheduling_modalFooter">
          <button className="doctorScheduling_secondaryButton" onClick={onClose}>Cancel</button>
          <button className="doctorScheduling_primaryButton" onClick={onCreate}>Create</button>
        </div>
      </div>
    </div>
  );
};

export default CreateShiftModal;
