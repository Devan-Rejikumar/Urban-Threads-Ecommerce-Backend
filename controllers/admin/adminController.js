
import Admin from '../../models/Admin.js';
import User from '../../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const adminLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.findOne({ email: new RegExp(`^${email}$`, 'i'), isAdmin: true });

    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin._id, email: admin.email, isAdmin: admin.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.cookie('adminToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'strict',
      maxAge: 3600000, // 1 hour
      path: '/'
    });

    res.status(200).json({ 
      message: 'Admin logged in successfully',
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: 'admin'
      }
    });
  } catch (error) {
    console.error("Server error:", error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const validateToken = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select('-password');
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    res.status(200).json({ 
      valid: true,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: 'admin'
      }
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Existing controller functions remain the same
export const getAllUsers = async (req, res) => {
  try {
    console.log('bcaksjchkj111')
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};

export const blockUsers = async (req, res) => {
  try {
    const userId = req.params.id;
    const updatedUser = await User.findByIdAndUpdate(
      userId, 
      { status: 'blocked' }, 
      { new: true }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'User blocked successfully', user: updatedUser });
  } catch (error) {
    console.error("Error blocking user:", error);
    res.status(500).json({ message: 'Error blocking user', error: error.message });
  }
};

export const unblockUsers = async (req, res) => {
  try {
    const userId = req.params.id;
    const updatedUser = await User.findByIdAndUpdate(
      userId, 
      { status: 'unblocked' }, 
      { new: true }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'User unblocked successfully', user: updatedUser });
  } catch (error) {
    console.error("Error unblocking user:", error);
    res.status(500).json({ message: 'Error unblocking user', error: error.message });
  }
};

export const adminLogout = async (req, res) => {
  try {
    res.clearCookie('adminToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      expires: new Date(0), 
      maxAge: 0 
    });
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error logging out' });
  }
};

export const verifyAdminToken = async(req,res) =>{
  try {
    console.log('fffffffffffffffffffffffffff',req.cookies)
    const {adminToken} = req.cookies
    console.log(adminToken)
    if(!adminToken){
      return res.status(404).json('token not found')
    }


    const decoded = jwt.verify(adminToken, process.env.JWT_SECRET);
    res.status(200).json('Successful')
  } catch (error) {
    res.status(500).json('something went wrong')
  }
}