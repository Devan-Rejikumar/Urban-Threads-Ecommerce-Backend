import User from '../../models/User.js';
import Order from '../../models/Order.js';
import Product from '../../models/Products.js';
import Category from '../../models/Category.js';

export const getDashboardStats = async (req, res) => {
    try {
        const { timeFilter = 'yearly' } = req.query;
        console.log('Starting to fetch dashboard stats...', { timeFilter });
        
        // Get date range based on filter
        const getDateRange = () => {
            const now = new Date();
            const startDate = new Date();
            
            switch(timeFilter) {
                case '7days':
                    startDate.setDate(now.getDate() - 7);
                    break;
                case '30days':
                    startDate.setDate(now.getDate() - 30);
                    break;
                case '90days':
                    startDate.setDate(now.getDate() - 90);
                    break;
                case 'all':
                    startDate.setFullYear(2020); // Set to a past date to get all data
                    break;
                default:
                    startDate.setFullYear(now.getFullYear() - 1);
            }
            
            return { startDate, endDate: now };
        };

        const { startDate, endDate } = getDateRange();

        // Basic Stats
        const totalUsers = await User.countDocuments({ role: 'user' });
        const totalProducts = await Product.countDocuments({ isDeleted: false });
        const totalCategories = await Category.countDocuments({ isDeleted: false });

        // Fetch orders with populated data and date filter
        const orders = await Order.find({
            createdAt: { $gte: startDate, $lte: endDate }
        })
            .populate('userId', 'firstName lastName email')
            .populate({
                path: 'items.productId',
                select: 'name price category',
                populate: {
                    path: 'category',
                    select: 'name'
                }
            })
            .sort({ createdAt: -1 });

        // Calculate total revenue from orders with active items only
        const totalRevenue = orders.reduce((sum, order) => {
            const hasActiveItems = order.items.some(item => 
                item.status !== 'cancelled' && item.status !== 'returned'
            );
            return sum + (hasActiveItems ? order.totalAmount : 0);
        }, 0);

        // Calculate revenue data by month
        const revenueData = orders.reduce((acc, order) => {
            const month = new Date(order.createdAt).toLocaleString('default', { month: 'short' });
            const hasActiveItems = order.items.some(item => 
                item.status !== 'cancelled' && item.status !== 'returned'
            );
            const revenue = hasActiveItems ? order.totalAmount : 0;
            acc[month] = (acc[month] || 0) + revenue;
            return acc;
        }, {});

        // Recent Orders (last 5)
        const recentOrders = orders.slice(0, 5).map(order => {
            // Check if all items are returned
            const allItemsReturned = order.items.every(item => item.status === 'returned');
            // If all items are returned, show 'returned' status, otherwise use order status
            const orderStatus = allItemsReturned ? 'returned' : order.status;

            return {
                orderId: order._id,
                customerName: order.userId ? `${order.userId.firstName} ${order.userId.lastName}` : 'Guest User',
                customerEmail: order.userId?.email || 'N/A',
                totalAmount: order.totalAmount || 0,
                status: orderStatus || 'pending',
                date: order.createdAt,
                items: order.items?.length || 0
            };
        });

        // Top 10 Products
        const topProducts = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            { $unwind: '$items' },
            {
                $match: {
                    'items.status': { $nin: ['cancelled', 'returned'] }
                }
            },
            {
                $group: {
                    _id: '$items.productId',
                    totalSales: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
                }
            },
            { $sort: { totalRevenue: -1 } }, // Changed to sort by revenue
            { $limit: 10 },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            {
                $project: {
                    name: '$product.name',
                    totalSales: 1,
                    totalRevenue: 1
                }
            }
        ]);

        // Top 10 Categories
        const topCategories = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            { $unwind: '$items' },
            {
                $match: {
                    'items.status': { $nin: ['cancelled', 'returned'] }
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.productId',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'product.category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: '$category' },
            {
                $group: {
                    _id: '$category._id',
                    name: { $first: '$category.name' },
                    totalSales: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
                }
            },
            { $sort: { totalRevenue: -1 } }, // Changed to sort by revenue
            { $limit: 10 }
        ]);

        // Recent Users
        const recentUsers = await User.find({ role: 'user' })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('firstName lastName email createdAt');

        const responseData = {
            basicStats: {
                totalUsers,
                totalOrders: orders.length,
                totalRevenue,
                totalProducts,
                totalCategories
            },
            revenueData,
            recentOrders,
            topProducts,
            topCategories,
            recentUsers,
            timeRange: {
                start: startDate,
                end: endDate,
                filter: timeFilter
            }
        };

        console.log('Successfully compiled dashboard stats');
        res.json(responseData);
    } catch (error) {
        console.error('Error in getDashboardStats:', error);
        res.status(500).json({ 
            message: 'Error fetching dashboard statistics',
            error: error.message 
        });
    }
};
