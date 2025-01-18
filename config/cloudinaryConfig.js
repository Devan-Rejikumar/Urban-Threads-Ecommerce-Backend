import { v2 as cloudinary } from 'cloudinary';

const connectCloudinary = async () => {
  cloudinary.config({
    cloud_name: 'dgbbdhdg7',
    api_key: 372466265213178,
    api_secret: 'RsbEo43EGP0e-lKgzEKqF2ktw-4',
  });
}

export default connectCloudinary;
