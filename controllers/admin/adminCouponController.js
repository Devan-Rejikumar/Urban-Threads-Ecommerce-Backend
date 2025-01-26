import Coupons from "../../models/Coupons.js";

export const createCoupon = async (req , res) => {
    try {
        const {code, discountType, discountAmount, minimumPurchase, maxDiscount, startDate, endDate, maxUses} = req.body;

        const coupon = new Coupons({
            code : code.toUpperCase(),
            discountType,
            discountAmount,
            minimumPurchase,
            maxDiscount,
            startDate,
            endDate,
            maxUses
        });

        await coupon.save();
        res.status(200).json({success : true, coupon});
    } catch (error) {
        res.status(400).json({success : false, message : error.message});

    }
}

export const getAllCoupons = async (req , res) => {
    try {
        const coupons = await Coupons.find({});
        res.status(200).json({success : true, coupons})
    } catch (error) {
        res.status(500).json({success : false,message : error.message })
    }
}

export const deleteCoupon = async (req , res) => {
    try {
        await Coupons.findByIdAndDelete(req.params.id);
        res.status(200).json({success : true , message : 'Coupons deleted successfully'})
    } catch (error) {
        res.status(500).json({success : false, message : error.message});
    }
}

export const updateCoupon = async (req, res) => {
    try {
        const coupon = await Coupons.findByIdAndUpdate(
            req.params.id,
            {$set : req.body},
            {new : true}
        )
        res.status(200).json({success : true, coupon})
    } catch (error) {
        res.status(500).json({success : false , message : "Error updating message"})
    }
}