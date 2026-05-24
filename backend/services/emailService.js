const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const dns = require('dns');

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT || 587),
  secure:
    process.env.SMTP_SECURE === 'true' ||
    Number(process.env.SMTP_PORT || 587) === 465,
  family: 4,
  lookup(hostname, options, callback) {
    return dns.lookup(hostname, { ...options, family: 4 }, callback);
  },
  connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 10000),
  greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 10000),
  socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 10000),
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter.verify((error) => {
    if (error) {
      console.log('Gmail Services connnection failed');
      console.log(error);
    } else {
      console.log('Email service is ready to send messages');
    }
  });
} else {
  console.log(
    'Email service skipped verification because EMAIL_USER or EMAIL_PASS is missing',
  );
}

const sendOtpToEmail = async (email, otp) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Email service is not configured');
  }

  const html = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
      <h2 style="color: #075e54;">🔐 WhatsApp Web Verification</h2>
      
      <p>Hi there,</p>
      
      <p>Your one-time password (OTP) to verify your WhatsApp Web account is:</p>
      
      <h1 style="background: #e0f7fa; color: #000; padding: 10px 20px; display: inline-block; border-radius: 5px; letter-spacing: 2px;">
        ${otp}
      </h1>

      <p><strong>This OTP is valid for the next 5 minutes.</strong> Please do not share this code with anyone.</p>

      <p>If you didn’t request this OTP, please ignore this email.</p>

      <p style="margin-top: 20px;">Thanks & Regards,<br/>WhatsApp Web Security Team</p>

      <hr style="margin: 30px 0;" />

      <small style="color: #777;">This is an automated message. Please do not reply.</small>
    </div>
  `;

  await transporter.sendMail({
    from: `WhatsApp Web <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your WhatsApp Web OTP Verification Code',
    html,
  });
};

module.exports = { sendOtpToEmail };
