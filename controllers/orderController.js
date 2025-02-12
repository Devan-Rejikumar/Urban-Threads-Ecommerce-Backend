
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Wallet from '../models/Wallet.js';
import Coupon from '../models/Coupons.js';
import PDFDocument from 'pdfkit';

export const createOrder = async (req, res) => {
  try {
    const { addressId, paymentMethod, items, totalAmount, discountAmount, couponCode, paymentStatus } = req.body;
    console.log('Order Creation Dataaaaaaaaaaaaaa:', {
      totalAmount,
      discountAmount,
      couponCode
    });
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

    if (discountAmount) {
      if (discountAmount < 0) {
        return res.status(400).json({
          success: false,
          message: 'Discount amount cannot be negative',
        });
      }
      if (discountAmount > totalAmount) {
        return res.status(400).json({
          success: false,
          message: 'Discount cannot exceed total amount',
        });
      }
    }


    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode });
      if (!coupon) {
        return res.status(400).json({
          success: false,
          message: 'Invalid coupon code',
        });
      }
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

    let initialStatus = 'pending';
    let initialPaymentStatus = 'pending';

    if (paymentMethod === 'online') {
      // For online payments, check the payment status
      if (paymentStatus === 'failed') {
        initialStatus = 'payment_failed';  // Set order status to payment_failed
        initialPaymentStatus = 'failed';
      }
    } else if (paymentMethod === 'wallet') {
      initialPaymentStatus = 'paid';
    }


    const newOrder = new Order({
      userId,
      addressId,
      paymentMethod,
      items,
      totalAmount,
      status: initialStatus,
      discountAmount: discountAmount || 0,
      couponUsed: couponCode || null,
      // paymentStatus: paymentMethod === 'wallet' ? 'paid' : 'pending',
      paymentStatus: initialPaymentStatus,
    });

    console.log('New Order Objectttttttttttttttttttt:', {
      totalAmount: newOrder.totalAmount,
      discountAmount: newOrder.discountAmount,
      couponUsed: newOrder.couponUsed
    });

    if (initialStatus === 'payment_failed') {
      newOrder.items = newOrder.items.map(item => ({
        ...item,
        status: 'payment_failed'
      }));
    }

    await newOrder.save();


    await Cart.findOneAndUpdate(
      { userId },
      { items: [], totalAmount: 0, discount: 0, couponCode: null }
    );

    if (couponCode) {
      await Coupon.findOneAndUpdate(
        { code: couponCode },
        { $inc: { usageCount: 1 } }
      );
    }

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
        message: 'Order not foundsss'
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

export const generateInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ orderId })
      .populate('userId')
      .populate('addressId')
      .populate('items.productId');

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invoice is only available for delivered orders' 
      });
    }

  
    const doc = new PDFDocument();
    
 
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${orderId}.pdf`);
    
   
    doc.pipe(res);
    
  
    doc.fontSize(20).text('Invoice', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Order ID: ${order.orderId}`);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`);
    doc.text(`Name: ${order.addressId.firstName} ${order.addressId.lastName}`);
    doc.text(`Address: ${order.addressId.streetAddress}`);
    doc.text(`${order.addressId.city}, ${order.addressId.state} ${order.addressId.pincode}`);
    doc.text(`Phone: ${order.addressId.phoneNumber}`);
    doc.moveDown();
    

    doc.text('Items:', { underline: true });
    order.items.forEach(item => {
      doc.text(`${item.productId.name} - ${item.selectedSize}`);
      doc.text(`Quantity: ${item.quantity} x ₹${item.price} = ₹${item.quantity * item.price}`);
      doc.moveDown(0.5);
    });
    
    doc.moveDown();
    doc.text(`Total Amount: ₹${order.totalAmount}`, { bold: true });
    
  
    doc.end();
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate invoice' 
    });
  }
};

export const returnItem = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    const order = await Order.findOne({ orderId, userId })
      .populate('items.productId');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Only delivered orders can be returned'
      });
    }

   
    const deliveryDate = new Date(order.deliveredAt || order.updatedAt);
    const now = new Date();
    const diffTime = Math.abs(now - deliveryDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 7) {
      return res.status(400).json({
        success: false,
        message: 'Return period has expired (7 days from delivery)'
      });
    }

   
    order.status = 'return_requested';
    order.returnReason = reason;
    order.returnRequestedAt = new Date();

    await order.save();

    res.json({
      success: true,
      message: 'Return request submitted successfully. Awaiting admin approval.',
      order
    });

  } catch (error) {
    console.error('Error processing return request:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing return request',
      error: error.message
    });
  }
};

// export const returnItem = async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     const { reason, itemId } = req.body;
//     const userId = req.user.id;

//     const order = await Order.findOne({ orderId, userId })
//       .populate('items.productId');

//     if (!order) {
//       return res.status(404).json({
//         success: false,
//         message: 'Order not found',
//       });
//     }

//     if (order.status !== 'delivered') {
//       return res.status(400).json({
//         success: false,
//         message: 'Only delivered orders can be returned',
//       });
//     }

//     const item = itemId ? order.items.find(item => item._id.toString() === itemId) : order.items[0];

//     if (!item) {
//       return res.status(404).json({
//         success: false,
//         message: 'Item not found in order',
//       });
//     }

//     if (item.status === 'returned') {
//       return res.status(400).json({
//         success: false,
//         message: 'Item has already been returned',
//       });
//     }

 
//     let refundAmount;
//     if (itemId) {

//       const itemTotal = item.price * item.quantity;
//       const orderTotal = order.items.reduce((total, i) => total + (i.price * i.quantity), 0);
//       const proportion = itemTotal / orderTotal;
//       refundAmount = Math.round(order.totalAmount * proportion);
//     } else {
//       refundAmount = order.totalAmount;
//     }

//     if (isNaN(refundAmount) || refundAmount < 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid refund amount calculated'
//       });
//     }

 
//     if (itemId) {
//       item.status = 'returned';
//       item.refundStatus = 'processed';
//       item.refundAmount = refundAmount;
//     } else {
     
//       order.items.forEach(item => {
//         item.status = 'returned';
//         item.refundStatus = 'processed';
//         item.refundAmount = item.price * item.quantity;
//       });
//       order.status = 'returned';
//       order.returnReason = reason;
//       order.returnDate = new Date();
//     }

 
//     const wallet = await Wallet.findOne({ userId });
//     if (!wallet) {
      
//       const newWallet = new Wallet({
//         userId,
//         balance: refundAmount,
//         transactions: [{
//           amount: refundAmount,
//           type: 'credit',
//           source: 'order_refund',
//           description: `Refund for order ${orderId}${itemId ? ' (item return)' : ''}`,
//           status: 'completed',
//           balance: refundAmount
//         }]
//       });
//       await newWallet.save();
//     } else {
    
//       wallet.balance += refundAmount;
//       wallet.transactions.push({
//         amount: refundAmount,
//         type: 'credit',
//         source: 'order_refund',
//         description: `Refund for order ${orderId}${itemId ? ' (item return)' : ''}`,
//         status: 'completed',
//         balance: wallet.balance
//       });
//       await wallet.save();
//     }

//     await order.save();

//     res.json({
//       success: true,
//       message: 'Return processed successfully',
//       order,
//       walletCredit: refundAmount
//     });

//   } catch (error) {
//     console.error('Error processing return:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error processing return',
//       error: error.message
//     });
//   }
// };

export const requestReturn = async (req,res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    const order = await Order.findOne({ orderId, userId}).populate('items.productId');

    if(!order) {
      return res.status(404).json({
        success : false,
        message : 'Order not found',

      })
    }

    if(order.status !== 'delivered') {
      return res.status(404).json({
        success : false,
        message : 'Only delivered products can be returned'
      })
    }

    const deliveryDate = new Date(order.deliveredAt || order.updatedAt);
    const now = new Date();
    const diffTime = Math.abs(now - deliveryDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 7) {
      return res.status(400).json({
        success: false,
        message: 'Return period has expired (7 days from delivery)'
      });
    }

    order.status = 'return_requested';
    order.returnReason = reason;
    order.returnRequestedAt = new Date();

    await order.save();

    res.json({
      success: true,
      message: 'Return request submitted successfully',
      order
    });
  } catch (error) {
    console.error('Error requesting return:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit return request'
    });
  }
}

