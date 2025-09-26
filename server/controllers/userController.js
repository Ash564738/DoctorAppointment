const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Doctor = require("../models/doctorModel");
const Appointment = require("../models/appointmentModel");
const nodemailer = require("nodemailer");
const Notification = require("../models/notificationModel");
require("dotenv").config();

const getuser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (user && user.role === 'Doctor') {
      const doctorInfo = await Doctor.findOne({ userId: user._id });
      if (doctorInfo) {
        user._doc.doctorInfo = {
          specialization: doctorInfo.specialization,
          experience: doctorInfo.experience,
          fees: doctorInfo.fees,
          department: doctorInfo.department,
          isDoctor: doctorInfo.isDoctor
        };
      }
    }

    return res.send(user);
  } catch (error) {
    res.status(500).send("Unable to get user");
  }
};

const getallusers = async (req, res) => {
  try {
    const currentUser = await User.findById(req.locals);
    console.log('=== getallusers DEBUG ===');
    console.log('Current user:', {
      id: currentUser?._id,
      email: currentUser?.email,
      role: currentUser?.role,
      roleType: typeof currentUser?.role,
      roleLowercase: currentUser?.role?.toLowerCase()
    });
    const isAdmin = currentUser?.role?.toLowerCase() === 'admin';
    console.log('Is admin check:', isAdmin);
    let userQuery = User.find();
    if (!isAdmin) {
      console.log('Non-admin user, excluding current user from results');
      userQuery = userQuery.find({ _id: { $ne: req.locals } });
    } else {
      console.log('Admin user detected, including all users in results');
    }
    const users = await userQuery.select("-password");
    console.log('Found users count:', users.length);
    console.log('All users with roles:', users.map(u => ({ 
      id: u._id, 
      email: u.email, 
      role: u.role,
      roleType: typeof u.role 
    })));
    const usersWithDoctorStatus = await Promise.all(
      users.map(async (user) => {
        const doctorRecord = await Doctor.findOne({ userId: user._id });
        const userObj = user.toObject();
        let calculatedAge = userObj.age;
        if (userObj.dateOfBirth) {
          const today = new Date();
          const birthDate = new Date(userObj.dateOfBirth);
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          calculatedAge = age;
        }
        return {
          ...userObj,
          age: calculatedAge,
          isDoctor: doctorRecord ? doctorRecord.isDoctor : false
        };
      })
    );

    console.log('Final result count:', usersWithDoctorStatus.length);
    console.log('Role distribution:', {
      admin: usersWithDoctorStatus.filter(u => u.role?.toLowerCase() === 'admin').length,
      doctor: usersWithDoctorStatus.filter(u => u.role?.toLowerCase() === 'doctor').length,
      patient: usersWithDoctorStatus.filter(u => u.role?.toLowerCase() === 'patient').length
    });
    console.log('=== END DEBUG ===');
    
    return res.send(usersWithDoctorStatus);
  } catch (error) {
    console.error('Error in getallusers:', error);
    res.status(500).send("Unable to get all users");
  }
};

const login = async (req, res) => {
  try {
    console.log('Login attempt:', {
      email: req.body.email,
      hasPassword: !!req.body.password,
      passwordLength: req.body.password?.length || 0,
      body: req.body
    });

    // Add this check for missing fields
    if (!req.body.email || !req.body.password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const emailPresent = await User.findOne({ email: req.body.email }).select('+password');
    if (!emailPresent) {
      console.log('User not found:', req.body.email);
      return res.status(400).json({
        success: false,
        message: "Incorrect credentials"
      });
    }

    console.log('User found:', {
      id: emailPresent._id,
      email: emailPresent.email,
      role: emailPresent.role,
      hasPassword: !!emailPresent.password,
      passwordLength: emailPresent.password?.length || 0,
      user: emailPresent.toObject()
    });

    console.log('Attempting password verification:', {
      hasProvidedPassword: !!req.body.password,
      providedPasswordLength: req.body.password?.length || 0,
      hasStoredHash: !!emailPresent.password,
      storedHashLength: emailPresent.password?.length || 0
    });

    const verifyPass = await bcrypt.compare(
      req.body.password,
      emailPresent.password
    );
    
    console.log('Password verification:', {
      email: emailPresent.email,
      verified: verifyPass,
      passwordMatch: verifyPass
    });

    if (!verifyPass) {
      return res.status(400).json({
        success: false,
        message: "Incorrect credentials"
      });
    }

    const token = jwt.sign(
      { 
        userId: emailPresent._id, 
        isAdmin: emailPresent.isAdmin, 
        role: emailPresent.role,
        firstname: emailPresent.firstname,
        lastname: emailPresent.lastname,
        email: emailPresent.email
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "2 days",
      }
    );

    return res.status(201).json({
      success: true,
      message: "User logged in successfully",
      token
    });
  } catch (error) {
    console.error('Login error:', error.message);
    console.error('Request body:', req.body);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: "Unable to login user"
    });
  }
};

const register = async (req, res) => {
  try {
    // Prevent public registration of Admin users
    if (req.body.role === 'Admin') {
      return res.status(403).json({
        success: false,
        message: "Admin registration is not allowed. Contact system administrator."
      });
    }    // Check if email already exists
    const emailPresent = await User.findOne({ email: req.body.email });
    if (emailPresent) {
      // Delete the existing user with corrupted password and recreate
      await User.deleteOne({ email: req.body.email });
    }

    // Create user object (password will be hashed automatically by the model)
    const userData = { ...req.body };
    console.log('Registering user with password (should be plain text):', userData.password);

    const user = new User(userData);
    const result = await user.save();

    console.log('User saved. Password hash in DB:', result.password);

    // If user is registering as a doctor, create doctor profile
    if (req.body.role === 'Doctor' && req.body.doctorInfo) {
      try {
        const Doctor = require('../models/doctorModel');
        const doctorData = {
          userId: result._id,
          specialization: req.body.doctorInfo.specialization,
          experience: req.body.doctorInfo.experience,
          fees: req.body.doctorInfo.fees,
          department: req.body.doctorInfo.department, // required
          isDoctor: false // Will be set to true when admin approves
        };

        const doctor = new Doctor(doctorData);
        await doctor.save();

        // Remove the duplicate creation of newDoctor (not needed)
      } catch (doctorError) {
        console.error('Error creating doctor profile:', doctorError);
        // Don't fail the registration if doctor profile creation fails
        // Admin can handle this manually
      }
    }

    // --- Notify user after registration ---
    await Notification.create({
      userId: result._id,
      content: `Welcome to the platform, ${result.firstname || 'User'}! Your registration was successful.`
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      userId: result._id
    });
  } catch (error) {
    console.error('Registration error:', error.message);

    // Check if it's a validation error
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      message: "Unable to register user",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const updateprofile = async (req, res) => {
  try {
    // Remove password fields from the update data
    const { password, confpassword, ...updateData } = req.body;

    // Find the user first to see current state
    const currentUser = await User.findById(req.locals);

    const result = await User.findByIdAndUpdate(
      req.locals,
      updateData,
      { new: true, runValidators: true }
    );

    if (!result) {
      return res.status(500).send("Unable to update user");
    }

    // If doctorInfo is present, update Doctor model as well
    if (req.body.doctorInfo) {
      await Doctor.findOneAndUpdate(
        { userId: req.locals },
        {
          specialization: req.body.doctorInfo.specialization,
          experience: req.body.doctorInfo.experience,
          fees: req.body.doctorInfo.fees,
          department: req.body.doctorInfo.department
        },
        { new: true, runValidators: true }
      );
    }

    // Clear cache for this user
    const { invalidateUserCache } = require('../middleware/cache');
    invalidateUserCache(req.locals);

    return res.status(201).send("User updated successfully");
  } catch (error) {
    console.error('Profile update error:', error);
    console.error('Error details:', error.message);
    if (error.name === 'ValidationError') {
      console.error('Validation errors:', error.errors);
    }
    res.status(500).send(`Unable to update user: ${error.message}`);
  }
};
const changepassword = async (req, res) => {
  try {
    console.log(req.body);
    const { userId, currentPassword, newPassword, confirmNewPassword } = req.body;
    // console.log("Received newPassword:", newPassword); 
    if (newPassword !== confirmNewPassword) {
      return res.status(400).send("Passwords do not match");
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found");
    }

    const isPasswordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordMatch) {
      return res.status(400).send("Incorrect current password");
    }

    const saltRounds = 10;
    // console.log("Using saltRounds:", saltRounds); 

    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
    // console.log("Hashed new password:", hashedNewPassword); 

    user.password = hashedNewPassword;
    await user.save();

    // --- Notify user after password change ---
    await Notification.create({
      userId: user._id,
      content: "Your password was changed successfully."
    });

    return res.status(200).send("Password changed successfully");
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
};



const deleteuser = async (req, res) => {
  try {
    const userId = req.params.id || req.body.userId;
    if (!userId) {
      return res.status(400).send("User ID is required");
    }
    const result = await User.findByIdAndDelete(userId);
    const removeDoc = await Doctor.findOneAndDelete({
      userId: userId,
    });
    const removeAppoint = await Appointment.findOneAndDelete({
      userId: userId,
    });
    return res.send("User deleted successfully");
  } catch (error) {
    res.status(500).send("Unable to delete user");
  }
};

const forgotpassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    // console.log(user,email);
    if (!user) {
      return res.status(404).send({ status: "User not found" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1m" });
// console.log(token)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "tarun.kumar.csbs25@heritageit.edu.in",
        pass: "qfhv wohg gjtf ikvz", 
      },
    });
    // console.log(transporter);

    const mailOptions = {
      from: "tarun.kumar.csbs25@heritageit.edu.in",
      to: email,
      subject: "Reset Password Link",
      text: `https://appointmentdoctor.netlify.app/resetpassword/${user._id}/${token}`,
    };
    // console.log(mailOptions);

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        return res.status(500).send({ status: "Error sending email" });
      } else {
        return res.status(200).send({ status: "Email sent successfully" });
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ status: "Internal Server Error" });
  }
};

const resetpassword = async (req, res) => {
  try {
    const { id, token } = req.params;
    const { password } = req.body;
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        console.log(err);
        return res.status(400).send({ error: "Invalid or expired token" });
      }
     
      try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.findByIdAndUpdate(id, { password: hashedPassword });
        return res.status(200).send({ success: "Password reset successfully" });
      } catch (updateError) {
        console.error("Error updating password:", updateError);
        return res.status(500).send({ error: "Failed to update password" });
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ error: "Internal Server Error" });
  }
};


const updatedoctorinfo = async (req, res) => {
  try {
    const { specialization, experience, fees, department } = req.body;
    const userId = req.locals;

    // Validate required fields
    if (!specialization || !experience || !fees || !department) {
      return res.status(400).json({
        success: false,
        message: "All doctor fields are required"
      });
    }

    // Validate numeric fields
    if (isNaN(experience) || experience < 0) {
      return res.status(400).json({
        success: false,
        message: "Experience must be a valid positive number"
      });
    }

    if (isNaN(fees) || fees < 0) {
      return res.status(400).json({
        success: false,
        message: "Fees must be a valid positive number"
      });
    }

    // Check if user exists and is a doctor
    const user = await User.findById(userId);
    if (!user || user.role !== 'Doctor') {
      return res.status(403).json({
        success: false,
        message: "Only doctors can update doctor information"
      });
    }

    // Update doctor information
    const Doctor = require('../models/doctorModel');
    const updatedDoctor = await Doctor.findOneAndUpdate(
      { userId: userId },
      {
        specialization,
        experience: parseInt(experience),
        fees: parseInt(fees),
        department
      },
      { new: true }
    );

    if (!updatedDoctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor profile not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Doctor information updated successfully",
      doctorInfo: {
        specialization: updatedDoctor.specialization,
        experience: updatedDoctor.experience,
        fees: updatedDoctor.fees,
        department: updatedDoctor.department,
        isDoctor: updatedDoctor.isDoctor
      }
    });
  } catch (error) {
    console.error('Update doctor info error:', error);
    res.status(500).json({
      success: false,
      message: "Unable to update doctor information"
    });
  }
};

const adminUpdateUser = async (req, res) => {
  try {
    // Check if the current user is an admin
    const currentUser = await User.findById(req.locals);
    if (currentUser?.role?.toLowerCase() !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required."
      });
    }

    const userId = req.params.id;
    const updateData = req.body;

    // Remove sensitive fields that shouldn't be updated this way
    const { password, confpassword, _id, __v, ...safeUpdateData } = updateData;

    // Find and update the user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      safeUpdateData,
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Clear cache for the updated user
    const { invalidateUserCache } = require('../middleware/cache');
    invalidateUserCache(userId);

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: updatedUser
    });
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({
      success: false,
      message: `Unable to update user: ${error.message}`
    });
  }
};

module.exports = {
  getuser,
  getallusers,
  login,
  register,
  updateprofile,
  deleteuser,
  changepassword,
  forgotpassword,
  resetpassword,
  updatedoctorinfo,
  adminUpdateUser,
};