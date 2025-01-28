// routes/walletRoutes.js
import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { getWalletDetails, addMoneyToWallet,getTransactionHistory } from '../controllers/user/walletController.js';

const router = express.Router();


router.get('/', verifyToken, getWalletDetails);
router.post('/add', verifyToken, addMoneyToWallet);
router.get('/transactions', verifyToken, getTransactionHistory);

export default router;