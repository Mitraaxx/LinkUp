const express = require('express');
const { getAllUsers } = require('../controller/user');



const router = express.Router();

router.get('/',getAllUsers);


module.exports = router;
