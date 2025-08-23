import React, { useState, useEffect } from "react";
import BookAppointment from ".//BookAppointment";
import { toast } from "react-hot-toast";
import { apiCall } from '../../../helper/apiCall';
import './DoctorCard.css';

const DoctorCard = ({ ele }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [doctorCard_rating, setDoctorCard_rating] = useState(null);
  const [doctorCard_totalPatients, setDoctorCard_totalPatients] = useState(0);
  const [doctorCard_isAvailable, setDoctorCard_isAvailable] = useState(true);
  const [doctorCard_loading, setDoctorCard_loading] = useState(false);
  const token = localStorage.getItem("token") || "";

  useEffect(() => {
    if (ele?._id) {
      fetchDoctorCardStats();
    }
  }, [ele?._id]);

  const fetchDoctorCardStats = async () => {
    try {
      setDoctorCard_loading(true);

      const ratingResponse = await apiCall.get(`/ratings/doctors/${ele._id}/ratings`);
      if (ratingResponse && ratingResponse.success) {
        setDoctorCard_rating(ratingResponse.data);
      }

      const patientCountResponse = await apiCall.get(`/appointment/doctor-appointments?status=Completed&doctorId=${ele._id}`);
      let treatedCount = 0;
      if (patientCountResponse && patientCountResponse.success && Array.isArray(patientCountResponse.appointments)) {
        treatedCount = patientCountResponse.appointments.length;
      }
      setDoctorCard_totalPatients(treatedCount);

      const currentHour = new Date().getHours();
      const doctorTiming = ele?.timing;
      let available = true;
      if (doctorTiming === 'morning' && (currentHour < 8 || currentHour > 12)) {
        available = false;
      } else if (doctorTiming === 'afternoon' && (currentHour < 12 || currentHour > 17)) {
        available = false;
      } else if (doctorTiming === 'evening' && (currentHour < 17 || currentHour > 21)) {
        available = false;
      } else if (doctorTiming === 'night' && (currentHour < 21 && currentHour > 6)) {
        available = false;
      }
      setDoctorCard_isAvailable(available);
    } catch (error) {
      setDoctorCard_rating({ averageRating: 0, totalRatings: 0 });
      setDoctorCard_totalPatients(0);
    } finally {
      setDoctorCard_loading(false);
    }
  };

  const doctorCard_formatTiming = (timing) => {
    const timingMap = {
      'morning': '8:00 AM - 12:00 PM',
      'afternoon': '12:00 PM - 5:00 PM',
      'evening': '5:00 PM - 9:00 PM',
      'night': '9:00 PM - 6:00 AM'
    };
    return timingMap[timing] || 'Available';
  };

  const doctorCard_renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <span key={i} className="doctorCard_star doctorCard_starFull" aria-label="Full star">
          <svg width="18" height="18" fill="#fbbf24" viewBox="0 0 20 20"><polygon points="10,1.5 12.59,7.36 18.9,7.64 13.97,11.97 15.54,18.02 10,14.5 4.46,18.02 6.03,11.97 1.1,7.64 7.41,7.36"/></svg>
        </span>
      );
    }
    if (hasHalfStar) {
      stars.push(
        <span key="half" className="doctorCard_star doctorCard_starHalf" aria-label="Half star">
          <svg width="18" height="18" viewBox="0 0 20 20">
            <defs>
              <linearGradient id="half-grad">
                <stop offset="50%" stopColor="#fbbf24" />
                <stop offset="50%" stopColor="#e5e7eb" />
              </linearGradient>
            </defs>
            <polygon points="10,1.5 12.59,7.36 18.9,7.64 13.97,11.97 15.54,18.02 10,14.5 4.46,18.02 6.03,11.97 1.1,7.64 7.41,7.36" fill="url(#half-grad)" />
          </svg>
        </span>
      );
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <span key={`empty-${i}`} className="doctorCard_star doctorCard_starEmpty" aria-label="Empty star">
          <svg width="18" height="18" fill="#e5e7eb" viewBox="0 0 20 20"><polygon points="10,1.5 12.59,7.36 18.9,7.64 13.97,11.97 15.54,18.02 10,14.5 4.46,18.02 6.03,11.97 1.1,7.64 7.41,7.36"/></svg>
        </span>
      );
    }
    return stars;
  };

  const doctorCard_handleModal = () => {
    if (token === "") {
      return toast.error("You must log in first");
    }
    setModalOpen(true);
  };

  return (
    <div
      className={`doctorCard_card${doctorCard_loading ? ' doctorCard_cardLoading' : ''}`}
      name="doctorCard_card"
    >
      <div className="doctorCard_header" name="doctorCard_header">
        <div className="doctorCard_imageWrapper" name="doctorCard_imageWrapper">
          <img
            src={
              ele?.userId?.pic ||
              "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
            }
            alt="profile"
            className="doctorCard_image"
            name="doctorCard_image"
          />
          <div
            className={`doctorCard_availability${doctorCard_isAvailable ? ' doctorCard_available' : ' doctorCard_unavailable'}`}
            name="doctorCard_availability"
          >
            <span className="doctorCard_availabilityDot" name="doctorCard_availabilityDot"></span>
            {doctorCard_isAvailable ? 'Available' : 'Offline'}
          </div>
        </div>
      </div>

      <div className="doctorCard_content" name="doctorCard_content">
        <h3 className="doctorCard_name" name="doctorCard_name">
          Dr. {ele?.userId?.firstname + " " + ele?.userId?.lastname}
        </h3>

        <p className="doctorCard_specialization" name="doctorCard_specialization">
          <strong>Specialization: </strong>
          {ele?.specialization}
        </p>

        {doctorCard_rating && (
          <div className="doctorCard_rating" name="doctorCard_rating">
            <div className="doctorCard_ratingStars" name="doctorCard_ratingStars">
              {doctorCard_renderStars(doctorCard_rating.averageRating || 0)}
            </div>
            <span className="doctorCard_ratingText" name="doctorCard_ratingText">
              {doctorCard_rating.averageRating ? doctorCard_rating.averageRating.toFixed(1) : '0.0'}
              ({doctorCard_rating.totalRatings || 0} reviews)
            </span>
          </div>
        )}

        <div className="doctorCard_details" name="doctorCard_details">
          <div className="doctorCard_detailItem" name="doctorCard_detailItem_experience">
            <span className="doctorCard_icon" name="doctorCard_icon_experience">
              {/* Professional SVG icon: User/Doctor */}
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#64748b"><path d="M12 14c-4.418 0-8 1.79-8 4v2h16v-2c0-2.21-3.582-4-8-4z"/><circle cx="12" cy="7" r="4"/></svg>
            </span>
            <div name="doctorCard_detailText_experience">
              <strong>Experience:</strong> {ele?.experience} years
            </div>
          </div>

          <div className="doctorCard_detailItem" name="doctorCard_detailItem_fees">
            <span className="doctorCard_icon" name="doctorCard_icon_fees">
              {/* Professional SVG icon: Money */}
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#64748b"><rect x="2" y="7" width="20" height="10" rx="2"/><path d="M16 11.37a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/></svg>
            </span>
            <div name="doctorCard_detailText_fees">
              <strong>Consultation Fee:</strong> ${ele?.fees}
            </div>
          </div>

          <div className="doctorCard_detailItem" name="doctorCard_detailItem_timing">
            <span className="doctorCard_icon" name="doctorCard_icon_timing">
              {/* Professional SVG icon: Clock */}
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#64748b"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            </span>
            <div name="doctorCard_detailText_timing">
              <strong>Available:</strong> {doctorCard_formatTiming(ele?.timing)}
            </div>
          </div>

          <div className="doctorCard_detailItem" name="doctorCard_detailItem_phone">
            <span className="doctorCard_icon" name="doctorCard_icon_phone">
              {/* Professional SVG icon: Phone */}
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#64748b"><path d="M2 8.5A6.5 6.5 0 0 1 8.5 2h7A6.5 6.5 0 0 1 22 8.5v7A6.5 6.5 0 0 1 15.5 22h-7A6.5 6.5 0 0 1 2 15.5v-7z"/><path d="M15 9h.01M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/></svg>
            </span>
            <div name="doctorCard_detailText_phone">
              <strong>Phone:</strong> {ele?.userId?.mobile}
            </div>
          </div>

          <div className="doctorCard_detailItem" name="doctorCard_detailItem_patients">
            <span className="doctorCard_icon" name="doctorCard_icon_patients">
              {/* Professional SVG icon: Users */}
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#64748b"><path d="M17 20h5v-2a8 8 0 1 0-16 0v2h5"/><circle cx="12" cy="7" r="4"/></svg>
            </span>
            <div name="doctorCard_detailText_patients">
              <strong>Patients Treated:</strong> {doctorCard_totalPatients}
            </div>
          </div>
        </div>

        <div className="doctorCard_actions" name="doctorCard_actions">
          <button
            className={`doctorCard_bookButton${!doctorCard_isAvailable ? ' doctorCard_bookButtonUnavailable' : ''}`}
            name="doctorCard_bookButton"
            onClick={doctorCard_handleModal}
            disabled={!doctorCard_isAvailable}
          >
            {doctorCard_isAvailable ? 'Book Appointment' : 'Currently Unavailable'}
          </button>
        </div>
      </div>

      {modalOpen && (
        <BookAppointment
          modalOpen={modalOpen}
          setModalOpen={setModalOpen}
          ele={{
            ...ele,
            _id: ele.userId?._id,
            doctorUserId: ele.userId?._id,
            firstname: ele.userId?.firstname,
            lastname: ele.userId?.lastname,
            mobile: ele.userId?.mobile,
            pic: ele.userId?.pic,
            fees: ele.fees,
            experience: ele.experience,
            specialization: ele.specialization,
            timing: ele.timing,
          }}
        />
      )}
    </div>
  );
};

export default DoctorCard;