
import Order from "../../models/Order.js";

export const getOrders = async (req, res) => {
    try {
        
        console.log('Admin making request:', req.admin);
        
        const { status = 'All' } = req.query;
        
        const query = status !== 'All' ? { status: status.toLowerCase() } : {};

        const orders = await Order.find(query)
            .populate('userId', 'firstName email')
            .populate('items.productId')
            .populate('addressId')
            .sort({ createdAt: -1 });

        console.log('Found orders:', orders.length);

        res.status(200).json({ 
            success: true, 
            orders 
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// Update order status
export const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        order.status = status.toLowerCase();
        await order.save();

        res.status(200).json({
            success: true,
            message: 'Order status updated successfully',
            order
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};