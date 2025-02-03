import Order from '../../models/Order.js';
import Cart from '../../models/Cart.js';
import Wallet from '../../models/Wallet.js';
import Product from '../../models/Product.js';
import axios from 'axios';

const createOrder = async (req, res) => {
    try {
        const { addressId, paymentMethod, items, totalAmount } = req.body;
        const userId = req.user.id;

        if (!addressId || !paymentMethod || !items || !totalAmount) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        for (const item of items) {
            await Product.findByIdAndUpdate(
                item.productId,
                { $inc: { stock: -item.quantity } },
                { new: true }
            );
        }

        const newOrder = new Order({
            userId,
            addressId,
            paymentMethod,
            items,
            totalAmount,
        });

        await newOrder.save();

   
        await Cart.findOneAndUpdate(
            { userId },
            { items: [], totalAmount: 0 }
        );

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            orderId: newOrder._id,
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order',
        });
    }
};

const getOrders = async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user.id })
            .populate('items.productId')
            .populate('addressId')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            orders,
            pagination: {
                totalPages: 1,
                currentPage: 1,
                hasNextPage: false,
                hasPrevPage: false
            }
        });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching orders'
        });
    }
};

const getOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findOne({ _id: orderId })
            .populate('items.productId')
            .populate('addressId');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (order.userId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this order'
            });
        }

        res.status(200).json({
            success: true,
            order
        });
    } catch (error) {
        console.error('Get order details error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching order details'
        });
    }
};

const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;
        const userId = req.user.id;

        const order = await Order.findOne({ _id: orderId, userId })
            .populate('items.productId')
            .populate('addressId');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (order.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Order cannot be cancelled in current status'
            });
        }

        const refundAmount = calculateRefundAmount(order);

       
        if (order.paymentMethod === 'online' || order.paymentMethod === 'wallet') {
            try {
             
                const wallet = await Wallet.findOne({ userId });
                if (!wallet) {
                    return res.status(404).json({
                        success: false,
                        message: 'Wallet not found'
                    });
                }

                const refundResponse = await axios.post(`${process.env.API_URL}/api/wallet/refund`, {
                    amount: refundAmount,
                    orderId: order._id.toString(),
                    userId: userId
                });

                if (!refundResponse.data.success) {
                    throw new Error('Refund processing failed');
                }

                order.refundStatus = 'processed';
                order.refundAmount = refundAmount;
            } catch (error) {
                console.error('Refund processing error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error processing refund'
                });
            }
        }

     
        for (const item of order.items) {
            await Product.findByIdAndUpdate(
                item.productId._id,
                { $inc: { stock: item.quantity } }
            );
        }

      
        order.status = 'cancelled';
        order.cancellationReason = reason;
        order.cancelledAt = new Date();

        
        order.items.forEach(item => {
            item.status = 'cancelled';
            item.cancellationReason = reason;
        });

        await order.save();

        res.status(200).json({
            success: true,
            message: 'Order cancelled successfully',
            order
        });
    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({
            success: false,
            message: 'Error cancelling order'
        });
    }
};

const cancelOrderItem = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { itemId, reason } = req.body;
        const userId = req.user.id;

        const order = await Order.findOne({ _id: orderId, userId })
            .populate('items.productId');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const item = order.items.find(item => item._id.toString() === itemId);

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in order'
            });
        }

        if (item.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'Item cannot be cancelled in current status'
            });
        }

        const refundAmount = calculateItemRefundAmount(order, item);

      
        if (order.paymentMethod === 'online' || order.paymentMethod === 'wallet') {
            try {
            
                const wallet = await Wallet.findOne({ userId });
                if (!wallet) {
                    return res.status(404).json({
                        success: false,
                        message: 'Wallet not found'
                    });
                }

                const refundResponse = await axios.post(`${process.env.API_URL}/api/wallet/refund`, {
                    amount: refundAmount,
                    orderId: order._id.toString(),
                    userId: userId
                });

                if (!refundResponse.data.success) {
                    throw new Error('Refund processing failed');
                }

                item.refundStatus = 'processed';
                item.refundAmount = refundAmount;
            } catch (error) {
                console.error('Refund processing error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error processing refund'
                });
            }
        }

        
        await Product.findByIdAndUpdate(
            item.productId._id,
            { $inc: { stock: item.quantity } }
        );

     
        item.status = 'cancelled';
        item.cancellationReason = reason;
        item.cancelledAt = new Date();

      
        const allItemsCancelled = order.items.every(item => item.status === 'cancelled');
        if (allItemsCancelled) {
            order.status = 'cancelled';
        }

        await order.save();

        res.status(200).json({
            success: true,
            message: 'Item cancelled successfully',
            order
        });
    } catch (error) {
        console.error('Cancel item error:', error);
        res.status(500).json({
            success: false,
            message: 'Error cancelling item'
        });
    }
};

const calculateRefundAmount = (order) => {
    const subtotal = order.items.reduce((total, item) => {
        return total + (item.price * item.quantity);
    }, 0);

    const discountProportion = order.totalAmount / subtotal;

    const refundAmount = order.items.reduce((total, item) => {
        return total + (item.price * item.quantity * discountProportion);
    }, 0);

    return Math.round(refundAmount * 100) / 100;
};

const calculateItemRefundAmount = (order, item) => {
    const subtotal = order.items.reduce((total, item) => {
        return total + (item.price * item.quantity);
    }, 0);

    const discountProportion = order.totalAmount / subtotal;
    const refundAmount = item.price * item.quantity * discountProportion;

    return Math.round(refundAmount * 100) / 100;
};

export {
    cancelOrder,
    cancelOrderItem,
    getOrder,
    getOrders,
    createOrder,
    calculateItemRefundAmount,
    calculateRefundAmount
};
