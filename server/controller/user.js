const User = require('../models/userModel');
const jwt = require('jsonwebtoken');

exports.getAllUsers = async (req, res) => {
    try {
        // Debug logging for iOS Safari
        console.log('=== getAllUsers Debug Info ===');
        console.log('User-Agent:', req.headers['user-agent']);
        console.log('Authorization Header:', req.headers.authorization);
        console.log('Cookies:', req.cookies);
        console.log('All Headers:', JSON.stringify(req.headers, null, 2));
        
        // Check for token in multiple places
        let token = null;
        let tokenSource = 'none';
        
        // Check Authorization header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
            tokenSource = 'header';
        }
        // Check cookies
        else if (req.cookies && req.cookies.jwt) {
            token = req.cookies.jwt;
            tokenSource = 'cookie';
        }
        // Check for custom header (add this for iOS Safari fallback)
        else if (req.headers['x-auth-token']) {
            token = req.headers['x-auth-token'];
            tokenSource = 'custom-header';
        }
        
        console.log('Token found:', !!token, 'Source:', tokenSource);
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: "Login required",
                debug: {
                    hasAuthHeader: !!req.headers.authorization,
                    hasCookies: !!req.cookies,
                    cookieKeys: req.cookies ? Object.keys(req.cookies) : [],
                    userAgent: req.headers['user-agent']
                }
            });
        }

        // Clean token
        token = token.trim();
        console.log('Token length:', token.length);
        console.log('Token preview:', token.substring(0, 20) + '...');

        // Simple token verification
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Token verified for user:', decoded.userId);
        
        // Get users excluding the current user
        const users = await User.find({ 
            _id: { $ne: decoded.userId } 
        }, "username");

        console.log('Found users:', users.length);
        
        res.status(200).json({ 
            success: true, 
            users 
        });

    } catch (error) {
        console.error('getAllUsers error:', error);
        
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                message: "Invalid or expired token",
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};
