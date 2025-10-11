import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Empty from "../../../components/Common/Empty/Empty";
import Footer from "../../../components/Common/Footer/Footer";
import NavbarWrapper from "../../../components/Common/NavbarWrapper/NavbarWrapper";
import { apiCall } from "../../../helper/apiCall";
import { setLoading } from "../../../redux/reducers/rootSlice";
import Loading from "../../../components/Common/Loading/Loading";
import { useNavigate } from 'react-router-dom';
import "./PatientAppointments.css";
import toast from "react-hot-toast";
import PageHeader from "../../../components/Common/PageHeader/PageHeader";

const PatientAppointments = () => {
	const navigate = useNavigate();
	const [appointments, setAppointments] = useState([]);
	const [filteredAppointments, setFilteredAppointments] = useState([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [currentPage, setCurrentPage] = useState(1);
	const appointmentsPerPage = 20;
	const dispatch = useDispatch();
	const { loading } = useSelector((state) => state.root);
	const getAllAppointments = React.useCallback(async () => {
		try {
			dispatch(setLoading(true));
			const response = await apiCall.get("/appointment/patient");
			const appointmentsArray = response.success ? 
				(Array.isArray(response.appointments) ? response.appointments : []) : 
				(Array.isArray(response) ? response : []);
				
			setAppointments(appointmentsArray);
			setFilteredAppointments(appointmentsArray);
		} catch (error) {
			console.error("Error fetching appointments:", error);
			toast.error("Failed to fetch appointments");
			setAppointments([]);
			setFilteredAppointments([]);
		} finally {
			dispatch(setLoading(false));
		}
	}, [dispatch]);

	useEffect(() => { 
		getAllAppointments(); 
	}, [getAllAppointments]);
	useEffect(() => {
		let filtered = appointments;
		if (searchTerm) {
			filtered = filtered.filter((appointment) =>
				`${appointment.doctorId?.firstname} ${appointment.doctorId?.lastname}`
					.toLowerCase()
					.includes(searchTerm.toLowerCase())
			);
		}
		if (statusFilter !== "all") {
			filtered = filtered.filter((appointment) => appointment.status.toLowerCase() === statusFilter.toLowerCase());
		}
		setFilteredAppointments(filtered);
		setCurrentPage(1);
	}, [searchTerm, statusFilter, appointments]);
	const indexOfLastAppointment = currentPage * appointmentsPerPage;
	const indexOfFirstAppointment = indexOfLastAppointment - appointmentsPerPage;
	const paginatedAppointments = filteredAppointments.slice(indexOfFirstAppointment, indexOfLastAppointment);
	const totalPages = Math.ceil(filteredAppointments.length / appointmentsPerPage);
	const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);
	const getStatusBadgeClass = (status) => {
		switch (status.toLowerCase()) {
			case "confirmed": 
				return "status-confirmed";
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
				await apiCall.put(`/appointment/update/${appointmentId}`, { 
					status: "Cancelled" 
				});
			toast.success("Appointment cancelled successfully");
			getAllAppointments();
		} catch (error) {
			console.error("Error cancelling appointment:", error);
			toast.error("Failed to cancel appointment");
		}
	};

	return (
		<div className="patientAppointments_page">
			<NavbarWrapper />
			{loading ? (<Loading />) : (
				<section className="patientAppointments_container">
					<PageHeader
						title="My Appointments"
						subtitle="View, filter, and manage your appointments"
						className="patientAppointments_header"
					/>
					{appointments.length > 0 ? (
						<div className="patientAppointments_content">
							<div className="patientAppointments_filtersSection">
								<div className="patientAppointments_filters">
									<input
										type="text"
										placeholder="Search by doctor name..."
										value={searchTerm}
										onChange={(e) => setSearchTerm(e.target.value)}
										className="patientAppointments_searchInput"
									/>
									<button
										className="patientAppointments_clearFiltersButton"
										onClick={() => {
											setSearchTerm('');
											setStatusFilter('all');
										}}
									>
										Clear Filters
									</button>
								</div>
							</div>
							<div className="patientAppointments_tableSection">
								<div className="patientAppointments_sectionHeader">
									<div className="patientAppointments_filters">
										{(() => {
											const statusCounts = appointments.reduce(
												(acc, appt) => {
													const status = (appt.status || '').toLowerCase();
													if (status === 'confirmed') acc.confirmed += 1;
													else if (status === 'completed') acc.completed += 1;
													else if (status === 'cancelled') acc.cancelled += 1;
													acc.all += 1;
													return acc;
												},
												{ all: 0, confirmed: 0, completed: 0, cancelled: 0 }
											);
											return (
												<>
													<button
														className={statusFilter === 'all' ? 'patientAppointments_filterButton patientAppointments_filterActive' : 'patientAppointments_filterButton'}
														onClick={() => setStatusFilter('all')}
													>
														All ({statusCounts.all})
													</button>
													<button
														className={statusFilter === 'confirmed' ? 'patientAppointments_filterButton patientAppointments_filterActive' : 'patientAppointments_filterButton'}
														onClick={() => setStatusFilter('confirmed')}
													>
														Confirmed ({statusCounts.confirmed})
													</button>
													<button
														className={statusFilter === 'completed' ? 'patientAppointments_filterButton patientAppointments_filterActive' : 'patientAppointments_filterButton'}
														onClick={() => setStatusFilter('completed')}
													>
														Completed ({statusCounts.completed})
													</button>
													<button
														className={statusFilter === 'cancelled' ? 'patientAppointments_filterButton patientAppointments_filterActive' : 'patientAppointments_filterButton'}
														onClick={() => setStatusFilter('cancelled')}
													>
														Cancelled ({statusCounts.cancelled})
													</button>
												</>
											);
										})()}
									</div>
								</div>

								<div className="patientAppointments_tableContainer">
									<table className="patientAppointments_table">
									<thead className="patientAppointments_tableHead">
										<tr className="patientAppointments_tableRow">
											<th className="patientAppointments_tableHeader">S.No</th>
											<th className="patientAppointments_tableHeader">Doctor</th>
											<th className="patientAppointments_tableHeader">Specialization</th>
											<th className="patientAppointments_tableHeader">Date</th>
											<th className="patientAppointments_tableHeader">Time</th>
											<th className="patientAppointments_tableHeader">Recurring</th>
											<th className="patientAppointments_tableHeader">Booked On</th>
											<th className="patientAppointments_tableHeader">Status</th>
											<th className="patientAppointments_tableHeader">Symptoms</th>
											<th className="patientAppointments_tableHeader">Appointment Type</th>
											<th className="patientAppointments_tableHeader">Priority</th>
											<th className="patientAppointments_tableHeader">Prescription</th>
											<th className="patientAppointments_tableHeader">Receipt</th>
											<th className="patientAppointments_tableHeader">Actions</th>
										</tr>
									</thead>
									<tbody className="patientAppointments_tableBody">
										{paginatedAppointments.map((appointment, index) => (
											<tr key={appointment._id} className="patientAppointments_tableRow">
												<td className="patientAppointments_tableCell">
													{indexOfFirstAppointment + index + 1}
												</td>
												<td className="patientAppointments_tableCell">
													Dr. {appointment.doctorId?.firstname} {appointment.doctorId?.lastname}
												</td>
												<td className="patientAppointments_tableCell">
													{appointment.doctorId?.specialization || "N/A"}
												</td>
												<td className="patientAppointments_tableCell">{appointment.date}</td>
												<td className="patientAppointments_tableCell">{appointment.time}</td>
												<td className="patientAppointments_tableCell">
													{appointment.recurringPattern?.frequency ? (
														<span>
															{appointment.recurringPattern.frequency}
															{appointment.recurringPattern.endDate ? `, until ${appointment.recurringPattern.endDate}` : ''}
															{appointment.recurringPattern.occurrences ? `, ${appointment.recurringPattern.occurrences} times` : ''}
														</span>
													) : (
														<span>—</span>
													)}
												</td>
												<td className="patientAppointments_tableCell">
													{new Date(appointment.createdAt).toLocaleDateString()}
												</td>
												<td className="patientAppointments_tableCell">
													<span className={`patientAppointments_statusBadge patientAppointments_statusBadge--${getStatusBadgeClass(appointment.status)}`}>
														{appointment.status}
													</span>
												</td>
												<td className="patientAppointments_tableCell">
													{appointment.symptoms || "—"}
												</td>
												<td className="patientAppointments_tableCell">
													{appointment.appointmentType || "—"}
												</td>
												<td className="patientAppointments_tableCell">
													{appointment.priority || "—"}
												</td>
												<td className="patientAppointments_tableCell">
													{appointment.medicalRecordId ? (
														<button
															type="button"
															onClick={() => navigate('/patient/medical-records')}
															className="patientAppointments_linkButton"
														>
															View
														</button>
													) : (
														"—"
													)}
												</td>
												<td className="patientAppointments_tableCell">
													{appointment.paymentId && appointment.paymentId.receiptUrl ? (
														<a
															href={appointment.paymentId.receiptUrl}
															target="_blank"
															rel="noopener noreferrer"
														>
															Receipt
														</a>
													) : (
														"—"
													)}
												</td>
												<td className="patientAppointments_tableCell">
													{["pending", "confirmed"].includes(appointment.status.toLowerCase()) && (
														<button 
															className="patientAppointments_actionBtn patientAppointments_actionBtn--cancel" 
															onClick={() => handleCancelAppointment(appointment._id)}
														>
															Cancel
														</button>
													)}
													{appointment.status.toLowerCase() === "completed" && (
														<span className="patientAppointments_statusText patientAppointments_statusText--success">
															Completed
														</span>
													)}
													{appointment.status.toLowerCase() === "cancelled" && (
														<span className="patientAppointments_statusText patientAppointments_statusText--danger">
															Cancelled
														</span>
													)}
												</td>
											</tr>
										))}
									</tbody>
									</table>
								</div>

								<div className="patientAppointments_pagination">
									<button
										onClick={() => handlePageChange(currentPage - 1)}
										disabled={currentPage === 1}
									>
										Previous
									</button>
									{Array.from({ length: totalPages }, (_, i) => (
										<button
											key={i + 1}
											className={currentPage === i + 1 ? 'active' : ''}
											onClick={() => handlePageChange(i + 1)}
										>
											{i + 1}
										</button>
									))}
									<button
										onClick={() => handlePageChange(currentPage + 1)}
										disabled={currentPage === totalPages || filteredAppointments.length === 0}
									>
										Next
									</button>
								</div>
							</div>
						</div>
					) : (
						<div className="patientAppointments_empty">
							<Empty message="No appointments found. Book your first appointment with a doctor!" />
						</div>
					)}
				</section>
			)}
			<Footer />
		</div>
	);
};

export default PatientAppointments;