const express = require("express");
const auth = require("../middleware/auth");
const userController = require("../controllers/userController");
const { cacheMiddleware } = require("../middleware/cache");
const { validateUserRegistration, validateUserLogin } = require("../middleware/validation");
const userRouter = express.Router();

userRouter.get("/getuser/:id", auth, cacheMiddleware(300), userController.getuser);

userRouter.get("/getallusers", auth, cacheMiddleware(180), userController.getallusers);

userRouter.post("/login", validateUserLogin, userController.login);

userRouter.post("/register", validateUserRegistration, userController.register);

userRouter.post("/forgotpassword", userController.forgotpassword);

userRouter.post("/resetpassword/:id/:token", userController.resetpassword);

userRouter.put("/updateprofile", auth, userController.updateprofile);

userRouter.put("/changepassword", auth, userController.changepassword);

userRouter.put("/updatedoctorinfo", auth, userController.updatedoctorinfo);

userRouter.delete("/deleteuser", auth, userController.deleteuser);


module.exports = userRouter;
