import User from '../../models/User.js';
import bcrypt from 'bcrypt';


const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.googleId) {
            return res.status(400).json({
                message: 'Password cannot be changed for Google-authenticated accounts'
            });
        }

        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            if (!isPasswordValid) {
                return res.status(400).json({ message: 'Current password is incorrect' });
            }
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashedPassword;
        await user.save();

        res.status(200).json({ message: "Password updated succesfully" })


    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Failed to update password' });
    }
}

export default changePassword;