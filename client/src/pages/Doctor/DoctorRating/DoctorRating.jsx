import React, { useEffect, useState } from 'react';
import './DoctorRating.css';
import { apiCall } from '../../../helper/apiCall';
import NavbarWrapper from '../../../components/Common/NavbarWrapper/NavbarWrapper';
import Footer from '../../../components/Common/Footer/Footer';

const DoctorRating = () => {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDoctorRatings();
  }, []);

  const fetchDoctorRatings = async () => {
    setLoading(true);
    try {
      const res = await apiCall.get('/doctor/ratings');
      if (res && res.success && Array.isArray(res.data)) {
        setRatings(res.data);
      } else {
        setRatings([]);
      }
    } catch (err) {
      setRatings([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="doctorRating_page">
      <NavbarWrapper />
      <div className="doctorRating_container">
        <h2 className="doctorRating_title">My Ratings &amp; Reviews</h2>
        {loading ? (
          <div className="doctorRating_loading">Loading...</div>
        ) : ratings.length === 0 ? (
          <div className="doctorRating_empty">No ratings yet.</div>
        ) : (
          <div className="doctorRating_list">
            {ratings.map((r) => (
              <div key={r._id} className="doctorRating_card">
                <div className="doctorRating_cardHeader">
                  <span className="doctorRating_score">{r.rating} / 5</span>
                  <span className="doctorRating_date">{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="doctorRating_feedback">{r.comment || 'No feedback'}</div>
                <div className="doctorRating_patient">Patient: {r.patientName || 'Anonymous'}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default DoctorRating;
