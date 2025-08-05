const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,       // Your app email
    pass: process.env.EMAIL_PASS,       // Your app email app-password
  },
});

const sendVerificationCode = async (email, code) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your Verification Code',
    text: `Your verification code is: ${code}. It expires in 15 minutes.`,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendVerificationCode };
