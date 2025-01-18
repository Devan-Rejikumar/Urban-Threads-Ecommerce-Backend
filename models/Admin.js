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
  // Add any other fields you need
});

const Admin = mongoose.model('Admin', AdminSchema);

export default Admin;