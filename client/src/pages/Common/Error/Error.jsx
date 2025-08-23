import React from "react";
import { NavLink } from "react-router-dom";
import NavbarWrapper from "../../../components/Common/NavbarWrapper/NavbarWrapper";
import "./Error.css";

const Error = () => {
  return (
    <div className="error-page">
      <NavbarWrapper />
      <div className="error-page__container">
        <div className="error-page__content">
          <h1 className="error-page__code">404</h1>
          <h2 className="error-page__title">Page Not Found</h2>
          <p className="error-page__message">
            Sorry, the page you are looking for doesn't exist or has been moved.
          </p>
          <NavLink to="/" className="error-page__home-btn">
            Go Back Home
          </NavLink>
        </div>
      </div>
    </div>
  );
};

export default Error;
