import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "../styles/register.css";
import Navbar from "../components/Navbar";
import axios from "axios";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import { setUserInfo } from "../redux/reducers/rootSlice";
import jwt_decode from "jwt-decode";
import fetchData from "../helper/apiCall";
import logger from "../utils/logger";
import ErrorBoundary from "../components/ErrorBoundary";

// Configure axios with the correct base URL structure
const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_SERVER_URL + '/api' || 'http://localhost:5015/api'
});

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

      logger.user('login_attempt', email, true, {
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
      } else if (password.length < 5) {
        logger.form('login', 'validation_failed', {
          reason: 'password_too_short',
          passwordLength: password.length
        });
        return toast.error("Password must be at least 5 characters long");
      }

      const { data } = await toast.promise(
        axiosInstance.post("/user/login", {
          email,
          password,
        }),

        {
          pending: "Logging in...",
          success: "Login successfully",
          error: "Unable to login user",
          loading: "Logging user...",
        }
      );

      localStorage.setItem("token", data.token);
      const decodedToken = jwt_decode(data.token);
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
        return navigate("/dashboard/home");
      } else if (role === "Patient"){
        return navigate("/");
      } else {
        return navigate("/");
      }
    } catch (error) {
      return error;
    }
  };

  return (
    <ErrorBoundary componentName="Login">
      <Navbar  />
      <section className="register-section flex-center">
        <div className="register-container flex-center">
          <h2 className="form-heading">Sign In</h2>
          <form onSubmit={formSubmit} className="register-form">
            <input
              type="email"
              name="email"
              className="form-input"
              placeholder="Enter your email"
              value={formDetails.email}
              onChange={inputChange}
            />
            <input
              type="password"
              name="password"
              className="form-input"
              placeholder="Enter your password"
              value={formDetails.password}
              onChange={inputChange}
            />

            <button type="submit" className="btn form-btn">
              sign in
            </button>
          </form>
          <NavLink className="login-link" to={"/forgotpassword"}>
              Forgot Password
            </NavLink>
          <p>
            Not a user?{" "}
            
            <NavLink className="login-link" to={"/register"}>
              Register
            </NavLink>
          </p>
        </div>
      </section>
    </ErrorBoundary>
  );
}

export default Login;
