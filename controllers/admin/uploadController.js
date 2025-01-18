import cloudinary from '../../config/cloudinaryConfig.js';
export const uploadImage = async (req, res) => {
  try {
    const file = req.file;  
    const result = await cloudinary.uploader.upload(file.path);  

    res.status(200).json({
      message: 'Image uploaded successfully',
      imageUrl: result.secure_url,  
    });
  } catch (error) {
    res.status(500).json({ message: 'Error uploading image', error: error.message });
  }
};
