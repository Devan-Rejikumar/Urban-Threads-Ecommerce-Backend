import express from 'express';
import { getCategories, addCategories, updateCategory, deleteCategory, inactivateCategory, updateCategoryOffer, getProductsByCategory } from '../controllers/admin/categoryController.js';
import { verifyAdminTokens } from '../middleware/adminMiddleware.js';



const router = express.Router();


router.get('/',getCategories);
router.post('/',addCategories);
router.put('/:id',updateCategory);
router.patch('/:id', inactivateCategory);
router.delete('/:id',deleteCategory);
router.patch('/categories/:categoryId/offer', updateCategoryOffer);
router.get('/products/category/:categoryId', getProductsByCategory);
router.get('/', verifyAdminTokens, async (req, res) => {
    try {
        const categories = await Category.find({ isDeleted: false })
            .select('name');
        res.json({
            success: true,
            categories
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export default router;
