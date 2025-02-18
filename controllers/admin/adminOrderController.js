
import Order from "../../models/Order.js";
import Wallet from '../../models/Wallet.js'

export const getOrders = async (req, res) => {
    try {      
        const { 
            status = 'All', 
            page = 1, 
            limit = 10,
            search = '' 
        } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        let query = {};


        if (status !== 'All') {
            query.status = status.toLowerCase();
        }

        // Add search conditions if search term exists
        if (search) {
            // First, find user IDs that match the search criteria
            const userQuery = {
                $or: [
                    { firstName: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ]
            };

            // Create the main query with OR conditions
            query = {
                ...query,
                $or: [
                    { orderId: { $regex: search, $options: 'i' } },
                    { 'userId.firstName': { $regex: search, $options: 'i' } },
                    { 'userId.email': { $regex: search, $options: 'i' } }
                ]
            };
        }

      
        const totalOrders = await Order.countDocuments(query);

   
        const orders = await Order.find(query)
            .populate('userId', 'firstName email')
            .populate('items.productId')
            .populate('addressId')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        console.log('Found orders:', orders.length);
        console.log('Total orders:', totalOrders);

        res.status(200).json({ 
            success: true, 
            orders,
            totalOrders,
            currentPage: pageNum,
            totalPages: Math.ceil(totalOrders / limitNum)
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};


export const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        const order = await Order.findById(orderId)
        .populate('userId')
        .populate('addressId')
        .populate('items.productId');
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not foundwwwww'
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

export const handleReturnRequest = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { action, rejectionReason } = req.body;

       
        const order = await Order.findById(orderId).populate([
            { path: 'items.productId' },
            { path: 'userId' }
        ]);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (order.status !== 'return_requested') {
            return res.status(400).json({
                success: false,
                message: 'Order is not in return requested state'
            });
        }

        if (action === 'accept') {
            order.status = 'returned';
            order.returnAccepted = new Date();

            const refundAmount = order.totalAmount;
            let wallet = await Wallet.findOne({ userId: order.userId });
            if (!wallet) {
                wallet = new Wallet({
                    userId: order.userId,
                    balance: 0,
                    transactions: []
                });
            }

            wallet.balance += refundAmount;
            wallet.transactions.push({
                amount: refundAmount,
                type: 'credit',
                source: 'return_refund',
                orderId: order._id,
                description: `Refund for returned order ${order._id}`,
                status: 'completed',
                balance: wallet.balance
            });

            await wallet.save();

            order.refundStatus = 'processed';
            order.refundAmount = refundAmount;

            order.items = order.items.map(item => ({
                ...item.toObject(),
                status: 'returned',
                refundStatus: 'processed',
                refundAmount: item.price * item.quantity
            }));

        } else if (action === 'reject') {
            order.status = 'delivered';
            order.returnRejectedAt = new Date();
            order.returnRejectionReason = rejectionReason;
        }

        await order.save();

        res.json({
            success: true,
            message: `Return request ${action === 'accept' ? 'accepted' : 'rejected'} successfully`,
            order
        });

    } catch (error) {
        console.error('Error handling return request:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};