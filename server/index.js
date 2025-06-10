const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const dbConnect = require('./db/dbConnect');
const {readdirSync} = require('fs')
const {route} = require('../server/routes/authRoute');
const authRoute = require('./routes/authRoute');
const userRoute = require('./routes/userRoute');


dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;

const allowedOrigins = [""];
 
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true); // Allow request
        } else {
            callback(new Error('Not allowed by CORS')); // Block request
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed HTTP methods
}));

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoute);
app.use('/api/user', userRoute);


app.get('/', (req,res)=>{
    res.json('hi')
})

const server = () => {
    dbConnect()
    app.listen(PORT, ()=>{
        console.log('listening to port:', PORT)
    })
}

server()