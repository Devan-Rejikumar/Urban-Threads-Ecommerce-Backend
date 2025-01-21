import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import cartController from '../controllers/user/cartController.js';
const {getCart, addToCart, updateCartQuantity, removeFromCart} = cartController

const router = express.Router();


router.use(verifyToken)

router.get('/',getCart);
router.post('/add', addToCart);
router.put('/update-quantity', updateCartQuantity);
router.delete('/remove/:productId/:selectedSize', removeFromCart);


export default router;