import React from 'react';
import NavbarWrapper from '../../../components/Common/NavbarWrapper/NavbarWrapper';
import Footer from '../../../components/Common/Footer/Footer';

const Localization = () => {
  return (
    <>
      <NavbarWrapper />
      <div className="localization-page">
        <h2>Multi-language Support</h2>
        <p>Switch between languages for the entire app. (Feature coming soon)</p>
      </div>
      <Footer />
    </>
  );
};

export default Localization;
