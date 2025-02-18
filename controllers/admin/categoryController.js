
import Category from "../../models/Category.js";
import { v2 as cloudinary } from 'cloudinary';
import Product from "../../models/Products.js";

const uploadBase64ImageToCloudinary = async (base64Image) => {
    try {
      if (!base64Image) return null;
      
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
      const sizeInKB = (base64Data.length * 0.75) / 1024;
      console.log(`Attempting to upload image of size: ${Math.round(sizeInKB)}KB`);
  
      const buffer = Buffer.from(base64Data, 'base64');
  
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { 
            resource_type: 'auto',      
            folder: 'categories',
            width: 800,
            height: 800,
            crop: "fill",
            quality: 'auto',
            fetch_format: 'auto',
            chunk_size: 6000000,        
            timeout: 120000             
          },
          (error, result) => {
            if (error) {
              console.error("Cloudinary upload error details:", {
                message: error.message,
                http_code: error.http_code,
                name: error.name
              });
              return reject(error);
            }
            console.log("Upload successful. Image URL:", result.secure_url);
            resolve({ 
              public_id: result.public_id,
              url: result.secure_url 
            });
          }
        );
  

        uploadStream.on('error', (error) => {
          console.error("Upload stream error:", error);
          reject(error);
        });
  
        uploadStream.end(buffer);
      });
    } catch (error) {
      console.error("Detailed upload error:", error);
      throw error;
    }
  };


const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isDeleted: false })
      .populate('currentOffer')
      console.log("Categories with offers:", JSON.stringify(categories, null, 2))
    res.status(200).json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: "Failed to fetch categories", error });
  }
};


const addCategories = async (req, res) => {
  try {
    const { name, description } = req.body;
    const image = req.body.image; 

    if (!name || !description) {
      return res.status(400).json({ message: "Name and description must be provided" });
    }

    if (image) {
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      const sizeInKB = (base64Data.length * 0.75) / 1024;
      console.log(`Processing image of size: ${Math.round(sizeInKB)}KB`);
    }

    const normalizedName = name.toLowerCase().trim().replace(/\s+/g, ' ');

   
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${normalizedName}$`, 'i') },
      isDeleted: false
    });

    if (existingCategory) {
      return res.status(400).json({ message: "A category with this name already exists" });
    }

  
    let imageData = {};
    if (image) {
      try {
        console.log("Starting image upload...");
        imageData = await uploadBase64ImageToCloudinary(image);
        console.log("Image upload completed");
      } catch (error) {
        console.error('Detailed upload error:', {
          message: error.message,
          name: error.name,
          code: error.http_code
        });
        return res.status(500).json({ 
          message: "Failed to upload image",
          details: error.message
        });
      }
    }

    const category = new Category({
      name,
      description,
      image: imageData,
      isActive: true,
      currentOffer: null 
    });

    await category.save();
    res.status(201).json(category);
  } catch (error) {
    console.error('Category creation error:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      message: "Failed to add category",
      details: error.message
    });
  }
};


const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive, currentOffer } = req.body;
    const image = req.body.image;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (name) {
      const normalizedName = name.toLowerCase().trim().replace(/\s+/g, " ");
      const existingCategory = await Category.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${normalizedName}$`, 'i') },
        isDeleted: false
      });

      if (existingCategory) {
        return res.status(400).json({ message: "A category with this name already exists" });
      }
    }


    if (image) {
      if (category.image?.public_id) {
        await cloudinary.uploader.destroy(category.image.public_id);
      }
      
      try {
        const imageData = await uploadBase64ImageToCloudinary(image);
        category.image = imageData;
      } catch (error) {
        console.error('Image upload error:', error);
        return res.status(400).json({ message: "Failed to upload new image" });
      }
    }

  
    if (name) category.name = name;
    if (description) category.description = description;
    if (typeof isActive !== 'undefined') category.isActive = isActive;
    if (typeof currentOffer !== 'undefined') category.currentOffer = currentOffer;

    await category.save();
    
  
    const updatedCategory = await Category.findById(id).populate('currentOffer');
    res.status(200).json(updatedCategory);
  } catch (error) {
    console.error('Error in updateCategory:', error);
    res.status(500).json({ message: "Error updating category", error: error.message });
  }
};

const updateCategoryOffer = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { offerId } = req.body;

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    category.currentOffer = offerId;
    await category.save();

    const updatedCategory = await Category.findById(categoryId).populate('currentOffer');
    res.status(200).json(updatedCategory);
  } catch (error) {
    console.error('Error updating category offer:', error);
    res.status(500).json({ message: "Error updating category offer", error: error.message });
  }
};


const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Delete the image from Cloudinary if it exists
    if (category.image?.public_id) {
      await cloudinary.uploader.destroy(category.image.public_id);
    }

    // Actually delete the document from database
    await Category.findByIdAndDelete(id);

    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error('Error in deleteCategory:', error);
    res.status(500).json({ message: "Error deleting category", error });
  }
};
const inactivateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const category = await Category.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json(category);
  } catch (error) {
    console.error('Error in inactivateCategory:', error);
    res.status(500).json({ message: "Error updating category status", error });
  }
};

const getProductsByCategory = async(req,res) => {
  try {
    const { categoryId } = req.params;
    
    const category = await Category.findById(categoryId)
      .populate('currentOffer');
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const products = await Product.find({
      category: categoryId,
      isDeleted: { $ne: true }, // Not deleted products
      isActive: true
    }).populate(['currentOffer', 'category']);

    console.log(`Found ${products.length} products for category ${categoryId}`);

    res.status(200).json({
      success: true,
      category,
      products
    });
  } catch (error) {
    console.error('Error in getProductsByCategory:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching category products',
      error: error.message
    });
  }
};

export { 
  getCategories, 
  addCategories, 
  updateCategory, 
  deleteCategory, 
  inactivateCategory,
  updateCategoryOffer,
  getProductsByCategory
};