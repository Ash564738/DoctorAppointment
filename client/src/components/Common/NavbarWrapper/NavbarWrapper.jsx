import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { NavLink, useNavigate } from 'react-router-dom';
import { setUserInfo } from '../../../redux/reducers/rootSlice';
import { 
  FaTachometerAlt, 
  FaUserMd, 
  FaCalendarAlt, 
  FaFileAlt, 
  FaUsers, 
  FaUser, 
  FaChartBar,
  FaHeart,
  FaStethoscope,
  FaCalendarCheck,
  FaDollarSign,
  FaStar
} from 'react-icons/fa';
import './NavbarWrapper.css';

const NavbarWrapper = () => {
  const { userInfo } = useSelector(state => state.root);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const token = localStorage.getItem('token');
  const isAuthenticated = !!(token && userInfo);
  const userRole = userInfo?.role;
  const getUserNavigation = () => {
    if (!isAuthenticated) return [];
    
    switch (userRole) {
      case 'Patient':
        return [
          { name: 'Dashboard', path: '/patient/dashboard', icon: <FaTachometerAlt /> },
          { name: 'Find Doctors', path: '/patient/doctors', icon: <FaUserMd /> },
          { name: 'Appointments', path: '/patient/appointments', icon: <FaCalendarAlt /> },
          { name: 'Medical Records', path: '/patient/medical-records', icon: <FaFileAlt /> },
          { name: 'Ratings', path: '/patient/ratings', icon: <FaStar /> },
          { name: 'Payments', path: '/patient/payments', icon: <FaDollarSign /> },
          { name: 'Family', path: '/patient/family', icon: <FaUsers /> }
        ];
      case 'Doctor':
        return [
          { name: 'Dashboard', path: '/doctor/dashboard', icon: <FaTachometerAlt /> },
          { name: 'Appointments', path: '/doctor/appointments', icon: <FaCalendarAlt /> },
          { name: 'Medical Records', path: '/doctor/medical-records', icon: <FaFileAlt /> },
          { name: 'Schedule', path: '/doctor/schedule', icon: <FaCalendarCheck /> },
          { name: 'Analytics', path: '/doctor/analytics', icon: <FaChartBar /> },
          { name: 'Earnings', path: '/doctor/earnings', icon: <FaDollarSign /> },
          { name: 'Ratings', path: '/doctor/ratings', icon: <FaStar /> }
        ];
      case 'Admin':
        return [
          { name: 'Dashboard', path: '/admin/dashboard', icon: <FaTachometerAlt /> },
          { name: 'Users', path: '/admin/users', icon: <FaUser /> },
          { name: 'Doctors', path: '/admin/doctors', icon: <FaUserMd /> },
          { name: 'Scheduling', path: '/admin/schedule', icon: <FaCalendarCheck /> },
          { name: 'Appointments', path: '/admin/appointments', icon: <FaCalendarAlt /> },
          { name: 'Billing', path: '/admin/billing', icon: <FaDollarSign /> },
          { name: 'Branch Mgmt', path: '/admin/branch-management', icon: <FaUsers /> },
          { name: 'Audit Logs', path: '/admin/audit-logs', icon: <FaFileAlt /> }
        ];
      default:
        return [];
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    dispatch(setUserInfo(null));
    navigate('/');
  };

  const navigation = getUserNavigation();

  return (
    <nav className="navbarWrapper_navbar">
      <div className="navbarWrapper_navContainer">
        {/* Brand */}
        <div className="navbarWrapper_navBrand">
          <NavLink to="/" className="navbarWrapper_navBrandLink">
            <FaStethoscope className="navbarWrapper_navBrandIcon" />
            <h2 className="navbarWrapper_navBrandTitle">HealthCare+</h2>
          </NavLink>
        </div>

        {/* Desktop Navigation */}
        {isAuthenticated ? (
          <div className="navbarWrapper_desktopNav">
            {navigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => 
                  `navbarWrapper_navLink ${isActive ? 'navbarWrapper_navLinkActive' : ''}`
                }
              >
                {item.icon}
                <span className="navbarWrapper_navLinkText">{item.name}</span>
              </NavLink>
            ))}
            
            {/* User Dropdown */}
            <div className="navbarWrapper_navUser">
              <button
                className="navbarWrapper_navLink navbarWrapper_navUserButton"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <span className="navbarWrapper_navUserName">{userInfo.firstname} {userInfo.lastname}</span>
                <span className="navbarWrapper_userRole">{userRole}</span>
              </button>
              
              {showDropdown && (
                <div className="navbarWrapper_dropdownMenu navbarWrapper_dropdownMenuShow">
                  <NavLink to="/profile" className="navbarWrapper_dropdownItem">
                    Profile
                  </NavLink>
                  <NavLink to="/notifications" className="navbarWrapper_dropdownItem">
                    Notifications
                  </NavLink>
                  <NavLink to="/changepassword" className="navbarWrapper_dropdownItem">
                    Change Password
                  </NavLink>
                  <div className="navbarWrapper_dropdownDivider"></div>
                  <button onClick={handleLogout} className="navbarWrapper_dropdownItem">
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Public Navigation */
          <div className="navbarWrapper_publicNav">
            <div className="navbarWrapper_navLinks">
              <NavLink to="/login" className="navbarWrapper_navLink">
                Login
              </NavLink>
              <NavLink to="/register" className="navbarWrapper_registerBtn">
                Register
              </NavLink>
            </div>
          </div>
        )}

        {/* Mobile Menu Toggle */}
        <button
          className="navbarWrapper_mobileMenuToggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          ☰
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <>
          <div 
            className="navbarWrapper_mobileOverlay navbarWrapper_mobileOverlayVisible"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="navbarWrapper_mobileNav navbarWrapper_mobileNavOpen">
            {isAuthenticated ? (
              <>
                {navigation.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className="navbarWrapper_mobileNavItem"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.icon}
                    <span className="navbarWrapper_mobileNavItemText">{item.name}</span>
                  </NavLink>
                ))}
                <div className="navbarWrapper_mobileNavDivider" />
                <NavLink 
                  to="/profile" 
                  className="navbarWrapper_mobileNavItem"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Profile
                </NavLink>
                <NavLink 
                  to="/notifications" 
                  className="navbarWrapper_mobileNavItem"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Notifications
                </NavLink>
                <button onClick={handleLogout} className="navbarWrapper_logoutBtn">
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink 
                  to="/login" 
                  className="navbarWrapper_mobileNavItem"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Login
                </NavLink>
                <NavLink 
                  to="/register" 
                  className="navbarWrapper_mobileNavItem"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Register
                </NavLink>
              </>
            )}
          </div>
        </>
      )}
    </nav>
  );
};

export default NavbarWrapper;