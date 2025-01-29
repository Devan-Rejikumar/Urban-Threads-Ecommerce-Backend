


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

  password: {
    type: String,
    required: function () {
      return !this.googleId;
    }
  },
  phone: {
    type: String,
    required: function () {
      return !this.googleId;
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
    enum: ['active', 'blocked','unblocked'],
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
  emailUpdateOTP : {
    type : String
  },
  emailUpdateOTPExpiry : {
    type : Date
  },
  newEmail : {
    type : String,
  },
  phoneUpdateOTP : {
    type : String
  },
  phoneUpdateOTPExpiry : {
    type : Date
  },
  newPhone : {
    type : String
  },
  otpExpiry: {
    type: Date,
    required: false,
  }
}, {
  timestamps: true
});

export default mongoose.model('User', userSchema);
