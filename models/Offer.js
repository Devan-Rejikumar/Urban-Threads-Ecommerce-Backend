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
    discountValue: {
        type: Number,
        required: true,
        min: 0,
        max: 100
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
    }
}, {
    timestamps: true
});

export default mongoose.model('Offer', offerSchema);