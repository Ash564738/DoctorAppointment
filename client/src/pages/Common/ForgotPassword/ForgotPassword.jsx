import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom"; 
import "./ForgotPassword.css";
import NavbarWrapper from "../../../components/Common/NavbarWrapper/NavbarWrapper";
import toast from "react-hot-toast";
import { apiCall } from "../../../helper/apiCall";

function ForgotPassword() {
  const [formDetails, setFormDetails] = useState({
    email: "",
  });
  const navigate = useNavigate(); 

  const inputChange = (e) => {
    const { name, value } = e.target;
    setFormDetails({
      ...formDetails,
      [name]: value,
    });
  };

  const formSubmit = async (e) => {
    e.preventDefault();
    const { email } = formDetails;

    if (!email) {
      return toast.error("Email is required");
    }

    try {
      const response = await apiCall.post("/user/forgotpassword", { email });
      // server returns { status: "Email sent successfully" } with 200
      if (response?.status === "Email sent successfully") {
        toast.success("Password reset email sent successfully!!!!!");
        navigate('/login'); 
      } else {
        toast.error("Failed to send password reset email");
      }
    } catch (error) {
      console.error("Error sending password reset email:", error);
    }
  };

  return (
    <>
      <NavbarWrapper />
      <section className="forgotPassword_container">
        <div className="forgotPassword_content">
          <div className="forgotPassword_header">
            <h2 className="forgotPassword_title">Forgot Password?</h2>
            <p className="forgotPassword_subtitle">
              Don't worry! Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>
          
          <form onSubmit={formSubmit} className="forgotPassword_form">
            <div className="forgotPassword_formGroup">
              <label className="forgotPassword_label">Email Address</label>
              <input
                type="email"
                name="email"
                className="forgotPassword_input"
                placeholder="Enter your registered email address"
                value={formDetails.email}
                onChange={inputChange}
                required
              />
            </div>
            
            <button type="submit" className="forgotPassword_submitButton">
              Send Reset Email
            </button>
          </form>
          
          <div className="forgotPassword_links">
            <NavLink className="forgotPassword_link" to={"/login"}>
              ← Back to Login
            </NavLink>
          </div>
          
          <div className="forgotPassword_info">
            <h4 className="forgotPassword_infoTitle">What happens next?</h4>
            <ul className="forgotPassword_infoList">
              <li className="forgotPassword_infoItem">We'll send a password reset link to your email</li>
              <li className="forgotPassword_infoItem">Click the link in the email to reset your password</li>
              <li className="forgotPassword_infoItem">Create a new secure password</li>
              <li className="forgotPassword_infoItem">Sign in with your new password</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}

export default ForgotPassword;