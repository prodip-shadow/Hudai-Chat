const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/dbConfig');
const bodyParser = require('body-parser');
const authRoute = require('./routes/authRoute')

    dotenv.config();

const PORT = process.env.PORT || 3000;
const app = express();

// Middlewares
app.use(express.json()); //Parse body data
app.use(cookieParser()); //Parse Tokens on every request
app.use(bodyParser.urlencoded({ extended: true })); //Parse URL-encoded data

// DATABASE CONNECTION
connectDB();


// Routes
app.use('/api/auth', authRoute);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
