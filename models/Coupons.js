import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
    code : {
        type : String,
        required : true,
        unique : true,
        uppercase : true
    },
    discountType : {
        type : String,
        required : true,
        enum : ['percentage','fixed']
    },
    discountAmount : {
        type : Number,
        required : true
    },
    minimumPurchase : {
        type: Number,
        default : 0
    },
    maxDiscount : {
        type : Number
    },
    startDate : {
        type : Date,
        required : true
    },
    endDate : {
        type : Date,
        required : true
    },
    maxUses : {
        type : Number,
        default : null
    },
    usedCount : {
        type : Number,
        default : 0
    },
    isActive : {
        type : Boolean,
        default : true
    }
}, {timestamps : true})

export default mongoose.model('Coupons', couponSchema);