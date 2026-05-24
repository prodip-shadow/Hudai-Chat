const User = require('../models/User');
const { sendOtpToEmail } = require('../services/emailService');
const otpGenerater = require('../utils/otpGenerator');
const twilioService = require('../services/twilloService');
const { uploadFileToCloudinary } = require('../config/cloudinaryConfig');
const response = require('../utils/responceHandler');
const generateToken = require('../utils/generateToken');
const Conversation = require('../models/Conversation');

const normalizeUploadedUrl = (url, req) => {
  if (!url) {
    return null;
  }

  if (url.startsWith('/uploads/')) {
    return `${req.protocol}://${req.get('host')}${url}`;
  }

  return url;
};

//OTP Send
const sendOTP = async (req, res) => {
  const { phoneNumber, phoneSuffix, email } = req.body;
  const otp = otpGenerater();
  const expiry = new Date(Date.now() + 5 * 60 * 1000); // OTP valid for 5 minutes

  let user;

  try {
    if (email) {
      user = await User.findOne({ email });
      if (!user) {
        user = new User({ email });
      }
      user.emailOtp = otp;
      user.emailOtpExpires = expiry;
      await user.save();

      try {
        await sendOtpToEmail(email, otp);
      } catch (mailError) {
        console.error('Failed to send email OTP:', mailError);
        return response(
          res,
          503,
          'Email service temporarily unavailable. Please try again later.',
        );
      }
      return response(res, 200, 'OTP sent to email', { email }); // In production, do not send OTP in response
    }
    if (!phoneNumber || !phoneSuffix) {
      return response(res, 400, 'Phone number and suffix are required');
    }

    const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`;
    user = await User.findOne({ phoneNumber });
    if (!user) {
      user = await new User({ phoneNumber, phoneSuffix });
    }

    await twilioService.sendOtpToPhoneNumber(fullPhoneNumber);
    // user.phoneOtp = otp;
    // user.phoneOtpExpires = expiry;
    await user.save();

    return response(res, 200, 'OTP sent to phone', user); // In production, do not send OTP in response
  } catch (error) {
    console.error(error);
    return response(res, 500, 'Server error');
  }
};

// Verify OTP

const verifyOtp = async (req, res) => {
  const { phoneNumber, phoneSuffix, email, otp } = req.body;

  try {
    let user;
    if (email) {
      user = await User.findOne({ email });
      if (!user) {
        return response(res, 404, 'User not found');
      }
      const now = new Date();
      if (
        !user.emailOtp ||
        String(user.emailOtp) !== String(otp) ||
        now > new Date(user.emailOtpExpires)
      ) {
        return response(res, 400, 'Invalid  or expire  otp');
      }

      user.isVerified = true;
      user.emailOtp = null;
      user.emailOtpExpires = null;
      await user.save();
    } else {
      if (!phoneNumber || !phoneSuffix) {
        return response(res, 400, 'Phone number and suffix are required');
      }
      const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`;
      user = await User.findOne({ phoneNumber });
      if (!user) {
        return response(res, 404, 'User not found');
      }
      const result = await twilioService.verifyOtp(fullPhoneNumber, otp);

      if (result.status !== 'approved') {
        return response(res, 400, 'Invalid Otp');
      }
      user.isVerified = true;
      await user.save();
    }

    const token = generateToken(user._id);
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    });
    return response(res, 200, 'OTP verified successfully', { token, user });
  } catch (error) {
    console.error(error);
    return response(res, 500, 'Server error');
  }
};

const updateProfile = async (req, res) => {
  const { username, agreed, about } = req.body;
  const userId = req.user.userId;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return response(res, 404, 'User not found');
    }

    const file = req.file;
    if (file) {
      const uploadResult = await uploadFileToCloudinary(file);
      console.log('update-profile upload result:', uploadResult);
      if (!uploadResult?.secure_url) {
        return response(res, 400, 'Failed to upload profile picture');
      }
      user.profilePicture = normalizeUploadedUrl(uploadResult.secure_url, req);
    } else if (req.body.profilePicture) {
      user.profilePicture = req.body.profilePicture;
    }

    if (typeof username === 'string' && username.trim()) {
      user.username = username.trim();
    }

    if (agreed !== undefined && agreed !== null && agreed !== 'undefined') {
      if (typeof agreed === 'boolean') {
        user.agreed = agreed;
      } else if (typeof agreed === 'string') {
        const normalizedAgreed = agreed.trim().toLowerCase();
        if (normalizedAgreed === 'true') {
          user.agreed = true;
        } else if (normalizedAgreed === 'false') {
          user.agreed = false;
        }
      }
    }
    if (about) {
      user.about = about;
    }

    await user.save();

    return response(res, 200, 'Profile updated successfully', user);
  } catch (error) {
    console.error(error);
    return response(res, 500, 'Server error');
  }
};

const checkAuthenticated = async (req, res) => {
  try {
    const userId = req.user.userId;
    if (!userId) {
      return response(
        res,
        404,
        'Unauthorized ! Please login before access our app',
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return response(res, 404, 'User not found');
    }

    return response(res, 200, 'User authenticated', user);
  } catch (error) {
    console.error(error);
    return response(res, 500, 'Server error');
  }
};

const logout = (req, res) => {
  try {
    res.cookie('auth_token', '', {
      expires: new Date(0),
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
    return response(res, 200, 'Logged out successfully');
  } catch (error) {
    console.error(error);
    return response(res, 500, 'Server error');
  }
};

const getAllUsers = async (req, res) => {
  const loggedInUser = req.user.userId;
  try {
    const users = await User.find({ _id: { $ne: loggedInUser } })
      .select(
        'username profilePicture lastSeen isOnline about phoneNumber email phoneSuffix',
      )
      .lean();

    const usersWithConversation = await Promise.all(
      users.map(async (user) => {
        const conversation = await Conversation.findOne({
          participants: { $all: [loggedInUser, user?._id] },
        })
          .populate({
            path: 'lastMessage',
            select: 'content createdAt sender receiver',
          })
          .lean();
        return { ...user, conversation: conversation || null };
      }),
    );
    return response(
      res,
      200,
      'Users retrieved successfully',
      usersWithConversation,
    );
  } catch (error) {
    console.error(error);
    return response(res, 500, 'Server error');
  }
};

module.exports = {
  sendOTP,
  verifyOtp,
  updateProfile,
  logout,
  checkAuthenticated,
  getAllUsers,
};
