const https = require('https');

const sendOtpToEmail = async (email, otp) => {
  if (!process.env.BREVO_API_KEY || !process.env.EMAIL_SENDER) {
    throw new Error('Email service is not configured');
  }

  const html = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
      <h2 style="color: #075e54;">Mernoc Verification</h2>

      <p>Hi there,</p>

      <p>Your one-time password (OTP) to verify your Mernoc account is:</p>

      <h1 style="background: #e0f7fa; color: #000; padding: 10px 20px; display: inline-block; border-radius: 5px; letter-spacing: 2px;">
        ${otp}
      </h1>

      <p><strong>This OTP is valid for the next 5 minutes.</strong> Please do not share this code with anyone.</p>

      <p>If you didn't request this OTP, please ignore this email.</p>

      <p style="margin-top: 20px;">Thanks & Regards,<br/>Mernoc Security Team</p>

      <hr style="margin: 30px 0;" />

      <small style="color: #777;">This is an automated message. Please do not reply.</small>
    </div>
  `;




  
  const payload = JSON.stringify({
    sender: { email: process.env.EMAIL_SENDER },
    to: [{ email }],
    subject: 'Your Mernoc OTP Verification Code',
    htmlContent: html,
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`Brevo error ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
};

module.exports = { sendOtpToEmail };
