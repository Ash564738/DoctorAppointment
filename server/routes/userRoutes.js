const express = require("express");
const auth = require("../middleware/auth");
const userController = require("../controllers/userController");
const { cacheMiddleware } = require("../middleware/cache");
const {
  validateUserRegistration,
  validateUserLogin,
} = require("../middleware/validation");

const userRouter = express.Router();

// Get user by ID
userRouter.get("/getuser/:id", auth, cacheMiddleware(300), userController.getuser);

// Get all users
userRouter.get("/getallusers", auth, cacheMiddleware(180), userController.getallusers);

// User authentication
userRouter.post("/login", validateUserLogin, userController.login);
userRouter.post("/register", validateUserRegistration, userController.register);

// Password management
userRouter.post("/forgotpassword", userController.forgotpassword);
userRouter.post("/resetpassword/:id/:token", userController.resetpassword);

// Profile management
userRouter.put("/updateprofile", auth, userController.updateprofile);
userRouter.put("/changepassword", auth, userController.changepassword);

// Doctor info update
userRouter.put("/updatedoctorinfo", auth, userController.updatedoctorinfo);

// Admin update user
userRouter.put("/admin-update/:id", auth, userController.adminUpdateUser);

// Delete user
userRouter.delete("/deleteuser/:id", auth, userController.deleteuser);

module.exports = userRouter;
