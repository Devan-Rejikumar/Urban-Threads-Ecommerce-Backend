import express from 'express';
import { getOrders, updateOrderStatus } from '../controllers/admin/adminOrderController.js';
import { verifyAdminTokens } from '../middleware/adminMiddleware.js';

const router = express.Router();

router.get('/admin/orders', verifyAdminTokens, getOrders);
router.patch('/admin/orders/:orderId/status', verifyAdminTokens, updateOrderStatus);

export default router;
