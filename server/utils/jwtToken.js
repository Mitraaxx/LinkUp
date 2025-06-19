const jwt = require('jsonwebtoken');

exports.jwtToken = (userId, res) => {
    const token = jwt.sign(
        { userId }, 
        process.env.JWT_SECRET, 
        { expiresIn: "30d" }
    );

    // iOS Safari-compatible cookie settings
    const cookieOptions = {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
        path: '/',
        // Critical fixes for iOS Safari
        sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
        secure: process.env.NODE_ENV === 'production', // Must be true with SameSite=None
    };

    // Additional iOS Safari fix - set domain explicitly if cross-origin
    if (process.env.NODE_ENV === 'production' && process.env.COOKIE_DOMAIN) {
        cookieOptions.domain = process.env.COOKIE_DOMAIN;
    }

    res.cookie('jwt', token, cookieOptions);

    console.log('Generated token length:', token.length);
    console.log('Token starts with:', token.substring(0, 50) + '...');
    console.log('Cookie options:', cookieOptions);
    
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
