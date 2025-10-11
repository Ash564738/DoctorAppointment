import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Empty from "../../../components/Common/Empty/Empty";
import NavbarWrapper from "../../../components/Common/NavbarWrapper/NavbarWrapper";
import Footer from "../../../components/Common/Footer/Footer";
import { apiCall } from "../../../helper/apiCall";
import { setLoading } from "../../../redux/reducers/rootSlice";
import Loading from "../../../components/Common/Loading/Loading";
import toast from "react-hot-toast";
import { Select } from "antd";
import { FaUndo, FaSpinner, FaExclamationTriangle } from "react-icons/fa";
import "./DoctorAppointments.css";
import PageHeader from "../../../components/Common/PageHeader/PageHeader";

const DoctorAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState("all");
  const [editFields, setEditFields] = useState({}); 
  const { loading } = useSelector((state) => state.root);
  const dispatch = useDispatch();
  
  // Refund state
  const [refundProcessing, setRefundProcessing] = useState({});
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundAmount, setRefundAmount] = useState(0);
  const DOCTOR_REFUND_LIMIT = 500;
  const fetchDoctorAppointments = useCallback(async () => {
    try {
      dispatch(setLoading(true));
      const response = await apiCall.get("/appointment/doctor");

      if (response?.success && Array.isArray(response.appointments)) {
        setAppointments(response.appointments);
      } else {
        setAppointments([]);
        toast.error(response?.message || "No appointments found");
      }
    } catch (error) {
      setAppointments([]);
      toast.error("Failed to fetch appointments");
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  useEffect(() => {
    fetchDoctorAppointments();
  }, [fetchDoctorAppointments]);

  const filteredAppointments = useMemo(() => {
    if (filterStatus === "all") return appointments;
    return appointments.filter((a) => (a.status || "") === filterStatus);
  }, [appointments, filterStatus]);

  const handleStatusUpdate = async (appointmentId, nextStatus) => {
    try {
      dispatch(setLoading(true));

      const res = await apiCall.put(`/appointment/update/${appointmentId}`, {
        status: nextStatus,
      });

      if (res?.success) {
        toast.success("Appointment status updated");
        await fetchDoctorAppointments();
      } else {
        toast.error(res?.message || "Failed to update status");
      }
    } catch (err) {
      toast.error("Failed to update status");
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleEditFieldChange = (appointmentId, field, value) => {
    setEditFields((prev) => ({
      ...prev,
      [appointmentId]: {
        ...prev[appointmentId],
        [field]: value,
      },
    }));
  };

  const handleSaveEdit = async (appointmentId) => {
    try {
      dispatch(setLoading(true));
      const fields = editFields[appointmentId];
      const res = await apiCall.put(`/appointment/update/${appointmentId}`, fields);
      if (res?.success) {
        toast.success("Appointment updated");
        setEditFields((prev) => {
          const copy = { ...prev };
          delete copy[appointmentId];
          return copy;
        });
        await fetchDoctorAppointments();
      } else {
        toast.error(res?.message || "Failed to update appointment");
      }
    } catch (err) {
      toast.error("Failed to update appointment");
    } finally {
      dispatch(setLoading(false));
    }
  };

  const fmtDate = (d) => {
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString();
    } catch {
      return String(d || "-");
    }
  };

  // Refund functionality
  const processRefund = async (appointmentId, amount, reason) => {
    setRefundProcessing(prev => ({ ...prev, [appointmentId]: true }));
    
    try {
      const response = await apiCall.post('/refunds/process', {
        appointmentId,
        amount: parseFloat(amount),
        reason
      });

      if (response.success) {
        toast.success('Refund processed successfully!');
        setShowRefundModal(false);
        setSelectedRefund(null);
        setRefundReason('');
        setRefundAmount(0);
        await fetchDoctorAppointments();
      } else {
        toast.error('Failed to process refund: ' + response.message);
      }
    } catch (error) {
      console.error('Refund processing error:', error);
      toast.error('Error processing refund. Please try again.');
    } finally {
      setRefundProcessing(prev => ({ ...prev, [appointmentId]: false }));
    }
  };

  const openRefundModal = (appointment) => {
    setSelectedRefund(appointment);
    setRefundAmount(100); // Default appointment fee
    setShowRefundModal(true);
  };

  const closeRefundModal = () => {
    setShowRefundModal(false);
    setSelectedRefund(null);
    setRefundReason('');
    setRefundAmount(0);
  };

  const canProcessRefund = (appointment) => {
    return appointment.status === 'Cancelled' && 
           appointment.paymentStatus === 'Paid' &&
           parseFloat(refundAmount || 100) <= DOCTOR_REFUND_LIMIT;
  };

  if (loading) return <Loading />;

  return (
    <div className="doctorAppointments_page">
      <NavbarWrapper />
        <div className="doctorAppointments_container">
          <PageHeader
            title="My Appointments"
            subtitle="Review and manage your upcoming and past appointments"
            className="doctorAppointments_header"
          />
          <div className="doctorAppointments_filterContainer">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="doctorAppointments_statusFilter"
            >
              <option value="all">All</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {filteredAppointments?.length ? (
            <div className="doctorAppointments_grid">
              {filteredAppointments.map((appointment) => {
                const id = appointment._id;
                const status = appointment.status || "";
                const patient = appointment.userId || {};
                const isEditing = !!editFields[id];
                return (
                  <div key={id} className="doctorAppointments_card">
                    <div className="doctorAppointments_cardHeader">
                      <h3 className="doctorAppointments_patientName">
                        {patient.firstname} {patient.lastname}
                      </h3>
                      <span
                        className={`doctorAppointments_statusBadge doctorAppointments_statusBadge--${status.toLowerCase()}`}
                      >
                        {status || "-"}
                      </span>
                    </div>

                    <div className="doctorAppointments_cardDetails">
                      <div className="doctorAppointments_detail">
                        <span className="doctorAppointments_detailLabel">Date:</span>
                        <span className="doctorAppointments_detailValue">{fmtDate(appointment.date)}</span>
                      </div>
                      <div className="doctorAppointments_detail">
                        <span className="doctorAppointments_detailLabel">Time:</span>
                        <span className="doctorAppointments_detailValue">{appointment.time || "-"}</span>
                      </div>
                      <div className="doctorAppointments_detail">
                        <span className="doctorAppointments_detailLabel">Symptoms:</span>
                        <span className="doctorAppointments_detailValue">{appointment.symptoms || "-"}</span>
                      </div>
                      {/* Editable fields for doctor */}
                      <div className="doctorAppointments_detail">
                        <span className="doctorAppointments_detailLabel">Appointment Type:</span>
                        {isEditing ? (
                          <Select
                            size="small"
                            value={editFields[id]?.appointmentType ?? appointment.appointmentType ?? "Regular"}
                            className="doctorAppointments_select doctorAppointments_select--appointmentType"
                            onChange={(v) => handleEditFieldChange(id, "appointmentType", v)}
                            options={[
                              { value: "Regular", label: "Regular" },
                              { value: "Emergency", label: "Emergency" },
                              { value: "Follow-up", label: "Follow-up" },
                              { value: "Consultation", label: "Consultation" },
                            ]}
                          />
                        ) : (
                          <span className="doctorAppointments_detailValue">{appointment.appointmentType || "Regular"}</span>
                        )}
                      </div>
                      <div className="doctorAppointments_detail">
                        <span className="doctorAppointments_detailLabel">Priority:</span>
                        {isEditing ? (
                          <Select
                            size="small"
                            value={editFields[id]?.priority ?? appointment.priority ?? "Normal"}
                            className="doctorAppointments_select doctorAppointments_select--priority"
                            onChange={(v) => handleEditFieldChange(id, "priority", v)}
                            options={[
                              { value: "Low", label: "Low" },
                              { value: "Normal", label: "Normal" },
                              { value: "High", label: "High" },
                              { value: "Urgent", label: "Urgent" },
                            ]}
                          />
                        ) : (
                          <span className="doctorAppointments_detailValue">{appointment.priority || "Normal"}</span>
                        )}
                      </div>
                      <div className="doctorAppointments_detail">
                        <span className="doctorAppointments_detailLabel">Estimated Duration:</span>
                        {isEditing ? (
                          <input
                            type="number"
                            min={5}
                            max={240}
                            value={editFields[id]?.estimatedDuration ?? appointment.estimatedDuration ?? 30}
                            onChange={e => handleEditFieldChange(id, "estimatedDuration", Number(e.target.value))}
                            className="doctorAppointments_input doctorAppointments_input--duration"
                          />
                        ) : (
                          <span className="doctorAppointments_detailValue">{appointment.estimatedDuration ? `${appointment.estimatedDuration} min` : "30 min"}</span>
                        )}
                      </div>
                      <div className="doctorAppointments_detail">
                        <span className="doctorAppointments_detailLabel">Recurring Pattern:</span>
                        {isEditing ? (
                          <Select
                            size="small"
                            value={editFields[id]?.recurringPattern?.frequency ?? appointment.recurringPattern?.frequency ?? ""}
                            className="doctorAppointments_select doctorAppointments_select--recurring"
                            onChange={v => handleEditFieldChange(id, "recurringPattern", { ...appointment.recurringPattern, frequency: v })}
                            options={[
                              { value: "", label: "None" },
                              { value: "Weekly", label: "Weekly" },
                              { value: "Biweekly", label: "Biweekly" },
                              { value: "Monthly", label: "Monthly" },
                            ]}
                          />
                        ) : (
                          <span className="doctorAppointments_detailValue">{appointment.recurringPattern?.frequency || "None"}</span>
                        )}
                      </div>
                      {patient.phone && (
                        <div className="doctorAppointments_detail">
                          <span className="doctorAppointments_detailLabel">Phone:</span>
                          <span className="doctorAppointments_detailValue">{patient.phone}</span>
                        </div>
                      )}
                      {patient.email && (
                        <div className="doctorAppointments_detail">
                          <span className="doctorAppointments_detailLabel">Email:</span>
                          <span className="doctorAppointments_detailValue">{patient.email}</span>
                        </div>
                      )}
                    </div>

                    <div className="doctorAppointments_cardActions">
                      {!isEditing ? (
                        <>
                          <button
                            onClick={() => setEditFields((prev) => ({ ...prev, [id]: {} }))}
                            className="doctorAppointments_actionBtn doctorAppointments_actionBtn--edit"
                          >
                            Edit Details
                          </button>
                          <button
                            onClick={() => navigate('/doctor/medical-records')}
                            className="doctorAppointments_actionBtn doctorAppointments_actionBtn--records"
                          >
                            View Medical Records
                          </button>
                          
                          {/* Refund Button - only for cancelled paid appointments */}
                          {appointment.status === 'Cancelled' && appointment.paymentStatus === 'Paid' && (
                            <button
                              onClick={() => openRefundModal(appointment)}
                              disabled={refundProcessing[id]}
                              className="doctorAppointments_actionBtn doctorAppointments_actionBtn--refund"
                              title={`Process refund (Doctor limit: $${DOCTOR_REFUND_LIMIT})`}
                            >
                              {refundProcessing[id] ? (
                                <>
                                  <FaSpinner className="fa-spin" size={14} />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <FaUndo size={14} />
                                  Process Refund
                                </>
                              )}
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleSaveEdit(id)}
                            className="doctorAppointments_actionBtn doctorAppointments_actionBtn--save"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditFields((prev) => {
                              const copy = { ...prev };
                              delete copy[id];
                              return copy;
                            })}
                            className="doctorAppointments_actionBtn doctorAppointments_actionBtn--cancel"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    {status === "Confirmed" && (
                        <button
                          onClick={() => handleStatusUpdate(id, "Completed")}
                          className="doctorAppointments_actionBtn doctorAppointments_actionBtn--complete"
                        >
                          Mark Complete
                        </button>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          ) : (
            <Empty message="No appointments found" />
          )}
        </div>

        {/* Refund Modal */}
        {showRefundModal && selectedRefund && (
          <div className="doctorAppointments_modalOverlay">
            <div className="doctorAppointments_modal">
              <div className="doctorAppointments_modalHeader">
                <h3>Process Refund</h3>
                <button 
                  className="doctorAppointments_modalClose"
                  onClick={closeRefundModal}
                >
                  ×
                </button>
              </div>
              <div className="doctorAppointments_modalContent">
                <div className="doctorAppointments_refundDetails">
                  <p><strong>Patient:</strong> {selectedRefund.userId?.firstname} {selectedRefund.userId?.lastname}</p>
                  <p><strong>Date:</strong> {fmtDate(selectedRefund.date)}</p>
                  <p><strong>Time:</strong> {selectedRefund.time}</p>
                </div>
                
                <div className="doctorAppointments_limitWarning">
                  <FaExclamationTriangle />
                  <span>Doctor refund limit: ${DOCTOR_REFUND_LIMIT}. Amounts above this require admin approval.</span>
                </div>
                
                <div className="doctorAppointments_formGroup">
                  <label htmlFor="refundAmount">Refund Amount ($):</label>
                  <input
                    id="refundAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    max={DOCTOR_REFUND_LIMIT}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="doctorAppointments_input"
                  />
                  {parseFloat(refundAmount) > DOCTOR_REFUND_LIMIT && (
                    <small className="doctorAppointments_error">
                      Amount exceeds doctor limit. Please contact admin for larger refunds.
                    </small>
                  )}
                </div>
                
                <div className="doctorAppointments_formGroup">
                  <label htmlFor="refundReason">Reason for Refund:</label>
                  <select
                    id="refundReason"
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="doctorAppointments_select"
                  >
                    <option value="">Select a reason</option>
                    <option value="Doctor unavailable">Doctor unavailable</option>
                    <option value="Medical emergency">Medical emergency</option>
                    <option value="Technical issues">Technical issues</option>
                    <option value="Schedule conflict">Schedule conflict</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div className="doctorAppointments_modalActions">
                  <button 
                    className="doctorAppointments_btnCancel"
                    onClick={closeRefundModal}
                  >
                    Cancel
                  </button>
                  <button 
                    className="doctorAppointments_btnProcess"
                    onClick={() => processRefund(selectedRefund._id, refundAmount, refundReason)}
                    disabled={!refundAmount || !refundReason || parseFloat(refundAmount) > DOCTOR_REFUND_LIMIT || refundProcessing[selectedRefund._id]}
                  >
                    {refundProcessing[selectedRefund._id] ? 'Processing...' : 'Process Refund'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      <Footer />
    </div>
  );
};

export default DoctorAppointments;