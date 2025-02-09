import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';
import Order from '../../models/Order.js';

dotenv.config();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET
});

export const createRazorpayOrder = async (req, res) => {
    try {
        const { totalAmount, discountAmount, couponCode} = req.body;
        console.log('Creating Razorpay order with:', { totalAmount, discountAmount, couponCode }); 

        if (!totalAmount || totalAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid amount'
            });
        }

        const options = {
            amount: Math.round(totalAmount * 100),
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
            notes: {
                discountAmount: discountAmount || 0,
                couponCode: couponCode || ''
            }
        };

        const order = await razorpay.orders.create(options);
        console.log('Razorpay Order Created:', order);
        res.json({ success: true, order });
    } catch (error) {
        console.error('Payment order creation errorrrrrrrrrrrrrrrr:', error);
        res.status(500).json({
            success: false,
            message: 'Payment order creation failed'
        });
    }
};


export const verifyPayment = async (req, res) => {
    try {
        const {
            orderId,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        const sign = `${razorpay_order_id}|${razorpay_payment_id}`;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_SECRET)
            .update(sign)
            .digest("hex");

        if (razorpay_signature !== expectedSign) {
            // Update order status to failed if signature verification fails
            if (orderId) {
                await Order.findOneAndUpdate(
                    { orderId },
                    {
                        paymentStatus: 'failed',
                        status: 'pending'
                    }
                );
            }
            
            return res.status(400).json({
                success: false,
                message: "Invalid signature"
            });
        }

        // Update order payment status to paid if verification succeeds
        if (orderId) {
            const order = await Order.findOneAndUpdate(
                { orderId },
                {
                    paymentStatus: 'paid',
                    status: 'pending',
                    razorpayOrderId: razorpay_order_id,
                    razorpayPaymentId: razorpay_payment_id
                },
                { new: true }
            );

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Payment verification failed'
        });
    }
};

export const retryPayment = async (req, res) => {
    try {
        const { orderId } = req.body;
        
        // Find the order
        const order = await Order.findOne({ orderId });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Validate order status
        if (order.paymentStatus !== 'failed') {
            return res.status(400).json({
                success: false,
                message: 'Order is not in failed payment status'
            });
        }

        // Create new Razorpay order
        const options = {
            amount: Math.round(order.totalAmount * 100),
            currency: "INR",
            receipt: `retry_${orderId}_${Date.now()}`,
            notes: {
                originalOrderId: orderId,
                discountAmount: order.discountAmount || 0,
                couponCode: order.couponCode || ''
            }
        };

        const razorpayOrder = await razorpay.orders.create(options);
        res.json({ success: true, order: razorpayOrder });
    } catch (error) {
        console.error('Payment retry error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to initialize payment retry'
        });
    }
};

export const failedPayment = async (req, res) => {
    try {
        const { orderId } = req.body;
        
        const order = await Order.findOneAndUpdate(
            { orderId },
            {
                paymentStatus: 'failed',
                status: 'pending' // You might want to set this to 'failed' as well
            },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.json({
            success: true,
            message: 'Order marked as payment failed',
            order
        });
    } catch (error) {
        console.error('Error handling failed payment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order status'
        });
    }
};