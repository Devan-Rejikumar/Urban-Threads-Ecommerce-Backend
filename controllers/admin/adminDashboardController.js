import Admin from '../../models/Admin.js';

export const getDashboard = (req, res) => {
    try {
      res.status(200).json({
        message: 'Welcome to the Admin Dashboard!',
        user: req.user, 
      });
    } catch (error) {
      res.status(500).json({
        message: 'Error retrieving the admin dashboard',
        error: error.message,
      });
    }
  };