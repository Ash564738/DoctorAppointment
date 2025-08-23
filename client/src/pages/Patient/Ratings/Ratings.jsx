import React, { useState, useEffect } from 'react';
import NavbarWrapper from '../../../components/Common/NavbarWrapper/NavbarWrapper';
import Footer from '../../../components/Common/Footer/Footer';
import { apiCall } from '../../../helper/apiCall';
import toast from 'react-hot-toast';
import { jwtDecode } from 'jwt-decode';
import { FaStar, FaUserMd } from 'react-icons/fa';
import './Ratings.css';

const Ratings = () => {
  const [completedAppointments, setCompletedAppointments] = useState([]);
  const [userRatings, setUserRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState('');
  const [filter, setFilter] = useState('pending');

  const { userId } = jwtDecode(localStorage.getItem("token"));

  useEffect(() => {
    fetchCompletedAppointments();
    fetchUserRatings();
  }, []);

  // Fetch all patient appointments and filter completed ones
  const fetchCompletedAppointments = async () => {
    try {
      setLoading(true);
      const response = await apiCall.get('/appointment/patient');
      const ratingsRes = await apiCall.get('/ratings/my-ratings');
      const ratedAppointmentIds = (ratingsRes?.data?.ratings || []).map(r => r.appointmentId?.toString());
      if (response && response.success && Array.isArray(response.appointments)) {
        // Only completed appointments
        const completed = response.appointments.filter(
          (apt) => apt.status && apt.status.toLowerCase() === 'completed'
        ).map(apt => ({
          ...apt,
          hasRating: ratedAppointmentIds.includes(apt._id?.toString())
        }));
        setCompletedAppointments(completed);
      } else {
        setCompletedAppointments([]);
      }
    } catch (error) {
      setCompletedAppointments([]);
      toast.error('Error fetching completed appointments');
    } finally {
      setLoading(false);
    }
  };

  // Fetch ratings submitted by the patient
  const fetchUserRatings = async () => {
    try {
      setLoading(true);
      const response = await apiCall.get('/ratings/my-ratings');
      if (response && response.success && response.data && Array.isArray(response.data.ratings)) {
        setUserRatings(
          response.data.ratings.map(rating => ({
            _id: rating._id,
            appointmentId: rating.appointmentId,
            doctorId: rating.doctorId,
            doctorName: rating.doctorId ? `Dr. ${rating.doctorId.firstname} ${rating.doctorId.lastname}` : '',
            specialization: rating.doctorId?.specialization || '',
            rating: rating.rating || 0,
            review: rating.comment || '',
            createdAt: rating.createdAt,
            appointmentDate: rating.appointmentId?.date // You may need to fetch appointment date separately if not populated
          }))
        );
      } else {
        setUserRatings([]);
      }
    } catch (error) {
      setUserRatings([]);
      toast.error('Error fetching your ratings');
    } finally {
      setLoading(false);
    }
  };

  // Submit a new rating for an appointment
  const handleSubmitRating = async () => {
    if (!selectedAppointment || rating === 0) {
      toast.error('Please provide a rating');
      return;
    }
    try {
      await apiCall.post(
        `/ratings/appointments/${selectedAppointment._id}/rate`,
        {
          score: rating,
          feedback: review.trim()
        }
      );
      toast.success('Rating submitted successfully!');
      setShowRatingModal(false);
      setSelectedAppointment(null);
      setRating(0);
      setHoverRating(0);
      setReview('');
      fetchCompletedAppointments();
      fetchUserRatings();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
        'Failed to submit rating'
      );
    }
  };

  const openRatingModal = (appointment) => {
    setSelectedAppointment(appointment);
    setShowRatingModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  const renderStars = (currentRating, interactive = false, size = 'medium') => {
    const starSize = size === 'large' ? '1.5rem' : size === 'small' ? '0.8rem' : '1rem';
    return (
      <div className="ratings_stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <FaStar
            key={star}
            className={`ratings_star ${star <= (interactive ? (hoverRating || rating) : currentRating) ? 'ratings_starFilled' : 'ratings_starEmpty'}`}
            style={{ fontSize: starSize }}
            onClick={interactive ? () => setRating(star) : undefined}
            onMouseEnter={interactive ? () => setHoverRating(star) : undefined}
            onMouseLeave={interactive ? () => setHoverRating(0) : undefined}
          />
        ))}
      </div>
    );
  };

  const pendingAppointments = completedAppointments.filter(apt => !apt.hasRating);
  const filteredAppointments = filter === 'pending' ? pendingAppointments : completedAppointments.filter(apt => apt.hasRating);

  return (
    <>
      <NavbarWrapper />
      <div className="ratings_page">
        <div className="ratings_container">
          <div className="ratings_header">
            <h1 className="ratings_title">Doctor Ratings & Reviews</h1>
            <p className="ratings_description">
              Rate your completed appointments and help other patients make informed decisions.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="ratings_filterTabs">
            <button 
              className={`ratings_filterTab ${filter === 'pending' ? 'ratings_filterTabActive' : ''}`}
              onClick={() => setFilter('pending')}
            >
              Pending Ratings ({pendingAppointments.length})
            </button>
            <button 
              className={`ratings_filterTab ${filter === 'completed' ? 'ratings_filterTabActive' : ''}`}
              onClick={() => setFilter('completed')}
            >
              My Reviews ({userRatings.length})
            </button>
          </div>

          {loading ? (
            <div className="ratings_loading">
              <div className="ratings_spinner"></div>
              <p className="ratings_loadingText">Loading appointments...</p>
            </div>
          ) : (
            <>
              {filter === 'pending' ? (
                /* Pending Ratings Section */
                <div className="ratings_section">
                  <h2 className="ratings_sectionTitle">Appointments Waiting for Your Review</h2>
                  {pendingAppointments.length > 0 ? (
                    <div className="ratings_appointmentsGrid">
                      {pendingAppointments.map((appointment) => (
                        <div key={appointment._id} className="ratings_appointmentCard">
                          <div className="ratings_cardHeader">
                            <div className="ratings_doctorInfo">
                              <FaUserMd className="ratings_doctorIcon" />
                              <div>
                                <h3 className="ratings_doctorName">
                                  Dr. {appointment.doctorId?.firstname} {appointment.doctorId?.lastname}
                                </h3>
                                <p className="ratings_doctorSpecialty">
                                  {appointment.doctorId?.specialization}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="ratings_appointmentDetails">
                            <div className="ratings_appointmentInfo">
                              <span className="ratings_label">Date:</span>
                              <span className="ratings_value">{formatDate(appointment.date)}</span>
                            </div>
                            <div className="ratings_appointmentInfo">
                              <span className="ratings_label">Time:</span>
                              <span className="ratings_value">{appointment.time}</span>
                            </div>
                          </div>
                          <div className="ratings_cardActions">
                            <button 
                              className="ratings_rateButton"
                              onClick={() => openRatingModal(appointment)}
                            >
                              Rate Doctor
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="ratings_emptyState">
                      <FaStar className="ratings_emptyIcon" />
                      <p className="ratings_emptyText">No pending ratings. All your appointments have been reviewed!</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Completed Ratings Section */
                <div className="ratings_section">
                  <h2 className="ratings_sectionTitle">Your Reviews</h2>
                  {userRatings.length > 0 ? (
                    <div className="ratings_reviewsList">
                      {userRatings.map((rating) => (
                        <div key={rating._id} className="ratings_reviewCard">
                          <div className="ratings_reviewHeader">
                            <div className="ratings_reviewDoctorInfo">
                              <h4 className="ratings_reviewDoctorName">{rating.doctorName}</h4>
                              <p className="ratings_reviewSpecialty">{rating.specialization}</p>
                            </div>
                            <div className="ratings_reviewRating">
                              {renderStars(rating.rating, false, 'large')}
                              <span className="ratings_reviewScore">{rating.rating}/5</span>
                            </div>
                          </div>
                          <div className="ratings_reviewContent">
                            <p className="ratings_reviewText">{rating.review}</p>
                            <div className="ratings_reviewMeta">
                              <span className="ratings_reviewDate">
                                Appointment: {formatDate(rating.appointmentDate)}
                              </span>
                              <span className="ratings_reviewSubmitted">
                                Reviewed: {formatDate(rating.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="ratings_emptyState">
                      <FaStar className="ratings_emptyIcon" />
                      <p className="ratings_emptyText">You haven't submitted any reviews yet.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Rating Modal */}
          {showRatingModal && selectedAppointment && (
            <div className="ratings_modal">
              <div className="ratings_modalContent">
                <div className="ratings_modalHeader">
                  <h3 className="ratings_modalTitle">Rate Your Experience</h3>
                  <button 
                    className="ratings_modalClose"
                    onClick={() => setShowRatingModal(false)}
                  >
                    ×
                  </button>
                </div>
                <div className="ratings_modalBody">
                  <div className="ratings_doctorSummary">
                    <FaUserMd className="ratings_summaryIcon" />
                    <div>
                      <h4 className="ratings_summaryName">
                        Dr. {selectedAppointment.doctorId?.firstname} {selectedAppointment.doctorId?.lastname}
                      </h4>
                      <p className="ratings_summarySpecialty">
                        {selectedAppointment.doctorId?.specialization}
                      </p>
                      <p className="ratings_summaryDate">
                        Appointment: {formatDate(selectedAppointment.date)} at {selectedAppointment.time}
                      </p>
                    </div>
                  </div>
                  
                  <div className="ratings_ratingSection">
                    <h4 className="ratings_ratingLabel">How would you rate this doctor?</h4>
                    <div className="ratings_starSection">
                      {renderStars(rating, true, 'large')}
                      <p className="ratings_ratingText">
                        {rating === 0 && 'Click to rate'}
                        {rating === 1 && 'Poor'}
                        {rating === 2 && 'Fair'}
                        {rating === 3 && 'Good'}
                        {rating === 4 && 'Very Good'}
                        {rating === 5 && 'Excellent'}
                      </p>
                    </div>
                  </div>

                  <div className="ratings_reviewSection">
                    <label className="ratings_reviewLabel">Write a review (optional):</label>
                    <textarea 
                      className="ratings_reviewTextarea"
                      value={review}
                      onChange={(e) => setReview(e.target.value)}
                      placeholder="Share your experience with this doctor. Your review will help other patients..."
                      rows="4"
                      maxLength="500"
                    />
                    <p className="ratings_characterCount">{review.length}/500</p>
                  </div>
                </div>
                <div className="ratings_modalActions">
                  <button 
                    className="ratings_cancelButton"
                    onClick={() => setShowRatingModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="ratings_submitButton"
                    onClick={handleSubmitRating}
                    disabled={rating === 0}
                  >
                    Submit Rating
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Ratings;
