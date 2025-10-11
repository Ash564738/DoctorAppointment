import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "./Login.css";
import NavbarWrapper from "../../../components/Common/NavbarWrapper/NavbarWrapper";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import { setUserInfo } from "../../../redux/reducers/rootSlice";
import { jwtDecode } from "jwt-decode";
import fetchData, { apiCall } from "../../../helper/apiCall";
import logger from "../../../utils/logger";
import ErrorBoundary from "../../../components/Common/ErrorBoundary/ErrorBoundary";
function Login() {
  const dispatch = useDispatch();
  const [formDetails, setFormDetails] = useState({
    email: "",
    password: "",
  });
  const navigate = useNavigate();
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
      const { email, password } = formDetails;
      logger.info('login_attempt', {
        email,
        hasEmail: !!email,
        hasPassword: !!password,
        passwordLength: password?.length || 0
      });
      if (!email || !password) {
        logger.form('login', 'validation_failed', {
          reason: 'missing_fields',
          hasEmail: !!email,
          hasPassword: !!password
        });
        return toast.error("Email and password are required");
      }
      const response = await toast.promise(
        apiCall.post("/user/login", { email, password }),
        {
          pending: "Logging in...",
          success: "Login successfully",
          error: "Unable to login user",
          loading: "Logging user...",
        }
      );
      if (!response?.token) {
        toast.error(response?.message || "Unable to login user");
        return;
      }
      localStorage.setItem("token", response.token);
      const decodedToken = jwtDecode(response.token);
      dispatch(setUserInfo(decodedToken.userId));
      const userRole = decodedToken.role;
      getUser(decodedToken.userId, userRole);
    } catch (error) {
      logger.error('Login failed', error);
      return error;
    }
  };
  const getUser = async (id, role) => {
    try {
      const temp = await fetchData(`/user/getuser/${id}`);
      dispatch(setUserInfo(temp));
      if (role === "Admin") {
        return navigate("/admin/dashboard");
      } else if (role === "Patient"){
        return navigate("/patient/dashboard");
      } else if (role === "Doctor") {
        return navigate("/doctor/dashboard");
      } else {
        return navigate("/");
      }
    } catch (error) {
      return error;
    }
  };
  return (
    <ErrorBoundary componentName="Login">
      <NavbarWrapper  />
      <section className="login_container">
        <div className="login_content">
          <div className="login_header">
            <h2 className="login_title">Sign In</h2>
            <p className="login_subtitle">Welcome back! Please sign in to your account</p>
          </div>
          <form onSubmit={formSubmit} className="login_form">
            <div className="login_formGroup">
              <label className="login_label">Email Address</label>
              <input
                type="email"
                name="email"
                className="login_input"
                placeholder="Enter your email"
                value={formDetails.email}
                onChange={inputChange}
                required
              />
            </div>
            <div className="login_formGroup">
              <label className="login_label">Password</label>
              <input
                type="password"
                name="password"
                className="login_input"
                placeholder="Enter your password"
                value={formDetails.password}
                onChange={inputChange}
                required
              />
            </div>

            <button type="submit" className="login_submitButton">
              Sign In
            </button>
          </form>
          
          <div className="login_links">
            <NavLink className="login_link" to={"/forgotpassword"}>
              Forgot Password?
            </NavLink>
            <p className="login_registerText">
              Don't have an account?{" "}
              <NavLink className="login_link" to={"/register"}>
                Register here
              </NavLink>
            </p>
          </div>
        </div>
      </section>
    </ErrorBoundary>
  );
}

export default Login;