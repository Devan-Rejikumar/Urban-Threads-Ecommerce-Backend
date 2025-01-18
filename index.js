import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js'
import session from 'express-session';
import connectDB from './config/db.js';
import passportCongig from './config/googleAuth.js';
import setupGoogleAuth from './config/googleAuth.js';
import cookieParser from 'cookie-parser';
import productRoutes from './routes/productRoutes.js'
import adminProductsRouter from './routes/products-routes.js'
import cloudinaryRoutes from './routes/cloudinaryRoutes.js';
import connectCloudinary from './config/cloudinaryConfig.js';



dotenv.config();
connectDB();
connectCloudinary().then(()=>console.log(' Coudnary Successfull')).catch((err)=>console.log(err))

const app = express();

app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit : '50mb' }));
app.use(express.json({limit : '50mb'}));





const corsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

app.use((req, res, next) => {
  res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com"
  );
  next();
});


app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
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


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
})



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});