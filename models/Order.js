import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
    selectedSize: { type: String, required: true },
    status: {
        type: String,
        enum: ['pending', 'cancelled'],
        default: 'pending'
    },
    cancellationReason: String
});

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, unique: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    addressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Address',
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cod'],
      required: true,
    },
    items: [orderItemSchema],
    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

// Function to generate custom orderId
async function generateOrderId() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');

  const todayStart = new Date(date.setHours(0, 0, 0, 0));
  const todayEnd = new Date(date.setHours(23, 59, 59, 999));

  const count = await mongoose.model('Order').countDocuments({
    createdAt: {
      $gte: todayStart,
      $lte: todayEnd
    }
  });

  const sequence = (count + 1).toString().padStart(4, '0');

  return `ORD${year}${month}${day}${sequence}`;
}

// Pre-save hook to ensure orderId is set
orderSchema.pre('save', async function (next) {
  if (!this.orderId) {
    this.orderId = await generateOrderId();
  }
  next();
});

const Order = mongoose.model('Order', orderSchema);

export default Order;
