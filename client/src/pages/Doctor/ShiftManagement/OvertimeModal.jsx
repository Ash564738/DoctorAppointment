import React from 'react';

const OvertimeModal = ({ show, onClose, onSubmit, overtimeForm, setOvertimeForm, availableShifts }) => {
  if (!show) return null;
  return (
    <div className="shiftManagement_modalOverlay">
      <div className="shiftManagement_modal">
        <div className="shiftManagement_modalHeader">
          <h3 className="shiftManagement_modalTitle">Log Overtime</h3>
          <button className="shiftManagement_closeButton" onClick={onClose}>×</button>
        </div>
        <form onSubmit={onSubmit} className="shiftManagement_form">
          <div className="shiftManagement_formGroup">
            <label className="shiftManagement_label">Shift</label>
            <select
              className="shiftManagement_select"
              value={overtimeForm.shiftId}
              onChange={(e) => setOvertimeForm({ ...overtimeForm, shiftId: e.target.value })}
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
            <label className="shiftManagement_label">Date</label>
            <input
              className="shiftManagement_input"
              type="date"
              value={overtimeForm.date}
              onChange={(e) => setOvertimeForm({ ...overtimeForm, date: e.target.value })}
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
              onChange={(e) => setOvertimeForm({ ...overtimeForm, hours: e.target.value })}
              placeholder="Number of overtime hours"
              required
            />
          </div>
          <div className="shiftManagement_formGroup">
            <label className="shiftManagement_label">Reason</label>
            <textarea
              className="shiftManagement_textarea"
              value={overtimeForm.reason}
              onChange={(e) => setOvertimeForm({ ...overtimeForm, reason: e.target.value })}
              placeholder="Explain the reason for overtime"
              rows="4"
              required
            />
          </div>
          <div className="shiftManagement_formActions">
            <button type="button" className="shiftManagement_actionButton shiftManagement_actionButton--secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="shiftManagement_actionButton shiftManagement_actionButton--primary">Log Overtime</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OvertimeModal;
