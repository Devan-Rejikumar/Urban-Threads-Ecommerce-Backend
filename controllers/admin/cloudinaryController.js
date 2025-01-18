// import cloudinary from "../../config/cloudinaryConfig";
import cloudinary from 'cloudinary'

export const cloudinaryImgUpload = async (req, res) => {
  console.log('clouding get request');
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const uploadPreset = process.env.CLOUDINARY_PRESET_NAME;


    const stringToSign = `timestamp=${timestamp}&upload_preset=${uploadPreset}`;
    console.log(process.env.CLOUDINARY_API_KEY);


    const signature = cloudinary.utils.api_sign_request(
      { timestamp, upload_preset: uploadPreset },
      process.env.CLOUDINARY_API_SECRET
    );

    
    const uploadUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDIANRY_NAME}/image/upload`;


    res.status(200).json({
      signature,
      timestamp,
      uploadPreset,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDIANRY_NAME,
      uploadUrl 
    });
  } catch (error) {
    console.error('Error generating Cloudinary signature:', error);
    res.status(500).json({ message: 'Cloudinary config failed' });
  }
}
