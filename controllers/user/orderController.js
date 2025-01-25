import Order from '../../models/Order.js';

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

const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findOne({ orderId: orderId });

        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: 'Order not found' 
            });
        }

        if (order.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Only pending orders can be cancelled'
            });
        }

       
        order.status = 'cancelled';
        order.items = order.items.map(item => ({
            ...item,
            status: 'cancelled',
            cancellationReason: 'Order cancelled by user'
        }));

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

        // Update item status
        order.items[itemIndex].status = 'cancelled';
        order.items[itemIndex].cancellationReason = reason;

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

        // Return updated order
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
    getOrders 
};
