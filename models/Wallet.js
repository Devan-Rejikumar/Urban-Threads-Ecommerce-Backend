import mongoose from 'mongoose';

const walletTransactionSchema = new mongoose.Schema({
 
  amount: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['credit', 'debit'],
    required: true
  },
  source: {
    type: String,
    enum: ['order_refund', 'razorpay', 'wallet_payment'],
    required: true
  },
  orderId: {
    type: String,
    sparse: true
  },
  razorpayPaymentId: {
    type: String,
    sparse: true
  },
  description: String,
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  balance: {
    type: Number,
    required: true
  }
}, { 
  timestamps: true 
});

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0
  },
  transactions: [walletTransactionSchema]
}, {
  timestamps: true
});

export default mongoose.model('Wallet', walletSchema);