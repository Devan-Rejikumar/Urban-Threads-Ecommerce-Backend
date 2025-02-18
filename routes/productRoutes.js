import express from "express";
import {getProducts, addProduct, editProduct, deleteProduct,getCategories, updateProduct, toggleProductListing, getProductsByCategory, getProductById , validateCartItems} from "../controllers/admin/productController.js";
import upload from "../middleware/multer.js";
import { verifyAdminTokens } from "../middleware/adminMiddleware.js";

const router = express.Router();

router.get("/", getProducts); 
router.post("/", upload.array('images',10), addProduct); 
router.get('/categories',getCategories)
router.get("/category/:categoryId", getProductsByCategory);
router.get("/:productId", getProductById);
router.put('/:id', upload.array('images', 10), updateProduct);
router.patch('/:id', toggleProductListing);
router.delete("/:id", deleteProduct); 
router.post('/validate-cart',validateCartItems);
router.get('/', verifyAdminTokens, async (req, res) => {
    try {
        const products = await Product.find({ isDeleted: false })
            .select('name');
        res.json({
            success: true,
            products
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export default router;
