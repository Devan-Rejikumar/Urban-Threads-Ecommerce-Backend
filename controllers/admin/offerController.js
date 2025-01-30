import Category from '../../models/Category.js';
import Product from '../../models/Products.js';
import { Offer } from '../../models/Index.js';

export const createOffer = async (req, res) => {
    try {
        const {
            name,
            description,
            discountType,
            discountValue,
            startDate,
            endDate,
            applicableType,
            applicableId,
            minPurchaseAmount,
            maxDiscountAmount
        } = req.body;

        // Check if target exists
        const Model = applicableType === 'product' ? Product : Category;
        const target = await Model.findById(applicableId);
        
        if (!target) {
            return res.status(404).json({
                success: false,
                message: `${applicableType} not found`
            });
        }

        // Check for existing active offer
        const existingOffer = await Offer.findOne({
            applicableType,
            applicableId,
            isActive: true,
            endDate: { $gt: new Date() }
        });

        if (existingOffer) {
            return res.status(400).json({
                success: false,
                message: `Active offer already exists for this ${applicableType}`
            });
        }

        const offer = new Offer({
            name,
            description,
            discountType,
            discountValue,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            applicableType,
            applicableId,
            minPurchaseAmount,
            maxDiscountAmount
        });

        await offer.save();

        // Update product/category with offer reference
        await Model.findByIdAndUpdate(applicableId, {
            $set: { currentOffer: offer._id }
        });

        res.status(201).json({
            success: true,
            message: 'Offer created successfully',
            offer
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const getOffers = async (req, res) => {
    try {
        console.log('kkkkkkkkk  ')
        const offers = await Offer.find()
        
            console.log("jjjjjjggggg",offers)

        res.status(200).json({
            success: true,
            offers
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const getOffer = async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id)
            .populate({
                path: 'applicableId',
                select: 'name'
            });

        if (!offer) {
            return res.status(404).json({
                success: false,
                message: 'Offer not found'
            });
        }

        res.json({
            success: true,
            offer
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const updateOffer = async (req, res) => {
    try {
        const {
            name,
            description,
            discountType,
            discountValue,
            startDate,
            endDate,
            minPurchaseAmount,
            maxDiscountAmount,
            isActive
        } = req.body;

        const offer = await Offer.findById(req.params.id);
        if (!offer) {
            return res.status(404).json({
                success: false,
                message: 'Offer not found'
            });
        }

        offer.name = name;
        offer.description = description;
        offer.discountType = discountType;
        offer.discountValue = discountValue;
        offer.startDate = new Date(startDate);
        offer.endDate = new Date(endDate);
        offer.minPurchaseAmount = minPurchaseAmount;
        offer.maxDiscountAmount = maxDiscountAmount;
        offer.isActive = isActive;

        await offer.save();

        res.json({
            success: true,
            message: 'Offer updated successfully',
            offer
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const deleteOffer = async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id);
        if (!offer) {
            return res.status(404).json({
                success: false,
                message: 'Offer not found'
            });
        }

        // Remove offer reference from product/category
        const Model = offer.applicableType === 'product' ? Product : Category;
        await Model.findByIdAndUpdate(offer.applicableId, {
            $unset: { currentOffer: "" }
        });

        await offer.deleteOne();

        res.json({
            success: true,
            message: 'Offer deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

