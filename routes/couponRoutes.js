import express from 'express';
import { verifyAdminTokens } from '../middleware/adminMiddleware.js';
import { applyCoupon, getAvailableCoupons, removeCoupon } from '../controllers/user/userCouponController.js';
import { createCoupon, getAllCoupons, deleteCoupon, updateCoupon } from '../controllers/admin/adminCouponController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
const router = express.Router();

router.post('/admin/coupons', verifyAdminTokens, createCoupon);
router.get('/admin/coupons', verifyAdminTokens, getAllCoupons);
router.delete('/admin/coupons/:id', verifyAdminTokens, deleteCoupon);
router.put('/admin/coupons/:id', verifyAdminTokens, updateCoupon);

router.post('/apply-coupon', verifyToken, applyCoupon);
router.delete('/remove-coupon', verifyToken, removeCoupon);
router.get('/coupons', verifyToken, getAvailableCoupons);

export default router;

