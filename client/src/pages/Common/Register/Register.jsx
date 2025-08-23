import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "./Register.css";
import NavbarWrapper from "../../../components/Common/NavbarWrapper/NavbarWrapper";
import toast from "react-hot-toast";
import { apiCall } from "../../../helper/apiCall";
import axios from "axios";

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
    department: ""
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
      const { firstname, lastname, email, password, confpassword, specialization, experience, fees, department } = formDetails;
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
      } else if (selectedRole === "Doctor" && (!specialization || !experience || !fees || !department)) {
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
          department
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
      <NavbarWrapper />
      <section className="register_container">
        <div className="register_content">
          <div className="register_header">
            <h2 className="register_title">Create Your Account</h2>
            <p className="register_subtitle">Join our healthcare platform today</p>
          </div>
          
          <form onSubmit={formSubmit} className="register_form">
            <div className="register_formRow">
              <div className="register_formGroup">
                <label className="register_label">First Name</label>
                <input
                  type="text"
                  name="firstname"
                  className="register_input"
                  placeholder="Enter your first name"
                  value={formDetails.firstname}
                  onChange={inputChange}
                  required
                />
              </div>
              <div className="register_formGroup">
                <label className="register_label">Last Name</label>
                <input
                  type="text"
                  name="lastname"
                  className="register_input"
                  placeholder="Enter your last name"
                  value={formDetails.lastname}
                  onChange={inputChange}
                  required
                />
              </div>
            </div>
            
            <div className="register_formGroup">
              <label className="register_label">Email Address</label>
              <input
                type="email"
                name="email"
                className="register_input"
                placeholder="Enter your email"
                value={formDetails.email}
                onChange={inputChange}
                required
              />
            </div>
            
            <div className="register_formGroup">
              <label className="register_label">Profile Picture</label>
              <input
                type="file"
                onChange={(e) => onUpload(e.target.files[0])}
                name="profile-pic"
                id="profile-pic"
                className="register_fileInput"
                accept="image/jpeg,image/jpg,image/png"
              />
              <small className="register_fileHint">Upload a profile picture (JPEG, JPG, or PNG)</small>
            </div>
            
            <div className="register_formRow">
              <div className="register_formGroup">
                <label className="register_label">Password</label>
                <input
                  type="password"
                  name="password"
                  className="register_input"
                  placeholder="Enter your password"
                  value={formDetails.password}
                  onChange={inputChange}
                  required
                />
              </div>
              <div className="register_formGroup">
                <label className="register_label">Confirm Password</label>
                <input
                  type="password"
                  name="confpassword"
                  className="register_input"
                  placeholder="Confirm your password"
                  value={formDetails.confpassword}
                  onChange={inputChange}
                  required
                />
              </div>
            </div>
            
            <div className="register_formGroup">
              <label className="register_label">Role</label>
              <select
                name="role"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="register_select"
                required
              >
                <option value="">Select your role</option>
                <option value="Doctor">Doctor (Requires Admin Approval)</option>
                <option value="Patient">Patient</option>
              </select>
            </div>

            {/* Doctor-specific fields */}
            {selectedRole === "Doctor" && (
              <div className="register_doctorFields">
                <h3 className="register_sectionTitle">Doctor Information</h3>
                
                <div className="register_formGroup">
                  <label className="register_label">Specialization</label>
                  <select
                    name="specialization"
                    className="register_select"
                    value={formDetails.specialization}
                    onChange={inputChange}
                    required
                  >
                    <option value="">Select your specialization</option>
                    {specializations.map((spec) => (
                      <option key={spec} value={spec}>
                        {spec}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="register_formRow">
                  <div className="register_formGroup">
                    <label className="register_label">Experience (Years)</label>
                    <input
                      type="number"
                      name="experience"
                      className="register_input"
                      placeholder="Years of experience"
                      value={formDetails.experience}
                      onChange={inputChange}
                      min="0"
                      required
                    />
                  </div>
                  <div className="register_formGroup">
                    <label className="register_label">Consultation Fee ($)</label>
                    <input
                      type="number"
                      name="fees"
                      className="register_input"
                      placeholder="Fee per consultation"
                      value={formDetails.fees}
                      onChange={inputChange}
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div className="register_formGroup">
                  <label className="register_label">Department</label>
                  <input
                    type="text"
                    name="department"
                    className="register_input"
                    placeholder="Department"
                    value={formDetails.department}
                    readOnly
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="register_submitButton"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>
          
          <div className="register_loginLink">
            <p className="register_loginText">
              Already have an account?{" "}
              <NavLink className="register_link" to={"/login"}>
                Sign in here
              </NavLink>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

export default Register;