import React from 'react';
import { daysRangeLabel } from './shiftUtils';

const MyShiftsSection = ({ shifts, loading, onOpenSwap }) => (
  <div className="shiftManagement_section">
    <div className="shiftManagement_sectionHeader">
      <h3 className="shiftManagement_sectionTitle">My Shifts</h3>
      <button className="shiftManagement_actionButton" onClick={onOpenSwap}>Request Swap</button>
    </div>
    <div className="shiftManagement_tableContainer">
      {loading ? (
        <div className="shiftManagement_loading">
          <p className="shiftManagement_loadingText">Loading shifts...</p>
        </div>
      ) : (
        <table className="shiftManagement_table">
          <thead className="shiftManagement_tableHeader">
            <tr>
              <th className="shiftManagement_headerCell">Department</th>
              <th className="shiftManagement_headerCell">Time</th>
              <th className="shiftManagement_headerCell">Days</th>
            </tr>
          </thead>
          <tbody className="shiftManagement_tableBody">
            {shifts.map(shift => (
              <tr key={shift._id || shift.id} className="shiftManagement_tableRow">
                <td className="shiftManagement_tableCell">{shift.department}</td>
                <td className="shiftManagement_tableCell">{shift.startTime} - {shift.endTime}</td>
                <td className="shiftManagement_tableCell" title={(shift.daysOfWeek || []).join(', ')}>
                  {daysRangeLabel(shift.daysOfWeek)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </div>
);

export default MyShiftsSection;
