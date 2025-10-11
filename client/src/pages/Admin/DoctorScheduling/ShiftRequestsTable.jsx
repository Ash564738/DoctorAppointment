import React, { useMemo, useState } from 'react';

const ShiftRequestsTable = ({ requests, onApprove, onReject, loading }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(((requests?.length) || 0) / rowsPerPage)), [requests]);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return (requests || []).slice(start, start + rowsPerPage);
  }, [requests, currentPage]);
  const goTo = (p) => { if (p < 1 || p > totalPages) return; setCurrentPage(p); };
  return (
    <div className="doctorScheduling_tableContainer" data-name="doctorScheduling_tableContainer">
      <table className="doctorScheduling_table" data-name="doctorScheduling_table">
        <thead>
          <tr>
            <th className="doctorScheduling_th">Doctor</th>
            <th className="doctorScheduling_th">Title</th>
            <th className="doctorScheduling_th">Time</th>
            <th className="doctorScheduling_th">Days</th>
            <th className="doctorScheduling_th">Department</th>
            <th className="doctorScheduling_th">Requested</th>
            <th className="doctorScheduling_th">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr className="doctorScheduling_tr"><td className="doctorScheduling_td" colSpan={7}>Loading...</td></tr>
          ) : (Array.isArray(paginated) && paginated.length > 0 ? (
            paginated.map(req => (
              <tr key={req._id} className="doctorScheduling_tr" data-name="doctorScheduling_row">
                <td className="doctorScheduling_td">{req.doctorId?.firstname ? `Dr. ${req.doctorId.firstname} ${req.doctorId.lastname}` : req.doctorId}</td>
                <td className="doctorScheduling_td">{req.title}</td>
                <td className="doctorScheduling_td">{req.startTime}–{req.endTime}</td>
                <td className="doctorScheduling_td">{(req.daysOfWeek || []).join(', ')}</td>
                <td className="doctorScheduling_td">{req.department}</td>
                <td className="doctorScheduling_td">{req.requestedBy?.firstname ? `${req.requestedBy.firstname} ${req.requestedBy.lastname}` : ''}</td>
                <td className="doctorScheduling_td">
                  <button className="doctorScheduling_button" onClick={() => onApprove(req._id)}>Approve</button>
                  <button className="doctorScheduling_button doctorScheduling_buttonDanger" onClick={() => onReject(req._id, prompt('Rejection reason?'))}>Reject</button>
                </td>
              </tr>
            ))
          ) : (
            <tr className="doctorScheduling_tr"><td className="doctorScheduling_td" colSpan={7}>No pending shift requests</td></tr>
          ))}
        </tbody>
      </table>
      {!loading && (
        <div className="doctorScheduling_pagination" data-name="doctorScheduling_pagination">
          <button className="doctorScheduling_paginationButton" onClick={() => goTo(currentPage - 1)} disabled={currentPage === 1}>Previous</button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i+1} className={`doctorScheduling_paginationButton ${currentPage === i+1 ? 'active' : ''}`} onClick={() => goTo(i+1)}>{i+1}</button>
          ))}
          <button className="doctorScheduling_paginationButton" onClick={() => goTo(currentPage + 1)} disabled={currentPage === totalPages}>Next</button>
        </div>
      )}
    </div>
  );
};

export default ShiftRequestsTable;
