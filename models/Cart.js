import mongoose from 'mongoose';

const CartItemSchema = new mongoose.Schema ({
    productId : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'Product',
        required : true
    },
    selectedSize : {
        type : String,
        required : true
    },
    quantity : {
        type : Number,
        required : true,
        min : 1
    },
    price : {
        type : Number,
        required : true
    }
});

const CartSchema = new mongoose.Schema({
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    items: [CartItemSchema],
    totalAmount: {
      type: Number,
      required: true,
      default: 0
    }
  }, { timestamps: true });
  
  export default mongoose.model('Cart', CartSchema);