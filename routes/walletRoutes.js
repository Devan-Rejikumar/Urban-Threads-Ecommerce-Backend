
import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { getWalletDetails, addMoneyToWallet,getTransactionHistory, refundOrderAmount, debitWallet } from '../controllers/user/walletController.js';

const router = express.Router();


router.get('/', verifyToken, getWalletDetails);
router.post('/add', verifyToken, addMoneyToWallet);
router.get('/transactions', verifyToken, getTransactionHistory);
router.post('/refund', verifyToken, refundOrderAmount);
router.post('/debit',verifyToken,debitWallet)

export default router;