import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js'
import session from 'express-session';
import connectDB from './config/db.js';
import setupGoogleAuth from './config/googleAuth.js';
import cookieParser from 'cookie-parser';
import productRoutes from './routes/productRoutes.js'
import adminProductsRouter from './routes/products-routes.js'
import cloudinaryRoutes from './routes/cloudinaryRoutes.js';
import connectCloudinary from './config/cloudinaryConfig.js';
import cartRoutes from './routes/cartRoutes.js';
import wishlistRoutes from './routes/wishlistRoute.js';
import userOrderRoutes from './routes/userOrderRoutes.js';
import adminOrderRoutes from './routes/adminOrderRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import offerRoutes from './routes/offerRoutes.js';
import salesReportRoutes from './routes/salesReport.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import { Category, Product, Offer} from './models/Index.js';



dotenv.config();
connectDB();
connectCloudinary().then(()=>console.log(' Coudnary Successfull')).catch((err)=>console.log(err))

const app = express();

app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit : '50mb' }));
app.use(express.json({limit : '50mb'}));

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization']
};

app.use(cors(corsOptions));

app.use((req, res, next) => {
  res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com"
  );
  next();
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie : {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(passport.initialize());
app.use(passport.session());


setupGoogleAuth();

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products",productRoutes)
app.use('/api/products', adminProductsRouter)
app.use('/',cloudinaryRoutes);
app.use('/api/cart',cartRoutes)
app.use('/api/wishlist', wishlistRoutes);
app.use('/api', userOrderRoutes);
app.use('/api', adminOrderRoutes);
app.use('/api', couponRoutes);  
app.use('/api/payment', paymentRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/admin/offers', offerRoutes);
app.use('/api/admin/reports', salesReportRoutes);
app.use('/api/admin/dashboard', dashboardRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
})



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});