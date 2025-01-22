import Wishlist from "../../models/Wishlist.js";
import Product from '../../models/Products.js';


const getWishlist = async (req, res) => {
    try {
        let wishlist = await Wishlist.findOne({ user: req.user.id }).populate('products');

        if (!wishlist) {
            wishlist = await Wishlist.create({ user: req.user.id, products: [] });
        }

        res.json(wishlist.products);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching wishlist' });
    }
}

const addToWishlist = async (req, res) => {
    try {
        const { productId } = req.body;

        const product = await Product.findById(productId);
        if (!product || product.isDeleted || !product.isListed) {
            return res.status(404).json({ error: "Product not available" });
        }

        let wishlist = await Wishlist.findOne({ user: req.user.id });
        
        if (!wishlist) {
            wishlist = await Wishlist.create({ 
                user: req.user.id, 
                products: [productId] 
            });
        } else if (!wishlist.products.includes(productId)) {
            wishlist.products.push(productId);
            await wishlist.save();
        }

        // Populate and return just the products array
        const populatedWishlist = await Wishlist.findOne({ user: req.user.id })
            .populate('products');

        res.json(populatedWishlist.products); // Send just the products array
    } catch (error) {
        res.status(500).json({ error: 'Error adding to wishlist' });
    }
}

const removeFromWishlist = async (req, res) => {
    try {
        const { productId } = req.params;
        console.log('Attempting to remove product:', productId, 'for user:', req.user._id);
        const wishlist = await Wishlist.findOne({ user: req.user.id });

        if (!wishlist) {
            console.log('Wishlist not found');
            return res.status(404).json({ error: 'Wishlist not found' });
        }

        if (wishlist) {
            const productIndex = wishlist.products.findIndex(
                product => product.toString() === productId
            )
            if (productIndex === -1) {
                return res.status(404).json({ error: 'Product not in wishlist' });
            }
            wishlist.products.splice(productIndex, 1);
            await wishlist.save();
        }
        res.json({ message: 'Product removed from wishlist' });
    } catch (error) {
        res.status(500).json({ error: 'Error removing from wishlist' });
    }
};

export default { getWishlist, addToWishlist, removeFromWishlist };