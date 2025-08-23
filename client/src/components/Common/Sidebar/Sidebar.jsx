import React from "react";
import {
  FaHome,
  FaList,
  FaUser,
  FaUserMd,
  FaUsers,
  FaEnvelope,
  FaCalendarAlt,
  FaChartLine,
  FaCalendarCheck,
  FaDollarSign,
} from "react-icons/fa";
import "../styles/sidebar.css";
import { NavLink, useNavigate } from "react-router-dom";
import { MdLogout } from "react-icons/md";
import { useDispatch } from "react-redux";
import { setUserInfo } from "../redux/reducers/rootSlice";

const Sidebar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const sidebar = [
    {
      name: "Dashboard",
      path: "/admin/dashboard",
      icon: <FaHome />,
    },
    {
      name: "Analytics",
      path: "/admin/analytics",
      icon: <FaChartLine />,
    },
    {
      name: "Users",
      path: "/admin/users",
      icon: <FaUsers />,
    },
    {
      name: "Doctors",
      path: "/admin/doctors",
      icon: <FaUserMd />,
    },
    {
      name: "Scheduling",
      path: "/admin/scheduling",
      icon: <FaCalendarCheck />,
    },
    {
      name: "Appointments",
      path: "/admin/appointments",
      icon: <FaList />,
    },
    {
      name: "Billing",
      path: "/admin/billing",
      icon: <FaDollarSign />,
    },
    {
      name: "Leave Management",
      path: "/admin/leave-management",
      icon: <FaCalendarAlt />,
    },
    {
      name: "Profile",
      path: "/profile",
      icon: <FaUser />,
    },
  ];

  const logoutFunc = () => {
    dispatch(setUserInfo({}));
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <>
      <section className="sidebar-section flex-center">
        <div className="sidebar-container">
          <ul>
            {sidebar.map((ele, i) => {
              return (
                <li key={i}>
                  {ele.icon}
                  <NavLink to={ele.path}>{ele.name}</NavLink>
                </li>
              );
            })}
          </ul>
          <div className="logout-container">
            <MdLogout />
            <p onClick={logoutFunc}>Logout</p>
          </div>
        </div>
      </section>
    </>
  );
};

export default Sidebar;
