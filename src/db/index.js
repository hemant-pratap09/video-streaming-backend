// import mongoose from "mongoose";
// // import { DB_NAME } from "../constants.js";

// // const connectDB = async () => {
// //     try {
// //         await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
// //         console.log(`\nMongoDB connected! DB HOST: ${connectionInstance.connection.host}`);
        
// //     } catch (error) {
// //         console.log("MONGODB connectiona error", error);
// //         process.exit(1)
// //     }   
// // }

// // export default connectDB;import mongoose from "mongoose";
// import { DB_NAME } from "../constants.js";

// const connectDB = async () => {
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
//         console.log(`\nMongoDB connected! DB HOST: ${connectionInstance.connection.host}`);
        
//     } catch (error) {
//         console.log("MONGODB connectiona error", error);
//         process.exit(1)
//     }   
// }

// export default connectDB;
import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try {
        // Save the returned connection in a variable
        const connectionInstance = await mongoose.connect(
            `${process.env.MONGODB_URL}/${DB_NAME}`
        );

        console.log(
            `\n✅ MongoDB connected! DB HOST: ${connectionInstance.connection.host}`
        );
    } catch (error) {
        console.error("❌ MONGODB connection error:", error);
        process.exit(1);
    }
};

export default connectDB;
