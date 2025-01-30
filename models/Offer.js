import mongoose from "mongoose";

const offerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
        required: true
    },
    discountValue: {
        type: Number,
        required: true,
        min: 0,
        validate: {
            validator: function(value) {
                if (this.discountType === 'percentage') {
                    return value <= 100;
                }
                return value <= 1000000;
            },
            message: props => 
                props.value > 100 && props.this.discountType === 'percentage' 
                    ? 'Percentage discount cannot exceed 100%' 
                    : 'Fixed discount cannot exceed 1000000'
        }
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    applicableType: {
        type: String,
        enum: ['product', 'category'],
        required: true
    },
    applicableId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'applicableType',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    minPurchaseAmount: {
        type: Number,
        default: 0
    },
    maxDiscountAmount: {
        type: Number
    }
}, {
    timestamps: true
});

export default mongoose.model('Offer', offerSchema);