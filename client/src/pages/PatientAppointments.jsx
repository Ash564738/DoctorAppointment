import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Empty from "../components/Empty";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import fetchData from "../helper/apiCall";
import { setLoading } from "../redux/reducers/rootSlice";
import Loading from "../components/Loading";
import "../styles/user.css";
import toast from "react-hot-toast";

const PatientAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const appointmentsPerPage = 8;

  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.root);

  const getAllAppointments = async () => {
    try {
      dispatch(setLoading(true));
      const temp = await fetchData("/appointment/getallappointments");

      // Ensure temp is an array
      const appointmentsArray = Array.isArray(temp) ? temp : [];
      setAppointments(appointmentsArray);
      setFilteredAppointments(appointmentsArray);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast.error("Failed to fetch appointments");
      // Set empty arrays on error
      setAppointments([]);
      setFilteredAppointments([]);
    } finally {
      dispatch(setLoading(false));
    }
  };

  useEffect(() => {
    getAllAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter appointments based on search term and status
  useEffect(() => {
    let filtered = appointments;

    // Filter by search term (doctor name)
    if (searchTerm) {
      filtered = filtered.filter((appointment) =>
        `${appointment.doctorId?.firstname} ${appointment.doctorId?.lastname}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((appointment) => 
        appointment.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    setFilteredAppointments(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  }, [searchTerm, statusFilter, appointments]);

  // Pagination logic
  const indexOfLastAppointment = currentPage * appointmentsPerPage;
  const indexOfFirstAppointment = indexOfLastAppointment - appointmentsPerPage;
  const paginatedAppointments = filteredAppointments.slice(
    indexOfFirstAppointment,
    indexOfLastAppointment
  );
  const totalPages = Math.ceil(filteredAppointments.length / appointmentsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const getStatusBadgeClass = (status) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "status-pending";
      case "completed":
        return "status-completed";
      case "cancelled":
        return "status-cancelled";
      default:
        return "status-default";
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) {
      return;
    }

    try {
      await fetchData(`/appointment/completed`, "PUT", {
        appointmentId,
        status: "Cancelled"
      });
      
      toast.success("Appointment cancelled successfully");
      getAllAppointments(); // Refresh the list
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      toast.error("Failed to cancel appointment");
    }
  };

  return (
    <>
      <Navbar />
      {loading ? (
        <Loading />
      ) : (
        <section className="container notif-section">
          <h2 className="page-heading">My Appointments</h2>

          {appointments.length > 0 ? (
            <>
              {/* Search and Filter Controls */}
              <div className="search-filter-container">
                <div className="search">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search by doctor name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="filter">
                  <select
                    className="form-input"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Appointment Statistics */}
              <div className="appointment-stats">
                <div className="stat-card">
                  <h4>Total Appointments</h4>
                  <p className="stat-number">{Array.isArray(appointments) ? appointments.length : 0}</p>
                </div>
                <div className="stat-card">
                  <h4>Pending</h4>
                  <p className="stat-number pending">
                    {Array.isArray(appointments) ? appointments.filter(apt => apt.status && apt.status.toLowerCase() === "pending").length : 0}
                  </p>
                </div>
                <div className="stat-card">
                  <h4>Completed</h4>
                  <p className="stat-number completed">
                    {Array.isArray(appointments) ? appointments.filter(apt => apt.status && apt.status.toLowerCase() === "completed").length : 0}
                  </p>
                </div>
                <div className="stat-card">
                  <h4>Cancelled</h4>
                  <p className="stat-number cancelled">
                    {Array.isArray(appointments) ? appointments.filter(apt => apt.status && apt.status.toLowerCase() === "cancelled").length : 0}
                  </p>
                </div>
              </div>
              
              {/* Appointments Table */}
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Doctor</th>
                      <th>Specialization</th>
                      <th>Appointment Date</th>
                      <th>Appointment Time</th>
                      <th>Booking Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAppointments.map((appointment, index) => (
                      <tr key={appointment._id}>
                        <td>{indexOfFirstAppointment + index + 1}</td>
                        <td>
                          Dr. {appointment.doctorId?.firstname} {appointment.doctorId?.lastname}
                        </td>
                        <td>{appointment.doctorId?.specialization || "N/A"}</td>
                        <td>{appointment.date}</td>
                        <td>{appointment.time}</td>
                        <td>{new Date(appointment.createdAt).toLocaleDateString()}</td>
                        <td>
                          <span className={`status-badge ${getStatusBadgeClass(appointment.status)}`}>
                            {appointment.status}
                          </span>
                        </td>
                        <td>
                          {appointment.status.toLowerCase() === "pending" && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleCancelAppointment(appointment._id)}
                            >
                              Cancel
                            </button>
                          )}
                          {appointment.status.toLowerCase() === "completed" && (
                            <span className="text-success">✓ Completed</span>
                          )}
                          {appointment.status.toLowerCase() === "cancelled" && (
                            <span className="text-danger">✗ Cancelled</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="btn btn-outline"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  
                  {[...Array(totalPages)].map((_, index) => (
                    <button
                      key={index + 1}
                      className={`btn ${currentPage === index + 1 ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => handlePageChange(index + 1)}
                    >
                      {index + 1}
                    </button>
                  ))}
                  
                  <button
                    className="btn btn-outline"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <Empty message="No appointments found. Book your first appointment with a doctor!" />
          )}
        </section>
      )}
      <Footer />
    </>
  );
};

export default PatientAppointments;
