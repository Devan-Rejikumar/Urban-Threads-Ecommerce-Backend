// import express from 'express';

// import handleImageUpload from '../controllers/admin/products-controller.js'

// import upload from '../config/cloudinaryConfig.js'

// const router = express.Router();

// router.post('/upload-image',upload.single('my_file'), handleImageUpload)

// export default router;
import express from 'express';
import multer from 'multer';

const router = express.Router();


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');   
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname); 
    }
});


const upload = multer({ storage: storage });


const handleImageUpload = (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    
    res.send('File uploaded successfully.');
};


router.post('/upload-image', upload.single('my_file'), handleImageUpload);

export default router;