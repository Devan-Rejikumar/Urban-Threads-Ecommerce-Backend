import mongoose from "mongoose";

const connectDB = async ()=>{
    try {
        await mongoose.connect(process.env.MONGODB_URL,{
            useNewUrlParser : true,
            useUnifiedTopology : true,
        });
        console.log('MongoDB connected successfully');
        
    } catch (error) {
        console.error('MongoDb connection failed',error.message)
        process.exit(1);
    }
}

export default connectDB;