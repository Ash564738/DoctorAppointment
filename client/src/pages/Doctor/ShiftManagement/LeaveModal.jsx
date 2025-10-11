import React from 'react';

const LeaveModal = ({ show, onClose, onSubmit, leaveForm, setLeaveForm, coverageEligibleColleagues, colleagues, currentDoctor }) => {
  if (!show) return null;
  return (
    <div className="shiftManagement_modalOverlay">
      <div className="shiftManagement_modal">
        <div className="shiftManagement_modalHeader">
          <h3 className="shiftManagement_modalTitle">Apply for Leave</h3>
          <button className="shiftManagement_closeButton" onClick={onClose}>×</button>
        </div>
        <form onSubmit={onSubmit} className="shiftManagement_form">
          <div className="shiftManagement_formGroup">
            <label className="shiftManagement_label">Leave Type</label>
            <select
              className="shiftManagement_select"
              value={leaveForm.type}
              onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}
              required
            >
              <option value="">Select leave type</option>
              <option value="sick">Sick Leave</option>
              <option value="vacation">Vacation</option>
              <option value="personal">Personal Leave</option>
              <option value="emergency">Emergency Leave</option>
              <option value="maternity">Maternity Leave</option>
              <option value="paternity">Paternity Leave</option>
              <option value="bereavement">Bereavement Leave</option>
            </select>
          </div>
          <div className="shiftManagement_formRow">
            <div className="shiftManagement_formGroup">
              <label className="shiftManagement_label">From Date</label>
              <input
                className="shiftManagement_input"
                type="date"
                value={leaveForm.from}
                onChange={(e) => setLeaveForm({ ...leaveForm, from: e.target.value })}
                required
              />
            </div>
            <div className="shiftManagement_formGroup">
              <label className="shiftManagement_label">To Date</label>
              <input
                className="shiftManagement_input"
                type="date"
                value={leaveForm.to}
                onChange={(e) => setLeaveForm({ ...leaveForm, to: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="shiftManagement_formGroup">
            <label className="shiftManagement_checkboxLabel">
              <input
                type="checkbox"
                checked={leaveForm.isEmergency}
                onChange={(e) => setLeaveForm({ ...leaveForm, isEmergency: e.target.checked })}
              />
              <span style={{ marginLeft: 8 }}>Emergency leave</span>
            </label>
          </div>
          <div className="shiftManagement_formGroup">
            <label className="shiftManagement_label">Covering Staff (optional)</label>
            <select
              className="shiftManagement_select"
              value={''}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) return;
                setLeaveForm(prev => ({
                  ...prev,
                  coveringStaffIds: prev.coveringStaffIds.includes(val)
                    ? prev.coveringStaffIds
                    : [...prev.coveringStaffIds, val]
                }));
              }}
            >
              <option value="">Select colleague to add</option>
              {(coverageEligibleColleagues || []).map(col => (
                <option key={col._id || col.userId?._id} value={(col.userId?._id) || col._id}>
                  {col.userId?.firstname && col.userId?.lastname ? `Dr. ${col.userId.firstname} ${col.userId.lastname}` : (col.name || (col._id || ''))}
                </option>
              ))}
            </select>
            {currentDoctor && coverageEligibleColleagues.length === 0 && (
              <small className="shiftManagement_helpText" style={{ display: 'block', marginTop: 6 }}>
                No eligible colleagues found in your specialization or department.
              </small>
            )}
            {leaveForm.coveringStaffIds.length > 0 && (
              <div className="shiftManagement_selectedChips" style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {leaveForm.coveringStaffIds.map(id => {
                  const col = (colleagues || []).find(c => (c.userId?._id) === id || c._id === id) || {};
                  const label = col.userId?.firstname && col.userId?.lastname ? `Dr. ${col.userId.firstname} ${col.userId.lastname}` : (col.name || id);
                  return (
                    <span key={id} style={{ background: '#eef2ff', color: '#3730a3', padding: '2px 8px', borderRadius: 12, fontSize: 12 }}>
                      {label}
                      <button type="button" style={{ marginLeft: 6, border: 'none', background: 'transparent', cursor: 'pointer' }} onClick={() => setLeaveForm(prev => ({ ...prev, coveringStaffIds: prev.coveringStaffIds.filter(x => x !== id) }))}>×</button>
                    </span>
                  );
                })}
              </div>
            )}
            <small className="shiftManagement_helpText">Add one or more colleagues to request coverage. They’ll be notified.</small>
          </div>
          <div className="shiftManagement_formGroup">
            <label className="shiftManagement_label">Reason</label>
            <textarea
              className="shiftManagement_textarea"
              value={leaveForm.reason}
              onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
              placeholder="Explain the reason for leave"
              rows="4"
              required
            />
          </div>
          <div className="shiftManagement_formGroup">
            <label className="shiftManagement_label">Attachments (optional, PDF)</label>
            <input
              className="shiftManagement_input"
              type="file"
              accept="application/pdf"
              multiple
              onChange={(e) => setLeaveForm({ ...leaveForm, attachments: Array.from(e.target.files || []) })}
            />
          </div>
          <div className="shiftManagement_formActions">
            <button type="button" className="shiftManagement_actionButton shiftManagement_actionButton--secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="shiftManagement_actionButton shiftManagement_actionButton--primary">Submit Application</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeaveModal;
