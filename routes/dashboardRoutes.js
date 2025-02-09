import express from 'express';
import { getDashboardStats } from '../controllers/admin/dashboardController.js';
import { verifyAdminTokens } from '../middleware/adminMiddleware.js';

const router = express.Router();

// Apply verifyAdminTokens middleware for admin verification
router.get('/stats', verifyAdminTokens, getDashboardStats);

export default router;
