import React, { useEffect, useState } from 'react';
import { FaDollarSign, FaClock, FaFileInvoiceDollar, FaChartLine, FaDownload } from 'react-icons/fa';
import NavbarWrapper from '../../../components/Common/NavbarWrapper/NavbarWrapper';
import Footer from '../../../components/Common/Footer/Footer';
import './BillingReports.css';
import { apiCall } from '../../../helper/apiCall';

const BillingReports = () => {
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    dateFrom: '',
    dateTo: '',
    minAmount: '',
    maxAmount: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchBilling();
  }, [currentPage, filters]);

  const fetchBilling = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        ...filters
      });

      Object.keys(filters).forEach(key => {
        if (!filters[key]) {
          params.delete(key);
        }
      });

      const response = await apiCall.get(`/admin/analytics/billing-reports?${params}`);
      if (response.success) {
        setBilling(response.data);
        setTotalPages(response.data.totalPages || 1);
      } else {
        setError(response.message || 'Failed to fetch billing reports');
      }
    } catch (err) {
      setError('Failed to fetch billing reports. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      dateFrom: '',
      dateTo: '',
      minAmount: '',
      maxAmount: ''
    });
    setCurrentPage(1);
  };

  const getStatusClassName = (status) => {
    const baseClass = 'billingReports_status';
    switch (status?.toLowerCase()) {
      case 'succeeded':
        return `${baseClass} billingReports_statusPaid`;
      case 'pending':
      case 'processing':
        return `${baseClass} billingReports_statusPending`;
      case 'failed':
      case 'cancelled':
        return `${baseClass} billingReports_statusOverdue`;
      case 'partially_refunded':
        return `${baseClass} billingReports_statusPartial`;
      case 'refunded':
        return `${baseClass} billingReports_statusOverdue`;
      default:
        return `${baseClass} billingReports_statusPending`;
    }
  };

  const getStatusLabel = (status) => {
    switch (status?.toLowerCase()) {
      case 'succeeded':
        return 'Paid';
      case 'pending':
        return 'Pending';
      case 'processing':
        return 'Processing';
      case 'failed':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      case 'refunded':
        return 'Refunded';
      case 'partially_refunded':
        return 'Partially Refunded';
      default:
        return status || 'Unknown';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  const summaryCards = [
    {
      title: 'Total Revenue',
      value: formatCurrency(billing?.summary?.totalRevenue || 0),
      icon: <FaDollarSign size={22} />,
      className: 'billingReports_cardRevenue'
    },
    {
      title: 'Pending Payments',
      value: formatCurrency(billing?.summary?.pendingPayments || 0),
      icon: <FaClock size={22} />,
      className: 'billingReports_cardPending'
    },
    {
      title: 'This Month',
      value: formatCurrency(billing?.summary?.monthRevenue || 0),
      icon: <FaChartLine size={22} />,
      className: 'billingReports_cardMonth'
    },
    {
      title: 'Failed/Overdue',
      value: formatCurrency(billing?.summary?.overdueAmount || 0),
      icon: <FaFileInvoiceDollar size={22} />,
      className: 'billingReports_cardOverdue'
    }
  ];

  return (
    <div className="billingReports_page" id="billingReports_page">
      <NavbarWrapper />
      <div className="billingReports_container" id="billingReports_container">
        <div className="billingReports_header" id="billingReports_header">
          <h2 className="billingReports_title" id="billingReports_title">Billing Reports</h2>
          <p className="billingReports_subtitle" id="billingReports_subtitle">
            Monitor revenue, track payments, and manage financial operations
          </p>
        </div>

        <div className="billingReports_filters" id="billingReports_filters">
          <div className="billingReports_filterGroup" id="billingReports_filterGroup_status">
            <label className="billingReports_filterLabel" htmlFor="billingReports_statusSelect">Status</label>
            <select 
              className="billingReports_filterSelect"
              id="billingReports_statusSelect"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="succeeded">Paid</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
              <option value="partially_refunded">Partially Refunded</option>
            </select>
          </div>
          <div className="billingReports_filterGroup" id="billingReports_filterGroup_dateFrom">
            <label className="billingReports_filterLabel" htmlFor="billingReports_dateFrom">Date From</label>
            <input 
              type="date"
              className="billingReports_filterInput"
              id="billingReports_dateFrom"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            />
          </div>
          <div className="billingReports_filterGroup" id="billingReports_filterGroup_dateTo">
            <label className="billingReports_filterLabel" htmlFor="billingReports_dateTo">Date To</label>
            <input 
              type="date"
              className="billingReports_filterInput"
              id="billingReports_dateTo"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            />
          </div>
          <div className="billingReports_filterGroup" id="billingReports_filterGroup_minAmount">
            <label className="billingReports_filterLabel" htmlFor="billingReports_minAmount">Min Amount</label>
            <input 
              type="number"
              className="billingReports_filterInput"
              id="billingReports_minAmount"
              placeholder="0"
              value={filters.minAmount}
              onChange={(e) => handleFilterChange('minAmount', e.target.value)}
            />
          </div>
          <div className="billingReports_filterGroup" id="billingReports_filterGroup_maxAmount">
            <label className="billingReports_filterLabel" htmlFor="billingReports_maxAmount">Max Amount</label>
            <input 
              type="number"
              className="billingReports_filterInput"
              id="billingReports_maxAmount"
              placeholder="10000"
              value={filters.maxAmount}
              onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
            />
          </div>
          <button className="billingReports_button billingReports_filterButton" id="billingReports_filterButton" onClick={fetchBilling}>
            Apply Filters
          </button>
          <button className="billingReports_button billingReports_clearFiltersButton" id="billingReports_clearFiltersButton" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>

        {loading ? (
          <div className="billingReports_loadingContainer" id="billingReports_loadingContainer">
            <div className="billingReports_spinner" id="billingReports_spinner"></div>
            <p className="billingReports_loadingText" id="billingReports_loadingText">Loading billing reports...</p>
          </div>
        ) : error ? (
          <div className="billingReports_errorContainer" id="billingReports_errorContainer">
            <div className="billingReports_errorMessage" id="billingReports_errorMessage">
              <div className="billingReports_errorContent" id="billingReports_errorContent">
                <h3 className="billingReports_errorTitle" id="billingReports_errorTitle">Failed to Load Billing Reports</h3>
                <p className="billingReports_errorText" id="billingReports_errorText">{error}</p>
                <button 
                  className="billingReports_button billingReports_retryButton"
                  id="billingReports_retryButton"
                  onClick={fetchBilling}
                  disabled={loading}
                >
                  {loading ? 'Retrying...' : 'Retry'}
                </button>
              </div>
            </div>
          </div>
        ) : billing ? (
          <>
            {/* Summary Cards */}
            <div className="billingReports_summaryGrid" id="billingReports_summaryGrid">
              {summaryCards.map((card, index) => (
                <div key={index} className={`billingReports_card ${card.className}`} id={`billingReports_card_${index}`}>
                  <div className="billingReports_cardIcon" id={`billingReports_cardIcon_${index}`}>
                    {card.icon}
                  </div>
                  <div className="billingReports_cardTitle" id={`billingReports_cardTitle_${index}`}>{card.title}</div>
                  <div className="billingReports_cardValue" id={`billingReports_cardValue_${index}`}>{card.value}</div>
                </div>
              ))}
            </div>

            {/* Billing Reports Table */}
            <div className="billingReports_tableSection" id="billingReports_tableSection">
              <div className="billingReports_tableHeader" id="billingReports_tableHeader">
                <h3 className="billingReports_tableTitle" id="billingReports_tableTitle">
                  Payment Records ({billing?.reports?.length || 0} of {billing?.total || 0})
                </h3>
                <div className="billingReports_tableActions" id="billingReports_tableActions">
                  <button 
                    className="billingReports_button billingReports_refreshButton"
                    id="billingReports_refreshButton"
                    onClick={fetchBilling}
                    disabled={loading}
                  >
                    {loading ? <FaClock /> : <FaDownload />} Refresh
                  </button>
                </div>
              </div>
              
              {billing.reports && billing.reports.length > 0 ? (
                <>
                  <table className="billingReports_table" id="billingReports_table">
                    <thead className="billingReports_tableHead" id="billingReports_tableHead">
                      <tr>
                        <th className="billingReports_tableHeaderCell" id="billingReports_tableHeaderCell_invoice">Invoice #</th>
                        <th className="billingReports_tableHeaderCell" id="billingReports_tableHeaderCell_patient">Patient</th>
                        <th className="billingReports_tableHeaderCell" id="billingReports_tableHeaderCell_doctor">Doctor</th>
                        <th className="billingReports_tableHeaderCell" id="billingReports_tableHeaderCell_services">Services</th>
                        <th className="billingReports_tableHeaderCell" id="billingReports_tableHeaderCell_amount">Amount</th>
                        <th className="billingReports_tableHeaderCell" id="billingReports_tableHeaderCell_status">Status</th>
                        <th className="billingReports_tableHeaderCell" id="billingReports_tableHeaderCell_date">Date</th>
                      </tr>
                    </thead>
                    <tbody className="billingReports_tableBody" id="billingReports_tableBody">
                      {billing.reports.map((report) => (
                        <tr key={report._id} className="billingReports_tableRow" id={`billingReports_tableRow_${report._id}`}>
                          <td className="billingReports_tableCell billingReports_invoiceNumber" id={`billingReports_tableCell_invoice_${report._id}`}>
                            {report.invoiceNumber}
                          </td>
                          <td className="billingReports_tableCell billingReports_patientName" id={`billingReports_tableCell_patient_${report._id}`}>
                            {report.patientName}
                          </td>
                          <td className="billingReports_tableCell billingReports_doctorName" id={`billingReports_tableCell_doctor_${report._id}`}>
                            {report.doctorName}
                          </td>
                          <td className="billingReports_tableCell billingReports_services" id={`billingReports_tableCell_services_${report._id}`}>
                            {report.services}
                          </td>
                          <td className="billingReports_tableCell billingReports_amount" id={`billingReports_tableCell_amount_${report._id}`}>
                            {formatCurrency(report.amount)}
                          </td>
                          <td className="billingReports_tableCell" id={`billingReports_tableCell_status_${report._id}`}>
                            <span className={getStatusClassName(report.status)} id={`billingReports_status_${report._id}`}>
                              {getStatusLabel(report.status)}
                            </span>
                          </td>
                          <td className="billingReports_tableCell billingReports_date" id={`billingReports_tableCell_date_${report._id}`}>
                            {formatDate(report.date)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  <div className="billingReports_pagination" id="billingReports_pagination">
                    <button 
                      className="billingReports_button billingReports_paginationButton"
                      id="billingReports_paginationButton_prev"
                      disabled={currentPage === 1 || loading}
                      onClick={() => setCurrentPage(prev => prev - 1)}
                    >
                      Previous
                    </button>
                    
                    <div className="billingReports_paginationInfo" id="billingReports_paginationInfo">
                      <span>Page {currentPage} of {totalPages}</span>
                      <span className="billingReports_totalCount" id="billingReports_totalCount">
                        ({billing?.total || 0} total records)
                      </span>
                    </div>
                    
                    <button 
                      className="billingReports_button billingReports_paginationButton"
                      id="billingReports_paginationButton_next"
                      disabled={currentPage >= totalPages || loading}
                      onClick={() => setCurrentPage(prev => prev + 1)}
                    >
                      Next
                    </button>
                  </div>
                </>
              ) : (
                <div className="billingReports_noDataContainer" id="billingReports_noDataContainer">
                  <div className="billingReports_noDataMessage" id="billingReports_noDataMessage">
                    <h3 className="billingReports_noDataTitle" id="billingReports_noDataTitle">No Billing Records Found</h3>
                    <p className="billingReports_noDataText" id="billingReports_noDataText">
                      {Object.values(filters).some(filter => filter !== '') 
                        ? 'No billing records match your current filters. Try adjusting your search criteria.'
                        : 'No billing records have been generated yet. Records will appear here once payments are processed.'
                      }
                    </p>
                    {Object.values(filters).some(filter => filter !== '') && (
                      <button 
                        className="billingReports_button billingReports_clearFiltersButton"
                        id="billingReports_clearFiltersButton_noData"
                        onClick={clearFilters}
                      >
                        Clear All Filters
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="billingReports_noDataContainer" id="billingReports_noDataContainer_empty">
            <div className="billingReports_noDataMessage" id="billingReports_noDataMessage_empty">
              <h3 className="billingReports_noDataTitle" id="billingReports_noDataTitle_empty">No Billing Data Available</h3>
              <p className="billingReports_noDataText" id="billingReports_noDataText_empty">
                There is no billing information to display. This could be because no payments have been processed yet or there may be a connectivity issue.
              </p>
              <button 
                className="billingReports_button billingReports_retryButton"
                id="billingReports_retryButton_empty"
                onClick={fetchBilling}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Refresh Data'}
              </button>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default BillingReports;