import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Badge, Button, Dropdown, Menu } from 'antd';
import fetchData from '../helper/apiCall';
import { 
  MenuOutlined, 
  CloseOutlined,
  DashboardOutlined,
  UserOutlined,
  CalendarOutlined,
  TeamOutlined,
  SettingOutlined,
  NotificationOutlined,
  LogoutOutlined,
  ScheduleOutlined,
  FileTextOutlined,
  UserAddOutlined,
  ToolOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { setUserInfo } from '../redux/reducers/rootSlice';
import '../styles/enhanced-navbar.css';

const EnhancedNavbar = () => {
  const { userInfo: user } = useSelector(state => state.root);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Fetch notifications count
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const response = await fetchData('/notification/getallnotifs');
      if (response) {
        setNotifications(response || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    dispatch(setUserInfo(null));
    navigate('/login');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  // Navigation items based on user role
  const getNavigationItems = () => {
    if (!user) return [];

    const commonItems = [
      {
        key: 'dashboard',
        icon: <DashboardOutlined />,
        label: 'Dashboard',
        path: '/dashboard'
      },
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: 'Profile',
        path: '/profile'
      },
      {
        key: 'notifications',
        icon: <NotificationOutlined />,
        label: 'Notifications',
        path: '/notifications',
        badge: notifications.length
      }
    ];

    let roleSpecificItems = [];

    if (user.role === 'Patient') {
      roleSpecificItems = [
        {
          key: 'doctors',
          icon: <TeamOutlined />,
          label: 'Find Doctors',
          path: '/doctors'
        },
        {
          key: 'book-appointment',
          icon: <CalendarOutlined />,
          label: 'Book Appointment',
          path: '/book-appointment'
        },
        {
          key: 'appointments',
          icon: <ScheduleOutlined />,
          label: 'My Appointments',
          path: '/my-appointments'
        },
        {
          key: 'medical-records',
          icon: <FileTextOutlined />,
          label: 'Medical Records',
          path: '/my-medical-records'
        },
        {
          key: 'apply-doctor',
          icon: <UserAddOutlined />,
          label: 'Apply as Doctor',
          path: '/apply-doctor'
        }
      ];
    } else if (user.role === 'Doctor') {
      roleSpecificItems = [
        {
          key: 'appointments',
          icon: <ScheduleOutlined />,
          label: 'Appointments',
          path: '/doctor-appointments'
        },
        {
          key: 'shift-management',
          icon: <ClockCircleOutlined />,
          label: 'Shift Management',
          path: '/shift-management'
        },
        {
          key: 'patient-records',
          icon: <FileTextOutlined />,
          label: 'Patient Records',
          path: '/patient-records'
        },
        {
          key: 'leave-requests',
          icon: <CalendarOutlined />,
          label: 'Leave Management',
          path: '/leave-requests'
        }
      ];
    } else if (user.role === 'Admin') {
      roleSpecificItems = [
        {
          key: 'admin-dashboard',
          icon: <DashboardOutlined />,
          label: 'Admin Dashboard',
          path: '/admin/dashboard'
        },
        {
          key: 'applications',
          icon: <UserAddOutlined />,
          label: 'Doctor Applications',
          path: '/admin/applications'
        },
        {
          key: 'users',
          icon: <TeamOutlined />,
          label: 'Manage Users',
          path: '/admin/users'
        },
        {
          key: 'doctors',
          icon: <UserOutlined />,
          label: 'Manage Doctors',
          path: '/admin/doctors'
        },
        {
          key: 'admin-appointments',
          icon: <ScheduleOutlined />,
          label: 'All Appointments',
          path: '/admin/appointments'
        },
        {
          key: 'leave-management',
          icon: <ToolOutlined />,
          label: 'Leave Management',
          path: '/admin/leave-management'
        }
      ];
    }

    return [...commonItems, ...roleSpecificItems];
  };

  const userMenu = (
    <Menu>
      <Menu.Item key="profile" icon={<UserOutlined />}>
        <Link to="/profile">Profile</Link>
      </Menu.Item>
      <Menu.Item key="change-password" icon={<SettingOutlined />}>
        <Link to="/change-password">Change Password</Link>
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
        Logout
      </Menu.Item>
    </Menu>
  );

  if (!user) {
    return (
      <nav className="enhanced-navbar public-nav">
        <div className="nav-container">
          <div className="nav-brand">
            <Link to="/">
              <h2>DocCare</h2>
            </Link>
          </div>
          <div className="nav-links">
            <Link to="/login" className="nav-link">Login</Link>
            <Link to="/register" className="nav-link register-btn">Register</Link>
          </div>
        </div>
      </nav>
    );
  }

  const navigationItems = getNavigationItems();

  return (
    <nav className="enhanced-navbar">
      <div className="nav-container">
        {/* Brand */}
        <div className="nav-brand">
          <Link to="/dashboard">
            <h2>DocCare</h2>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="nav-links desktop-nav">
          {navigationItems.map(item => (
            <Link
              key={item.key}
              to={item.path}
              className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
            >
              {item.badge > 0 ? (
                <Badge count={item.badge} size="small">
                  {item.icon}
                  <span>{item.label}</span>
                </Badge>
              ) : (
                <>
                  {item.icon}
                  <span>{item.label}</span>
                </>
              )}
            </Link>
          ))}
        </div>

        {/* User Menu */}
        <div className="nav-user">
          <Dropdown menu={{ items: userMenu.props.children.map(child => ({
            key: child.key || Math.random(),
            label: child.props.children,
            onClick: child.props.onClick
          })) }} placement="bottomRight" trigger={['click']}>
            <Button type="text" className="user-btn">
              <UserOutlined />
              <span className="user-name">
                {user.firstname} {user.lastname}
              </span>
              <span className="user-role">({user.role})</span>
            </Button>
          </Dropdown>
        </div>

        {/* Mobile Menu Toggle */}
        <Button
          type="text"
          className="mobile-menu-toggle"
          onClick={toggleMenu}
          icon={isMenuOpen ? <CloseOutlined /> : <MenuOutlined />}
        />
      </div>

      {/* Mobile Navigation */}
      <div className={`mobile-nav ${isMenuOpen ? 'open' : ''}`}>
        <div className="mobile-nav-content">
          {navigationItems.map(item => (
            <Link
              key={item.key}
              to={item.path}
              className={`mobile-nav-link ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              {item.badge > 0 ? (
                <Badge count={item.badge} size="small">
                  {item.icon}
                  <span>{item.label}</span>
                </Badge>
              ) : (
                <>
                  {item.icon}
                  <span>{item.label}</span>
                </>
              )}
            </Link>
          ))}
          
          <div className="mobile-nav-divider" />
          
          <Link
            to="/profile"
            className="mobile-nav-link"
            onClick={() => setIsMenuOpen(false)}
          >
            <UserOutlined />
            <span>Profile</span>
          </Link>
          
          <Link
            to="/change-password"
            className="mobile-nav-link"
            onClick={() => setIsMenuOpen(false)}
          >
            <SettingOutlined />
            <span>Change Password</span>
          </Link>
          
          <button
            className="mobile-nav-link logout-btn"
            onClick={() => {
              setIsMenuOpen(false);
              handleLogout();
            }}
          >
            <LogoutOutlined />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {isMenuOpen && <div className="mobile-overlay" onClick={toggleMenu} />}
    </nav>
  );
};

export default EnhancedNavbar;
