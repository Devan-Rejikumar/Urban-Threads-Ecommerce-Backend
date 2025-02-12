import express from 'express';
import { createOrder, getOrders, getOrderDetails, cancelOrder, cancelOrderItem, generateInvoice, returnItem, requestReturn } from '../controllers/orderController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import validateStock from '../middleware/stockMiddleware.js';


const router = express.Router();

router.post('/orders', verifyToken, validateStock, createOrder);
router.get('/orders', verifyToken, getOrders);
router.get('/orders/:orderId', verifyToken, getOrderDetails);
router.post('/orders/:orderId/cancel', verifyToken, cancelOrder);
router.post('/orders/:orderId/cancel-item', verifyToken, cancelOrderItem);
router.post('/orders/:orderId/return', verifyToken, returnItem);
router.get('/orders/:orderId/invoice', verifyToken, generateInvoice);
router.post('/:orderId/return-request',verifyToken,requestReturn);




export default router;
