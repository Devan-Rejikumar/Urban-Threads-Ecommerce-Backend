import Coupon from "../../models/Coupons.js";  // Changed from Coupons to Coupon
import Cart from "../../models/Cart.js";

export const applyCoupon = async (req, res) => {
    try {
        const { code, cartTotal } = req.body;
        console.log('Received coupon request:', { code, cartTotal }); // Debug log

        if (!code || cartTotal === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Coupon code and cart total are required'
            });
        }

        const coupon = await Coupon.findOne({
            code: code.toUpperCase(),
            isActive: true
        });

        console.log('Found coupon:', coupon); // Debug log

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Invalid or expired coupon'
            });
        }

        let discountAmount = 0;
        if (coupon.discountType === 'percentage') {
            discountAmount = (cartTotal * coupon.discountAmount) / 100;
            if (coupon.maxDiscount) {
                discountAmount = Math.min(discountAmount, coupon.maxDiscount);
            }
        } else {
            discountAmount = Math.min(coupon.discountAmount, cartTotal);
        }

        res.status(200).json({
            success: true,
            coupon,
            discountAmount
        });

    } catch (error) {
        console.error('Coupon application error:', error); // Debug log
        res.status(500).json({
            success: false,
            message: 'Error applying coupon',
            error: error.message
        });
    }
}

export const removeCoupon = async (req, res) => {
    try {
        const userId = req.user.id;
        const cart = await Cart.findOne({ userId });

        cart.couponCode = null;
        cart.discount = 0;
        await cart.save();

        res.status(200).json({ success: true, cart });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}