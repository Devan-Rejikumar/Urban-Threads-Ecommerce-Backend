import mongoose from 'mongoose';
import Category from '../../models/Category.js';
import Product from '../../models/Products.js';
import Offer from '../../models/Offer.js';


const priceCalculator = {
    calculateDiscountedPrice: (originalPrice, offer) => {
        if (!offer || !offer.discountValue || originalPrice <= 0) return Math.round(originalPrice);
        const discountedAmount = (originalPrice * offer.discountValue) / 100;
        return Math.round(Math.max(0, originalPrice - discountedAmount));
    },

    getBestOfferPrice: (originalPrice, productOffer, categoryOffer) => {
        if (!productOffer && !categoryOffer) return Math.round(originalPrice);
        
        const productDiscountedPrice = productOffer ? 
            priceCalculator.calculateDiscountedPrice(originalPrice, productOffer) : originalPrice;
        const categoryDiscountedPrice = categoryOffer ? 
            priceCalculator.calculateDiscountedPrice(originalPrice, categoryOffer) : originalPrice;
        
        return Math.round(Math.min(productDiscountedPrice, categoryDiscountedPrice));
    },

    async updateCategoryProductPrices(categoryId, categoryOffer) {
        try {
            const products = await Product.find({ 
                category: categoryId,
                isDeleted: false,
            }).populate('currentOffer');

            const updatePromises = products.map(async (product) => {
                const salePrice = priceCalculator.getBestOfferPrice(
                    product.originalPrice,
                    product.currentOffer,
                    categoryOffer
                );

                return Product.findByIdAndUpdate(
                    product._id,
                    { salePrice: Math.round(salePrice) },
                    { new: true }
                );
            });

            return await Promise.all(updatePromises);
        } catch (error) {
            console.error('Error updating category product prices:', error);
            throw error;
        }
    }
};

export const createOffer = async (req, res) => {
    try {
        const { name, description, discountValue, applicableType, applicableId } = req.body;

        // Validate discount value
        if (discountValue < 0 || discountValue > 100) {
            return res.status(400).json({
                success: false,
                message: 'Discount value must be between 0 and 100'
            });
        }

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
        });

        if (existingOffer) {
            return res.status(400).json({
                success: false,
                message: `Active offer already exists for this ${applicableType}`
            });
        }

        // Create new offer
        const offer = new Offer({
            name,
            description,
            discountValue,
            applicableType,
            applicableId
        });

        await offer.save();

        if (applicableType === 'product') {
            // Find category offer if exists
            const category = await Category.findById(target.category)
                .select('currentOffer')
                .populate('currentOffer');
            
            const categoryOffer = category?.currentOffer;
            const bestPrice = priceCalculator.getBestOfferPrice(
                target.originalPrice,
                offer,
                categoryOffer
            );

            await Product.findByIdAndUpdate(applicableId, {
                currentOffer: offer._id,
                salePrice: bestPrice
            });
        } else {
            // Update category with offer
            await Category.findByIdAndUpdate(applicableId, {
                currentOffer: offer._id
            });
            
            // Update all products in category
            await priceCalculator.updateCategoryProductPrices(applicableId, offer);
        }

        res.status(201).json({
            success: true,
            message: 'Offer created successfully',
            offer
        });
    } catch (error) {
        console.error('Error creating offer:', error);
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

        if (offer.applicableType === 'product') {
            // Find the product
            const product = await Product.findById(offer.applicableId)
                .populate('category');

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            // Check if category has an active offer
            const categoryOffer = await Offer.findOne({
                applicableType: 'category',
                applicableId: product.category,
            });

            // Calculate new sale price
            const newSalePrice = categoryOffer ? 
                priceCalculator.calculateDiscountedPrice(product.originalPrice, categoryOffer) : 
                product.originalPrice;

            // Update product
            await Product.findByIdAndUpdate(product._id, {
                $unset: { currentOffer: "" },
                salePrice: newSalePrice
            });
        } else {
            // For category offer, update all products
            const products = await Product.find({ 
                category: offer.applicableId,
                isActive: true,
                isDeleted: false
            }).populate('currentOffer');

            // Update products
            const updatePromises = products.map(async (product) => {
                const newSalePrice = product.currentOffer ? 
                    priceCalculator.calculateDiscountedPrice(
                        product.originalPrice, 
                        product.currentOffer
                    ) : 
                    product.originalPrice;

                return Product.findByIdAndUpdate(product._id, { 
                    salePrice: newSalePrice 
                });
            });

            await Promise.all(updatePromises);

            // Remove offer from category
            await Category.findByIdAndUpdate(offer.applicableId, {
                $unset: { currentOffer: "" }
            });
        }

        // Delete the offer
        await offer.deleteOne();

        res.json({
            success: true,
            message: 'Offer deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting offer:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Other existing methods like getOffers, getOffer, updateOffer can remain the same
export const getOffers = async (req, res) => {
    try {
        const offers = await Offer.find();
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
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid offer ID format'
            });
        }

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
        console.error('Error fetching offer:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
export const updateOffer = async (req, res) => {
    try {
        const { name, description, discountValue } = req.body;

        const offer = await Offer.findById(req.params.id);
        if (!offer) {
            return res.status(404).json({
                success: false,
                message: 'Offer not found'
            });
        }

        offer.name = name;
        offer.description = description;
        offer.discountValue = discountValue;
        await offer.save();

        // Recalculate prices if necessary
        if (offer.applicableType === 'product') {
            const product = await Product.findById(offer.applicableId)
                .populate('category');
            
            const categoryOffer = await Offer.findOne({
                applicableType: 'category',
                applicableId: product.category,
            });

            const bestPrice = priceCalculator.getBestOfferPrice(
                product.originalPrice,
                offer,
                categoryOffer
            );

            await Product.findByIdAndUpdate(product._id, {
                salePrice: bestPrice
            });
        } else {
            // Recalculate prices for all products in category
            await priceCalculator.updateCategoryProductPrices(offer.applicableId, offer);
        }

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