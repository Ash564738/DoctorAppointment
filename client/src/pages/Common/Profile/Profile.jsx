import React, { useEffect, useState } from "react";
import "./Profile.css";
import Footer from "../../../components/Common/Footer/Footer";
import NavbarWrapper from "../../../components/Common/NavbarWrapper/NavbarWrapper";
import toast from "react-hot-toast";
import { setLoading } from "../../../redux/reducers/rootSlice";
import { useDispatch, useSelector } from "react-redux";
import Loading from "../../../components/Common/Loading/Loading";
import fetchData, { apiCall } from "../../../helper/apiCall";
import { jwtDecode } from "jwt-decode";
// Use the shared apiCall helper for all HTTP requests to ensure the correct /api base URL is used

function Profile() {
  const { userId } = jwtDecode(localStorage.getItem("token"));
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
    department: ""
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

  const specializationToDepartment = {
    "Allergists/Immunologists": "Internal Medicine - Allergy & Immunology",
    "Anesthesiologists": "Anesthesiology",
    "Cardiologists": "Cardiovascular Medicine",
    "Colon and Rectal Surgeons": "Surgery - Colorectal Surgery",
    "Critical Care Medicine Specialists": "Critical Care Medicine",
    "Dermatologists": "Dermatology",
    "Emergency Medicine Physicians": "Emergency Medicine",
    "Endocrinologists": "Internal Medicine - Endocrinology",
    "Family Medicine Physicians": "Family Medicine",
    "Gastroenterologists": "Internal Medicine - Gastroenterology & Hepatology",
    "General Surgeons": "Surgery",
    "Geriatricians": "Medicine - Geriatrics",
    "Hematologists": "Medicine - Hematology/Oncology",
    "Infectious Disease Specialists": "Medicine - Infectious Diseases",
    "Internal Medicine Physicians": "Internal Medicine",
    "Nephrologists": "Medicine - Nephrology",
    "Neurologists": "Neurology",
    "Neurosurgeons": "Neurological Surgery",
    "Obstetricians and Gynecologists": "Obstetrics & Gynecology",
    "Oncologists": "Oncology",
    "Ophthalmologists": "Ophthalmology",
    "Orthopedic Surgeons": "Orthopaedic Surgery",
    "Otolaryngologists": "Otolaryngology (ENT)",
    "Pathologists": "Pathology & Laboratory Medicine",
    "Pediatricians": "Pediatrics",
    "Physical Medicine and Rehabilitation Physicians": "Physical Medicine & Rehabilitation",
    "Plastic Surgeons": "Plastic Surgery",
    "Podiatrists": "Podiatry",
    "Preventive Medicine Physicians": "Preventive Medicine/Public Health",
    "Psychiatrists": "Psychiatry",
    "Pulmonologists": "Medicine - Pulmonary, Allergy & Critical Care",
    "Radiologists": "Radiology",
    "Rheumatologists": "Medicine - Rheumatology",
    "Urologists": "Urology"
  };

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
        department: (temp.role === 'Doctor' && temp.doctorInfo) ? temp.doctorInfo.department || "" : ""
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

  // Update inputChange to auto-set department when specialization changes
  const inputChange = (e) => {
    const { name, value } = e.target;
    if (name === "specialization") {
      setFormDetails((prev) => ({
        ...prev,
        specialization: value,
        department: specializationToDepartment[value] || ""
      }));
    } else {
      setFormDetails({
        ...formDetails,
        [name]: value,
      });
    }
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
        department
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
        if (!specialization || !experience || !fees || !department) {
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
          department
        };
      }

      // Use apiCall.put which already sets Authorization header and prefixes /api
      await toast.promise(
        apiCall.put("/user/updateprofile", updateData),
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
    <NavbarWrapper />
      {loading ? (
        <Loading />
      ) : (
        <section className="profile_container">
          <div className="profile_content">
            <div className="profile_header">
              <h2 className="profile_title">Profile</h2>
              <img
                src={file}
                alt="profile"
                className="profile_profilePic"
              />
            </div>
            <form
              onSubmit={formSubmit}
              className="profile_form"
            >
              <div className="profile_formRow">
                <input
                  type="text"
                  name="firstname"
                  className="profile_input"
                  placeholder="Enter your first name"
                  value={formDetails.firstname}
                  onChange={inputChange}
                />
                <input
                  type="text"
                  name="lastname"
                  className="profile_input"
                  placeholder="Enter your last name"
                  value={formDetails.lastname}
                  onChange={inputChange}
                />
              </div>
              <div className="profile_formRow">
                <input
                  type="email"
                  name="email"
                  className="profile_input"
                  placeholder="Enter your email"
                  value={formDetails.email}
                  onChange={inputChange}
                />
                <select
                  name="gender"
                  value={formDetails.gender}
                  className="profile_select"
                  id="gender"
                  onChange={inputChange}
                >
                  <option value="neither">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div className="profile_formRow">
                <input
                  type="date"
                  name="dateOfBirth"
                  className="profile_input"
                  placeholder="Enter your date of birth"
                  value={formDetails.dateOfBirth}
                  onChange={inputChange}
                />
                <input
                  type="text"
                  name="mobile"
                  className="profile_input"
                  placeholder="Enter your mobile number"
                  value={formDetails?.mobile}
                  onChange={inputChange}
                />
              </div>
              <select
                name="bloodGroup"
                value={formDetails.bloodGroup}
                className="profile_select"
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
                className="profile_textarea"
                placeholder="Enter your address"
                value={formDetails.address}
                onChange={inputChange}
                rows="2"
              ></textarea>
              <textarea
                type="text"
                name="familyDiseases"
                className="profile_textarea"
                placeholder="Enter family medical history (optional)"
                value={formDetails.familyDiseases}
                onChange={inputChange}
                rows="3"
              ></textarea>

              {/* Doctor-specific fields */}
              {userRole === 'Doctor' && (
                <div className="profile_doctorSection">
                  <h3 className="profile_doctorTitle">Doctor Information</h3>
                  <select
                    name="specialization"
                    value={formDetails.specialization}
                    onChange={inputChange}
                    className="profile_select"
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
                    className="profile_input"
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
                    className="profile_input"
                    placeholder="Consultation Fees ($)"
                    value={formDetails.fees}
                    onChange={inputChange}
                    min="0"
                    required
                  />

                  <input
                    type="text"
                    name="department"
                    className="profile_input"
                    placeholder="Department"
                    value={formDetails.department}
                    readOnly
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                className="profile_submitButton"
              >
                Update Profile
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