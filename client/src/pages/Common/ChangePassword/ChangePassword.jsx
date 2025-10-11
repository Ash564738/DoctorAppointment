import React, { useEffect, useState } from "react";
import "./ChangePassword.css";
import Footer from "../../../components/Common/Footer/Footer";
import NavbarWrapper from "../../../components/Common/NavbarWrapper/NavbarWrapper";
import toast from "react-hot-toast";
import { setLoading } from "../../../redux/reducers/rootSlice";
import { useDispatch, useSelector } from "react-redux";
import Loading from "../../../components/Common/Loading/Loading";
import fetchData, { apiCall } from "../../../helper/apiCall";
import { jwtDecode } from "jwt-decode";

function ChangePassword() {
  const { userId } = jwtDecode(localStorage.getItem("token"));
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.root);
  const [file, setFile] = useState("");
  const [formDetails, setFormDetails] = useState({
    password: "",
    newpassword: "",
    confnewpassword: "",
  });

  const getUser = async () => {
    try {
      dispatch(setLoading(true));
      const temp = await fetchData(`/user/getuser/${userId}`);
      setFormDetails({
        password: "",
        newpassword: "",
        confnewpassword: "",
      });
      setFile(temp.pic || "");
      dispatch(setLoading(false));
    } catch (error) {
      console.error("Error fetching user data:", error);
      dispatch(setLoading(false));
    }
  };

  useEffect(() => {
    getUser();
  }, [dispatch]);

  const inputChange = (e) => {
    const { name, value } = e.target;
    setFormDetails({
      ...formDetails,
      [name]: value,
    });
  };

  const formSubmit = async (e) => {
    e.preventDefault();
    const { password, newpassword, confnewpassword } = formDetails;
    // console.log(formDetails);
    if (newpassword !== confnewpassword) {
      return toast.error("Passwords do not match");
    }

    try {
      const response = await apiCall.put(
        "/user/changepassword",
        {
          userId: userId,
          currentPassword: password,
          newPassword: newpassword,
          confirmNewPassword: confnewpassword,
        }
      );

      if (response === "Password changed successfully") {
        toast.success("Password updated successfully");
        setFormDetails({
          ...formDetails,
          password: "",
          newpassword: "",
          confnewpassword: "",
        });
      } else {
        toast.error("Unable to update password");
      }
    } catch (error) {
      console.error("Error updating password:", error);
      if (error.response?.data) {
        toast.error(error.response.data);
      } else {
        toast.error("Network error. Please try again.");
      }
    }
  };

  return (
    <>
      <NavbarWrapper />
      {loading ? (
        <Loading />
      ) : (
        <section className="changePassword_container">
          <div className="changePassword_content">
            <div className="changePassword_header">
              <h2 className="changePassword_title">Change Password</h2>
              <img src={file} alt="profile" className="changePassword_profilePic" />
            </div>
            <form onSubmit={formSubmit} className="changePassword_form">
              <div className="changePassword_formGroup">
                <label className="changePassword_label">Current Password</label>
                <input
                  type="password"
                  name="password"
                  className="changePassword_input"
                  placeholder="Enter your current password"
                  value={formDetails.password}
                  onChange={inputChange}
                  required
                />
              </div>
              <div className="changePassword_formRow">
                <div className="changePassword_formGroup">
                  <label className="changePassword_label">New Password</label>
                  <input
                    type="password"
                    name="newpassword"
                    className="changePassword_input"
                    placeholder="Enter your new password"
                    value={formDetails.newpassword}
                    onChange={inputChange}
                    required
                  />
                </div>
                <div className="changePassword_formGroup">
                  <label className="changePassword_label">Confirm New Password</label>
                  <input
                    type="password"
                    name="confnewpassword"
                    className="changePassword_input"
                    placeholder="Confirm your new password"
                    value={formDetails.confnewpassword}
                    onChange={inputChange}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="changePassword_submitButton">
                Update Password
              </button>
              
              <div className="changePassword_securityTips">
                <h4 className="changePassword_securityTitle">Password Security Tips:</h4>
                <ul className="changePassword_securityList">
                  <li className="changePassword_securityItem">Use at least 8 characters</li>
                  <li className="changePassword_securityItem">Include uppercase and lowercase letters</li>
                  <li className="changePassword_securityItem">Add numbers and special characters</li>
                  <li className="changePassword_securityItem">Avoid using personal information</li>
                  <li className="changePassword_securityItem">Don't reuse old passwords</li>
                </ul>
              </div>
            </form>
          </div>
        </section>
      )}
      <Footer />
    </>
  );
}

export default ChangePassword;
