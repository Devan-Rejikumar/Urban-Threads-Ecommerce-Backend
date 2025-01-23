import User from '../../models/User.js';
import Product from '../../models/Products.js'
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { resolve } from 'path';
import { decode } from 'punycode';

dotenv.config();

const secretKey = process.env.JWT_SECRET;


const pendingRegistrations = new Map();

const createTransporter = async () => {
    try {
        console.log('Setting up email transporter with user:', process.env.EMAIL_USER);


        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
            console.log('No email credentials found, creating test account...');
            const testAccount = await nodemailer.createTestAccount();

            return nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass,
                }
            });
        }
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            },
            debug: true,
            logger: true
        });

        console.log('Verifying transporter configuration...');
        await transporter.verify();
        console.log('Transporter verified successfully');
        return transporter;
    } catch (error) {
        console.error('Email transporter configuration error:', error);
        throw new Error(`Failed to configure email transport: ${error.message}`);
    }
};


const sendVerificationEmail = async (email, otp) => {
    try {
        console.log('Attempting to send verification email to:', email);
        const transporter = await createTransporter();

        const mailOptions = {
            from: `"Account Verification" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Email Verification OTP',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #333; text-align: center;">Email Verification</h1>
                    <p style="font-size: 16px;">Your OTP for email verification is:</p>
                    <h2 style="text-align: center; color: #4CAF50; letter-spacing: 5px; padding: 10px; background: #f5f5f5; border-radius: 5px;">${otp}</h2>
                    <p style="color: #666; font-size: 14px;">This OTP will expire in 10 minutes</p>
                    <p style="color: #999; font-size: 12px;">If you didn't request this verification, please ignore this email.</p>
                </div>
            `
        };

        console.log('Sending mail with options:', {
            to: mailOptions.to,
            subject: mailOptions.subject,
            from: mailOptions.from
        });

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.response);
        if (info.previewUrl) {
            console.log('Preview URL:', info.previewUrl);
        }

        return true;
    } catch (error) {
        console.error('Detailed email sending error:', {
            error: error.message,
            stack: error.stack,
            code: error.code,
            command: error.command
        });
        return false;
    }
};


const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const registerUser = async (req, res) => {
    try {
        const { firstName, lastName, email, password, phone } = req.body;
        console.log('Received registration data:', {
            firstName,
            lastName,
            email,
            phone,
            passwordLength: password ? password.length : 0
        });

        const validationErrors = {
            firstName: !firstName && 'First name is required',
            lastName: !lastName && 'Last name is required',
            email: !email ? 'Email is required' :
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && 'Invalid email format',
            password: !password ? 'Password is required' :
                password.length < 6 && 'Password must be at least 6 characters long',
            phone: !phone && 'Phone number is required'
        };

        const errors = Object.entries(validationErrors)
            .filter(([_, value]) => value)
            .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({
                message: 'Validation failed',
                errors
            });
        }
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);


        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const registrationId = crypto.randomUUID();
        pendingRegistrations.set(registrationId, {
            userData: {
                firstName,
                lastName,
                email: email.toLowerCase(),
                password: hashedPassword,
                phone,
                status: 'active'
            },
            otp,
            otpExpiry
        });


        setTimeout(() => {
            pendingRegistrations.delete(registrationId);
        }, 10 * 60 * 1000);

        const emailSent = await sendVerificationEmail(email, otp);

        if (!emailSent) {
            pendingRegistrations.delete(registrationId);
            return res.status(500).json({
                message: 'Failed to send verification email. Please try again.'
            });
        }
        res.status(201).json({
            message: 'Please verify your email to complete registration.',
            registrationId,
            requiresVerification: true
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const verifyOTP = async (req, res) => {
    console.log('Received OTP verification request:', req.body);
    try {
        const { registrationId, otp } = req.body;
        console.log(registrationId, otp)
        const registrationData = pendingRegistrations.get(registrationId);
        console.log('Registration data retrieved:', registrationData);

        if (!registrationData) {
            console.log(2)
            return res.status(404).json({
                message: 'Registration session expired or not found. Please register again.'
            });
        }

        if (new Date() > registrationData.otpExpiry) {
            console.log(4)
            pendingRegistrations.delete(registrationId);
            return res.status(400).json({ message: 'OTP expired. Please register again.' });
        }


        if (String(registrationData.otp) !== String(otp)) {
            console.log(3)
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        const newUser = new User({
            ...registrationData.userData,
            googleId: undefined,
            isVerified: true
        });

        await newUser.save();




        const token = jwt.sign(
            { id: newUser._id, email: newUser.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        console.log(5)
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 1000,
            path: '/'
        });

        pendingRegistrations.delete(registrationId);

        return res.status(200).json({

            message: 'Registration completed successfully',

            token,
            user: {
                id: newUser._id,
                email: newUser.email,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                status: newUser.status
            }
        });

        console.log(7)
    } catch (error) {
        console.error('Detailed OTP verification error:', error.message);
        console.error('Full error stack:', error.stack);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};




const resendOTP = async (req, res) => {
    try {
        const { registrationId } = req.body;

        const registrationData = pendingRegistrations.get(registrationId);
        if (!registrationData) {
            return res.status(404).json({ message: 'Registration session not found' });
        }



        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        registrationData.otp = otp;
        registrationData.otpExpiry = otpExpiry;
        pendingRegistrations.set(registrationId, registrationData);



        const emailSent = await sendVerificationEmail(registrationData.userData.email, otp);
        console.log(otp);


        if (!emailSent) {
            return res.status(500).json({
                message: 'Failed to send OTP email. Please try again later.',
                success: false
            });
        }

        res.status(200).json({
            message: emailSent
                ? 'New OTP sent successfully'
                : 'Failed to send OTP. Please try again later.',
            success: emailSent
        });
    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};



const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: 'Email and password are required'
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        if (!user.isVerified) {
            return res.status(403).json({
                message: 'Email not verified. Please verify your email first.',
                requiresVerification: true,
                userId: user._id
            });
        }

        if (user.status === 'blocked') {
            return res.status(403).json({
                message: "Your account has been blocked. Please contact support for assistance."
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }


        const token = jwt.sign(
            { id: user._id, email: user.email, id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        console.log(token);

        res.cookie('token', token, {
            httpOnly: true,
            secure: false,
            sameSite: 'none',
            maxAge: 3600000, // 1 hour
            path: '/'
        });
        console.log('Cookie set, checking cookies:', req.cookies);

        // Send both token and user data in response
        return res.status(200).json({
            message: 'Login successful',
            token, // Include token in response for client-side storage
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                status: user.status
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const googleCallback = (req, res) => {
    passport.authenticate('google', { session: false }, async (err, user, info) => {
        try {
            if (err) {
                console.error('Google authentication error:', err);
                return res.redirect(`${process.env.FRONTEND_URL}/?error=${encodeURIComponent('Authentication failed')}`);
            }

            if (!user) {
                return res.redirect(`${process.env.FRONTEND_URL}/?error=${encodeURIComponent('User not found')}`);
            }

            if (user.status === 'blocked') {
                return res.redirect(`${process.env.FRONTEND_URL}/?error=${encodeURIComponent('Account blocked')}`);
            }

            const token = jwt.sign(
                { id: user._id, email: user.email },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            res.redirect(`${process.env.FRONTEND_URL}/?token=${token}`);
        } catch (error) {
            console.error('Callback processing error:', error);
            res.redirect(`${process.env.FRONTEND_URL}/?error=${encodeURIComponent('Server error')}`);
        }
    })(req, res);
};


const handleGoogleSignup = async (req, res) => {
    try {
        const { firstName, lastName, email, googleId } = req.body.userDetails;

        let user = await User.findOne({
            $or: [
                { email: email.toLowerCase() },
                { googleId }
            ]
        });

        if (user) {
            // If user exists but doesn't have googleId, update it
            if (!user.googleId) {
                user.googleId = googleId;
                await user.save();
            }

            const token = jwt.sign(
                { id: user._id, email: user.email },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            // Set token in cookie
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 1000, // 1 hour
                path: '/'
            });

            // Return existing user data
            return res.status(200).json({
                message: 'Login successful',
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    status: user.status
                }
            });
        }

        // If user doesn't exist, create new user
        const newUser = new User({
            firstName,
            lastName,
            email: email.toLowerCase(),
            googleId,
            isVerified: true,  // Google users are considered verified
            status: 'active',
            // Generate a random password for Google users
            password: await bcrypt.hash(crypto.randomBytes(20).toString('hex'), 10)
        });

        await newUser.save();

        // Generate token for new user
        const token = jwt.sign(
            { id: newUser._id, email: newUser.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Set token in cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 1000, // 1 hour
            path: '/'
        });

        // Return new user data
        return res.status(201).json({
            message: 'Registration successful',
            user: {
                id: newUser._id,
                email: newUser.email,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                status: newUser.status
            }
        });

    } catch (error) {
        console.error('Google signup error:', error);
        res.status(500).json({
            message: 'Internal server error during Google signup',
            error: error.message
        });
    }
};

const verifyStatus = async (req, res) => {
    try {
        // Get the token from cookies
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({
                isAuthenticated: false,
                message: 'No token found'
            });
        }

        // Verify the token and get user data
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(401).json({
                isAuthenticated: false,
                message: 'User not found'
            });
        }

        return res.status(200).json({
            isAuthenticated: true,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                status: user.status
                // add other needed user fields
            }
        });
    } catch (error) {
        console.error('Verify status error:', error);
        return res.status(401).json({
            isAuthenticated: false,
            message: 'Invalid or expired token'
        });
    }
};


const logout = async (req, res) => {
    try {
        // Clear the authentication token cookie
        res.cookie('token', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            expires: new Date(0),
            path: '/'
        });

        return res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        return res.status(500).json({ message: 'Error during logout' });
    }
};

const verifyUserToken = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'No token provided or invalid format' });
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'No token found' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.status !== 'active') {
            return res.status(403).json({ message: 'You have been blocked' });
        }

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                status: user.status
            }
        });
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        console.error('Token verification error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

const getUserProfile = async (req, res) => {
    try {
       
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
       
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

       
        res.status(200).json({
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            status: user.status,
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        res.status(500).json({ message: 'Server error while fetching profile' });
    }
};

const updateUsersProfile = async (req, res) => {
    try {
        // Get user ID from middleware
        const userId = req.user.id;
        
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const { firstName, lastName, email, phone } = req.body;
        
        // Validation
        const validationErrors = {};
        if (!firstName) validationErrors.firstName = 'First name is required';
        if (!lastName) validationErrors.lastName = 'Last name is required';
        if (!email) validationErrors.email = 'Email is required';
        if (!phone) validationErrors.phone = 'Phone number is required';

        if (Object.keys(validationErrors).length > 0) {
            return res.status(400).json({ 
                message: 'Validation failed',
                errors: validationErrors 
            });
        }

        // Check if email is already in use by another user
        const existingUser = await User.findOne({
            email: email.toLowerCase(),
            _id: { $ne: userId }
        });

        if (existingUser) {
            return res.status(400).json({ 
                message: 'Email is already in use by another user' 
            });
        }

        // Update user
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                firstName,
                lastName,
                email: email.toLowerCase(),
                phone
            },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            message: 'Profile updated successfully',
            user: {
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                email: updatedUser.email,
                phone: updatedUser.phone
            }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Error updating profile' });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email.toLowerCase() })

        if (!user) {
            return res.status(404).json({ message: "No account found with this email" })
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000);

        const hashedToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');


        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = resetTokenExpiry;
        await user.save();

        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
        const transporter = await createTransporter();
        await transporter.sendMail({
            from: `"Password Reset" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Password Reset Request',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #333; text-align: center;">Password Reset Request</h1>
                    <p style="font-size: 16px;">You requested a password reset. Click the button below to reset your password:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Reset Password</a>
                    </div>
                    <p style="color: #666; font-size: 14px;">This link will expire in 30 minutes.</p>
                    <p style="color: #999; font-size: 12px;">If you didn't request this reset, please ignore this email.</p>
                </div>
            `
        });

        res.status(200).json({
            message: 'Password reset link sent to your email',
            success: true
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Error sending reset email' });
    }
}

const verifyResetToken = async (req, res) => {
    try {
        const { token } = req.params;

        // Hash token to compare with stored hash
        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                message: 'Invalid or expired reset token',
                validToken: false
            });
        }

        res.status(200).json({
            message: 'Token is valid',
            validToken: true
        });

    } catch (error) {
        console.error('Verify reset token error:', error);
        res.status(500).json({ message: 'Error verifying reset token' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password, confirmPassword } = req.body;

        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        // Hash token to compare with stored hash
        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        // Clear reset token fields
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        res.status(200).json({
            message: 'Password reset successful',
            success: true
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Error resetting password' });
    }
};

const advancedSearch = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.json([]);
        }
        console.log('Search query:', q);

        const products = await Product.find({
            $or: [
                { name: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } }
            ],
            isListed: true,
            isDeleted: false
        })
            .populate('category', 'name')
            .select('name category images')
            .limit(10)
            .lean();

        // Transform the data to match the frontend expectations
        const transformedProducts = products.map(product => ({
            _id: product._id,
            name: product.name,
            category: product.category?.name || '',
            thumbnail: product.images[0] || ''
        }));

        console.log('Found products:', transformedProducts);

        res.json(transformedProducts);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: error.message });
    }
};

const getNewArrivals = async (req, res) => {
    try {
        const newArrivals = await Product.find({ isListed: true })
            .sort({ createdAt: -1 })
            .limit(8)
            .populate('category')
            .lean()  // Convert to plain JavaScript object

        // If category population fails, send products without category details
        const safeNewArrivals = newArrivals.map(product => {
            if (!product.category) {
                product.category = null;
            }
            return product;
        });

        res.status(200).json(safeNewArrivals)
    } catch (error) {
        console.error('Detailed error:', error);
        res.status(500).json({ 
            message: 'Error fetching new arrivals',
            error: error.message
        });
    }
}


export { registerUser, loginUser, googleCallback, verifyOTP, resendOTP, handleGoogleSignup, verifyStatus, logout, verifyUserToken, getUserProfile, updateUsersProfile, forgotPassword, verifyResetToken, resetPassword, advancedSearch, getNewArrivals };

