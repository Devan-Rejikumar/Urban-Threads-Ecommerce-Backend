import express from 'express';
import {
    createOffer,
    getOffers,
    getOffer,
    updateOffer,
    deleteOffer
} from "../controllers/admin/offerController.js";

import { verifyAdminTokens } from '../middleware/adminMiddleware.js';

const router = express.Router();

router.post('/', verifyAdminTokens, createOffer);
router.get('/', verifyAdminTokens, getOffers);
router.get('/:id', verifyAdminTokens, getOffer);
router.put('/:id', verifyAdminTokens ,updateOffer);
router.delete('/:id', verifyAdminTokens, deleteOffer);

export default router;