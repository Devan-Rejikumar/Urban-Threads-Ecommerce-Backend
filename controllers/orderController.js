import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Wallet from '../models/Wallet.js';

export const createOrder = async (req, res) => {
  try {
    const { addressId, paymentMethod, items, totalAmount } = req.body;
    const userId = req.user.id;


    if (!addressId || !paymentMethod || !items || !totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

  
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items must be a non-empty array',
      });
    }


    if (paymentMethod === 'wallet') {
      const wallet = await Wallet.findOne({ userId });

      if (!wallet || wallet.balance < totalAmount) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient wallet balance',
        });
      }

      
      wallet.balance -= totalAmount;
      wallet.transactions.push({
        amount: totalAmount,
        type: 'debit',
        source: 'wallet_payment',
        description: `Payment for order`,
        status: 'completed',
        balance: wallet.balance,
      });

      await wallet.save();
    }

  
    const newOrder = new Order({
      userId,
      addressId,
      paymentMethod,
      items,
      totalAmount,
      status: 'pending',
      paymentStatus: paymentMethod === 'wallet' ? 'paid' : 'pending', 
    });

    await newOrder.save();

   
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
    console.error('Error creating orderrrrrrrrrrrrrrrr:', error);

    
    console.error('Full error details:', {
      message: error.message,
      stack: error.stack,
      requestBody: req.body,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message, 
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

   
    if (status !== 'All') {
      query.status = status.toLowerCase();
    }

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
    const { reason } = req.body;
    const userId = req.user.id;

    const order = await Order.findOne({ orderId, userId });

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


    if (order.paymentMethod === 'online' || order.paymentMethod === 'wallet') {
      const refundAmount = order.totalAmount;

      let wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        wallet = new Wallet({ userId, balance: 0, transactions: [] });
      }

      
      wallet.balance += refundAmount;
      wallet.transactions.push({
        amount: refundAmount,
        type: 'credit',
        source: 'order_refund',
        orderId: order.orderId,
        description: `Refund for cancelled order ${order.orderId}`,
        status: 'completed',
        balance: wallet.balance
      });

      await wallet.save();

     
      order.refundStatus = 'processed';
      order.refundAmount = refundAmount;
    }

    
    order.status = 'cancelled';
    order.cancellationReason = reason;

   
    order.items = order.items.map(item => ({
      ...item.toObject(),
      status: 'cancelled',
      cancellationReason: reason,
      refundStatus: (order.paymentMethod === 'online' || order.paymentMethod === 'wallet') ? 'processed' : 'not_applicable',
      refundAmount: (order.paymentMethod === 'online' || order.paymentMethod === 'wallet') ? (item.price * item.quantity) : 0
    }));

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      order,
      refundProcessed: (order.paymentMethod === 'online' || order.paymentMethod === 'wallet')
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

    const order = await Order.findOne({ orderId, userId });

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

    if (item.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Item is already cancelled'
      });
    }

 
    if (order.paymentMethod === 'online' || order.paymentMethod === 'wallet') {
      const refundAmount = item.price * item.quantity;

      let wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        wallet = new Wallet({ userId, balance: 0, transactions: [] });
      }

      
      wallet.balance += refundAmount;
      wallet.transactions.push({
        amount: refundAmount,
        type: 'credit',
        source: 'order_refund',
        orderId: order.orderId,
        description: `Refund for cancelled item in order ${order.orderId}`,
        status: 'completed',
        balance: wallet.balance
      });

      await wallet.save();

      item.refundStatus = 'processed';
      item.refundAmount = refundAmount;
    }

    
    item.status = 'cancelled';
    item.cancellationReason = reason;

   
    if (order.items.every((i) => i.status === 'cancelled')) {
      order.status = 'cancelled';
    } else if (order.items.some((i) => i.status === 'processing')) {
      order.status = 'processing';
    } else if (order.items.some((i) => i.status === 'shipped')) {
      order.status = 'shipped';
    } else if (order.items.some((i) => i.status === 'delivered')) {
      order.status = 'delivered';
    } else if (order.items.every((i) => i.status === 'returned')) {
      order.status = 'returned';
    }

   
    order.totalAmount = order.items.reduce((total, item) => {
      return item.status !== 'cancelled' ? total + (item.price * item.quantity) : total;
    }, 0);

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Item cancelled successfully',
      order
    });
    
  } catch (error) {
    console.error('Error cancelling order item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order item'
    });
  }
};
