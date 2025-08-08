import React, { useEffect, useState } from "react";
import "../styles/profile.css";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import axios from "axios";
import toast from "react-hot-toast";
import { setLoading } from "../redux/reducers/rootSlice";
import { useDispatch, useSelector } from "react-redux";
import Loading from "../components/Loading";
import fetchData from "../helper/apiCall";
import jwt_decode from "jwt-decode";

axios.defaults.baseURL = process.env.REACT_APP_SERVER_DOMAIN;

function Profile() {
  const { userId } = jwt_decode(localStorage.getItem("token"));
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.root);
  const [file, setFile] = useState("");
  const [formDetails, setFormDetails] = useState({
    firstname: "",
    lastname: "",
    email: "",
    dateOfBirth: "",
    mobile: "",
    gender: "neither",
    address: "",
    bloodGroup: "",
    familyDiseases: "",
    // Doctor fields
    specialization: "",
    experience: "",
    fees: "",
    timing: ""
  });
  const [userRole, setUserRole] = useState("");

  const specializations = [
    "Allergists/Immunologists",
    "Anesthesiologists",
    "Cardiologists",
    "Colon and Rectal Surgeons",
    "Critical Care Medicine Specialists",
    "Dermatologists",
    "Emergency Medicine Physicians",
    "Endocrinologists",
    "Family Medicine Physicians",
    "Gastroenterologists",
    "General Surgeons",
    "Geriatricians",
    "Hematologists",
    "Infectious Disease Specialists",
    "Internal Medicine Physicians",
    "Nephrologists",
    "Neurologists",
    "Neurosurgeons",
    "Obstetricians and Gynecologists",
    "Oncologists",
    "Ophthalmologists",
    "Orthopedic Surgeons",
    "Otolaryngologists",
    "Pathologists",
    "Pediatricians",
    "Physical Medicine and Rehabilitation Physicians",
    "Plastic Surgeons",
    "Podiatrists",
    "Preventive Medicine Physicians",
    "Psychiatrists",
    "Pulmonologists",
    "Radiologists",
    "Rheumatologists",
    "Urologists"
  ];

  const getUser = async () => {
    try {
      dispatch(setLoading(true));
      const temp = await fetchData(`/user/getuser/${userId}`);
      setFormDetails({
        firstname: temp.firstname || "",
        lastname: temp.lastname || "",
        email: temp.email || "",
        dateOfBirth: temp.dateOfBirth ? temp.dateOfBirth.split('T')[0] : "",
        mobile: temp.mobile || "",
        gender: temp.gender || "neither",
        address: temp.address || "",
        bloodGroup: temp.bloodGroup || "",
        familyDiseases: temp.familyDiseases || "",
        // Doctor fields
        specialization: (temp.role === 'Doctor' && temp.doctorInfo) ? temp.doctorInfo.specialization || "" : "",
        experience: (temp.role === 'Doctor' && temp.doctorInfo) ? temp.doctorInfo.experience || "" : "",
        fees: (temp.role === 'Doctor' && temp.doctorInfo) ? temp.doctorInfo.fees || "" : "",
        timing: (temp.role === 'Doctor' && temp.doctorInfo) ? temp.doctorInfo.timing || "" : "",
      });
      setFile(temp.pic);
      setUserRole(temp.role || "");
      dispatch(setLoading(false));
    } catch (error) {
      console.error('Error fetching user profile:', error);
      dispatch(setLoading(false));
      toast.error('Failed to load profile');
    }
  };

  useEffect(() => {
    getUser();
  }, [dispatch]);

  const inputChange = (e) => {
    const { name, value } = e.target;
    return setFormDetails({
      ...formDetails,
      [name]: value,
    });
  };



  const formSubmit = async (e) => {
    try {
      e.preventDefault();
      const {
        firstname,
        lastname,
        email,
        dateOfBirth,
        mobile,
        address,
        gender,
        bloodGroup,
        familyDiseases,
        specialization,
        experience,
        fees,
        timing,
      } = formDetails;

      if (!email) {
        return toast.error("Email should not be empty");
      } else if (firstname.length < 3) {
        return toast.error("First name must be at least 3 characters long");
      } else if (lastname.length < 3) {
        return toast.error("Last name must be at least 3 characters long");
      }

      // Validate doctor fields if user is a doctor
      if (userRole === 'Doctor') {
        if (!specialization || !experience || !fees || !timing) {
          return toast.error("All doctor fields are required");
        }
      }

      const updateData = {
        firstname,
        lastname,
        email,
        dateOfBirth,
        mobile,
        address,
        gender,
        bloodGroup,
        familyDiseases,
      };

      // Add doctor fields if user is a doctor
      if (userRole === 'Doctor') {
        updateData.doctorInfo = {
          specialization,
          experience,
          fees,
          timing,
        };
      }

      await toast.promise(
        axios.put(
          "/user/updateprofile",
          updateData,
          {
            headers: {
              authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        ),
        {
          pending: "Updating profile...",
          success: "Profile updated successfully",
          error: "Unable to update profile",
          loading: "Updating profile...",
        }
      );

      // Profile updated successfully
    } catch (error) {
      console.error('Profile update error:', error);
      return toast.error("Unable to update profile");
    }
  };

  return (
    <>
    <Navbar />
      {loading ? (
        <Loading />
      ) : (
        <section className="container flex-center">
          <div className="profile-container flex-center">
            <h2 className="form-heading">Profile</h2>
            <img
              src={file}
              alt="profile"
              className="profile-pic"
            />
            <form
              onSubmit={formSubmit}
              className="register-form"
            >
              <div className="form-same-row">
                <input
                  type="text"
                  name="firstname"
                  className="form-input"
                  placeholder="Enter your first name"
                  value={formDetails.firstname}
                  onChange={inputChange}
                />
                <input
                  type="text"
                  name="lastname"
                  className="form-input"
                  placeholder="Enter your last name"
                  value={formDetails.lastname}
                  onChange={inputChange}
                />
              </div>
              <div className="form-same-row">
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  placeholder="Enter your email"
                  value={formDetails.email}
                  onChange={inputChange}
                />
                <select
                  name="gender"
                  value={formDetails.gender}
                  className="form-input"
                  id="gender"
                  onChange={inputChange}
                >
                  <option value="neither">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div className="form-same-row">
                <input
                  type="date"
                  name="dateOfBirth"
                  className="form-input"
                  placeholder="Enter your date of birth"
                  value={formDetails.dateOfBirth}
                  onChange={inputChange}
                />
                <input
                  type="text"
                  name="mobile"
                  className="form-input"
                  placeholder="Enter your mobile number"
                  value={formDetails?.mobile}
                  onChange={inputChange}
                />
              </div>
              <select
                name="bloodGroup"
                value={formDetails.bloodGroup}
                className="form-input"
                onChange={inputChange}
              >
                <option value="">Select Blood Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
              <textarea
                type="text"
                name="address"
                className="form-input"
                placeholder="Enter your address"
                value={formDetails.address}
                onChange={inputChange}
                rows="2"
              ></textarea>
              <textarea
                type="text"
                name="familyDiseases"
                className="form-input"
                placeholder="Enter family medical history (optional)"
                value={formDetails.familyDiseases}
                onChange={inputChange}
                rows="3"
              ></textarea>

              {/* Doctor-specific fields */}
              {userRole === 'Doctor' && (
                <>
                  <select
                    name="specialization"
                    value={formDetails.specialization}
                    onChange={inputChange}
                    className="form-input"
                    required
                  >
                    <option value="">Select Specialization</option>
                    {specializations.map((spec) => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>

                  <input
                    type="number"
                    name="experience"
                    className="form-input"
                    placeholder="Experience (years)"
                    value={formDetails.experience}
                    onChange={inputChange}
                    min="0"
                    max="50"
                    required
                  />

                  <input
                    type="number"
                    name="fees"
                    className="form-input"
                    placeholder="Consultation Fees ($)"
                    value={formDetails.fees}
                    onChange={inputChange}
                    min="0"
                    required
                  />

                  <input
                    type="text"
                    name="timing"
                    className="form-input"
                    placeholder="Available Timing (e.g., 9:00 AM - 5:00 PM)"
                    value={formDetails.timing}
                    onChange={inputChange}
                    required
                  />
                </>
              )}

              <button
                type="submit"
                className="btn form-btn"
              >
                update
              </button>
            </form>



          </div>
        </section>
      )}
      <Footer />
    </>
  );
}

export default Profile;
