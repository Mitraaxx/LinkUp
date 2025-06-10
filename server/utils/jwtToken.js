const jwt = require('jsonwebtoken');

exports.jwtToken = (userId, res) => {
    const token = jwt.sign(
        { userId }, 
        process.env.JWT_SECRET, 
        { expiresIn: "30d" }
    );

    // Set cookie with environment-appropriate settings
    res.cookie('jwt', token, {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
        sameSite: "None",
        secure: process.env.NODE_ENV === 'production', // Only secure in production
        path: '/'
    });

    console.log('Generated token length:', token.length);
    console.log('Token starts with:', token.substring(0, 50) + '...');
    
    return token;
};

// Helper function to verify token format
exports.verifyTokenFormat = (token) => {
    if (!token) return { valid: false, error: 'Token is missing' };
    
    const parts = token.split('.');
    if (parts.length !== 3) {
        return { 
            valid: false, 
            error: `Token has ${parts.length} parts, expected 3. Token: ${token.substring(0, 50)}...` 
        };
    }
    
    return { valid: true };
};