const express = require('express');
const { getAllUsers } = require('../controller/user');
const { isLogin } = require('../middleware/isLogIn');


const router = express.Router();

router.get('/',getAllUsers);


module.exports = router;
