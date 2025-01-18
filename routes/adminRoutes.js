
import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { adminLogin, getAllUsers, blockUsers, unblockUsers, validateToken, adminLogout, verifyAdminToken } from '../controllers/admin/adminController.js';

const router = express.Router();

// Admin login route
router.post('/adminLogin', adminLogin);
router.get('/validate-token', verifyToken, validateToken);

// Protected Routes
router.get('/users', getAllUsers);
router.put('/users/:id/block', blockUsers);
router.put('/users/:id/unblock',  unblockUsers);
router.post('/adminLogout',adminLogout)
router.get('/verify-adminToken',verifyAdminToken)

export default router;


