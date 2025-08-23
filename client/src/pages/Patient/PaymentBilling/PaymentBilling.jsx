import React, { useState, useEffect } from 'react';
import NavbarWrapper from '../../../components/Common/NavbarWrapper/NavbarWrapper';
import Footer from '../../../components/Common/Footer/Footer';
import { apiCall } from '../../../helper/apiCall';
import toast from 'react-hot-toast';
import { jwtDecode } from 'jwt-decode';
import { FaFileInvoice, FaDownload, FaEye } from 'react-icons/fa';
import './PaymentBilling.css';

const PaymentBilling = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [invoiceDetails, setInvoiceDetails] = useState(null);

  const { userId } = jwtDecode(localStorage.getItem("token"));

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
      const response = await apiCall.get(`payment/download/${invoiceId}/`, { responseType: 'blob' });
      if (response && response.data) {
        const url = window.URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `invoice-${invoiceId}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return '#28a745';
      case 'overdue': return '#dc3545';
      default: return '#6c757d';
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

  const filteredInvoices = invoices;

  return (
    <div className="paymentBilling_page">
      <NavbarWrapper />
      <div className="paymentBilling_container">
        <div className="paymentBilling_header">
          <h1 className="paymentBilling_title">Payment & Billing</h1>
          <p className="paymentBilling_description">
            Manage your medical bills and transaction history.
          </p>
        </div>

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
                            className="paymentBilling_status" 
                            style={{ backgroundColor: getStatusColor(invoice.status) }}
                          >
                            {invoice.status}
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
      </div>
      <Footer />
    </div>
  );
};

export default PaymentBilling;