
import Order from '../../models/Order.js';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

export const generateSalesReport = async (req, res) => {
    try {
        const { startDate, endDate, page = 1, limit = 10 } = req.query;
        
        const dateFilter = {
            createdAt: {
                $gte: new Date(startDate + 'T00:00:00.000Z'),
                $lte: new Date(endDate + 'T23:59:59.999Z')
            }
        };
       

      
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
        const { startDate, endDate } = req.query;

        // Fetch all orders for the report (without pagination)
        const dateFilter = {
            createdAt: {
                $gte: new Date(startDate + 'T00:00:00.000Z'),
                $lte: new Date(endDate + 'T23:59:59.999Z')
            }
        };

        const orders = await Order.find(dateFilter)
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });

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
                    }
                }
            }
        ]);

        const formattedOrders = orders.map(order => ({
            orderId: order.orderId,
            date: order.createdAt,
            originalAmount: order.totalAmount,
            totalDiscount: order.discountAmount || 0,
            revenue: order.status === 'cancelled' || order.status === 'returned' 
                ? 0 
                : (order.totalAmount - (order.discountAmount || 0)),
            paymentMethod: order.paymentMethod,
            status: order.status,
            customerName: order.userId?.name || 'N/A'
        }));

        if (format === 'xlsx') {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Sales Report');

            // Add title and date range
            worksheet.mergeCells('A1:H1');
            worksheet.getCell('A1').value = 'Sales Report';
            worksheet.getCell('A1').font = { size: 16, bold: true };
            worksheet.getCell('A1').alignment = { horizontal: 'center' };

            worksheet.mergeCells('A2:H2');
            worksheet.getCell('A2').value = `Period: ${startDate} to ${endDate}`;
            worksheet.getCell('A2').alignment = { horizontal: 'center' };

            // Add summary section
            worksheet.mergeCells('A4:B4');
            worksheet.getCell('A4').value = 'Summary';
            worksheet.getCell('A4').font = { bold: true };

            worksheet.getCell('A5').value = 'Total Orders';
            worksheet.getCell('B5').value = orders.length;

            worksheet.getCell('A6').value = 'Total Revenue';
            worksheet.getCell('B6').value = totals[0]?.totalRevenue || 0;

            worksheet.getCell('A7').value = 'Total Discount';
            worksheet.getCell('B7').value = totals[0]?.totalDiscount || 0;

            // Add orders table
            worksheet.addRow([]); // Empty row for spacing
            
            // Define columns
            worksheet.columns = [
                { header: 'Order ID', key: 'orderId', width: 15 },
                { header: 'Date', key: 'date', width: 20 },
                { header: 'Customer', key: 'customerName', width: 20 },
                { header: 'Original Amount', key: 'originalAmount', width: 15 },
                { header: 'Discount', key: 'totalDiscount', width: 15 },
                { header: 'Revenue', key: 'revenue', width: 15 },
                { header: 'Payment Method', key: 'paymentMethod', width: 15 },
                { header: 'Status', key: 'status', width: 12 }
            ];

            // Style header row
            const headerRow = worksheet.getRow(9);
            headerRow.font = { bold: true };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };

            // Add data
            formattedOrders.forEach(order => {
                worksheet.addRow({
                    ...order,
                    date: new Date(order.date).toLocaleString(),
                    originalAmount: Number(order.originalAmount),
                    totalDiscount: Number(order.totalDiscount),
                    revenue: Number(order.revenue)
                });
            });

           
            worksheet.getColumn('originalAmount').numFmt = 'Rs. #,##0.00';
            worksheet.getColumn('totalDiscount').numFmt = 'Rs.  #,##0.00';
            worksheet.getColumn('revenue').numFmt = 'Rs. #,##0.00';

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=sales-report-${startDate}-to-${endDate}.xlsx`);

            await workbook.xlsx.write(res);
            res.end();

        } else if (format === 'pdf') {
            const doc = new PDFDocument({ margin: 50 });
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=sales-report-${startDate}-to-${endDate}.pdf`);

            doc.pipe(res);

       
            doc.fontSize(20).text('Sales Report', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text(`Period: ${startDate} to ${endDate}`, { align: 'center' });
            doc.moveDown();

       
            doc.fontSize(14).text('Summary');
            doc.fontSize(12).text(`Total Orders: ${orders.length}`);
            doc.text(`Total Revenue: Rs. ${(totals[0]?.totalRevenue || 0).toLocaleString()}`);
            doc.text(`Total Discount: Rs. ${(totals[0]?.totalDiscount || 0).toLocaleString()}`);
            doc.moveDown();

         
            const tableTop = 200;
            const itemsPerPage = 20;
            let currentPage = 1;
            let y = tableTop;

           
            const headers = ['Order ID', 'Date', 'Amount', 'Discount', 'Revenue', 'Status'];
            const columnWidth = 90;

            const drawTableHeaders = () => {
                doc.fontSize(10);
                headers.forEach((header, i) => {
                    doc.text(header, 50 + (i * columnWidth), y, { width: columnWidth });
                });
                y += 20;
            };

            drawTableHeaders();

            
            formattedOrders.forEach((order, index) => {
                if (y > 700) {
                    doc.addPage();
                    y = 50;
                    drawTableHeaders();
                }

                doc.fontSize(9);
                doc.text(order.orderId, 50, y, { width: columnWidth });
                doc.text(new Date(order.date).toLocaleDateString(), 50 + columnWidth, y, { width: columnWidth });
                doc.text(`Rs. ${order.originalAmount.toLocaleString()}`, 50 + (columnWidth * 2), y, { width: columnWidth });
                doc.text(`Rs. ${order.totalDiscount.toLocaleString()}`, 50 + (columnWidth * 3), y, { width: columnWidth });
                doc.text(`Rs. ${order.revenue.toLocaleString()}`, 50 + (columnWidth * 4), y, { width: columnWidth });
                doc.text(order.status, 50 + (columnWidth * 5), y, { width: columnWidth });

                y += 20;
            });

            doc.end();
        } else {
            res.status(400).json({
                success: false,
                message: 'Invalid format specified'
            });
        }
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error generating report'
        });
    }
};