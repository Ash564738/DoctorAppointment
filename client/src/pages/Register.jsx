import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "../styles/register.css";
import Navbar from "../components/Navbar";
import axios from "axios";
import toast from "react-hot-toast";

axios.defaults.baseURL = process.env.REACT_APP_SERVER_DOMAIN;

function Register() {
  const [file, setFile] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [formDetails, setFormDetails] = useState({
    firstname: "",
    lastname: "",
    email: "",
    password: "",
    confpassword: "",
    role: "",
    // Doctor-specific fields
    specialization: "",
    experience: "",
    fees: "",
    timing: "",
  });
  const navigate = useNavigate();

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
    "Otolaryngologists (ENT)",
    "Pathologists",
    "Pediatricians",
    "Plastic Surgeons",
    "Psychiatrists",
    "Pulmonologists",
    "Radiologists",
    "Rheumatologists",
    "Urologists",
    "Other"
  ];

  const inputChange = (e) => {
    const { name, value } = e.target;
    setFormDetails({
      ...formDetails,
      [name]: value,
    });
  };

  const onUpload = async (element) => {
    setLoading(true);
    if (
      element.type === "image/jpeg" ||
      element.type === "image/png" ||
      element.type === "image/jpg"
    ) {
      const data = new FormData();
      data.append("file", element);
      data.append("upload_preset", process.env.REACT_APP_CLOUDINARY_PRESET);
      data.append("cloud_name", process.env.REACT_APP_CLOUDINARY_CLOUD_NAME);
      fetch(process.env.REACT_APP_CLOUDINARY_BASE_URL, {
        method: "POST",
        body: data,
      })
        .then((res) => res.json())
        .then((data) => setFile(data.url.toString()));
      setLoading(false);
    } else {
      setLoading(false);
      toast.error("Please select an image in jpeg or png format");
    }
  };

  const formSubmit = async (e) => {
    try {
      e.preventDefault();
  
      if (loading) return;
      if (file === "") return;
      const { firstname, lastname, email, password, confpassword, specialization, experience, fees, timing } = formDetails;
      if (!firstname || !lastname || !email || !password || !confpassword || !selectedRole) {
        return toast.error("Input field should not be empty");
      } else if (firstname.length < 3) {
        return toast.error("First name must be at least 3 characters long");
      } else if (lastname.length < 3) {
        return toast.error("Last name must be at least 3 characters long");
      } else if (password.length < 5) {
        return toast.error("Password must be at least 5 characters long");
      } else if (password !== confpassword) {
        return toast.error("Passwords do not match");
      } else if (selectedRole === "Doctor" && (!specialization || !experience || !fees || !timing)) {
        return toast.error("Please fill all doctor-specific fields");
      } else if (selectedRole === "Doctor" && (isNaN(experience) || experience < 0)) {
        return toast.error("Experience must be a valid number");
      } else if (selectedRole === "Doctor" && (isNaN(fees) || fees < 0)) {
        return toast.error("Fees must be a valid number");
      }
  
      const registrationData = {
        firstname,
        lastname,
        email,
        password,
        pic: file,
        role: selectedRole,
      };

      // Add doctor-specific fields if registering as doctor
      if (selectedRole === "Doctor") {
        registrationData.doctorInfo = {
          specialization,
          experience: parseInt(experience),
          fees: parseInt(fees),
          timing,
        };
      }

      await toast.promise(
        axios.post("/user/register", registrationData),
        {
          pending: "Registering user...",
          success: "User registered successfully",
          error: "Unable to register user",
          loading: "Registering user...",
        }
      );
      return navigate("/login");
    } catch (error) {}
  };
  

  return (
    <>
      <Navbar />
      <section className="register-section flex-center">
        <div className="register-container flex-center">
          <h2 className="form-heading">Sign Up</h2>
          <form onSubmit={formSubmit} className="register-form">
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
            <input
              type="email"
              name="email"
              className="form-input"
              placeholder="Enter your email"
              value={formDetails.email}
              onChange={inputChange}
            />
            <input
              type="file"
              onChange={(e) => onUpload(e.target.files[0])}
              name="profile-pic"
              id="profile-pic"
              className="form-input"
            />
            <input
              type="password"
              name="password"
              className="form-input"
              placeholder="Enter your password"
              value={formDetails.password}
              onChange={inputChange}
            />
            <input
              type="password"
              name="confpassword"
              className="form-input"
              placeholder="Confirm your password"
              value={formDetails.confpassword}
              onChange={inputChange}
            />
            <select
              name="role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="form-input"
            >
              <option value="">Select Role</option>
              <option value="Doctor">Doctor (Requires Admin Approval)</option>
              <option value="Patient">Patient</option>
            </select>

            {/* Doctor-specific fields */}
            {selectedRole === "Doctor" && (
              <>
                <select
                  name="specialization"
                  className="form-input"
                  value={formDetails.specialization}
                  onChange={inputChange}
                  required
                >
                  <option value="">Select your specialization</option>
                  {specializations.map((spec, index) => (
                    <option key={index} value={spec}>
                      {spec}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  name="experience"
                  className="form-input"
                  placeholder="Enter your experience in years"
                  value={formDetails.experience}
                  onChange={inputChange}
                  min="0"
                  required
                />
                <input
                  type="number"
                  name="fees"
                  className="form-input"
                  placeholder="Enter your fees per consultation ($)"
                  value={formDetails.fees}
                  onChange={inputChange}
                  min="0"
                  required
                />
                <select
                  name="timing"
                  value={formDetails.timing}
                  className="form-input"
                  onChange={inputChange}
                  required
                >
                  <option value="">Select preferred timing</option>
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                  <option value="night">Night</option>
                </select>
              </>
            )}

            <button
              type="submit"
              className="btn form-btn"
              disabled={loading ? true : false}
            >
              sign up
            </button>
          </form>
          <p>
            Already a user?{" "}
            <NavLink className="login-link" to={"/login"}>
              Log in
            </NavLink>
          </p>
        </div>
      </section>
    </>
  );
}

export default Register;
