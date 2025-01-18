import express from 'express';
const router = express.Router();
import {cloudinaryImgUpload} from '../controllers/admin/cloudinaryController.js';

router.get('/admin/generate-upload-url', cloudinaryImgUpload);

export default router;