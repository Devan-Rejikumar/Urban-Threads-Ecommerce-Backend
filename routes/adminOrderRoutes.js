import express from 'express';
import { getOrders, handleReturnRequest, updateOrderStatus } from '../controllers/admin/adminOrderController.js';
import { verifyAdminTokens } from '../middleware/adminMiddleware.js';

const router = express.Router();

router.get('/admin/orders', verifyAdminTokens, getOrders);
router.patch('/admin/orders/:orderId/status', verifyAdminTokens, updateOrderStatus);
router.post('/admin/orders/:orderId/accept-return', verifyAdminTokens, handleReturnRequest);
router.post('/admin/orders/:orderId/reject-return', verifyAdminTokens, handleReturnRequest);

export default router;
