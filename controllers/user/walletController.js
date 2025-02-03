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


const refundOrderAmount = async (req, res) => {
    try {
      const { amount, orderId } = req.body;
      const userId = req.user.id;
  
      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid refund amount'
        });
      }
  
      let wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        wallet = new Wallet({ 
          userId, 
          balance: 0,
          transactions: [] 
        });
      }
  
      const refundTransaction = {
        amount: Number(amount),
        type: 'credit',
        source: 'order_refund',
        orderId,
        description: `Refund for order #${orderId}`,
        status: 'completed',
        balance: wallet.balance + Number(amount)
      };
  
      wallet.transactions.push(refundTransaction);
      wallet.balance += Number(amount);
      
      await wallet.save();
  
      res.status(200).json({
        success: true,
        message: 'Refund processed successfully',
        wallet
      });
    } catch (error) {
      console.error('Process refund error:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing refund',
        error: error.message
      });
    }
  };

const debitWallet = async (req,res) => {
    try {
        const {amount, description} = req.body;
        const userId = req.user.id;

        if(!amount || amount <=0) {
            return res.status(400).json({
                success : false,
                message : 'Wallet not found'
            });
        }

        let wallet = await Wallet.findOne({userId});
        if(!wallet) {
            res.status(404).json({
                message : false,
                message :'Wallet not found'
            })
        }

        if(wallet.balance < amount) {
            return res.status(400).json({
                success : false,
                message : 'Insufficient wallet balance'
            })
        }
        const newTransaction = {
            amount: Number(amount),
            type: 'debit',
            source: 'wallet_payment',
            description: description || 'Payment for order',
            status: 'completed',
            balance: wallet.balance - Number(amount)
        };

        await wallet.save();

        res.status(200).json({
            success: true,
            message: 'Wallet balance deducted successfully',
            wallet
        });
    } catch (error) {
        console.error('Debit wallet error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deducting wallet balance',
            error: error.message
        });
    }
}

export {
    getWalletDetails,
    addMoneyToWallet,
    getTransactionHistory,
    refundOrderAmount,
    debitWallet
};