import React, { useEffect } from 'react';
import { DEFAULT_SHIFT_CONFIG, calculateSlotAndMaxPatients } from '../../Admin/DoctorScheduling/schedulingUtils';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

const CreateShiftModal = ({
  open,
  onClose,
  scheduleForm,
  setScheduleForm,
  shiftType,
  setShiftType,
  manualOverride,
  setManualOverride,
  onCreate,
  currentDoctor
}) => {
  useEffect(() => {
    if (!open) return;
    if (currentDoctor?.department && scheduleForm.department !== currentDoctor.department) {
      setScheduleForm(prev => ({ ...prev, department: currentDoctor.department }));
    }
  }, [open, currentDoctor, scheduleForm.department, setScheduleForm]);

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
  }, [shiftType, manualOverride, open, setScheduleForm]);

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
  }, [scheduleForm.startTime, scheduleForm.endTime, scheduleForm.breakStart, scheduleForm.breakEnd, manualOverride, open, setScheduleForm]);

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
    <div className="shiftManagement_modalOverlay">
      <div className="shiftManagement_modal">
        <div className="shiftManagement_modalHeader">
          <h3 className="shiftManagement_modalTitle">Create Shift</h3>
          <button className="shiftManagement_closeButton" onClick={onClose}>×</button>
        </div>
        <div className="shiftManagement_modalBody">
          <div className="shiftManagement_formGroup">
            <label className="shiftManagement_label">Title<span className="req">*</span></label>
            <input
              className="shiftManagement_input"
              type="text"
              value={scheduleForm.title}
              onChange={(e) => handleFormChange('title', e.target.value, false)}
              placeholder="e.g., Day Shift"
            />
          </div>

          <div className="shiftManagement_formGroup">
            <label className="shiftManagement_label">Preset</label>
            <select
              className="shiftManagement_select"
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

          <div className="shiftManagement_formRow">
            <div className="shiftManagement_formGroup">
              <label className="shiftManagement_label">Start Time<span className="req">*</span></label>
              <input
                className="shiftManagement_input"
                type="time"
                value={scheduleForm.startTime}
                onChange={(e) => handleFormChange('startTime', e.target.value)}
              />
            </div>
            <div className="shiftManagement_formGroup">
              <label className="shiftManagement_label">End Time<span className="req">*</span></label>
              <input
                className="shiftManagement_input"
                type="time"
                value={scheduleForm.endTime}
                onChange={(e) => {
                  const v = e.target.value;
                  if ((shiftType === 'night8' || shiftType === 'night12') && v === '00:00') {
                    handleFormChange('endTime', '07:00');
                  } else {
                    handleFormChange('endTime', v);
                  }
                }}
              />
            </div>
          </div>

          <div className="shiftManagement_formRow">
            <div className="shiftManagement_formGroup">
              <label className="shiftManagement_label">Break Start</label>
              <input
                className="shiftManagement_input"
                type="time"
                value={scheduleForm.breakStart}
                onChange={(e) => handleFormChange('breakStart', e.target.value)}
              />
            </div>
            <div className="shiftManagement_formGroup">
              <label className="shiftManagement_label">Break End</label>
              <input
                className="shiftManagement_input"
                type="time"
                value={scheduleForm.breakEnd}
                onChange={(e) => handleFormChange('breakEnd', e.target.value)}
              />
            </div>
          </div>

          <div className="shiftManagement_formRow">
            <div className="shiftManagement_formGroup">
              <label className="shiftManagement_label">Slot Duration</label>
              <select
                className="shiftManagement_select"
                value={scheduleForm.slotDuration}
                onChange={(e) => handleFormChange('slotDuration', Number(e.target.value))}
              >
                {[15,30,45,60].map(v => <option key={v} value={v}>{v} min</option>)}
              </select>
            </div>
            <div className="shiftManagement_formGroup">
              <label className="shiftManagement_label">Max Patients / hour</label>
              <input
                className="shiftManagement_input"
                type="number"
                min={1}
                max={20}
                value={scheduleForm.maxPatientsPerHour}
                onChange={(e) => handleFormChange('maxPatientsPerHour', Number(e.target.value))}
              />
            </div>
          </div>

          <div className="shiftManagement_formGroup">
            <label className="shiftManagement_label">Days of Week<span className="req">*</span></label>
            <div className="shiftManagement_daysGrid">
              {DAYS.map((day) => (
                <label key={day} className="shiftManagement_dayItem">
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

          <div className="shiftManagement_formRow">
            <div className="shiftManagement_formGroup">
              <label className="shiftManagement_label">Department</label>
              <input
                className="shiftManagement_input"
                type="text"
                value={scheduleForm.department}
                onChange={(e) => handleFormChange('department', e.target.value, false)}
              />
            </div>
            <div className="shiftManagement_formGroup">
              <label className="shiftManagement_label">Notes</label>
              <input
                className="shiftManagement_input"
                type="text"
                maxLength={200}
                value={scheduleForm.specialNotes}
                onChange={(e) => handleFormChange('specialNotes', e.target.value, false)}
                placeholder="Optional"
              />
            </div>
          </div>
        </div>
        <div className="shiftManagement_formActions">
          <button className="shiftManagement_actionButton shiftManagement_actionButton--secondary" onClick={onClose} type="button">Cancel</button>
          <button className="shiftManagement_actionButton shiftManagement_actionButton--primary" onClick={onCreate} type="button">Create</button>
        </div>
      </div>
    </div>
  );
};

export default CreateShiftModal;
