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
    
    // Validate admin role or permissions
    if (!decoded.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized admin access' 
      });
    }

    // Attach admin info to the request for further use
    req.admin = decoded;
    
    // Continue to the next middleware/route handler
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