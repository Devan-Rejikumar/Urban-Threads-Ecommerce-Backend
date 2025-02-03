import express from 'express';
import { getCategories, addCategories, updateCategory, deleteCategory, inactivateCategory, updateCategoryOffer, getProductsByCategory } from '../controllers/admin/categoryController.js';



const router = express.Router();


router.get('/',getCategories);
router.post('/',addCategories);
router.put('/:id',updateCategory);
router.patch('/:id', inactivateCategory);
router.delete('/:id',deleteCategory);
router.patch('/categories/:categoryId/offer', updateCategoryOffer);
router.get('/products/category/:categoryId', getProductsByCategory);

export default router;

