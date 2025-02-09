import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: false,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref : 'Category',
      required: false,
    },
    images: {
      type: [String], 
      default: [],
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isListed : {
      type : Boolean,
      default : true
    },
    originalPrice:{
      type : Number,
      default : 0,
    },
    salePrice : {
      type : Number,
      default : 0,
    },
    description: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true
    },
    currentOffer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer'
    },
    variants: [{
      size: String,
      color: String,
      stock: {
        type: Number,
        min: 0,
        default: 0
      },
    }],
  },
  {
    timestamps: true, 
  }
);

const Product = mongoose.model("Product", productSchema);
export default Product;