const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided."
      });
    }

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Invalid token format."
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided."
      });
    }

    const verifyToken = jwt.verify(token, process.env.JWT_SECRET);

    if (!verifyToken) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Invalid token."
      });
    }

    // Debug: log the decoded token
    console.log('[AUTH DEBUG] Decoded JWT:', verifyToken);

    req.locals = verifyToken.userId;
    req.user = verifyToken;
    // Ensure _id is set for compatibility with controllers
    if (!req.user._id && verifyToken.userId) {
      req.user._id = verifyToken.userId;
    }
    req.userId = verifyToken.userId;

    // Debug: log the req.user after assignment
    console.log('[AUTH DEBUG] req.user after assignment:', req.user);

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: "Access denied. Token expired."
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: "Access denied. Invalid token."
      });
    }

    console.error("Auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

module.exports = auth;
