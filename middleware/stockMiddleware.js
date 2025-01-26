import Product from "../models/Products.js";

const validateStock = async (req, res, next) => {
  try {
    const { items } = req.body;

    for (const item of items) {
      const product = await Product.findById(item.productId);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product ${item.productId} not found`
        });
      }

      const variant = product.variants.find(v => v.size === item.selectedSize);
      if (!variant) {
        return res.status(404).json({
          success: false,
          message: `Size ${item.selectedSize} not found for ${product.name}`
        });
      }

      if (variant.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name} in size ${item.selectedSize}`
        });
      }

      // Reduce stock
      variant.stock -= item.quantity;
      await product.save();
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export default validateStock;