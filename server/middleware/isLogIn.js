const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

exports.isLogin = async (req, res, next) => {
  try {
    let token;

    // ✅ 1. Try Authorization Header first
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    // ✅ 2. Fallback to Cookie if no header token
    if (!token && req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    // ✅ 3. Validate token format (must have 3 parts)
    const parts = token.trim().split(".");
    if (parts.length !== 3) {
      return res.status(401).json({
        success: false,
        message: "Invalid token format",
      });
    }

    // ✅ 4. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid token. User not found.",
      });
    }

    // ✅ 5. Attach user to req
    req.user = user;
    next();

  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      });
    }

    console.error("Auth Middleware Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during authentication",
    });
  }
};
