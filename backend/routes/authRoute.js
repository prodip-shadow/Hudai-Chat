const express = require('express');
const authController = require('../controllers/authController');
const { multerMiddleware } = require('../config/cloudinaryConfig');
const authMiddleware = require('../middleware/authMiddleware');


const router = express.Router();

router.post('/send-otp', authController.sendOTP);
router.post('/verify-otp', authController.verifyOtp);
router.get('/logout', authController.logout);


// Protected route
router.put('/update-profile', authMiddleware, multerMiddleware, authController.updateProfile);
router.get('/check-auth', authMiddleware, authController.checkAuthenticated);
router.get('/users', authMiddleware, authController.getAllUsers);


module.exports = router;