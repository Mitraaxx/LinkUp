const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const dbConnect = require('./db/dbConnect');
const {readdirSync} = require('fs');
const authRoute = require('./routes/authRoute');
const userRoute = require('./routes/userRoute');

// Use require for Node.js modules instead of import
const {createServer} = require('http');
const {Server} = require('socket.io');
const { profile } = require('console');


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = createServer(app);

const allowedOrigins = [process.env.CLIENT_URL];

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

app.get('/', (req, res) => {
    res.json('hi');
});

// Initialize Socket.IO with correct syntax
const io = new Server(server, {
    pingTimeout: 60000,
    cors: {
        origin: allowedOrigins[0],
        methods: ["GET", "POST"],
    }
});

console.log("Success - Socket.io Initialized with CORS");

let onlineUsers = []; // Fixed variable name for consistency

io.on("connection", (socket) => {
    console.log(`Info - new Connection: ${socket.id}`);
    socket.emit("me", socket.id);

    socket.on("join", (user) => {
        if (!user || !user.id) {
            console.log("Invalid User data");
            return;
        }
        
        socket.join(user.id);
        
        // Fixed syntax error - missing parentheses
        const existingUser = onlineUsers.find((u) => u.userId === user.id);
        
        if (existingUser) {
            existingUser.socketId = socket.id;
        } else {
            onlineUsers.push({
                userId: user.id, // Fixed property name consistency
                name: user.name,
                socketId: socket.id
            });
        }

        io.emit("online-users", onlineUsers);
        console.log(`User ${user.name} joined with socket ID: ${socket.id}`);
    });

    socket.on("callToUser", (data)=>{
    console.log("Incoming call from -", data);
    // Fixed: Use correct variable name 'onlineUsers' instead of 'onlineUser'
    const call = onlineUsers.find((user)=> user.userId == data.callToUserId)
    if(!call){
        socket.emit("userUnavailable", {message: `User is offline`})
        return;
    }

    // emit an event to the receiver socket(caller)
    io.to(call.socketId).emit("callToUser",{
       signal: data.signalData,
       from:data.from,
       name:data.name,
       profilepic:data.profilepic 
    })
})

    socket.on("call-ended", (data)=>{
        io.to(data.to).emit("callEnded",{
            name:data.name,
        })
    })

    socket.on("reject-call", (data)=>{
        io.to(data.to).emit("callRejected",{
            name:data.name,
            profilepic:data.profilepic
        })
    })

    socket.on("answeredCall", (data)=>{
        io.to(data.to).emit("callAccepted",{
            signal:data.signal,
            from:data.from
        })
    })

    socket.on("disconnect", () => {
        const user = onlineUsers.find((u) => u.socketId === socket.id);
        onlineUsers = onlineUsers.filter((u) => u.socketId !== socket.id);

        io.emit("online-users", onlineUsers);

        // Fixed typo: 'mit' to 'emit'
        socket.broadcast.emit("disconnectUser", { disUser: socket.id });

        console.log("Info - Disconnected:", socket.id);
        if (user) {
            console.log(`User ${user.name} disconnected`);
        }
    });
});

const startServer = () => {
    dbConnect();
    server.listen(PORT, () => {
        console.log('Server listening on port:', PORT);
    });
};

startServer();
