const User = require('../models/userModel');
const jwt = require('jsonwebtoken');

exports.getAllUsers = async (req, res) => {
    try {
        // Quick token extraction and verification
        const token = req.headers.authorization?.split(' ')[1] || req.cookies?.jwt;
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: "Login required" 
            });
        }

        // Simple token verification
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get users excluding the current user
        const users = await User.find({ 
            _id: { $ne: decoded.userId } 
        }, "username");

        res.status(200).json({ 
            success: true, 
            users 
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                message: "Invalid or expired token" 
            });
        }

        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};
