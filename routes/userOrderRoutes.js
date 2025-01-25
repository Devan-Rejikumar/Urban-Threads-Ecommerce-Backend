import express from 'express';
import { createOrder, getOrders, getOrderDetails, cancelOrder, cancelOrderItem } from '../controllers/orderController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/orders', verifyToken, createOrder);
router.get('/orders', verifyToken, getOrders);
router.get('/orders/:orderId', verifyToken, getOrderDetails);
router.post('/orders/:orderId/cancel', verifyToken, cancelOrder);
router.post('/orders/:orderId/cancel-item', verifyToken, cancelOrderItem);

export default router;
