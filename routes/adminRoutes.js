

import express from 'express';
import { verifyAdminTokens } from '../middleware/adminMiddleware.js';
import { 
    adminLogin, 
    getAllUsers, 
    blockUsers, 
    unblockUsers, 
    validateToken, 
    adminLogout,
    verifyAdminToken 
} from '../controllers/admin/adminController.js';

const router = express.Router();

// Public route
router.post('/adminLogin', adminLogin);

// Protected Routes - require admin authentication
router.get('/validate-token', verifyAdminTokens, validateToken);
router.get('/users', verifyAdminTokens, getAllUsers);
router.put('/users/:id/block', verifyAdminTokens, blockUsers);
router.put('/users/:id/unblock', verifyAdminTokens, unblockUsers);
router.post('/adminLogout', verifyAdminTokens, adminLogout);
router.get('/verify-adminToken', verifyAdminToken);

export default router;

