const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    phoneNumber: { type: String, unique: true, sparse: true },
    phoneSuffix: { type: String, unique: false },
    username: { type: String },
    email: {
        type: String,
        lowercase: true,
        validate: {
            validator: function (value) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            },
            message: 'Invalid email address format',
        },

    },
    emailOtp: { type: String },
    emailOtpExpires: { type: Date },
    profilePicture: { type: String },
    about: { type: String },
    lastSeen: { type: Date },
    isOnline: { type: Boolean, default: false },
    inVerified: { type: Boolean, default: false },
    agreed: { type: Boolean, default: false },
}, { timestamps: true });




const User = mongoose.model('User', userSchema);
module.exports = User;