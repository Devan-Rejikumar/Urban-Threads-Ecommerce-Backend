
import mongoose from "mongoose";
import Category from "../../models/Category.js";
import Product from "../../models/Products.js";
import { v2 as cloudinary } from 'cloudinary';


const getProducts = async (req, res) => {
    try {
        console.log('getproducts')
        const products = await Product.find().populate('category', 'name');  
        console.log(products)
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
        base64Images.map(async (base64Image) => {
      
          const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
          
     
          const buffer = Buffer.from(base64Data, 'base64');
  
        
          return new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
              { resource_type: 'image' },
              (error, result) => {
                if (error) {
                  return reject(error);
                }
                resolve(result.secure_url); 
              }
            ).end(buffer); 
          });
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
      const { name, category, description, variants, images, originalPrice, salePrice } = req.body;

      console.log('Received product data:', {
        name: req.body.name,
        category: req.body.category,
        isListed: req.body.isListed
      });
  
      // Parse variants if it's a string
      let parsedVariants;
      try {
        parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
      } catch (error) {
        return res.status(400).json({
          message: 'Invalid variants format',
          error: error.message
        });
      }
  
      // Validate variants
      if (!parsedVariants || !Array.isArray(parsedVariants) || parsedVariants.length === 0) {
        return res.status(400).json({
          message: 'At least one variant is required',
          receivedVariants: variants
        });
      }
  
      // Process variants
      const processedVariants = parsedVariants.map((variant) => ({
        size: variant.size,
        color: variant.color,
        stock: Number(variant.stock)
      }));
  
      // Upload images
      const imageUrls = await uploadBase64ImagesToCloudinary(images);
  
      const newProduct = new Product({
        name,
        category,
        description,
        variants: processedVariants,
        images: imageUrls,
        originalPrice,
        salePrice,
      });
  
      await newProduct.save();
  
      res.status(201).json({
        message: 'Product added successfully',
        product: newProduct,
      });
    } catch (error) {
      console.error('Error adding product:', error);
      res.status(400).json({ error: error.message });
    }
  };
  

const getCategories = async(req,res)=>{
    try {
        const categories = await Category.find()
        return res.status(200).json(categories)
    } catch (error) {
        console.log('getcategories',error)
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
    console.log('Searching for category:', categoryId);

    const category = await Category.findOne({
      _id: categoryId,
      isActive: true,
      isDeleted: false
    });
    console.log('Found category:', category);

    const query = {
      category: new mongoose.Types.ObjectId(categoryId),
      isListed: true,
      isDeleted: false
    };
    console.log('Product search query:', query);

    const products = await Product.find(query)
  .select('name originalPrice salePrice images'); // Add this line
    console.log('Raw products found:', products);

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
    }).select('name originalPrice salePrice images description variants rating reviews');

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.status(200).json(product);
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    res.status(500).json({ error: error.message });
  }
};

export { getProducts, addProduct, editProduct, softDeleteProduct, deleteProduct,getCategories , updateProduct, toggleProductListing, getProductsByCategory, getProductById};
