import Coupons from "../../models/Coupons.js";
import Cart from "../../models/Cart.js";

export const applyCoupon = async (req, res) => {
    try {
        const { code } = req.body;
        const userId = req.user.id;

        // Find valid coupon
        const coupon = await Coupons.findOne({
            code: code.toUpperCase(),
            isActive: true,
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() },
            $or: [
                { maxUses: null },
                { $expr: { $lt: ["$usedCount", "$maxUses"] }}
            ]
        });

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Invalid or expired coupon'
            });
        }

        // Find user's cart
        const cart = await Cart.findOne({ userId });
        
        if (!cart || cart.totalAmount < coupon.minimumPurchase) {
            return res.status(400).json({
                success: false,
                message: `Minimum purchase amount of ${coupon.minimumPurchase} required`
            });
        }

        // Calculate discount
        let discount = 0;
        if (coupon.discountType === 'percentage') {
            discount = (cart.totalAmount * coupon.discountAmount) / 100;
            if (coupon.maxDiscount) {
                discount = Math.min(discount, coupon.maxDiscount);
            }
        } else {
            discount = Math.min(coupon.discountAmount, cart.totalAmount); // Can't discount more than total
        }

        // Update cart with discount
        cart.couponCode = code;
        cart.discount = discount;
        cart.finalAmount = cart.totalAmount - discount;
        await cart.save();

        // Increment coupon usage
        await Coupons.findByIdAndUpdate(coupon._id, {
            $inc: { usedCount: 1 }
        });

        res.status(200).json({
            success: true,
            cart: {
                ...cart.toObject(),
                totalAmount: cart.totalAmount,
                discount: cart.discount,
                finalAmount: cart.finalAmount
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
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

export const getAvailableCoupons = async (req,res) => {
    try {
        const coupons = await Coupons.find({
            isActive : true,
            startDate : { $lte : new Date() },
            endDate : { $gte : new Date ()},
            $or : [
                { maxUses : null },
                { $expr: { $lt: ["$usedCount", "$maxUses"] }}
            ]
        }).select('code discountAmount minimumPurchase maxDiscount')
        res.status(200).json({
            success: true,
            coupons
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}
