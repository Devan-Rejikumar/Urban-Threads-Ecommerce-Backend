
import express from 'express';
import { registerUser, loginUser, verifyOTP, resendOTP, handleGoogleSignup, verifyStatus, logout, verifyUserToken, getUserProfile, updateUsersProfile, forgotPassword, verifyResetToken, resetPassword, advancedSearch, getNewArrivals} from '../controllers/user/authController.js';
import passport from 'passport';
import { verifyToken } from '../middleware/authMiddleware.js';
import addressController from '../controllers/user/addressController.js';
import changePassword from '../controllers/user/changePasswordController.js';
import cartController from '../controllers/user/cartController.js';

const { getAddresses, getAddress, createAddress, updateAddress, deleteAddress } = addressController;

const router = express.Router();





router.post('/register', registerUser);
router.post('/login', loginUser);
// router.get('/verify-status', verifyStatus);
router.post('/google-signup',handleGoogleSignup)

// router.get('/verify-status', verifyToken, verifyStatus);
router.get('/verify-token',verifyUserToken)

router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/logout', logout)
router.get("/google",
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        prompt: 'select_account'
    })
);
router.post('/forgot-password', forgotPassword);
router.get('/reset-password/:token', verifyResetToken);
router.post('/reset-password/:token', resetPassword);

router.get('/profile', verifyToken, getUserProfile)
router.put('/profile/update', verifyToken, updateUsersProfile);


router.get('/addresses',verifyToken, getAddresses);
router.post('/address',verifyToken, createAddress);
router.get('/address/:id', verifyToken, getAddress);
router.put('/address/:id',verifyToken, updateAddress);
router.delete('/address/:id',verifyToken, deleteAddress);



const validatePasswordChange = (req,res,next) =>{
    const { currentPassword, newPassword } = req.body;
    
    if(!currentPassword || !newPassword) {
        return res.status(400).json({ message : 'All fields are required'})
    }

    if(newPassword.length < 8) {
        return res.status(400).json({ message : 'Password must be at least 8 character long'})
    }

    next();
}

router.put('/change-password', verifyToken, validatePasswordChange,changePassword)
router.get('/search', advancedSearch);

router.get('/new-arrivals', getNewArrivals )







export default router;

