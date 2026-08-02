import mongoose from "mongoose";

const connectDB=async()=>{
    try {
        if(!process.env.MONGO_DB) {
            throw new Error("MONGO_DB is not defined in .env file");
        }
        const conn=await mongoose.connect(process.env.MONGO_DB);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    }catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
}

export default connectDB;