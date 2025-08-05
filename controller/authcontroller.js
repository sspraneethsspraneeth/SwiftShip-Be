const User = require('../models/User');
const VerificationCode = require('../models/VerificationCode');
const Order = require('../models/Order'); 
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// ✅ Nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ Password strength regex
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

// ✅ Generate and send verification code
const sendVerificationCode = async (email) => {
  const code = Math.random().toString(36).substring(2, 7).toUpperCase();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

  await VerificationCode.findOneAndUpdate(
    { email },
    { code, expiresAt },
    { upsert: true, new: true }
  );

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your Verification Code',
    text: `Your verification code is: ${code}. It will expire in 15 minutes.`,
  };

  await transporter.sendMail(mailOptions);
};

// ✅ Generate unique customerId
const generateCustomerId = async () => {
  const count = await User.countDocuments();
  const nextNumber = count + 1;
  const padded = String(nextNumber).padStart(3, '0');
  return `CUST${padded}`;
};

// ✅ Request verification code
const requestVerificationCode = async (req, res) => {
  const { email, source } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  try {
    const userExists = await User.findOne({ email });

    if (source === 'register' && userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    if (source === 'forgot' && !userExists) {
      return res.status(404).json({ message: 'User not found' });
    }

    await sendVerificationCode(email);
    res.status(200).json({ message: 'Verification code sent' });
  } catch (err) {
    console.error('Email error:', err);
    res.status(500).json({ message: 'Failed to send verification code' });
  }
};

// ✅ Verify code
const verifyCode = async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code)
    return res.status(400).json({ message: 'Email and code are required' });

  try {
    const record = await VerificationCode.findOne({ email });
    if (!record)
      return res.status(400).json({ message: 'Verification code not found' });

    if (record.expiresAt < new Date()) {
      await VerificationCode.deleteOne({ email });
      return res.status(400).json({ message: 'Verification code expired' });
    }

    if (record.code !== code.toUpperCase())
      return res.status(400).json({ message: 'Invalid verification code' });

    await VerificationCode.deleteOne({ email });
    res.status(200).json({ message: 'Verification successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ Register user (with customerId)
const registerUser = async (req, res) => {
  const { email, password, code } = req.body;

  if (!email || !password || !code)
    return res.status(400).json({ message: 'Email, password, and code are required' });

  if (!strongPasswordRegex.test(password)) {
    return res.status(400).json({
      message:
        'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
    });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: 'User already exists' });

    const record = await VerificationCode.findOne({ email });
    if (!record)
      return res.status(400).json({ message: 'Verification code not found' });

    if (record.expiresAt < new Date()) {
      await VerificationCode.deleteOne({ email });
      return res.status(400).json({ message: 'Verification code expired' });
    }

    if (record.code !== code.toUpperCase()) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    // Code verified, delete it
    await VerificationCode.deleteOne({ email });

    const customerId = await generateCustomerId();
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      email,
      password: hashedPassword,
      customerId,
    });

    await user.save();
    res.status(201).json({ message: 'User registered successfully', customerId });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};


// ✅ Login user
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Email and password are required' });

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    if (!user.tokens) {
      user.tokens = [];
    }
    user.tokens.push(token);
    await user.save();

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        email: user.email,
        customerId: user.customerId,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login error' });
  }
};

// ✅ Update user profile
const updateUserProfile = async (req, res) => {
  const { email, fullName, nickName, dob, phone, gender, image } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.fullName = fullName || user.fullName;
    user.nickName = nickName || user.nickName;
    user.dob = dob || user.dob;
    user.phone = phone || user.phone;
    user.gender = gender || user.gender;
    user.image = image || user.image;

    await user.save();
    res.status(200).json({ message: 'Profile updated', user });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ message: 'Server error while updating profile' });
  }
};

// ✅ Save user location
const saveUserLocation = async (req, res) => {
  const { place } = req.body;
  if (!place) return res.status(400).json({ message: 'Place is required' });

  try {
    const user = await User.findOne().sort({ createdAt: -1 });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const resGeo = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1`
    );
    const data = await resGeo.json();

    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'No location found for the given place' });
    }

    const { lat, lon, display_name } = data[0];
    user.location = {
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      address: display_name || place,
    };

    await user.save();

    res.status(200).json({
      message: 'Location saved successfully',
      user: user.email,
      location: user.location,
    });
  } catch (err) {
    console.error('Save location error:', err);
    res.status(500).json({ message: 'Server error while saving location' });
  }
};

// ✅ Logout user
const logoutUser = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token missing" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.tokens = user.tokens.filter(t => t !== token);
    await user.save();

    res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

// ✅ Reset password
const resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ message: 'Email and new password are required' });
  }

  if (!strongPasswordRegex.test(newPassword)) {
    return res.status(400).json({
      message:
        'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
    });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset error:', err);
    res.status(500).json({ message: 'Server error during password reset' });
  }
};

// ✅ Get user by email
const getUserByEmail = async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  try {
    const user = await User.findOne({ email }).select('-password -__v');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({ user });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ message: 'Server error while fetching user' });
  }
};
// ✅ Get all users/customers

const getAllCustomers = async (req, res) => {
  try {
    const users = await User.find();
    const orders = await Order.find();

    const enrichedUsers = users.map((user, i) => {
      const userOrders = orders.filter(
        (order) =>
          order.senderEmail === user.email || order.senderPhone === user.phone
      );

      return {
        customerId: user.customerId,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        totalOrders: userOrders.length,
      };
    });

    res.status(200).json({ customers: enrichedUsers });
  } catch (error) {
    console.error("Error fetching customers", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
// ✅ Get single customer by ID
// controller/authController.js
const getCustomerById = async (req, res) => {
  try {
    const user = await User.findOne({ customerId: req.params.id });

    if (!user) return res.status(404).json({ message: "User not found" });

    const userOrders = await Order.find({ senderEmail: user.email });

    res.json({
      id: user.customerId,
      name: user.fullName,
      email: user.email,
      contact: user.phone,
      address: user.location?.address,
      orders: userOrders.map(order => ({
        orderId: order.orderId,
        date: order.createdAt,
        amount: order.totalAmount,
        status: order.status
      }))
    });
  } catch (err) {
    console.error("Get customer by ID error:", err);
    res.status(500).json({ message: "Server error" });
  }
};



// ✅ Export all
module.exports = {
  requestVerificationCode,
  verifyCode,
  registerUser,
  loginUser,
  logoutUser,
  resetPassword,
  updateUserProfile,
  saveUserLocation,
  getUserByEmail,
  getAllCustomers,
  getCustomerById,

};
