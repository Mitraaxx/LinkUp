const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

exports.isLogin = async (req, res, next) => {
    try {
        let token;

        // step 1
        // Check Authorization header first, then cookies
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies.jwt) {
            token = req.cookies.jwt;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        // step 2
        // Clean and validate token format
        token = token.trim();
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
            // If header token is invalid, try cookie as fallback
            if (req.headers.authorization && req.cookies.jwt) {
                token = req.cookies.jwt.trim();
                const cookieParts = token.split('.');
                if (cookieParts.length !== 3) {
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid token format'
                    });
                }
            } else {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid token format'
                });
            }
        }

        // step 3
        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // step 4
        // Get user from database
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token. User not found.'
            });
        }

        // step 5
        // Attach user to request object
        req.user = user;
        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error during authentication'
        });
    }
};