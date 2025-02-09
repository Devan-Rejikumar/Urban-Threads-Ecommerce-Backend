import jwt from 'jsonwebtoken';

export const verifyAdminTokens = async (req, res, next) => {
  try {
    const { adminToken } = req.cookies;

    if (!adminToken) {
      return res.status(401).json({ 
        success: false, 
        message: 'Admin token not found' 
      });
    }

    const decoded = jwt.verify(adminToken, process.env.JWT_SECRET);
    
   
    if (!decoded.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized admin access' 
      });
    }


    req.admin = decoded;
    
  
    next();

  } catch (error) {
    console.error('Admin token verification error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Admin token expired' 
      });
    }

    res.status(401).json({ 
      success: false, 
      message: 'Invalid admin token' 
    });
  }
};

export const isAdmin = async (req, res, next) => {
  try {
      const user = await User.findById(req.user.id);
      
      if (!user || user.role !== 'admin') {
          return res.status(403).json({
              success: false,
              message: 'Access denied. Admin only.'
          });
      }
      
      next();
  } catch (error) {
      res.status(500).json({
          success: false,
          message: 'Error verifying admin status'
      });
  }
};
