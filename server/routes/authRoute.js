const express = require('express');
const { Signup, Login, LogOut } = require('../controller/auth');


const router = express.Router();

router.post('/register', Signup);
router.post('/Login', Login);

router.post('/Logout',LogOut);




module.exports = router;
