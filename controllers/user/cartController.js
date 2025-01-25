import Cart from "../../models/Cart.js";
import Product from '../../models/Products.js'


const addToCart = async (req, res) => {
    try {
        const { productId, selectedSize, quantity } = req.body;

        console.log('User from token:', req.user);


        const userId = req.user.id;

        const product = await Product.findById(productId);
        const variant = product.variants.find(v => v.size === selectedSize);

        if (!variant || variant.stock < quantity) {
            return res.status(400).json({ error: 'Insufficient stock' });

        }

        let cart = await Cart.findOne({ userId });

        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

        const existingItemIndex = cart.items.findIndex(
            item => item.productId.toString() === productId && item.selectedSize === selectedSize
        );

        if (existingItemIndex > -1) {
            const newQuantity = cart.items[existingItemIndex].quantity + quantity;
            if (newQuantity > variant.stock || newQuantity > 5) {
                return res.status(400).json({ error: 'Maximum quantity exceeded' });
            }
            cart.items[existingItemIndex].quantity = newQuantity;
        } else {
            cart.items.push({
                productId,
                selectedSize,
                quantity,
                price: product.salePrice || product.originalPrice
            });
        }
        cart.totalAmount = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
        await cart.save();
        res.json(cart);

    } catch (error) {
        console.error('Cart addition error:', error);
        res.status(500).json({ error: error.message });
    }
}

const updateCartQuantity = async (req, res) => {
    try {
        const { productId, selectedSize, quantity } = req.body;
        const userId = req.user.id;

        const product = await Product.findById(productId);
        const variant = product.variants.find(v => v.size === selectedSize);

        if (!variant || variant.stock < quantity || quantity > 5) {
            return res.status(400).json({ error: 'Invalid quantity' });
        }

        const cart = await Cart.findOne({ userId });
        const itemIndex = cart.items.findIndex(
            item => item.productId.toString() === productId && item.selectedSize === selectedSize
        );

        if (itemIndex > -1) {
            cart.items[itemIndex].quantity = quantity;
            cart.totalAmount = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0)
            await cart.save();
        }

        res.json(cart);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const removeFromCart = async (req, res) => {
    try {
        const { productId, selectedSize } = req.params;
        const userId = req.user.id;

        const cart = await Cart.findOne({ userId });
        cart.items = cart.items.filter(
            item => !(item.productId.toString() === productId && item.selectedSize === selectedSize)
        );
        cart.totalAmount = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
        await cart.save();
        res.json(cart);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const getCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ userId: req.user.id })
            .populate('items.productId', 'name images variants');
        const response = cart || { items: [], totalAmount: 0 };
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


export default { addToCart, updateCartQuantity, removeFromCart, getCart }