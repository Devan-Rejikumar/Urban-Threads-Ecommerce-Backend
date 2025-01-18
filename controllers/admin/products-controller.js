const handleImageUpload = async (req, res) => {
    try {
   
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        const url = 'data:' + req.file.mimetype + ';base64,' + b64;
        const result = await imageUploadUtils(url);
        res.json({
            success: true,
            result,
        });
    } catch (error) {
        console.error('Error during image upload:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to upload image',
            error: error.message,
        });
    }
};

export default handleImageUpload;