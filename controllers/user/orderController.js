import Order from '../../models/Order.js';
import Cart from '../../models/Cart.js';
import Wallet from '../../models/Wallet.js';

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

        // Reduce stock for each product
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

        // Clear the user's cart after successful order
        await Cart.findOneAndUpdate(
            { userId },
            { items: [], totalAmount: 0 }
        );

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            orderId: newOrder.orderId,
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
        const order = await Order.findOne({ orderId })
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

// const cancelOrder = async (req, res) => {
//     try {
//         const { orderId } = req.params;
//         const { reason } = req.body;


//         if (!reason?.trim()) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Cancellation reason is required'
//             });
//         }
//         const order = await Order.findOne({ orderId });

//         if (!order) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Order not found'
//             });
//         }

//         if (order.status !== 'pending') {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Only pending orders can be cancelled'
//             });
//         }

//         const refundAmount = order.totalAmount;

//         if (order.paymentMethod === 'online') {
//             let wallet = await Wallet.findOne({ userId: order.userId });
//             if (!wallet) {
//                 wallet = new Wallet({ userId: order.userId, balance: 0 });
//             }
//             wallet.transactions.push({
//                 amount: refundAmount,
//                 type: 'credit',
//                 source: 'order_refund',
//                 orderId: order.orderId,
//                 description: `Refund for cancelled order ${order.orderId}`,
//                 status: 'completed',
//                 balance: wallet.balance + refundAmount
//             });

//             wallet.balance += refundAmount;
//             await wallet.save();
//         }

//         order.status = 'cancelled';
//         order.cancellationReason = reason;
//         order.items = order.items.map(item => ({
//             ...item.toObject(),
//             status: 'cancelled',
//             cancellationReason: reason,
//             refundStatus: order.paymentMethod === 'online' ? 'processed' : 'not_applicable',
//             refundAmount: order.paymentMethod === 'online' ? (item.price * item.quantity) : 0
//         }));

//         await order.save();

//         res.status(200).json({
//             success: true,
//             message: 'Order cancelled successfully',
//             order
//         });
//     } catch (error) {
//         console.error('Cancel order error:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Error cancelling order'
//         });
//     }
// };

const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;
        const userId = req.user.id;

        console.log('Cancel order requestsaaaaaaaaaaaaaaaa:', { orderId, reason }); 

        if (!reason?.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Cancellation reason is required'
            });
        }

        const order = await Order.findOne({ orderId });
        console.log('Found ordersssssssssssssssss:', order);


        // if (!order) {
        //     return res.status(404).json({
        //         success: false,
        //         message: 'Order not found'
        //     });
        // }

        // if (order.status !== 'pending') {
        //     return res.status(400).json({
        //         success: false,
        //         message: 'Only pending orders can be cancelled'
        //     });
        // }

        if (!order || order.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: order ? 'Only pending orders can be cancelled' : 'Order not found'
            });
        }

        // Process refund for online payments
        if (order.paymentMethod === 'online') {
            const refundAmount = order.totalAmount;
            console.log('Processing refundddddddddd:', { refundAmount });

            // Find or create wallet
            let wallet = await Wallet.findOne({ userId });
            console.log('Found walletttttttttttttt:', wallet);
            if (!wallet) {
                wallet = new Wallet({ userId, balance: 0, transactions : [] });
            }

            console.log('Created new wallet:', wallet);

            const transaction = {
                amount: refundAmount,
                type: 'credit',
                source: 'order_refund',
                orderId: order.orderId,
                description: `Refund for cancelled order ${order.orderId}`,
                status: 'completed',
                balance: wallet.balance + refundAmount
            };

            wallet.transactions.push(transaction);
            wallet.balance += refundAmount;
            console.log('Updated walletttttttttttttttt:', { 
                newBalance: wallet.balance,
                transaction: transaction
            });
            await wallet.save();

            // Update order refund status
            order.refundStatus = 'processed';
            order.refundAmount = refundAmount;
        }

        // Update order status
        order.status = 'cancelled';
        order.cancellationReason = reason;
        order.items = order.items.map(item => ({
            ...item.toObject(),
            status: 'cancelled',
            cancellationReason: reason,
            refundStatus: order.paymentMethod === 'online' ? 'processed' : 'not_applicable',
            refundAmount: order.paymentMethod === 'online' ? (item.price * item.quantity) : 0
        }));

        await order.save();
        console.log('Saved orderrrrrrrrrrrrrrrr:', order);

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

        if (!reason.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Cancellation reason is required'
            });
        }

        const order = await Order.findOne({ orderId }).populate('items.productId');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Verify user owns this order
        if (order.userId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to modify this order'
            });
        }

        // Check if order is cancellable
        if (order.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Only items from pending orders can be cancelled'
            });
        }

        // Find the item
        const itemIndex = order.items.findIndex(item =>
            item._id.toString() === itemId && item.status === 'active'
        );

        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Active item not found in order'
            });
        }

        // Calculate refund amount
        const refundAmount = order.items[itemIndex].price * order.items[itemIndex].quantity;

        // Update item status
        order.items[itemIndex].status = 'cancelled';
        order.items[itemIndex].cancellationReason = reason;

        // Process refund for online/wallet payments
        if (order.paymentMethod === 'online' || order.paymentMethod === 'wallet') {
            // Find or create wallet
            let wallet = await Wallet.findOne({ userId: order.userId });
            if (!wallet) {
                wallet = new Wallet({ userId: order.userId, balance: 0 });
            }

            // Add transaction
            wallet.transactions.push({
                amount: refundAmount,
                type: 'credit',
                source: 'order_refund',
                orderId: order.orderId,
                description: `Refund for cancelled item in order ${order.orderId}`,
                status: 'completed',
                balance: wallet.balance + refundAmount
            });

            // Update wallet balance
            wallet.balance += refundAmount;
            await wallet.save();

            // Update order refund status
            order.items[itemIndex].refundStatus = 'processed';
            order.items[itemIndex].refundAmount = refundAmount;
        }

        // Check if all items are cancelled
        const activeItems = order.items.filter(item => item.status === 'active');
        if (activeItems.length === 0) {
            order.status = 'cancelled';
        }

        // Recalculate total amount
        order.totalAmount = activeItems.reduce((total, item) =>
            total + (item.price * item.quantity), 0
        );

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

export {
    cancelOrder,
    cancelOrderItem,
    getOrder,
    getOrders,
    createOrder
};
