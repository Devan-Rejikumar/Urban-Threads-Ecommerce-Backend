import express from 'express';
import { createRazorpayOrder, verifyPayment,retryPayment, failedPayment } from '../controllers/user/paymentController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/create-order', verifyToken, createRazorpayOrder);
router.post('/verify-payment', verifyToken, verifyPayment);
router.post('/retry-payment', verifyToken, retryPayment);
router.post('/failed-payment', verifyToken, failedPayment);

export default router;