import React from 'react';

const SwapModal = ({ show, onClose, onSubmit, swapForm, setSwapForm, availableShifts, swapEligibleColleagues, filteredColleagueShifts, requestedShiftCoverageNote, currentDoctor }) => {
  if (!show) return null;
  return (
    <div className="shiftManagement_modalOverlay">
      <div className="shiftManagement_modal">
        <div className="shiftManagement_modalHeader">
          <h3 className="shiftManagement_modalTitle">Request Shift Swap</h3>
          <button className="shiftManagement_closeButton" onClick={onClose}>×</button>
        </div>
        <form onSubmit={onSubmit} className="shiftManagement_form">
          <div className="shiftManagement_formGroup">
            <label className="shiftManagement_label">Swap Type</label>
            <select
              className="shiftManagement_select"
              value={swapForm.swapType}
              onChange={(e) => setSwapForm({ ...swapForm, swapType: e.target.value })}
              required
            >
              <option value="trade">Trade (swap shifts)</option>
              <option value="cover">Cover (colleague covers my shift)</option>
            </select>
          </div>
          <div className="shiftManagement_formGroup">
            <label className="shiftManagement_label">Swap Date (single)</label>
            <input
              className="shiftManagement_input"
              type="date"
              value={swapForm.swapDate}
              onChange={(e) => setSwapForm({ ...swapForm, swapDate: e.target.value })}
            />
          </div>
          <div className="shiftManagement_formRow">
            <div className="shiftManagement_formGroup">
              <label className="shiftManagement_label">Swap Start Date (range)</label>
              <input
                className="shiftManagement_input"
                type="date"
                value={swapForm.swapStartDate}
                onChange={(e) => setSwapForm({ ...swapForm, swapStartDate: e.target.value })}
              />
            </div>
            <div className="shiftManagement_formGroup">
              <label className="shiftManagement_label">Swap End Date (range)</label>
              <input
                className="shiftManagement_input"
                type="date"
                value={swapForm.swapEndDate}
                onChange={(e) => setSwapForm({ ...swapForm, swapEndDate: e.target.value })}
              />
            </div>
          </div>
          <div className="shiftManagement_formGroup">
            <label className="shiftManagement_label">My Shift (Original)</label>
            <select
              className="shiftManagement_select"
              value={swapForm.originalShiftId}
              onChange={(e) => setSwapForm({ ...swapForm, originalShiftId: e.target.value })}
              required
            >
              <option value="">Select my shift</option>
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
              onChange={(e) => setSwapForm({ ...swapForm, withUser: e.target.value })}
              required
            >
              <option value="">Select colleague</option>
              {(swapEligibleColleagues || []).map(doc => (
                <option key={doc.userId?._id || doc._id} value={doc.userId?._id || doc._id}>
                  {doc.userId?.firstname && doc.userId?.lastname ? `Dr. ${doc.userId.firstname} ${doc.userId.lastname}` : (doc.name || (doc._id || ''))}
                </option>
              ))}
            </select>
            {currentDoctor && swapEligibleColleagues.length === 0 && (
              <small className="shiftManagement_helpText" style={{ display: 'block', marginTop: 6 }}>
                No eligible colleagues in your specialization or department.
              </small>
            )}
          </div>
          <div className="shiftManagement_formGroup">
            <label className="shiftManagement_label">Colleague Shift (Requested)</label>
            <select
              className="shiftManagement_select"
              value={swapForm.requestedShiftId}
              onChange={(e) => setSwapForm({ ...swapForm, requestedShiftId: e.target.value })}
              required={swapForm.swapType === 'trade'}
              disabled={swapForm.swapType === 'cover'}
            >
              <option value="">Select colleague's shift</option>
              {filteredColleagueShifts.map(shift => (
                <option key={shift._id} value={shift._id}>
                  {shift.title} ({shift.startTime}-{shift.endTime})
                </option>
              ))}
            </select>
            {requestedShiftCoverageNote && (
              <small className="shiftManagement_helpText" style={{ display: 'block', marginTop: 6 }}>
                {requestedShiftCoverageNote}
              </small>
            )}
          </div>
          <div className="shiftManagement_formGroup">
            <label className="shiftManagement_label">Reason</label>
            <textarea
              className="shiftManagement_textarea"
              value={swapForm.reason}
              onChange={(e) => setSwapForm({ ...swapForm, reason: e.target.value })}
              placeholder="Explain the reason for swap request"
              rows="4"
              required
            />
          </div>
          <div className="shiftManagement_formActions">
            <button type="button" className="shiftManagement_actionButton shiftManagement_actionButton--secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="shiftManagement_actionButton shiftManagement_actionButton--primary">Submit Request</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SwapModal;
