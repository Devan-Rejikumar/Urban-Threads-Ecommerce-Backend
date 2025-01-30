import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true, 
    },
    description: {
      type: String,
      required: true,
    },
    image: {
      public_id: String,
      url: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false, 
    },
    currentOffer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer'
    },
  },
  {
    timestamps: true, 
  }
);

const Category = mongoose.model("Category", categorySchema); 
export default Category;
