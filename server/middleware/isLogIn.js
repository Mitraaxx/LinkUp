const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

exports.isLogin = async (req, res, next) => {
    try {
        let token;
        
        // Step 1: Get token from Authorization header or cookies
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

        // Step 2: Clean token (remove any whitespace)
        token = token.trim();

        // Step 3: Verify JWT token (let jwt.verify handle format validation)
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Step 4: Get user from database
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token. User not found.'
            });
        }

        // Step 5: Attach user to request object
        req.user = user;
        next();

    } catch (error) {
        console.error('Authentication error:', error);
        
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
        
        // Handle malformed token errors
        if (error.message && error.message.includes('malformed')) {
            return res.status(401).json({
                success: false,
                message: 'Malformed token'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server error during authentication'
        });
    }
};
