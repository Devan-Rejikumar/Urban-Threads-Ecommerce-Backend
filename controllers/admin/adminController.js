import Admin from '../../models/Admin.js';
import User from '../../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';


export const adminLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.findOne({ email: new RegExp(`^${email}$`, 'i'), isAdmin: true });

    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin._id, email: admin.email, isAdmin: admin.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.cookie('adminToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'strict',
      maxAge: 3600000, // 1 hour
      path: '/'
    });

    res.status(200).json({ 
      message: 'Admin logged in successfully',
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: 'admin'
      }
    });
  } catch (error) {
    console.error("Server error:", error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const validateToken = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select('-password');
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    res.status(200).json({ 
      valid: true,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: 'admin'
      }
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Existing controller functions remain the same
export const getAllUsers = async (req, res) => {
  try {
    console.log('bcaksjchkj111')
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};

export const blockUsers = async (req, res) => {
  try {
    const userId = req.params.id;
    const updatedUser = await User.findByIdAndUpdate(
      userId, 
      { status: 'blocked', token : null }, 
      { new: true }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'User blocked successfully', user: updatedUser });
  } catch (error) {
    console.error("Error blocking user:", error);
    res.status(500).json({ message: 'Error blocking user', error: error.message });
  }
};

export const unblockUsers = async (req, res) => {
  try {
    const userId = req.params.id;
    const updatedUser = await User.findByIdAndUpdate(
      userId, 
      { status: 'unblocked' }, 
      { new: true }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'User unblocked successfully', user: updatedUser });
  } catch (error) {
    console.error("Error unblocking user:", error);
    res.status(500).json({ message: 'Error unblocking user', error: error.message });
  }
};

export const adminLogout = async (req, res) => {
  try {
    res.clearCookie('adminToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      expires: new Date(0), 
      maxAge: 0 
    });
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error logging out' });
  }
};

export const verifyAdminToken = async(req, res, next) => {
  try {
    const { adminToken } = req.cookies;
    if (!adminToken) {
      return res.status(401).json({ message: 'Admin token not found' });
    }

    const decoded = jwt.verify(adminToken, process.env.JWT_SECRET);
    // Add the decoded admin info to the request
    console.log('hhhhhhhhhhhhhhhhhhh',decoded)
    req.admin = decoded;
    res.status(200).json({admin:decoded,message:'admin verified'})
    
  } catch (error) {
    console.error('Admin token verification error:', error);
    res.status(401).json({ message: 'Invalid or expired admin token' });
  }
};


const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const createTransporter = async () => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
    
    await transporter.verify();
    return transporter;
  } catch (error) {
    console.error('Email configuration error:', error);
    throw error;
  }
};

const sendOTPEmail = async (email, otp) => {
  try {
    const transporter = await createTransporter();
    
    const mailOptions = {
      from: `"Admin Password Reset" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Your OTP for password reset is:</p>
          <h1 style="color: #4CAF50; letter-spacing: 5px; text-align: center; padding: 10px; background: #f5f5f5; border-radius: 5px;">${otp}</h1>
          <p style="color: #666;">This OTP will expire in 10 minutes.</p>
          <p style="color: #999; font-size: 12px;">If you didn't request this password reset, please ignore this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    console.log('Processing forgot password for email:', email);

    // Find admin by email
    const admin = await Admin.findOne({ email: new RegExp(`^${email}$`, 'i') });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'No admin account found with this email'
      });
    }

    // Generate OTP
    const otp = generateOTP();
    console.log('Generated OTP:', otp);

    // Save OTP to admin document with expiry
    admin.resetPasswordOTP = otp;
    admin.resetPasswordOTPExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await admin.save();

    // Send OTP email
    await sendOTPEmail(email, otp);
    
    res.status(200).json({
      success: true,
      message: 'OTP has been sent to your email'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const admin = await Admin.findOne({
      email: new RegExp(`^${email}$`, 'i'),
      resetPasswordOTP: otp,
      resetPasswordOTPExpiry: { $gt: new Date() }
    });

    if (!admin) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully'
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP'
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // Find admin with matching email and valid OTP
    const admin = await Admin.findOne({
      email: new RegExp(`^${email}$`, 'i'),
      resetPasswordOTP: otp,
      resetPasswordOTPExpiry: { $gt: new Date() }
    });

    if (!admin) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password and clear OTP fields
    admin.password = hashedPassword;
    admin.resetPasswordOTP = undefined;
    admin.resetPasswordOTPExpiry = undefined;
    await admin.save();

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while resetting password'
    });
  }
};