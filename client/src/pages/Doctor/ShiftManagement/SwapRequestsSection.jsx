import React from 'react';

const SwapRequestsSection = ({ swapRequests, loading, currentUserId, colleagues, onRespond }) => {
  return (
    <div className="shiftManagement_section">
      <div className="shiftManagement_sectionHeader">
        <h3 className="shiftManagement_sectionTitle">Swap Requests</h3>
      </div>
      <div className="shiftManagement_tableContainer">
        {loading ? (
          <div className="shiftManagement_loading">
            <p className="shiftManagement_loadingText">Loading swap requests...</p>
          </div>
        ) : (
          <table className="shiftManagement_table">
            <thead className="shiftManagement_tableHeader">
              <tr>
                <th className="shiftManagement_headerCell">Shift</th>
                <th className="shiftManagement_headerCell">With</th>
                <th className="shiftManagement_headerCell">Dates</th>
                <th className="shiftManagement_headerCell">Days</th>
                <th className="shiftManagement_headerCell">Your Time</th>
                <th className="shiftManagement_headerCell">Colleague Time</th>
                <th className="shiftManagement_headerCell">Type</th>
                <th className="shiftManagement_headerCell">Status</th>
                <th className="shiftManagement_headerCell">Action</th>
              </tr>
            </thead>
            <tbody className="shiftManagement_tableBody">
              {swapRequests.map(request => {
                const reqId = (request.requesterId?._id) || request.requesterId;
                const withId = (request.swapWithId?._id) || request.swapWithId;
                const youAreRequester = currentUserId && reqId === currentUserId;
                const otherUser = youAreRequester ? request.swapWithId : request.requesterId;
                const otherResolved = (() => {
                  if (otherUser && typeof otherUser === 'object') return otherUser;
                  const oid = (typeof otherUser === 'string') ? otherUser : null;
                  if (!oid) return null;
                  const match = (colleagues || []).find(c => (c.userId?._id) === oid || c._id === oid);
                  return match?.userId || null;
                })();
                const otherName = otherResolved?.firstname
                  ? `${otherResolved.firstname} ${otherResolved.lastname}`
                  : (otherUser && typeof otherUser === 'object' && otherUser.firstname
                      ? `${otherUser.firstname} ${otherUser.lastname}`
                      : 'colleague');
                const dateText = (() => {
                  if (request.swapDate) return new Date(request.swapDate).toISOString().slice(0,10);
                  if (request.swapStartDate && request.swapEndDate) return `${new Date(request.swapStartDate).toISOString().slice(0,10)} → ${new Date(request.swapEndDate).toISOString().slice(0,10)}`;
                  return '-';
                })();
                const daysText = (() => {
                  const collectDays = (s, e) => {
                    const names = [];
                    const seen = new Set();
                    const order = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
                    let cur = new Date(s);
                    const end = new Date(e);
                    while (cur <= end) {
                      const name = cur.toLocaleDateString('en-US', { weekday: 'long' });
                      if (!seen.has(name)) { seen.add(name); names.push(name); }
                      cur.setDate(cur.getDate() + 1);
                    }
                    return names.sort((a,b) => order.indexOf(a) - order.indexOf(b)).map(n => ({Sunday:'Sun',Monday:'Mon',Tuesday:'Tue',Wednesday:'Wed',Thursday:'Thu',Friday:'Fri',Saturday:'Sat'}[n] || n)).join('·');
                  };
                  if (request.swapDate) return new Date(request.swapDate).toLocaleDateString('en-US', { weekday: 'short' });
                  if (request.swapStartDate && request.swapEndDate) return collectDays(request.swapStartDate, request.swapEndDate);
                  return '-';
                })();
                const os = request.originalShiftId || {};
                const rs = request.requestedShiftId || {};
                const yourTime = (() => {
                  if (youAreRequester) return os.startTime && os.endTime ? `${os.startTime} - ${os.endTime}` : '-';
                  if ((request.swapType || '') === 'trade') return rs.startTime && rs.endTime ? `${rs.startTime} - ${rs.endTime}` : '-';
                  return os.startTime && os.endTime ? `${os.startTime} - ${os.endTime}` : '-';
                })();
                const colleagueTime = (() => {
                  if (youAreRequester) {
                    if ((request.swapType || '') === 'trade') return rs.startTime && rs.endTime ? `${rs.startTime} - ${rs.endTime}` : '-';
                    return '-';
                  }
                  return os.startTime && os.endTime ? `${os.startTime} - ${os.endTime}` : '-';
                })();
                return (
                  <tr key={request._id || request.id} className="shiftManagement_tableRow">
                    <td className="shiftManagement_tableCell">{request.originalShiftId?.title || request.originalShiftId || ''}</td>
                    <td className="shiftManagement_tableCell">{otherName}</td>
                    <td className="shiftManagement_tableCell">{dateText}</td>
                    <td className="shiftManagement_tableCell">{daysText}</td>
                    <td className="shiftManagement_tableCell">{yourTime}</td>
                    <td className="shiftManagement_tableCell">{colleagueTime}</td>
                    <td className="shiftManagement_tableCell">{(request.swapType || '').charAt(0).toUpperCase() + (request.swapType || '').slice(1)}</td>
                    <td className="shiftManagement_tableCell">
                      <span className={`shiftManagement_statusBadge shiftManagement_statusBadge--${(request.status || '').toLowerCase()}`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="shiftManagement_tableCell">
                      {request.partnerDecision === 'pending' && currentUserId && (withId === currentUserId) ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="shiftManagement_actionButton" onClick={() => onRespond(request._id, 'accepted')}>Accept</button>
                          <button className="shiftManagement_actionButton shiftManagement_actionButton--secondary" onClick={() => onRespond(request._id, 'declined')}>Decline</button>
                        </div>
                      ) : (
                        <small style={{ color: '#6b7280' }}>{request.partnerDecision && request.partnerDecision !== 'pending' ? `Partner ${request.partnerDecision}` : '-'}</small>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default SwapRequestsSection;
