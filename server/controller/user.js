const User = require('../models/userModel');
const jwt = require('jsonwebtoken');

exports.getAllUsers = async (req, res) => {
    try {
        console.log('User-Agent:', req.headers['user-agent']);
        console.log('Authorization Header:', req.headers.authorization);

        // Get token from Authorization header
        let token = null;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: "Access denied. No token provided." 
            });
        }

        token = token.trim();
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const users = await User.find({ 
            _id: { $ne: decoded.userId } 
        }, "username");

        res.status(200).json({ 
            success: true, 
            users 
        });

    } catch (error) {
        console.error('getAllUsers error:', error);

        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                message: "Invalid or expired token" 
            });
        }

        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};
