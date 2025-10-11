import React from 'react';

const CoverageRequestsSection = ({ coverageRequests, loading, doctorShiftsCache, onRespond }) => (
  <div className="shiftManagement_section">
    <div className="shiftManagement_sectionHeader">
      <h3 className="shiftManagement_sectionTitle">Coverage Requests</h3>
    </div>
    <div className="shiftManagement_tableContainer">
      {loading ? (
        <div className="shiftManagement_loading">
          <p className="shiftManagement_loadingText">Loading coverage requests...</p>
        </div>
      ) : (
        <table className="shiftManagement_table">
          <thead className="shiftManagement_tableHeader">
            <tr>
              <th className="shiftManagement_headerCell">From</th>
              <th className="shiftManagement_headerCell">Type</th>
              <th className="shiftManagement_headerCell">Range</th>
              <th className="shiftManagement_headerCell">Reason</th>
              <th className="shiftManagement_headerCell">Date</th>
              <th className="shiftManagement_headerCell">Time</th>
              <th className="shiftManagement_headerCell">Action</th>
            </tr>
          </thead>
          <tbody className="shiftManagement_tableBody">
            {coverageRequests.length === 0 && (
              <tr><td className="shiftManagement_tableCell" colSpan={7} style={{ textAlign: 'center', color: '#6b7280' }}>No coverage requests</td></tr>
            )}
            {coverageRequests.map(req => (
              (req.myCovering && req.myCovering.length > 0 ? req.myCovering : [{ shiftDate: null }]).map((mc, idx) => (
                <tr key={`${req._id}_${idx}`} className="shiftManagement_tableRow">
                  <td className="shiftManagement_tableCell">{req.doctorId?.firstname ? `Dr. ${req.doctorId.firstname} ${req.doctorId.lastname}` : (req.doctorId || '')}</td>
                  <td className="shiftManagement_tableCell">{req.leaveType}</td>
                  <td className="shiftManagement_tableCell">{`${(req.startDate || '').slice(0,10)} → ${(req.endDate || '').slice(0,10)}`}</td>
                  <td className="shiftManagement_tableCell">{req.reason}</td>
                  <td className="shiftManagement_tableCell">{mc.shiftDate ? new Date(mc.shiftDate).toISOString().slice(0,10) : 'Any'}</td>
                  <td className="shiftManagement_tableCell">
                    {(() => {
                      const rdId = (req.doctorId?._id) || req.doctorId;
                      const shifts = doctorShiftsCache[rdId] || [];
                      if (!Array.isArray(shifts) || shifts.length === 0) return '-';
                      if (mc.shiftDate) {
                        const dayName = new Date(mc.shiftDate).toLocaleDateString('en-US', { weekday: 'long' });
                        const dayShifts = shifts.filter(s => (s.daysOfWeek || []).includes(dayName));
                        const times = Array.from(new Set(dayShifts.map(s => `${s.startTime}-${s.endTime}`)));
                        return times.length ? times.join(', ') : '-';
                      }
                      const uniqueTimes = Array.from(new Set(shifts.map(s => `${s.startTime}-${s.endTime}`)));
                      return uniqueTimes.length ? uniqueTimes.join(', ') : '-';
                    })()}
                  </td>
                  <td className="shiftManagement_tableCell">
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="shiftManagement_actionButton" onClick={() => onRespond(req._id, 'accepted', mc.shiftDate)}>Accept</button>
                      <button className="shiftManagement_actionButton shiftManagement_actionButton--secondary" onClick={() => onRespond(req._id, 'declined', mc.shiftDate)}>Decline</button>
                    </div>
                  </td>
                </tr>
              ))
            ))}
          </tbody>
        </table>
      )}
    </div>
  </div>
);

export default CoverageRequestsSection;
