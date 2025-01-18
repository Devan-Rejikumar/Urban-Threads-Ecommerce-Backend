// import mongoose from "mongoose";

// const categorySchema = new mongoose.Schema(
//     {
//         name:{
//             type : String,
//             required : true,
//         },
//         isDeleted : {
//             type : Boolean,
//             default : false,
//         },
//         description :{
//             type : String,
//             required : true,
//         },
//         image :{
//             public_id : {
//                 type : String,
//             },
//             url :{
//                 type : String,
//             }
//         },
//         isActive : {
//             type : Boolean,
//             default : true,
//         }
//     },
//     {timestamps : true }
// )

// const Category = mongoose.model('categories',categorySchema);
// export default Category;

import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true, // Removes whitespace from both ends
    },
    description: {
      type: String,
      required: true,
    },
    image: {
      public_id: {
        type: String,
        required: false, // Explicitly marking it as optional
      },
      url: {
        type: String,
        required: false,
      },
    },
    isActive: {
      type: Boolean,
      default: true, // Default value is true
    },
    isDeleted: {
      type: Boolean,
      default: false, // Default value is false
    },
  },
  {
    timestamps: true, // Automatically adds `createdAt` and `updatedAt` fields
  }
);

const Category = mongoose.model("Category", categorySchema); // Correct model name capitalization
export default Category;
