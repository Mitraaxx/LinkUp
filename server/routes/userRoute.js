const express = require('express');
const { getAllUsers } = require('../controller/user');
const { isLogin } = require('../middleware/isLogIn');


const router = express.Router();

router.get('/',isLogin,getAllUsers);


module.exports = router;