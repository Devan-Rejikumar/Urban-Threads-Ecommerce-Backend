

import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true 
  },
  quantity: { 
    type: Number, 
    required: true, 
    min: 1 
  },
  price: { 
    type: Number, 
    required: true 
  },
  selectedSize: { 
    type: String, 
    required: true 
  },
  status: {
    type: String,
    enum: ['pending', 'shipped', 'delivered', 'cancelled', 'return_requested', 'returned', 'payment_failed'],
    default: 'pending'
  },
  returnReason: String,
  returnRequestedAt: Date,
  returnAcceptedAt: Date,
  returnRejectedAt: Date,
  returnRejectionReason: String,
  cancellationReason: String,
  refundStatus: {
    type: String,
    enum: ['pending', 'processed', 'failed', 'not_applicable'],
    default: 'not_applicable'
  },
  refundAmount: {
    type: Number,
    default: 0
  }
});

const orderSchema = new mongoose.Schema({
  orderId: { 
    type: String, 
    unique: true 
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  addressId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address',
    required: true,
  },
  paymentMethod: {
    type: String,
    enum: ['cod', 'online', 'wallet'],
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  razorpayOrderId: {
    type: String,
    unique: true,
    sparse: true
  },
  razorpayPaymentId: {
    type: String,
    unique: true,
    sparse: true
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true,
  },
  discountAmount: {
    type: Number,
    default: 0,
    validate: {
      validator: function(value) {
        return value >= 0 && value <= this.totalAmount;
      },
      message: 'Discount amount must be between 0 and total amount'
    }
  },
  couponUsed: {
    type: String,
    default: null,
    sparse: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'return_requested', 'returned', 'payment_failed'],
    default: 'pending',
  },
  returnReason: String,
  returnRequestedAt: Date,
  returnAcceptedAt: Date,
  returnRejectedAt: Date,
  returnRejectionReason: String,
  refundStatus: {
    type: String,
    enum: ['pending', 'processed', 'failed', 'not_applicable'],
    default: 'not_applicable'
  },
  refundAmount: {
    type: Number,
    default: 0,
    validate: {
      validator: function(value) {
        return value >= 0 && value <= this.totalAmount;
      },
      message: 'Refund amount cannot exceed total order amount'
    }
  }
}, {
  timestamps: true
});


orderSchema.methods.markPaymentFailed = async function() {
  this.paymentStatus = 'failed';
  this.status = 'payment_failed';
  await this.save();
};

orderSchema.methods.markPaymentSuccess = async function(razorpayData) {
  this.paymentStatus = 'paid';
  this.status = 'processing';
  this.razorpayOrderId = razorpayData.orderId;
  this.razorpayPaymentId = razorpayData.paymentId;
  await this.save();
};


orderSchema.methods.requestReturn = async function(reason) {
  if (this.status !== 'delivered') {
    throw new Error('Only delivered orders can be returned');
  }
  
  if (Date.now() - this.updatedAt > 7 * 24 * 60 * 60 * 1000) {
    throw new Error('Return window has expired (7 days)');
  }

  this.status = 'return_requested';
  this.returnReason = reason;
  this.returnRequestedAt = new Date();
  await this.save();
};

orderSchema.methods.acceptReturn = async function() {
  if (this.status !== 'return_requested') {
    throw new Error('Order must be in return_requested status');
  }

  this.status = 'returned';
  this.returnAcceptedAt = new Date();
  this.refundStatus = 'pending';
  this.refundAmount = this.totalAmount - this.discountAmount;
  await this.save();
};

orderSchema.methods.rejectReturn = async function(rejectionReason) {
  if (this.status !== 'return_requested') {
    throw new Error('Order must be in return_requested status');
  }

  this.status = 'delivered';
  this.returnRejectedAt = new Date();
  this.returnRejectionReason = rejectionReason;
  await this.save();
};

orderSchema.methods.processRefund = async function() {
  if (this.refundStatus !== 'pending') {
    throw new Error('Refund must be in pending status');
  }

  try {

    
    this.refundStatus = 'processed';
    await this.save();
  } catch (error) {
    this.refundStatus = 'failed';
    await this.save();
    throw error;
  }
};


orderSchema.pre('save', async function(next) {
  try {
    if (!this.orderId) {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');

      const todayStart = new Date(date.setHours(0, 0, 0, 0));
      const todayEnd = new Date(date.setHours(23, 59, 59, 999));

      const count = await this.constructor.countDocuments({
        createdAt: {
          $gte: todayStart,
          $lte: todayEnd
        }
      });

      const sequence = (count + 1).toString().padStart(4, '0');
      this.orderId = `ORD${year}${month}${day}${sequence}`;
    }
    next();
  } catch (error) {
    next(error);
  }
});

const Order = mongoose.model('Order', orderSchema);

export default Order;