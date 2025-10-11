import React, { useMemo, useState } from 'react';

const OvertimeRequestsTable = ({ overtimeRequests = [], onApprove, onReject }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;
  const totalPages = useMemo(() => Math.max(1, Math.ceil((overtimeRequests?.length || 0) / rowsPerPage)), [overtimeRequests]);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return (overtimeRequests || []).slice(start, start + rowsPerPage);
  }, [overtimeRequests, currentPage]);
  const goTo = (p) => { if (p < 1 || p > totalPages) return; setCurrentPage(p); };
  return (
    <div className="doctorScheduling_tableContainer" data-name="doctorScheduling_tableContainer">
      <table className="doctorScheduling_table" data-name="doctorScheduling_table">
        <thead>
          <tr>
            <th className="doctorScheduling_th">Doctor</th>
            <th className="doctorScheduling_th">Date</th>
            <th className="doctorScheduling_th">Hours</th>
            <th className="doctorScheduling_th">Status</th>
            <th className="doctorScheduling_th">Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginated.map(ot => (
            <tr key={ot._id} className="doctorScheduling_tr" data-name="doctorScheduling_row">
              <td className="doctorScheduling_td">{ot.doctorId?.firstname} {ot.doctorId?.lastname}</td>
              <td className="doctorScheduling_td">{new Date(ot.date).toLocaleDateString()}</td>
              <td className="doctorScheduling_td">{ot.hours}</td>
              <td className="doctorScheduling_td">{ot.status}</td>
              <td className="doctorScheduling_td">
                {ot.status === 'pending' && <>
                  <button className="doctorScheduling_button" onClick={() => onApprove(ot._id)}>Approve</button>
                  <button className="doctorScheduling_button doctorScheduling_buttonDanger" onClick={() => onReject(ot._id, prompt('Rejection reason?'))}>Reject</button>
                </>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="doctorScheduling_pagination" data-name="doctorScheduling_pagination">
        <button className="doctorScheduling_paginationButton" onClick={() => goTo(currentPage - 1)} disabled={currentPage === 1}>Previous</button>
        {Array.from({ length: totalPages }, (_, i) => (
          <button key={i+1} className={`doctorScheduling_paginationButton ${currentPage === i+1 ? 'active' : ''}`} onClick={() => goTo(i+1)}>{i+1}</button>
        ))}
        <button className="doctorScheduling_paginationButton" onClick={() => goTo(currentPage + 1)} disabled={currentPage === totalPages}>Next</button>
      </div>
    </div>
  );
};

export default OvertimeRequestsTable;
