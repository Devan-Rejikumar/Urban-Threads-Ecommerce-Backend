import express from 'express';
import { createRazorpayOrder, verifyPayment } from '../controllers/user/paymentController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/create-order', verifyToken, createRazorpayOrder);
router.post('/verify-payment', verifyToken, verifyPayment);

export default router;