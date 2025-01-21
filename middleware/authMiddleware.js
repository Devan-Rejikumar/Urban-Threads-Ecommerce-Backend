
import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
    try { 
        const token = 
            req.cookies.token || 
            req.cookies.adminToken ||
            req.headers.authorization?.split(' ')[1] ||
            req.query.token;

            console.log('Token received in middleware:', token);

        if (!token) {
            console.log('No token found');
            return res.status(401).json({ message: 'No token found' });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('Decoded token:', decoded);
            console.log('Successfully decoded token:', decoded);
            req.user = decoded;
            next();
        } catch (err) {
            console.log('Token verification error:', err);
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    message: 'Token expired',
                    expired: true
                });
            }
            return res.status(401).json({ message: 'Invalid token' });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};