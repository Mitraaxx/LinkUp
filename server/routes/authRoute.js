const express = require('express');
const { Signup, Login, LogOut } = require('../controller/auth');
const { isLogin } = require('../middleware/isLogIn');

const router = express.Router();

router.post('/register', Signup);
router.post('/Login', Login);
router.post('/Logout',LogOut);
// yaha mene ek isLogin middleware udaya hai



module.exports = router;
