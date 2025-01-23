// controllers/adminOrderController.js
import Order from "../../models/Order.js";

// Get all orders for admin
export const getOrders = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        
        const query = status && status !== 'All' 
            ? { status } 
            : {};

        const orders = await Order.find(query)
            .populate('userId', 'name email')
            .populate('items.productId')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Order.countDocuments(query);

        res.status(200).json({ 
            success: true, 
            orders,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalOrders: total
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// Update order status
export const updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        
        const validStatusFlow = {
            'Pending': ['Processing', 'Cancelled'],
            'Processing': ['Shipped', 'Cancelled'],
            'Shipped': ['Delivered', 'Cancelled'],
            'Delivered': [],
            'Cancelled': []
        };

        const order = await Order.findById(req.params.orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const allowedNextStatuses = validStatusFlow[order.status] || [];
        
        if (!allowedNextStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status transition'
            });
        }

        order.status = status;
        await order.save();

        res.status(200).json({ 
            success: true, 
            order 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};