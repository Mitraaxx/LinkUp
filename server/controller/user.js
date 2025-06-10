const User = require('../models/userModel');

exports.getAllUsers = async (req, res) => {
    const currentUserId = req.user?._id;

    if (!currentUserId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {
        const users = await User.find({ _id: { $ne: currentUserId } }, "username");
        res.status(200).json({ success: true, users });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};
