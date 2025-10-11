import React from 'react';

const StatsRow = ({ shiftsCount, swapRequests, leaveCount, overtimeRecords }) => {
  const approved = overtimeRecords.filter(r => (r.status || '').toLowerCase() === 'approved');
  const pending = overtimeRecords.filter(r => (r.status || '').toLowerCase() === 'pending');
  const approvedH = approved.reduce((sum, r) => sum + (parseFloat(r.hours) || 0), 0);
  const pendingH = pending.reduce((sum, r) => sum + (parseFloat(r.hours) || 0), 0);
  return (
    <div className="shiftManagement_statsRow">
      <div className="shiftManagement_statCard">
        <p className="shiftManagement_statTitle">Total Shifts</p>
        <h3 className="shiftManagement_statValue">{shiftsCount}</h3>
      </div>
      <div className="shiftManagement_statCard">
        <p className="shiftManagement_statTitle">Pending Swaps</p>
        <h3 className="shiftManagement_statValue">{swapRequests.filter(r => (r.status || '').toLowerCase() === 'pending').length}</h3>
      </div>
      <div className="shiftManagement_statCard">
        <p className="shiftManagement_statTitle">Leave Requests</p>
        <h3 className="shiftManagement_statValue">{leaveCount}</h3>
      </div>
      <div className="shiftManagement_statCard">
        <p className="shiftManagement_statTitle">Overtime</p>
        <h3 className="shiftManagement_statValue">{approvedH}h approved {pendingH ? `(${pendingH}h pending)` : ''}</h3>
      </div>
    </div>
  );
};

export default StatsRow;
