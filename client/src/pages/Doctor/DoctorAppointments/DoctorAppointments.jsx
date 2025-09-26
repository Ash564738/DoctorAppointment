import React, { useEffect, useState, useMemo } from "react";
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
import "./DoctorAppointments.css";

const DoctorAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState("all");
  const [editFields, setEditFields] = useState({}); 
  const { loading } = useSelector((state) => state.root);
  const dispatch = useDispatch();

  const fetchDoctorAppointments = async () => {
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
  };

  useEffect(() => {
    fetchDoctorAppointments();
  }, []);

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

  if (loading) return <Loading />;

  return (
    <div className="doctorAppointments_page">
      <NavbarWrapper />
        <div className="doctorAppointments_container">
          <h2 className="doctorAppointments_title">My Appointments</h2>
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
      <Footer />
    </div>
  );
};

export default DoctorAppointments;