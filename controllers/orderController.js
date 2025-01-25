import Order from '../models/Order.js';
import Cart from '../models/Cart.js';

export const createOrder = async (req, res) => {
  try {
    console.log('Received order payload:', req.body); 
    const { addressId, paymentMethod, items, totalAmount } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!addressId || !paymentMethod || !items || !totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const newOrder = new Order({
      userId,
      addressId,
      paymentMethod,
      items: items.map(item => ({
        productId: item.productId,
        selectedSize: item.selectedSize,
        quantity: item.quantity,
        price: item.price,
        status: 'pending'
      })),
      totalAmount,
      status: 'pending',
      orderId: `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`
    });

    await newOrder.save();

    // Clear cart after successful order
    await Cart.findOneAndUpdate(
      { userId },
      { items: [], totalAmount: 0 }
    );

    

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      orderId: newOrder.orderId
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create order'
    });
  }
};

export const getOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const search = req.query.search || '';
    const status = req.query.status || 'All';
    
    let query = { userId };

    // Add status filter if not 'All'
    if (status !== 'All') {
      query.status = status.toLowerCase();
    }

    // Add search query if present
    if (search) {
      query = {
        ...query,
        $or: [
          { orderId: { $regex: search, $options: 'i' } },
          { 'addressId.firstName': { $regex: search, $options: 'i' } },
          { 'addressId.lastName': { $regex: search, $options: 'i' } }
        ]
      };
    }

    const skip = (page - 1) * limit;

    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limit);

    const orders = await Order.find(query)
      .populate('items.productId')
      .populate('addressId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      orders,
      pagination: {
        currentPage: page,
        totalPages,
        totalOrders,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
};

export const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const order = await Order.findOne({ 
      orderId: orderId,
      userId: userId 
    })
    .populate('items.productId')
    .populate('addressId');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order details'
    });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const order = await Order.findOne({ orderId, userId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Only allow cancellation of pending orders
    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending orders can be cancelled'
      });
    }

    order.status = 'cancelled';
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order'
    });
  }
};

export const cancelOrderItem = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { itemId, reason } = req.body;
    const userId = req.user.id;

    const order = await Order.findOne({ 
      orderId, 
      userId 
    }).populate('items.productId');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const item = order.items.id(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in order'
      });
    }

    // Update item status and reason
    item.status = 'cancelled';
    item.cancellationReason = reason;

    // Check if all items are cancelled to update order status
    const allItemsCancelled = order.items.every(item => item.status === 'cancelled');
    if (allItemsCancelled) {
      order.status = 'cancelled';
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Item cancelled successfully',
      order: order
    });
  } catch (error) {
    console.error('Error cancelling order item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order item'
    });
  }
};
