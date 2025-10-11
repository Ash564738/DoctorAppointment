import React from 'react';

const LeaveRequestsSection = ({ leaveRequests, loading, onOpenLeave }) => (
  <div className="shiftManagement_section">
    <div className="shiftManagement_sectionHeader">
      <h3 className="shiftManagement_sectionTitle">Leave Requests</h3>
      <button className="shiftManagement_actionButton" onClick={onOpenLeave}>Apply for Leave</button>
    </div>
    <div className="shiftManagement_tableContainer">
      {loading ? (
        <div className="shiftManagement_loading">
          <p className="shiftManagement_loadingText">Loading leave requests...</p>
        </div>
      ) : (
        <table className="shiftManagement_table">
          <thead className="shiftManagement_tableHeader">
            <tr>
              <th className="shiftManagement_headerCell">Type</th>
              <th className="shiftManagement_headerCell">From</th>
              <th className="shiftManagement_headerCell">To</th>
              <th className="shiftManagement_headerCell">Status</th>
            </tr>
          </thead>
          <tbody className="shiftManagement_tableBody">
            {leaveRequests.map(request => (
              <tr key={request._id || request.id} className="shiftManagement_tableRow">
                <td className="shiftManagement_tableCell">{request.leaveType}</td>
                <td className="shiftManagement_tableCell">{request.startDate?.slice(0,10) || request.from}</td>
                <td className="shiftManagement_tableCell">{request.endDate?.slice(0,10) || request.to}</td>
                <td className="shiftManagement_tableCell">
                  <span className={`shiftManagement_statusBadge shiftManagement_statusBadge--${(request.status || '').toLowerCase()}`}>
                    {request.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </div>
);

export default LeaveRequestsSection;
