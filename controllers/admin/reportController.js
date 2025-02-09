


import Order from '../../models/Order.js';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

export const generateSalesReport = async (req, res) => {
    try {
        const { startDate, endDate, page = 1, limit = 10 } = req.query;
        
        const dateFilter = {
            createdAt: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        };

        // Get paginated orders
        const skip = (page - 1) * limit;
        const orders = await Order.find(dateFilter)
            .populate('userId', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totals = await Order.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: null,
                    totalOriginalAmount: { $sum: '$totalAmount' },
                    totalDiscount: { $sum: { $ifNull: ['$discountAmount', 0] } },
                    totalRevenue: {
                        $sum: {
                            $cond: [
                                { $in: ['$status', ['cancelled', 'returned']] },
                                0,
                                { $subtract: ['$totalAmount', { $ifNull: ['$discountAmount', 0] }] }
                            ]
                        }
                    },
                    totalSales: {
                        $sum: {
                            $cond: [
                                { $in: ['$status', ['cancelled', 'returned']] },
                                0,
                                1
                            ]
                        }
                    }
                }
            }
        ]);

        const totalOrders = await Order.countDocuments(dateFilter);

        const formattedOrders = orders.map(order => ({
            orderId: order.orderId,
            date: order.createdAt,
            originalAmount: order.totalAmount,
            totalDiscount: order.discountAmount || 0,
            revenue: order.status === 'cancelled' || order.status === 'returned' 
                ? 0 
                : (order.totalAmount - (order.discountAmount || 0)),
            paymentMethod: order.paymentMethod,
            status: order.status
        }));

        const totalsData = totals[0] || {
            totalOriginalAmount: 0,
            totalDiscount: 0,
            totalRevenue: 0,
            totalSales: 0
        };

        res.json({
            success: true,
            total: totalOrders,
            report: {
                totalOrders,
                totalSales: totalsData.totalSales,
                totalOriginalAmount: totalsData.totalOriginalAmount,
                totalDiscount: totalsData.totalDiscount,
                totalRevenue: totalsData.totalRevenue,
                orders: formattedOrders
            }
        });

    } catch (error) {
        console.error('Report generation error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate report'
        });
    }
};

export const downloadReport = async (req, res) => {
    try {
        const { format } = req.params;
        const { report } = req.body;

        if (format === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Sales Report');

            worksheet.columns = [
                { header: 'Order ID', key: 'orderId' },
                { header: 'Date', key: 'date' },
                { header: 'Amount', key: 'amount' },
                { header: 'Discount', key: 'discount' },
                { header: 'Coupon Used', key: 'couponUsed' }
            ];

            worksheet.addRows(report.orders);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=sales-report.xlsx');

            await workbook.xlsx.write(res);
            res.end();
        } else if (format === 'pdf') {
            const doc = new PDFDocument();
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');

            doc.pipe(res);
            // Add PDF content
            doc.end();
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
