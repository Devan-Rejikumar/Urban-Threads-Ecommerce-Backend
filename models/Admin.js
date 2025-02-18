// models/Admin.js

import mongoose from 'mongoose';

const AdminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  isAdmin: {
    type: Boolean,
    default: true,
  },
  resetPasswordToken: String,
  resetPasswordExpiry: Date,
  resetPasswordOTP: {
    type: String
  },
  resetPasswordOTPExpiry: {
    type: Date
  }
});

const Admin = mongoose.model('Admin', AdminSchema);

export default Admin;