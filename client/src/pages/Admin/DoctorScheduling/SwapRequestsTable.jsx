import React, { useMemo, useState } from 'react';

const SwapRequestsTable = ({ swapRequests = [], onApprove, onReject }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;
  const totalPages = useMemo(() => Math.max(1, Math.ceil((swapRequests?.length || 0) / rowsPerPage)), [swapRequests]);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return (swapRequests || []).slice(start, start + rowsPerPage);
  }, [swapRequests, currentPage]);
  const goTo = (p) => { if (p < 1 || p > totalPages) return; setCurrentPage(p); };
  return (
    <div className="doctorScheduling_tableContainer" data-name="doctorScheduling_tableContainer">
      <table className="doctorScheduling_table" data-name="doctorScheduling_table">
        <thead>
          <tr>
            <th className="doctorScheduling_th">Requester</th>
            <th className="doctorScheduling_th">Swap With</th>
            <th className="doctorScheduling_th">Original Shift</th>
            <th className="doctorScheduling_th">Requested Shift</th>
            <th className="doctorScheduling_th">Status</th>
            <th className="doctorScheduling_th">Partner Decision</th>
            <th className="doctorScheduling_th">Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginated.map(sw => (
            <tr key={sw._id} className="doctorScheduling_tr" data-name="doctorScheduling_row">
              <td className="doctorScheduling_td">{sw.requesterId?.firstname} {sw.requesterId?.lastname}</td>
              <td className="doctorScheduling_td">{sw.swapWithId?.firstname} {sw.swapWithId?.lastname}</td>
              <td className="doctorScheduling_td">{sw.originalShiftId?.title}</td>
              <td className="doctorScheduling_td">{sw.requestedShiftId?.title}</td>
              <td className="doctorScheduling_td">{sw.status}</td>
              <td className="doctorScheduling_td doctorScheduling_capitalize">{sw.partnerDecision || 'pending'}</td>
              <td className="doctorScheduling_td">
                {sw.status === 'pending' && <>
                  <button
                    className="doctorScheduling_button"
                    onClick={() => onApprove(sw._id)}
                    disabled={sw.partnerDecision !== 'accepted'}
                    title={sw.partnerDecision !== 'accepted' ? 'Waiting for partner acceptance before approval' : 'Approve this swap'}
                  >
                    Approve
                  </button>
                  <button
                    className="doctorScheduling_button doctorScheduling_buttonDanger"
                    onClick={() => onReject(sw._id, prompt('Rejection reason?'))}
                    title="Reject this swap"
                  >
                    Reject
                  </button>
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

export default SwapRequestsTable;
