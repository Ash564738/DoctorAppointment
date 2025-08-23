import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DoctorCard from ".//DoctorCard";
import Footer from "../../../components/Common/Footer/Footer";
import NavbarWrapper from "../../../components/Common/NavbarWrapper/NavbarWrapper";
import "./FindDoctors.css";
import { apiCall } from "../../../helper/apiCall";
import Loading from "../../../components/Common/Loading/Loading";
import { useDispatch, useSelector } from "react-redux";
import { setLoading } from "../../../redux/reducers/rootSlice";
import Empty from "../../../components/Common/Empty/Empty";

const Doctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialization, setSelectedSpecialization] = useState("");
  const [selectedTiming, setSelectedTiming] = useState("");
  const [experienceRange, setExperienceRange] = useState("");
  const [feeRange, setFeeRange] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [specializations, setSpecializations] = useState([]);
  const [doctorStats, setDoctorStats] = useState({
    totalDoctors: 0,
    averageExperience: 0,
    specializations: 0,
    averageFee: 0
  });
  const dispatch = useDispatch();
  const { loading, userInfo } = useSelector((state) => state.root);

  useEffect(() => {
    const fetchAllDocs = async () => {
      try {
        dispatch(setLoading(true));
        const data = await apiCall.get(`/doctor/getalldoctors`);
        setDoctors(data);
        setFilteredDoctors(data);
        const uniqueSpecializations = [...new Set(data.map(doctor => doctor.specialization))];
        setSpecializations(uniqueSpecializations);
        const stats = {
          totalDoctors: data.length,
          averageExperience: data.length > 0 ? (data.reduce((sum, doc) => sum + doc.experience, 0) / data.length).toFixed(1) : 0,
          specializations: uniqueSpecializations.length,
          averageFee: data.length > 0 ? Math.round(data.reduce((sum, doc) => sum + doc.fees, 0) / data.length) : 0
        };
        setDoctorStats(stats);

      } catch (error) {
        console.error("Error fetching doctors:", error);
        setDoctors([]);
        setFilteredDoctors([]);
      } finally {
        dispatch(setLoading(false));
      }
    };

    fetchAllDocs();
  }, [dispatch]);

  useEffect(() => {
    let filtered = [...doctors];

    if (searchQuery) {
      filtered = filtered.filter(doctor => 
        `${doctor.userId?.firstname} ${doctor.userId?.lastname}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doctor.specialization.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (selectedSpecialization) {
      filtered = filtered.filter(doctor => doctor.specialization === selectedSpecialization);
    }
    if (selectedTiming) {
      filtered = filtered.filter(doctor => doctor.timing === selectedTiming);
    }
    if (experienceRange) {
      const [min, max] = experienceRange.split('-').map(Number);
      filtered = filtered.filter(doctor => {
        if (max) {
          return doctor.experience >= min && doctor.experience <= max;
        } else {
          return doctor.experience >= min;
        }
      });
    }
    if (feeRange) {
      const [min, max] = feeRange.split('-').map(Number);
      filtered = filtered.filter(doctor => {
        if (max) {
          return doctor.fees >= min && doctor.fees <= max;
        } else {
          return doctor.fees >= min;
        }
      });
    }
    if (sortBy) {
      filtered.sort((a, b) => {
        switch (sortBy) {
          case 'experience-high':
            return b.experience - a.experience;
          case 'experience-low':
            return a.experience - b.experience;
          case 'fees-low':
            return a.fees - b.fees;
          case 'fees-high':
            return b.fees - a.fees;
          case 'name':
            return `${a.userId?.firstname} ${a.userId?.lastname}`.localeCompare(
              `${b.userId?.firstname} ${b.userId?.lastname}`
            );
          default:
            return 0;
        }
      });
    }

    setFilteredDoctors(filtered);
  }, [searchQuery, selectedSpecialization, selectedTiming, experienceRange, feeRange, sortBy, doctors]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSpecializationChange = (e) => {
    setSelectedSpecialization(e.target.value);
  };

  const handleTimingChange = (e) => {
    setSelectedTiming(e.target.value);
  };

  const handleExperienceChange = (e) => {
    setExperienceRange(e.target.value);
  };

  const handleFeeChange = (e) => {
    setFeeRange(e.target.value);
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedSpecialization("");
    setSelectedTiming("");
    setExperienceRange("");
    setFeeRange("");
    setSortBy("");
  };

  const hasActiveFilters = searchQuery || selectedSpecialization || selectedTiming || experienceRange || feeRange || sortBy;

  return (
    <div className="findDoctors_page">
      <NavbarWrapper/>
      {loading && <Loading name="findDoctors_loading" />}
      {!loading && (
        <div className="findDoctors_content" name="findDoctors_content">
          <section className="findDoctors_container" name="findDoctors_container">
            <h2 className="findDoctors_heading" name="findDoctors_heading">Find Your Perfect Doctor</h2>
            {/* Search and Filter Section (all real data) */}
            <div className="findDoctors_filtersSection" name="findDoctors_filtersSection">
              <div className="findDoctors_searchWrapper" name="findDoctors_searchWrapper">
                {/* Professional SVG icon for search */}
                <span className="findDoctors_searchIcon" name="findDoctors_searchIcon">
                  <svg viewBox="0 0 24 24" fill="none" width="20" height="20" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search doctors by name or specialization..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="findDoctors_searchInput"
                  name="findDoctors_searchInput"
                />
              </div>
              
              <div className="findDoctors_filtersGrid" name="findDoctors_filtersGrid">
                <div className="findDoctors_filterGroup" name="findDoctors_filterGroup_specialization">
                  <label className="findDoctors_filterLabel" name="findDoctors_filterLabel_specialization">Specialization</label>
                  <select
                    value={selectedSpecialization}
                    onChange={handleSpecializationChange}
                    className="findDoctors_select"
                    name="findDoctors_select_specialization"
                  >
                    <option value="">All Specializations</option>
                    {specializations.map((spec, index) => (
                      <option key={index} value={spec}>{spec}</option>
                    ))}
                  </select>
                </div>

                <div className="findDoctors_filterGroup" name="findDoctors_filterGroup_timing">
                  <label className="findDoctors_filterLabel" name="findDoctors_filterLabel_timing">Available Timing</label>
                  <select
                    value={selectedTiming}
                    onChange={handleTimingChange}
                    className="findDoctors_select"
                    name="findDoctors_select_timing"
                  >
                    <option value="">Any Time</option>
                    <option value="morning">Morning (8AM-12PM)</option>
                    <option value="afternoon">Afternoon (12PM-5PM)</option>
                    <option value="evening">Evening (5PM-9PM)</option>
                    <option value="night">Night (9PM-6AM)</option>
                  </select>
                </div>

                <div className="findDoctors_filterGroup" name="findDoctors_filterGroup_experience">
                  <label className="findDoctors_filterLabel" name="findDoctors_filterLabel_experience">Experience</label>
                  <select
                    value={experienceRange}
                    onChange={handleExperienceChange}
                    className="findDoctors_select"
                    name="findDoctors_select_experience"
                  >
                    <option value="">Any Experience</option>
                    <option value="0-5">0-5 years</option>
                    <option value="5-10">5-10 years</option>
                    <option value="10-15">10-15 years</option>
                    <option value="15-20">15-20 years</option>
                    <option value="20">20+ years</option>
                  </select>
                </div>

                <div className="findDoctors_filterGroup" name="findDoctors_filterGroup_fee">
                  <label className="findDoctors_filterLabel" name="findDoctors_filterLabel_fee">Consultation Fee</label>
                  <select
                    value={feeRange}
                    onChange={handleFeeChange}
                    className="findDoctors_select"
                    name="findDoctors_select_fee"
                  >
                    <option value="">Any Fee Range</option>
                    <option value="0-50">Under $50</option>
                    <option value="50-100">$50-$100</option>
                    <option value="100-150">$100-$150</option>
                    <option value="150-200">$150-$200</option>
                    <option value="200">$200+</option>
                  </select>
                </div>

                <div className="findDoctors_filterGroup" name="findDoctors_filterGroup_sort">
                  <label className="findDoctors_filterLabel" name="findDoctors_filterLabel_sort">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={handleSortChange}
                    className="findDoctors_select"
                    name="findDoctors_select_sort"
                  >
                    <option value="">Default</option>
                    <option value="name">Name (A-Z)</option>
                    <option value="experience-high">Experience (High to Low)</option>
                    <option value="experience-low">Experience (Low to High)</option>
                    <option value="fees-low">Fees (Low to High)</option>
                    <option value="fees-high">Fees (High to Low)</option>
                  </select>
                </div>
              </div>

              {hasActiveFilters && (
                <div className="findDoctors_filterActions" name="findDoctors_filterActions">
                  <button 
                    onClick={clearFilters}
                    className="findDoctors_clearButton"
                    name="findDoctors_clearButton"
                  >
                    {/* Professional SVG icon for clear */}
                    <span name="findDoctors_clearIcon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="6" width="18" height="13" rx="2"/>
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        <line x1="1" y1="6" x2="23" y2="6"/>
                      </svg>
                    </span>
                    Clear All Filters
                  </button>
                  <span className="findDoctors_activeFiltersCount" name="findDoctors_activeFiltersCount">
                    {[searchQuery, selectedSpecialization, selectedTiming, experienceRange, feeRange, sortBy].filter(Boolean).length} filter(s) active
                  </span>
                </div>
              )}
            </div>

            {/* Results Summary */}
            <div className="findDoctors_resultsInfo" name="findDoctors_resultsInfo">
              <div className="findDoctors_resultsSummary" name="findDoctors_resultsSummary">
                <h3 name="findDoctors_resultsTitle">Search Results</h3>
                <p className="findDoctors_resultsText" name="findDoctors_resultsText">
                  Showing <strong name="findDoctors_resultsCount">{filteredDoctors.length}</strong> of <strong name="findDoctors_totalCount">{doctors.length}</strong> doctors
                  {selectedSpecialization && (
                    <span className="findDoctors_filterBadge" name="findDoctors_filterBadge_specialization">in {selectedSpecialization}</span>
                  )}
                  {selectedTiming && (
                    <span className="findDoctors_filterBadge" name="findDoctors_filterBadge_timing">available {selectedTiming}</span>
                  )}
                  {searchQuery && (
                    <span className="findDoctors_filterBadge" name="findDoctors_filterBadge_search">matching "{searchQuery}"</span>
                  )}
                </p>
              </div>
            </div>
            
            {filteredDoctors.length > 0 ? (
              <div className="findDoctors_cardsGrid" name="findDoctors_cardsGrid">
                {filteredDoctors.map((ele) => {
                  // Only render if userId exists and has _id
                  if (!ele.userId || !ele.userId._id) return null;
                  const doctorCardData = {
                    ...ele,
                    _id: ele.userId._id, // Always use User's _id
                  };
                  return (
                    <DoctorCard
                      ele={doctorCardData}
                      key={doctorCardData._id}
                      name="findDoctors_doctorCard"
                    />
                  );
                })}
              </div>
            ) : (
              <div className="findDoctors_emptyState" name="findDoctors_emptyState">
                <Empty name="findDoctors_emptyComponent" />
                <p className="findDoctors_emptyMessage" name="findDoctors_emptyMessage">
                  {doctors.length === 0 
                    ? "No doctors found. Please check back later." 
                    : "No doctors match your current filters. Try adjusting your search criteria."
                  }
                </p>
                {hasActiveFilters && (
                  <button 
                    onClick={clearFilters}
                    className="findDoctors_clearButton findDoctors_clearButtonLarge"
                    name="findDoctors_clearButtonLarge"
                  >
                    {/* Professional SVG icon for clear */}
                    <span name="findDoctors_clearIconLarge">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="6" width="18" height="13" rx="2"/>
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        <line x1="1" y1="6" x2="23" y2="6"/>
                      </svg>
                    </span>
                    Clear All Filters
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      )}
      <Footer />
    </div>
  );
};

export default Doctors;