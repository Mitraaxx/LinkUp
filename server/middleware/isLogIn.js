const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

exports.isLogin = async (req, res, next) => {
    try {
        let token;

        // Debug logging for iOS Safari
        console.log('Headers:', req.headers.authorization);
        console.log('Cookies:', req.cookies);
        console.log('User-Agent:', req.headers['user-agent']);

        // Check Authorization header first, then cookies
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
            console.log('Token from header:', token ? 'Found' : 'Not found');
        } else if (req.cookies && req.cookies.jwt) {
            token = req.cookies.jwt;
            console.log('Token from cookie:', token ? 'Found' : 'Not found');
        }

        if (!token) {
            console.log('No token found in headers or cookies');
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.',
                debug: {
                    hasAuthHeader: !!req.headers.authorization,
                    hasCookies: !!req.cookies,
                    cookieKeys: req.cookies ? Object.keys(req.cookies) : []
                }
            });
        }

        // Clean and validate token format
        token = token.trim();
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
            console.log('Invalid token format:', tokenParts.length, 'parts');
            // If header token is invalid, try cookie as fallback
            if (req.headers.authorization && req.cookies && req.cookies.jwt) {
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

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Token verified successfully for user:', decoded.userId);
        
        // Get user from database
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            console.log('User not found for ID:', decoded.userId);
            return res.status(401).json({
                success: false,
                message: 'Invalid token. User not found.'
            });
        }

        // Attach user to request object
        req.user = user;
        console.log('Authentication successful for user:', user.username);
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

        res.status(500).json({
            success: false,
            message: 'Server error during authentication'
        });
    }
};
