import React, { useState, useEffect } from 'react';
import NavbarWrapper from '../../../components/Common/NavbarWrapper/NavbarWrapper';
import Footer from '../../../components/Common/Footer/Footer';
import { apiCall } from '../../../helper/apiCall';
import toast from 'react-hot-toast';
// removed unused jwtDecode import
import { FaFileInvoice, FaDownload, FaEye, FaUndo, FaExclamationTriangle, FaSpinner } from 'react-icons/fa';
import { MdCheckCircle } from 'react-icons/md';
import './PaymentBilling.css';
import PageHeader from '../../../components/Common/PageHeader/PageHeader';

const PaymentBilling = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [invoiceDetails, setInvoiceDetails] = useState(null);
  
  // Refund state
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundRequesting, setRefundRequesting] = useState({});

  // removed unused userId

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await apiCall.get('/payment/payment-history');
      if (response && response.success && Array.isArray(response.payments)) {
        const mapped = response.payments.map(payment => ({
          _id: payment._id,
          invoiceNumber: payment._id.slice(-8).toUpperCase(),
          doctorName: payment.doctorId ? `${payment.doctorId.firstname} ${payment.doctorId.lastname}` : '',
          serviceDescription: payment.appointmentId?.symptoms || 'Consultation',
          amount: payment.amount,
          status: (payment.status || '').toLowerCase() === 'succeeded'
            ? 'paid'
            : (payment.status || '').toLowerCase() === 'refunded'
              ? 'overdue'
              : (payment.status || '').toLowerCase(),
          appointmentDate: payment.appointmentId?.date,
          dueDate: payment.appointmentId?.date,
          paidDate: payment.paymentDate,
          paymentMethod: payment.paymentMethod,
          receiptUrl: payment.receiptUrl,
          paymentRaw: payment
        }));
        setInvoices(mapped);
      } else {
        setInvoices([]);
      }
    } catch (error) {
      setInvoices([]);
      toast.error('Error fetching invoices');
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = async (invoiceId) => {
    try {
      const blob = await apiCall.get(`payment/download/${invoiceId}/`, { responseType: 'blob' });
      if (blob) {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `invoice-${invoiceId}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        toast.success('Invoice download started');
      } else {
        toast.error('Failed to download invoice');
      }
    } catch (error) {
      toast.error('Failed to download invoice');
    }
  };

  const handleViewDetails = async (invoice) => {
    setLoading(true);
    try {
      const response = await apiCall.get(`/payment/payment/${invoice._id}`);
      if (response && response.success && response.payment) {
        setInvoiceDetails(response.payment);
        setShowInvoiceDetails(true);
      } else {
        toast.error('Failed to fetch invoice details');
      }
    } catch (error) {
      toast.error('Failed to fetch invoice details');
    } finally {
      setLoading(false);
    }
  };

  const closeInvoiceDetails = () => {
    setShowInvoiceDetails(false);
    setInvoiceDetails(null);
  };

  // Refund functionality
  const requestRefund = async (invoiceId, reason) => {
    setRefundRequesting(prev => ({ ...prev, [invoiceId]: true }));
    
    try {
      const response = await apiCall.post('/payment/request-refund', {
        paymentId: invoiceId,
        reason
      });

      if (response.success) {
        toast.success('Refund request submitted successfully!');
        setShowRefundModal(false);
        setSelectedInvoice(null);
        setRefundReason('');
        await fetchInvoices(); // Refresh the invoices
      } else {
        toast.error('Failed to submit refund request: ' + response.message);
      }
    } catch (error) {
      console.error('Refund request error:', error);
      toast.error('Error submitting refund request. Please try again.');
    } finally {
      setRefundRequesting(prev => ({ ...prev, [invoiceId]: false }));
    }
  };

  const openRefundModal = (invoice) => {
    setSelectedInvoice(invoice);
    setShowRefundModal(true);
  };

  const closeRefundModal = () => {
    setShowRefundModal(false);
    setSelectedInvoice(null);
    setRefundReason('');
  };

  const canRequestRefund = (invoice) => {
    const status = getPrettyStatusLabel(invoice).toLowerCase();
    return status === 'paid' && !invoice.refundRequested;
  };

  // removed unused getStatusColor helper

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

  const filteredInvoices = invoices;

  const PaymentStatusIcon = ({ status }) => {
    switch (status) {
      case 'Paid':
        return <MdCheckCircle size={18} color="#155724" style={{ marginRight: 4 }} />;
      case 'Refunded':
        return (
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{ marginRight: 4 }}>
            <circle cx="10" cy="10" r="10" fill="#d1ecf1" />
            <path d="M13 7v3a3 3 0 01-3 3H7" stroke="#0c5460" strokeWidth="2" fill="none" strokeLinecap="round"/>
            <path d="M7 13l2-2-2-2" stroke="#0c5460" strokeWidth="2" fill="none" strokeLinecap="round"/>
          </svg>
        );
      default:
        return (
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{ marginRight: 4 }}>
            <circle cx="10" cy="10" r="10" fill="#fff3cd" />
            <path d="M10 5v5l3 3" stroke="#856404" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
    }
  };

  const getPrettyStatusLabel = (invoice) => {
    const raw = (invoice?.paymentRaw?.status || invoice?.status || '').toLowerCase();
    if (raw === 'succeeded' || raw === 'paid') return 'Paid';
    if (raw === 'refunded') return 'Refunded';
    if (!raw) return 'Unknown';
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  };

  return (
    <div className="paymentBilling_page">
      <NavbarWrapper />
      <div className="paymentBilling_container">
        <PageHeader
          title="Payment & Billing"
          subtitle="Manage your medical bills and transaction history."
          className="paymentBilling_header"
        />

        {loading ? (
          <div className="paymentBilling_loading">
            <div className="paymentBilling_spinner"></div>
            <p className="paymentBilling_loadingText">Loading billing information...</p>
          </div>
        ) : (
          <>
            <div className="paymentBilling_section">

              {filteredInvoices.length > 0 ? (
                <div className="paymentBilling_invoicesList">
                  {filteredInvoices.map((invoice) => (
                    <div key={invoice._id} className="paymentBilling_invoiceCard">
                      <div className="paymentBilling_invoiceHeader">
                        <div className="paymentBilling_invoiceInfo">
                          <h3 className="paymentBilling_invoiceNumber">{invoice.invoiceNumber}</h3>
                          <p className="paymentBilling_invoiceDoctor">{invoice.doctorName}</p>
                          <p className="paymentBilling_invoiceService">{invoice.serviceDescription}</p>
                        </div>
                        <div className="paymentBilling_invoiceAmount">
                          <span className="paymentBilling_amount">{formatCurrency(invoice.amount)}</span>
                          <span 
                            className={`paymentBilling_status paymentBilling_status--${getPrettyStatusLabel(invoice).toLowerCase().replace(/\s+/g, '-')}`}>
                            <PaymentStatusIcon status={getPrettyStatusLabel(invoice)} />
                            {getPrettyStatusLabel(invoice)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="paymentBilling_invoiceDetails">
                        <div className="paymentBilling_detailRow">
                          <span className="paymentBilling_label">Appointment Date:</span>
                          <span className="paymentBilling_value">{formatDate(invoice.appointmentDate)}</span>
                        </div>
                        <div className="paymentBilling_detailRow">
                          <span className="paymentBilling_label">Due Date:</span>
                          <span className="paymentBilling_value">{formatDate(invoice.dueDate)}</span>
                        </div>
                        {invoice.paidDate && (
                          <div className="paymentBilling_detailRow">
                            <span className="paymentBilling_label">Paid Date:</span>
                            <span className="paymentBilling_value">{formatDate(invoice.paidDate)}</span>
                          </div>
                        )}
                        {invoice.paymentMethod && (
                          <div className="paymentBilling_detailRow">
                            <span className="paymentBilling_label">Payment Method:</span>
                            <span className="paymentBilling_value">{invoice.paymentMethod}</span>
                          </div>
                        )}
                      </div>

                      <div className="paymentBilling_invoiceActions">
                        <button 
                          className="paymentBilling_actionButton paymentBilling_viewButton"
                          onClick={() => handleViewDetails(invoice)}
                        >
                          <FaEye /> View Details
                        </button>
                        <button 
                          className="paymentBilling_actionButton paymentBilling_downloadButton"
                          onClick={() => downloadInvoice(invoice._id)}
                        >
                          <FaDownload /> Download
                        </button>
                        
                        {/* Refund Button - only for paid invoices that haven't been refunded */}
                        {canRequestRefund(invoice) && (
                          <button 
                            className="paymentBilling_actionButton paymentBilling_refundButton"
                            onClick={() => openRefundModal(invoice)}
                            disabled={refundRequesting[invoice._id]}
                          >
                            {refundRequesting[invoice._id] ? (
                              <>
                                <FaSpinner className="fa-spin" />
                                Requesting...
                              </>
                            ) : (
                              <>
                                <FaUndo />
                                Request Refund
                              </>
                            )}
                          </button>
                        )}
                        
                        {/* Show refund status if already refunded or requested */}
                        {getPrettyStatusLabel(invoice).toLowerCase() === 'refunded' && (
                          <div className="paymentBilling_refundStatus">
                            <FaUndo /> Refunded
                          </div>
                        )}
                        {invoice.refundRequested && getPrettyStatusLabel(invoice).toLowerCase() !== 'refunded' && (
                          <div className="paymentBilling_refundStatus paymentBilling_refundPending">
                            <FaExclamationTriangle /> Refund Pending
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="paymentBilling_emptyState">
                  <FaFileInvoice className="paymentBilling_emptyIcon" />
                  <p className="paymentBilling_emptyText">No invoices found for the selected filter.</p>
                </div>
              )}
            </div>

            {showInvoiceDetails && invoiceDetails && (
              <div className="paymentBilling_modal">
                <div className="paymentBilling_modalContent">
                  <div className="paymentBilling_modalHeader">
                    <h3 className="paymentBilling_modalTitle">Invoice Details</h3>
                    <button 
                      className="paymentBilling_modalClose"
                      onClick={closeInvoiceDetails}
                    >
                      ×
                    </button>
                  </div>
                  <div className="paymentBilling_modalBody">
                    <div className="paymentBilling_detailRow">
                      <span className="paymentBilling_label">Invoice ID:</span>
                      <span className="paymentBilling_value">{invoiceDetails._id}</span>
                    </div>
                    <div className="paymentBilling_detailRow">
                      <span className="paymentBilling_label">Doctor:</span>
                      <span className="paymentBilling_value">
                        {invoiceDetails.doctorId?.firstname} {invoiceDetails.doctorId?.lastname}
                      </span>
                    </div>
                    <div className="paymentBilling_detailRow">
                      <span className="paymentBilling_label">Patient:</span>
                      <span className="paymentBilling_value">
                        {invoiceDetails.patientId?.firstname} {invoiceDetails.patientId?.lastname}
                      </span>
                    </div>
                    <div className="paymentBilling_detailRow">
                      <span className="paymentBilling_label">Amount:</span>
                      <span className="paymentBilling_value">{formatCurrency(invoiceDetails.amount)}</span>
                    </div>
                    <div className="paymentBilling_detailRow">
                      <span className="paymentBilling_label">Status:</span>
                      <span className="paymentBilling_value">{invoiceDetails.status}</span>
                    </div>
                    <div className="paymentBilling_detailRow">
                      <span className="paymentBilling_label">Payment Date:</span>
                      <span className="paymentBilling_value">{formatDate(invoiceDetails.paymentDate)}</span>
                    </div>
                    <div className="paymentBilling_detailRow">
                      <span className="paymentBilling_label">Payment Method:</span>
                      <span className="paymentBilling_value">{invoiceDetails.paymentMethod}</span>
                    </div>
                    {invoiceDetails.receiptUrl && (
                      <div className="paymentBilling_detailRow">
                        <span className="paymentBilling_label">Receipt:</span>
                        <a href={invoiceDetails.receiptUrl} target="_blank" rel="noopener noreferrer">
                          View Receipt
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Refund Request Modal */}
        {showRefundModal && selectedInvoice && (
          <div className="paymentBilling_modalOverlay">
            <div className="paymentBilling_refundModal">
              <div className="paymentBilling_modalHeader">
                <h3>Request Refund</h3>
                <button 
                  className="paymentBilling_modalClose"
                  onClick={closeRefundModal}
                >
                  ×
                </button>
              </div>
              <div className="paymentBilling_modalContent">
                <div className="paymentBilling_refundDetails">
                  <p><strong>Invoice:</strong> {selectedInvoice.invoiceNumber}</p>
                  <p><strong>Amount:</strong> {formatCurrency(selectedInvoice.amount)}</p>
                  <p><strong>Doctor:</strong> {selectedInvoice.doctorName}</p>
                  <p><strong>Service:</strong> {selectedInvoice.serviceDescription}</p>
                </div>
                
                <div className="paymentBilling_refundWarning">
                  <FaExclamationTriangle />
                  <span>Refund requests are subject to review and approval. Processing may take 3-5 business days.</span>
                </div>
                
                <div className="paymentBilling_formGroup">
                  <label htmlFor="refundReason">Reason for Refund Request:</label>
                  <select
                    id="refundReason"
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="paymentBilling_select"
                  >
                    <option value="">Select a reason</option>
                    <option value="Appointment cancelled by patient">Appointment cancelled by patient</option>
                    <option value="Appointment cancelled by doctor">Appointment cancelled by doctor</option>
                    <option value="Medical emergency">Medical emergency</option>
                    <option value="Billing error">Billing error</option>
                    <option value="Service not satisfactory">Service not satisfactory</option>
                    <option value="Technical issues">Technical issues</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div className="paymentBilling_modalActions">
                  <button 
                    className="paymentBilling_btnCancel"
                    onClick={closeRefundModal}
                  >
                    Cancel
                  </button>
                  <button 
                    className="paymentBilling_btnSubmit"
                    onClick={() => requestRefund(selectedInvoice._id, refundReason)}
                    disabled={!refundReason || refundRequesting[selectedInvoice._id]}
                  >
                    {refundRequesting[selectedInvoice._id] ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
      <Footer />
    </div>
  );
};

export default PaymentBilling;