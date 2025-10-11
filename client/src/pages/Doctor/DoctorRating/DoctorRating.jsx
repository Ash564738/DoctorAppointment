import React, { useEffect, useState } from 'react';
import './DoctorRating.css';
import { apiCall } from '../../../helper/apiCall';
import NavbarWrapper from '../../../components/Common/NavbarWrapper/NavbarWrapper';
import Footer from '../../../components/Common/Footer/Footer';
import PageHeader from '../../../components/Common/PageHeader/PageHeader';
import { FaStar, FaUserMd } from 'react-icons/fa';

const DoctorRating = () => {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRatings: 0,
    averageRating: 0,
    fiveStars: 0,
    fourStars: 0,
    threeStars: 0,
    twoStars: 0,
    oneStar: 0
  });

  useEffect(() => {
    fetchDoctorRatings();
  }, []);

  const fetchDoctorRatings = async () => {
    setLoading(true);
    try {
      const res = await apiCall.get('/ratings/my-doctor-ratings');
      if (res && res.success && Array.isArray(res.data)) {
        setRatings(res.data);
        calculateStats(res.data);
      } else {
        setRatings([]);
      }
    } catch (err) {
      console.error('Error fetching ratings:', err);
      setRatings([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (ratingsData) => {
    if (!ratingsData || ratingsData.length === 0) {
      setStats({
        totalRatings: 0,
        averageRating: 0,
        fiveStars: 0,
        fourStars: 0,
        threeStars: 0,
        twoStars: 0,
        oneStar: 0
      });
      return;
    }

    const total = ratingsData.length;
    const sum = ratingsData.reduce((acc, r) => acc + r.rating, 0);
    const average = (sum / total).toFixed(1);
    
    const distribution = {
      5: ratingsData.filter(r => r.rating === 5).length,
      4: ratingsData.filter(r => r.rating === 4).length,
      3: ratingsData.filter(r => r.rating === 3).length,
      2: ratingsData.filter(r => r.rating === 2).length,
      1: ratingsData.filter(r => r.rating === 1).length
    };

    setStats({
      totalRatings: total,
      averageRating: parseFloat(average),
      fiveStars: distribution[5],
      fourStars: distribution[4],
      threeStars: distribution[3],
      twoStars: distribution[2],
      oneStar: distribution[1]
    });
  };

  const renderStars = (rating) => {
    return (
      <div className="doctorRating_stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <FaStar
            key={star}
            className={star <= rating ? 'doctorRating_starFilled' : 'doctorRating_starEmpty'}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="doctorRating_page">
      <NavbarWrapper />
      <div className="doctorRating_container">
        <PageHeader
          title="My Ratings & Reviews"
          subtitle="See feedback from patients and your overall performance"
          className="doctorRating_header"
        />

        {loading ? (
          <div className="doctorRating_loading">
            <div className="doctorRating_spinner"></div>
            <p className="doctorRating_loadingText">Loading your ratings...</p>
          </div>
        ) : (
          <>
            {/* Statistics Cards - Using DoctorDashboard style */}
            {ratings.length > 0 && (
              <div className="doctorRating_statsSection">
                <div className="doctorRating_stats">
                  <div className="doctorRating_statCard doctorRating_statCard--primary">
                    <div className="doctorRating_statIcon">
                      <FaStar />
                    </div>
                    <div className="doctorRating_statContent">
                      <h3 className="doctorRating_statNumber">{stats.averageRating}</h3>
                      <p className="doctorRating_statLabel">Average Rating</p>
                    </div>
                  </div>
                  <div className="doctorRating_statCard doctorRating_statCard--success">
                    <div className="doctorRating_statIcon">
                      <FaUserMd />
                    </div>
                    <div className="doctorRating_statContent">
                      <h3 className="doctorRating_statNumber">{stats.totalRatings}</h3>
                      <p className="doctorRating_statLabel">Total Reviews</p>
                    </div>
                  </div>
                  <div className="doctorRating_statCard doctorRating_statCard--warning">
                    <div className="doctorRating_statIcon">
                      <FaStar />
                    </div>
                    <div className="doctorRating_statContent">
                      <h3 className="doctorRating_statNumber">{stats.fiveStars}</h3>
                      <p className="doctorRating_statLabel">5-Star Ratings</p>
                    </div>
                  </div>
                  <div className="doctorRating_statCard doctorRating_statCard--info">
                    <div className="doctorRating_statIcon">
                      <FaStar />
                    </div>
                    <div className="doctorRating_statContent">
                      <h3 className="doctorRating_statNumber">
                        {stats.totalRatings > 0 ? Math.round((stats.fiveStars / stats.totalRatings) * 100) : 0}%
                      </h3>
                      <p className="doctorRating_statLabel">Excellent Rate</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Ratings List */}
            {ratings.length === 0 ? (
              <div className="doctorRating_emptyState">
                <FaStar className="doctorRating_emptyIcon" />
                <h3 className="doctorRating_emptyTitle">No ratings yet</h3>
                <p className="doctorRating_emptyText">
                  You haven't received any patient reviews yet. Keep providing excellent care and your ratings will appear here.
                </p>
              </div>
            ) : (
              <div className="doctorRating_contentWrapper">
                <div className="doctorRating_listHeader">
                  <span className="doctorRating_listTitle">Patient Reviews ({ratings.length})</span>
                </div>
                <div className="doctorRating_list">
                  {ratings.map((r) => (
                    <div key={r._id} className="doctorRating_card">
                      <div className="doctorRating_cardTop">
                        <div className="doctorRating_patientInfo">
                          <FaUserMd className="doctorRating_patientIcon" />
                          <span className="doctorRating_patientName">{r.patientName || 'Anonymous Patient'}</span>
                        </div>
                        <span className="doctorRating_date">{formatDate(r.createdAt)}</span>
                      </div>
                      
                      <div className="doctorRating_ratingInfo">
                        {renderStars(r.rating)}
                        <span className="doctorRating_score">{r.rating}.0 / 5.0</span>
                      </div>
                      
                      {r.comment && (
                        <div className="doctorRating_feedbackSection">
                          <p className="doctorRating_feedback">"{r.comment}"</p>
                        </div>
                      )}
                    </div>
                  ))}
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

export default DoctorRating;
