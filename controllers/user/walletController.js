import Wallet from "../../models/Wallet.js";

const getWalletDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        
        let wallet = await Wallet.findOne({ userId });
        
        // If wallet doesn't exist, create one
        if (!wallet) {
            wallet = new Wallet({
                userId,
                balance: 0,
                transactions: []
            });
            await wallet.save();
        }

        res.status(200).json({
            success: true,
            wallet
        });
    } catch (error) {
        console.error('Get wallet error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching wallet details'
        });
    }
};

const addMoneyToWallet = async (req, res) => {
    try {
        const { amount, razorpayPaymentId } = req.body;
        const userId = req.user.id;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid amount'
            });
        }

        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = new Wallet({ userId, balance: 0 });
        }

        const newTransaction = {
            amount: Number(amount),
            type: 'credit',
            source: 'razorpay',
            razorpayPaymentId,
            description: 'Added money to wallet',
            status: 'completed',
            balance: wallet.balance + Number(amount)
        };

        wallet.transactions.push(newTransaction);
        wallet.balance += Number(amount);
        
        await wallet.save();

        res.status(200).json({
            success: true,
            message: 'Money added successfully',
            wallet
        });
    } catch (error) {
        console.error('Add money to wallet error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding money to wallet',
            error: error.message
        });
    }
};

const getTransactionHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const wallet = await Wallet.findOne({ userId });

        if (!wallet) {
            return res.status(404).json({
                success: false,
                message: 'Wallet not found'
            });
        }

        // Sort transactions by date (newest first)
        const transactions = wallet.transactions.sort((a, b) => 
            b.createdAt - a.createdAt
        );

        res.status(200).json({
            success: true,
            transactions,
            balance: wallet.balance
        });
    } catch (error) {
        console.error('Get transaction history error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching transaction history'
        });
    }
};

export {
    getWalletDetails,
    addMoneyToWallet,
    getTransactionHistory
};