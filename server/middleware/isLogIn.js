const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

exports.isLogin = async (req, res, next) => {
    try {
        let token;
        
        // Debug logging for iPhone issues
        console.log('=== AUTH DEBUG ===');
        console.log('User-Agent:', req.headers['user-agent']);
        console.log('Has Authorization header:', !!req.headers.authorization);
        console.log('Has jwt cookie:', !!req.cookies?.jwt);
        
        // Step 1: Get token from Authorization header or cookies
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
            console.log('Token from header, length:', token?.length);
        } else if (req.cookies?.jwt) {
            token = req.cookies.jwt;
            console.log('Token from cookie, length:', token?.length);
        }

        if (!token) {
            console.log('No token found');
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        // Step 2: Clean token and validate it exists
        token = token?.trim();
        
        if (!token || token === 'undefined' || token === 'null') {
            console.log('Token is empty or invalid after trim');
            return res.status(401).json({
                success: false,
                message: 'Invalid token provided.'
            });
        }

        console.log('About to verify token, first 20 chars:', token.substring(0, 20));

        // Step 3: Verify JWT token (let jwt.verify handle format validation)
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        console.log('Token verified successfully, userId:', decoded.userId);
        
        // Step 4: Get user from database
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            console.log('User not found for userId:', decoded.userId);
            return res.status(401).json({
                success: false,
                message: 'Invalid token. User not found.'
            });
        }

        console.log('User found:', user._id);
        console.log('=== AUTH SUCCESS ===');

        // Step 5: Attach user to request object
        req.user = user;
        next();

    } catch (error) {
        console.error('=== AUTH ERROR ===');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Full error:', error);
        console.error('==================');
        
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
