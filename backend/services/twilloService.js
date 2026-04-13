const twilio = require('twilio');

// Twilio credentials from env
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const serviceSid = process.env.TWILIO_SERVICE_SID;

// Initialize Twilio client
const client = twilio(accountSid, authToken);

// Function to send OTP
const sendOtpToPhoneNumber = async (phoneNumber) => {
    try {
        console.log('Sending Otp To Phone Number', phoneNumber);
        if (!phoneNumber) {
            throw new Error('Phone number is required to send OTP');
        }

        const response = await client.verify.v2.services(serviceSid)
            .verifications.create({ to: phoneNumber, channel: 'sms' });
        console.log('This is my Otp response',response);
        return response;
    } catch (error) {
        console.error('Error sending OTP:', error);
        throw new Error('Failed to send OTP. Please try again later.');
    }
}


// Function to verify OTP
const verifyOtp = async (phoneNumber, otp) => {
    try {
        console.log('This is my otp: ', otp);
        console.log('This is my phone number: ', phoneNumber);

        const response = await client.verify.v2.services(serviceSid)
            .verificationChecks.create({ to: phoneNumber, code: otp });
        console.log('This is my Otp verification response', response);
        return response;
    } catch (error) {
        console.error('Error verifying OTP:', error);
        throw new Error('Failed to verify OTP. Please try again later.');
    }
}



module.exports = {
    sendOtpToPhoneNumber,
    verifyOtp
}