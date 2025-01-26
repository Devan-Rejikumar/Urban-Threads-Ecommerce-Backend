


import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  // password: {
  //   type: String,
  //   required: true,
  // },
  // phone: {
  //   type: String,
  //   required: true,
  // },

  password: {
    type: String,
    required: function() {
      return !this.googleId; // Only required if not using Google auth
    }
  },
  phone: {
    type: String,
    required: function() {
      return !this.googleId; // Only required if not using Google auth
    }
  },
  
  googleId: {
    type: String,
    sparse: true,
    unique: true,  
    default: undefined  
  },
  status: {
    type: String,
    enum: ['active', 'blocked'],
    default: 'active',
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  otp: {
    type: String,
    required: false,
  },
  resetPasswordToken: {
    type: String,
    default: undefined
  },
  resetPasswordExpires: {
    type: Date,
    default: undefined
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
},

  otpExpiry: {
    type: Date,
    required: false,
  }
}, {
  timestamps: true
});

export default mongoose.model('User', userSchema);
