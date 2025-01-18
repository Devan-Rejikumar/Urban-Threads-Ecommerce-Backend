
import Category from "../../models/Category.js";
import { v2 as cloudinary } from 'cloudinary';

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
            resource_type: 'auto',      // Allow any file type
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
  
        // Handle upload stream errors
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
    const categories = await Category.find({ isDeleted: false });
    res.status(200).json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: "Failed to fetch categories", error });
  }
};

const addCategories = async (req, res) => {
  try {
    const { name, description } = req.body;
    const image = req.body.image; // Expecting base64 image string

    if (!name || !description) {
      return res.status(400).json({ message: "Name and description must be provided" });
    }

    if (image) {
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const sizeInKB = (base64Data.length * 0.75) / 1024;
        console.log(`Processing image of size: ${Math.round(sizeInKB)}KB`);
      }

    const normalizedName = name.toLowerCase().trim().replace(/\s+/g, ' ');

    // Check for existing category
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${normalizedName}$`, 'i') },
      isDeleted: false
    });

    if (existingCategory) {
      return res.status(400).json({ message: "A category with this name already exists" });
    }

    // Upload image if provided
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
      isActive: true
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
    const { name, description, isActive } = req.body;
    const image = req.body.image; // Expecting base64 image string

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

    // Handle image update
    if (image) {
      // Delete old image from Cloudinary if exists
      if (category.image?.public_id) {
        await cloudinary.uploader.destroy(category.image.public_id);
      }
      
      // Upload new image
      try {
        const imageData = await uploadBase64ImageToCloudinary(image);
        category.image = imageData;
      } catch (error) {
        console.error('Image upload error:', error);
        return res.status(400).json({ message: "Failed to upload new image" });
      }
    }

    // Update other fields
    if (name) category.name = name;
    if (description) category.description = description;
    if (typeof isActive !== 'undefined') category.isActive = isActive;

    await category.save();
    res.status(200).json(category);
  } catch (error) {
    console.error('Error in updateCategory:', error);
    res.status(500).json({ message: "Error updating category", error: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Delete image from Cloudinary if exists
    if (category.image?.public_id) {
      await cloudinary.uploader.destroy(category.image.public_id);
    }

    category.isDeleted = true;
    await category.save();

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

export { 
  getCategories, 
  addCategories, 
  updateCategory, 
  deleteCategory, 
  inactivateCategory 
};