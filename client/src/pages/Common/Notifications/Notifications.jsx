import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Empty from "../../../components/Common/Empty/Empty";
import Footer from "../../../components/Common/Footer/Footer";
import NavbarWrapper from "../../../components/Common/NavbarWrapper/NavbarWrapper";
import fetchData, { apiCall } from "../../../helper/apiCall";
import { setLoading } from "../../../redux/reducers/rootSlice";
import Loading from "../../../components/Common/Loading/Loading";
import "./Notifications.css";
// axios import removed; using unified apiCall helper
import toast from "react-hot-toast";
import axios from "axios";

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const notificationsPerPage = 8;
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.root);

  const getAllNotif = async () => {
    try {
      dispatch(setLoading(true));
      const temp = await fetchData(`/notification/getallnotifs?page=${currentPage - 1}&limit=${notificationsPerPage}`);
      dispatch(setLoading(false));
      setNotifications(temp);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const clearAllNotifications = async () => {
    try {
      dispatch(setLoading(true));
      await axios.delete("/notification/clearallnotifs", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setNotifications([]);
      dispatch(setLoading(false));
      toast.success("All notifications cleared successfully");
    } catch (error) {
      dispatch(setLoading(false));
      toast.error("Failed to clear notifications");
      console.error("Error clearing notifications:", error);
    }
  };

  useEffect(() => {
    getAllNotif();
  }, [currentPage]);

  const totalPages = Math.ceil(notifications.length / notificationsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const renderPagination = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <button 
          key={i} 
          onClick={() => handlePageChange(i)}
          className={`notifications_paginationButton ${currentPage === i ? 'notifications_paginationButton--active' : ''}`}
        >
          {i}
        </button>
      );
    }
    return pages;
  };

  const paginatedNotifications = notifications.slice(
    (currentPage - 1) * notificationsPerPage,
    currentPage * notificationsPerPage
  );

  return (
    <>
      <NavbarWrapper />
      {loading ? (
        <Loading />
      ) : (
        <section className="notifications_container">
          <div className="notifications_content">
            <div className="notifications_header">
              <h2 className="notifications_title">Your Notifications</h2>
              {notifications.length > 0 && (
                <button
                  onClick={clearAllNotifications}
                  className="notifications_clearButton"
                >
                  Clear All Notifications
                </button>
              )}
            </div>

            {notifications.length > 0 ? (
              <div className="notifications_section">
                <div className="notifications_tableContainer">
                  <table className="notifications_table">
                    <thead className="notifications_tableHeader">
                      <tr>
                        <th className="notifications_headerCell">S.No</th>
                        <th className="notifications_headerCell">Content</th>
                        <th className="notifications_headerCell">Date</th>
                        <th className="notifications_headerCell">Time</th>
                      </tr>
                    </thead>
                    <tbody className="notifications_tableBody">
                      {paginatedNotifications.map((ele, i) => (
                        <tr key={ele?._id} className="notifications_tableRow">
                          <td className="notifications_tableCell">
                            {(currentPage - 1) * notificationsPerPage + i + 1}
                          </td>
                          <td className="notifications_tableCell notifications_content">
                            {ele?.content}
                          </td>
                          <td className="notifications_tableCell">
                            {ele?.updatedAt.split("T")[0]}
                          </td>
                          <td className="notifications_tableCell">
                            {ele?.updatedAt.split("T")[1].split(".")[0]}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="notifications_pagination">
                    {renderPagination()}
                  </div>
                )}
              </div>
            ) : (
              <div className="notifications_emptyState">
                <Empty />
              </div>
            )}
          </div>
        </section>
      )}
      <Footer />
    </>
  );
};

export default Notifications;
