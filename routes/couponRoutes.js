import express from 'express';
import { isAdmin, verifyToken } from '../middleware/authMiddleware.js';
import { applyCoupon, removeCoupon } from '../controllers/user/userCouponController.js';
import { createCoupon, getAllCoupons, deleteCoupon, updateCoupon } from '../controllers/admin/adminCouponController.js';
const router = express.Router();

router.post('/admin/coupons', verifyToken, isAdmin, createCoupon);
router.get('/admin/coupons', verifyToken,isAdmin, getAllCoupons);
router.delete('/admin/coupons/:id', verifyToken,isAdmin, deleteCoupon);
router.put('/admin/coupons/:id', verifyToken,isAdmin, updateCoupon);

router.post('/apply-coupon', verifyToken, applyCoupon);
router.delete('/remove-coupon', verifyToken, removeCoupon);

export default router;

