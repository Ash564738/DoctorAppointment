import React from "react";
import "./Home.css";
import Contact from "./Contact/Contact"; // Placeholder - create if needed
import AboutUs from "./AboutUs/AboutUs"; // Placeholder - create if needed
import Footer from "../../../components/Common/Footer/Footer";
import Hero from "./Hero/Hero";
import NavbarWrapper from "../../../components/Common/NavbarWrapper/NavbarWrapper";
import HomeCircles from "./HomeCircles/HomeCircles"; // Placeholder - create if needed

const Home = () => {
  return (
    <div className="home-page">
      <NavbarWrapper />
      <div className="home-page__content">
        <Hero />
        <AboutUs />
        <HomeCircles />
        <Contact />
      </div>
      <Footer />
    </div>
  );
};

export default Home;
