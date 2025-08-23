import React from 'react';
import './Footer.css';
import { FaFacebookF, FaYoutube, FaInstagram, FaEnvelope, FaPhoneAlt, FaMapMarkerAlt, FaArrowUp, FaRegCopyright } from "react-icons/fa";

const Footer = () => {
  const handleBackToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="footer_root">
      <div className="footer_container">
        <div className="footer_aboutSection">
          <h3 className="footer_sectionTitle">Doctor Appointment</h3>
          <p className="footer_aboutText">
            Your trusted platform for booking appointments with certified doctors. Fast, reliable, and secure healthcare access for everyone.
          </p>
          <button className="footer_backToTopBtn" onClick={handleBackToTop} aria-label="Back to top">
            <FaArrowUp /> <span>Back to Top</span>
          </button>
        </div>
        <div className="footer_linksSection">
          <h3 className="footer_sectionTitle">Links</h3>
          <ul className="footer_linksList">
            <li className="footer_linkItem">
              <a className="footer_link" href="/">Home</a>
            </li>
            <li className="footer_linkItem">
              <a className="footer_link" href="/doctors">Doctors</a>
            </li>
            <li className="footer_linkItem">
              <a className="footer_link" href="/appointments">Appointments</a>
            </li>
            <li className="footer_linkItem">
              <a className="footer_link" href="/notifications">Notifications</a>
            </li>
            <li className="footer_linkItem">
              <a className="footer_link" href="/#contact">Contact Us</a>
            </li>
            <li className="footer_linkItem">
              <a className="footer_link" href="/profile">Profile</a>
            </li>
          </ul>
        </div>
        <div className="footer_socialSection">
          <h3 className="footer_sectionTitle">Social</h3>
          <ul className="footer_socialList">
            <li className="footer_socialItem">
              <a
                className="footer_socialLink"
                href="https://www.facebook.com/"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
              >
                <FaFacebookF />
              </a>
            </li>
            <li className="footer_socialItem">
              <a
                className="footer_socialLink"
                href="https://www.youtube.com/"
                target="_blank"
                rel="noreferrer"
                aria-label="YouTube"
              >
                <FaYoutube />
              </a>
            </li>
            <li className="footer_socialItem">
              <a
                className="footer_socialLink"
                href="https://www.instagram.com/"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
              >
                <FaInstagram />
              </a>
            </li>
          </ul>
        </div>
        <div className="footer_contactSection">
          <h3 className="footer_sectionTitle">Contact</h3>
          <ul className="footer_contactList">
            <li className="footer_contactItem">
              <FaEnvelope className="footer_contactIcon" />
              <a href="mailto:support@doctorapp.com" className="footer_contactLink">support@doctorapp.com</a>
            </li>
            <li className="footer_contactItem">
              <FaPhoneAlt className="footer_contactIcon" />
              <a href="tel:+1234567890" className="footer_contactLink">+1 234 567 890</a>
            </li>
            <li className="footer_contactItem">
              <FaMapMarkerAlt className="footer_contactIcon" />
              <a href="123 Health St, MedCity" className="footer_contactLink">123 Health St, MedCity</a>
            </li>
          </ul>
        </div>
      </div>
      <div className="footer_bottom">
        <FaRegCopyright className="footer_copyrightIcon" />
        {new Date().getFullYear()} Doctor Appointment. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;