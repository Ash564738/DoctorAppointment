import React from 'react';

const OvertimeRecordsSection = ({ overtimeRecords, loading, onOpenOvertime }) => {
  const totalApprovedHours = overtimeRecords
    .filter(o => (o.status || '').toLowerCase() === 'approved')
    .reduce((sum, o) => sum + (o.hours || 0), 0);

  return (
    <div className="shiftManagement_section">
      <div className="shiftManagement_sectionHeader">
        <h3 className="shiftManagement_sectionTitle">Overtime</h3>
        <div>
          <span className="shiftManagement_metricPill">Approved Hours: {totalApprovedHours}</span>
          <button className="shiftManagement_actionButton" onClick={onOpenOvertime} style={{ marginLeft: 12 }}>Request Overtime</button>
        </div>
      </div>
      <div className="shiftManagement_tableContainer">
        {loading ? (
          <div className="shiftManagement_loading">
            <p className="shiftManagement_loadingText">Loading overtime records...</p>
          </div>
        ) : (
          <table className="shiftManagement_table">
            <thead className="shiftManagement_tableHeader">
              <tr>
                <th className="shiftManagement_headerCell">Date</th>
                <th className="shiftManagement_headerCell">Hours</th>
                <th className="shiftManagement_headerCell">Reason</th>
                <th className="shiftManagement_headerCell">Status</th>
              </tr>
            </thead>
            <tbody className="shiftManagement_tableBody">
              {overtimeRecords.map(rec => (
                <tr key={rec._id || rec.id} className="shiftManagement_tableRow">
                  <td className="shiftManagement_tableCell">{rec.date?.slice(0,10) || rec.day}</td>
                  <td className="shiftManagement_tableCell">{rec.hours}</td>
                  <td className="shiftManagement_tableCell">{rec.reason}</td>
                  <td className="shiftManagement_tableCell">
                    <span className={`shiftManagement_statusBadge shiftManagement_statusBadge--${(rec.status || '').toLowerCase()}`}>
                      {rec.status}
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
};

export default OvertimeRecordsSection;
