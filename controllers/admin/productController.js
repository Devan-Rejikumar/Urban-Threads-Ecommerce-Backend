import mongoose from "mongoose";
import Category from "../../models/Category.js";
import Product from "../../models/Products.js";
import Offer from "../../models/Offer.js"
import { v2 as cloudinary } from 'cloudinary';


const priceCalculator = {
  // Calculate discounted price based on an offer
  calculateDiscountedPrice: (originalPrice, offer) => {
    if (!offer || !offer.discountValue || originalPrice <= 0) return originalPrice;
    const discountedAmount = (originalPrice * offer.discountValue) / 100;
    return Math.max(0, originalPrice - discountedAmount);
  },

  // Compare offers and return the best price
  getBestOfferPrice: (originalPrice, productOffer, categoryOffer) => {
    if (!productOffer && !categoryOffer) return originalPrice;
    
    const productDiscountedPrice = productOffer ? 
      priceCalculator.calculateDiscountedPrice(originalPrice, productOffer) : originalPrice;
    const categoryDiscountedPrice = categoryOffer ? 
      priceCalculator.calculateDiscountedPrice(originalPrice, categoryOffer) : originalPrice;
    
    return Math.min(productDiscountedPrice, categoryDiscountedPrice);
  },

  // Update product prices based on category offer
  async updateCategoryProductPrices(categoryId, categoryOffer) {
    const products = await Product.find({ 
      category: categoryId,
      isDeleted: false,
      isActive: true
    }).populate('currentOffer');

    const updatePromises = products.map(async (product) => {
      const salePrice = priceCalculator.getBestOfferPrice(
        product.originalPrice,
        product.currentOffer,
        categoryOffer
      );

      return Product.findByIdAndUpdate(
        product._id,
        { salePrice },
        { new: true }
      );
    });

    await Promise.all(updatePromises);
  }
};


const getProducts = async (req, res) => {
    try {
       
        const products = await Product.find().populate('category', 'name');  
        if (!products || products.length === 0) {
            return res.status(404).json({ error: "No products found asdfghj" });
        }
        res.status(200).json(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: error.message });
    }
};


const uploadBase64ImagesToCloudinary = async (base64Images) => {
  try {
    const imageUrls = await Promise.all(
      base64Images.map(async (base64Image, index) => {
        try {
          if (!base64Image || typeof base64Image !== 'string') {
            throw new Error(`Invalid image data for image ${index + 1}`);
          }

          // Validate image format
          if (!base64Image.startsWith('data:image/')) {
            throw new Error(`Invalid image format for image ${index + 1}`);
          }

          const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
          
          // Validate base64 data
          if (!base64Data) {
            throw new Error(`Empty image data for image ${index + 1}`);
          }

          // Create buffer and check size
          const buffer = Buffer.from(base64Data, 'base64');
          if (buffer.length > 5 * 1024 * 1024) { // 5MB limit
            throw new Error(`Image ${index + 1} exceeds 5MB size limit`);
          }

          return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              { 
                resource_type: 'image',
                folder: 'urban-threads', // Organize images in a folder
                transformation: [
                  { quality: 'auto:good' }, // Optimize image quality
                  { fetch_format: 'auto' } // Auto-select best format
                ]
              },
              (error, result) => {
                if (error) {
                  return reject(new Error(`Failed to upload image ${index + 1}: ${error.message}`));
                }
                resolve(result.secure_url);
              }
            );

            // Handle potential stream errors
            uploadStream.on('error', (error) => {
              reject(new Error(`Stream error for image ${index + 1}: ${error.message}`));
            });

            uploadStream.end(buffer);
          });
        } catch (error) {
          throw new Error(`Error processing image ${index + 1}: ${error.message}`);
        }
      })
    );
    return imageUrls;
  } catch (error) {
    console.error("Error uploading images:", error);
    throw error;
  }
};
  
  const addProduct = async (req, res) => {
    try {
      const { name, category, description, variants, images, originalPrice } = req.body;
  
      // Validate and parse variants
      let parsedVariants;
      try {
        parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
      } catch (error) {
        return res.status(400).json({
          message: 'Invalid variants format',
          error: error.message
        });
      }
  
      if (!parsedVariants?.length) {
        return res.status(400).json({
          message: 'At least one variant is required'
        });
      }

      // Parse and validate images
      let parsedImages;
      try {
        parsedImages = typeof images === 'string' ? JSON.parse(images) : images;
        if (!Array.isArray(parsedImages) || parsedImages.length === 0) {
          return res.status(400).json({
            message: 'At least one image is required'
          });
        }
      } catch (error) {
        return res.status(400).json({
          message: 'Invalid images format',
          error: error.message
        });
      }
  
      // Get category and its offer
      const categoryData = await Category.findById(category)
        .populate('currentOffer')
        .lean();
  
      if (!categoryData) {
        return res.status(404).json({
          message: 'Category not found'
        });
      }
  
      // Calculate initial sale price based on category offer
      const salePrice = priceCalculator.calculateDiscountedPrice(
        originalPrice,
        categoryData.currentOffer
      );
  
      // Process variants
      const processedVariants = parsedVariants.map(variant => ({
        size: variant.size,
        color: variant.color,
        stock: Number(variant.stock)
      }));
  
      // Upload images
      const imageUrls = await uploadBase64ImagesToCloudinary(parsedImages);
  
      const newProduct = new Product({
        name,
        category,
        description,
        variants: processedVariants,
        images: imageUrls,
        originalPrice,
        salePrice,
        isListed: true
      });
  
      await newProduct.save();
  
      res.status(201).json({
        message: 'Product added successfully',
        product: newProduct
      });
    } catch (error) {
      console.error('Error adding product:', error);
      res.status(500).json({ error: error.message });
    }
  };
  

const getCategories = async(req,res)=>{
    try {
        const categories = await Category.find()
        return res.status(200).json(categories)
    } catch (error) {
        res.status(400).json('something went wrong')
    }
}


const editProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const product = await Product.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
        
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.status(200).json({
            message: 'Product updated successfully',
            product,
        });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(400).json({ error: error.message });
    }
};


const softDeleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { isDeleted } = req.body;

        const updatedProduct = await Product.findByIdAndUpdate(id, { isDeleted }, { new: true });

        if (!updatedProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.status(200).json({
            message: `Product ${isDeleted ? 'deleted' : 'restored'} successfully`,
            product: updatedProduct,
        });
    } catch (error) {
        console.error('Error soft deleting product:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
};


const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const product = await Product.findByIdAndDelete(id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.status(200).json({
            message: 'Product deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(400).json({ error: error.message });
    }
};
const updateProduct = async (req, res) => {
  try {
    const productData = {
      name: req.body.name,
      category: req.body.category,
      description: req.body.description,
      originalPrice: req.body.originalPrice,
      salePrice: req.body.salePrice,
      variants: JSON.parse(req.body.variants || '[]')
    };

   
    if (req.files && req.files.length > 0) {
      productData.images = req.files.map(file => file.path);
    } else if (req.body.images) {
  
      productData.images = Array.isArray(req.body.images) 
        ? req.body.images 
        : [req.body.images];
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      productData,
      { new: true }
    ).populate('category');

    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error('Update error:', error);
    res.status(400).json({ message: error.message });
  }
};

const toggleProductListing = async (req, res) => {
  try {
      const { id } = req.params;
      const { isListed } = req.body;

      // Validate that isListed is a boolean
      if (typeof isListed !== 'boolean') {
          return res.status(400).json({ 
              message: 'isListed must be a boolean value' 
          });
      }

      const updatedProduct = await Product.findByIdAndUpdate(
          id,
          { isListed },
          { new: true, runValidators: true }
      ).populate('category');

      if (!updatedProduct) {
          return res.status(404).json({ 
              message: 'Product not found' 
          });
      }

      res.status(200).json({
          message: `Product ${isListed ? 'listed' : 'unlisted'} successfully`,
          product: updatedProduct
      });
  } catch (error) {
      console.error('Error toggling product listing:', error);
      res.status(500).json({ 
          error: 'Failed to update product listing status' 
      });
  }
};

const getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const category = await Category.findOne({
      _id: categoryId,
      isActive: true,
      isDeleted: false
    });

    const query = {
      category: new mongoose.Types.ObjectId(categoryId),
      isListed: true,
      isDeleted: false
    };

    const products = await Product.find(query)
  .select('name originalPrice salePrice images'); // Add this line

    res.status(200).json({ category, products });
  } catch (error) {
    console.error('Error in getProductsByCategory:', error);
    res.status(500).json({ error: error.message });
  }
};

const getProductById = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findOne({
      _id: productId,
      isListed: true,
      isDeleted: false
    }).select('name originalPrice salePrice category images description variants rating reviews');

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.status(200).json(product);
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    res.status(500).json({ error: error.message });
  }
};

const updateProductStock = async (productId,quantity) => {
  try {
    const product = await Product.findById(productId);

    if(!product) {
      throw new Error('Product not found');
    } 

    if(product.stock < quantity) {
      throw new Error (`Insufficient stock. Available: ${product.stock}`)
    }

    product.stock -= quantity;
    await product.save();

  } catch (error) {
    res.status(500).json('There is an errorrr',error)
  }
}

export { getProducts, addProduct, editProduct, softDeleteProduct, deleteProduct,getCategories , updateProduct, toggleProductListing, getProductsByCategory, getProductById, updateProductStock};
