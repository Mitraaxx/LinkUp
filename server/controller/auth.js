const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { jwtToken } = require('../utils/jwtToken');

exports.Signup = async(req, res) => {
    try {
        const { username, password } = req.body;
        
        // Validate input
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Username and password are required"
            });
        }

        const user = await User.findOne({ username });

        if (user) {
            return res.status(409).json({ // 409 Conflict is more appropriate
                success: false,
                message: "User already exists"
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const newUser = new User({
            username,
            password: hashedPassword
        });

        await newUser.save();
        
        res.status(201).json({
            success: true,
            message: "Signup successful!"
        });

    } catch(error) {
        console.error("Registration error:", error);
        res.status(500).json({ 
            success: false,
            message: "Internal server error during registration"
        });
    }
}

exports.Login = async(req, res) => {
    try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Username and password are required"
            });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ // 401 Unauthorized is more appropriate
                success: false,
                message: "Invalid credentials"
            });
        }

        const comparePassword = await bcrypt.compare(password, user.password);
        if (!comparePassword) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        const token = jwtToken(user._id, res);

        res.status(200).json({
            success: true,
            _id: user._id,
            username: user.username,
            message: "Login successful",
            token
        });

    } catch(error) {
        console.error("Login error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error during login"
        });
    }
}

exports.LogOut = async(req, res) => {
    try {
        // Fixed typo: clearCookie (not clearcookie)
        res.clearCookie('jwt', {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Only secure in production
            sameSite: 'None'
        });

        res.status(200).json({
            success: true,
            message: "Logout successful"
        });

    } catch(error) {
        console.error("Logout error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error during logout"
        });
    }
}