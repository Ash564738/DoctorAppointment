
import React, { useEffect, useState } from 'react';
import './DoctorEarning.css';
import { apiCall } from '../../../helper/apiCall';
import NavbarWrapper from '../../../components/Common/NavbarWrapper/NavbarWrapper';
import Footer from '../../../components/Common/Footer/Footer';
import { FaDollarSign, FaCalendarAlt, FaChartLine, FaDownload } from 'react-icons/fa';


const DoctorEarning = () => {
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentPayouts, setRecentPayouts] = useState([]);
  const [payoutsLoading, setPayoutsLoading] = useState(true);
  const [downloading, setDownloading] = useState(null); // payout id being downloaded

  useEffect(() => {
    fetchEarnings();
    fetchRecentPayouts();
  }, []);

  const fetchEarnings = async () => {
    setLoading(true);
    try {
      const res = await apiCall.get('/payment/doctor-earnings');
      if (res && res.success && res.earnings) {
        setEarnings(res.earnings);
      } else {
        setEarnings(null);
      }
    } catch (err) {
      setEarnings(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentPayouts = async () => {
    setPayoutsLoading(true);
    try {
      const res = await apiCall.get('/payment/payment-history?limit=5');
      if (res && res.success && Array.isArray(res.payments)) {
        setRecentPayouts(res.payments.filter(p => p.status && p.status.toLowerCase() === 'succeeded'));
      } else {
        setRecentPayouts([]);
      }
    } catch (err) {
      setRecentPayouts([]);
    } finally {
      setPayoutsLoading(false);
    }
  };

  const downloadInvoice = async (invoiceId) => {
    setDownloading(invoiceId);
    try {
      const response = await apiCall.get(`payment/download/${invoiceId}/`, { responseType: 'blob' });
      if (response && response.data) {
        const url = window.URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `invoice-${invoiceId}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        alert('Failed to download invoice');
      }
    } catch (error) {
      alert('Failed to download invoice');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="doctorEarning_page">
      <NavbarWrapper />
      <div className="doctorEarning_container">
        <h2 className="doctorEarning_title">My Earnings</h2>
        {loading ? (
          <div className="doctorEarning_loading">Loading...</div>
        ) : !earnings ? (
          <div className="doctorEarning_empty">No earnings data available.</div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="doctorEarning_stats">
              <div className="doctorEarning_statCard">
                <div className="doctorEarning_statIcon"><FaDollarSign /></div>
                <div className="doctorEarning_statContent">
                  <div className="doctorEarning_statNumber">${earnings.totalEarnings?.toFixed(2) ?? '0.00'}</div>
                  <div className="doctorEarning_statLabel">Total Earnings</div>
                </div>
              </div>
              <div className="doctorEarning_statCard">
                <div className="doctorEarning_statIcon"><FaChartLine /></div>
                <div className="doctorEarning_statContent">
                  <div className="doctorEarning_statNumber">${earnings.monthlyBreakdown?.[0]?.earnings?.toFixed(2) ?? '0.00'}</div>
                  <div className="doctorEarning_statLabel">This Month</div>
                </div>
              </div>
              <div className="doctorEarning_statCard">
                <div className="doctorEarning_statIcon"><FaCalendarAlt /></div>
                <div className="doctorEarning_statContent">
                  <div className="doctorEarning_statNumber">${earnings.monthlyBreakdown?.[1]?.earnings?.toFixed(2) ?? '0.00'}</div>
                  <div className="doctorEarning_statLabel">Last Month</div>
                </div>
              </div>
            </div>

            {/* Monthly Breakdown Table */}
            {Array.isArray(earnings.monthlyBreakdown) && earnings.monthlyBreakdown.length > 0 && (
              <div className="doctorEarning_section">
                <h3 className="doctorEarning_sectionTitle">Monthly Earnings Breakdown</h3>
                <div className="doctorEarning_tableWrapper">
                  <table className="doctorEarning_table">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Earnings</th>
                        <th>Appointments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {earnings.monthlyBreakdown.map((row, idx) => (
                        <tr key={row.month || idx}>
                          <td>{row.month}</td>
                          <td>${row.earnings.toFixed(2)}</td>
                          <td>{row.appointments}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recent Payouts Section */}
            <div className="doctorEarning_section">
              <h3 className="doctorEarning_sectionTitle">Recent Payouts</h3>
              {payoutsLoading ? (
                <div className="doctorEarning_loading">Loading payouts...</div>
              ) : recentPayouts.length === 0 ? (
                <div className="doctorEarning_empty">No payouts found.</div>
              ) : (
                <div className="doctorEarning_payoutsList">
                  {recentPayouts.map((payout) => (
                    <div key={payout.id || payout._id} className="doctorEarning_payoutCard">
                      <div className="doctorEarning_payoutInfo">
                        <div><strong>Date:</strong> {payout.paymentDate ? new Date(payout.paymentDate).toLocaleDateString() : '-'}</div>
                        <div><strong>Amount:</strong> ${payout.doctorEarnings?.toFixed(2) ?? payout.amount?.toFixed(2) ?? '0.00'}</div>
                        <div><strong>Status:</strong> {payout.status}</div>
                      </div>
                      <button
                        className="doctorEarning_downloadBtn"
                        onClick={() => downloadInvoice(payout.id || payout._id)}
                        disabled={downloading === (payout.id || payout._id)}
                      >
                        <FaDownload /> {downloading === (payout.id || payout._id) ? 'Downloading...' : 'Download Invoice'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}

export default DoctorEarning;
