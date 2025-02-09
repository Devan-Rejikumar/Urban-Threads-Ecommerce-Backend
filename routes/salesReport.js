import express from 'express';
import {
    generateSalesReport,
    downloadReport
} from '../controllers/admin/reportController.js';

import { verifyAdminTokens } from '../middleware/adminMiddleware.js';

const router = express.Router();

router.get('/sales-report', verifyAdminTokens, generateSalesReport);
router.get('/download-report/:format', verifyAdminTokens, downloadReport);

export default router;