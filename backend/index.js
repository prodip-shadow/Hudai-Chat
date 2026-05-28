const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const connectDB = require('./config/dbConfig');
const bodyParser = require('body-parser');
const authRoute = require('./routes/authRoute');
const chatRoute = require('./routes/chatRoute');
const http = require('http');
const statusRoute = require('./routes/statusRoute');
const friendRoute = require('./routes/friendRoute');
const initializeSocket = require('./services/socketService');
const path = require('path');

const PORT = process.env.PORT || 3000;
const app = express();

const corsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true,
};
app.use(cors(corsOptions));

// Middlewares
app.use(express.json()); //Parse body data
app.use(cookieParser()); //Parse Tokens on every request
app.use(bodyParser.urlencoded({ extended: true })); //Parse URL-encoded data
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// DATABASE CONNECTION
connectDB();

// create server
const server = http.createServer(app);

const io = initializeSocket(server);

// apply socket middleware to all routes
app.use((req, res, next) => {
  req.io = io;
  req.socketUserMap = io.socketUserMap;
  next();
});

// Routes
app.use('/api/auth', authRoute);
app.use('/api/chats', chatRoute);
app.use('/api/status', statusRoute);
app.use('/api/friends', friendRoute);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
