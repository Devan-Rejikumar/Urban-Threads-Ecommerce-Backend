import express from 'express'
import wishlistController from '../controllers/user/wishlistController.js';
const { getWishlist, addToWishlist, removeFromWishlist } = wishlistController;
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();



router.use(verifyToken);

router.get('/', getWishlist);
router.post('/add', addToWishlist);
router.delete('/remove/:productId', removeFromWishlist);

export default router;