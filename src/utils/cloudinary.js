import { v2 as cloudinary } from 'cloudinary'
import { response } from 'express';
import fs from "fs"
import { loadEnvFile } from 'process';


cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        //uplaod the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        //file has been uploaded successfully
        //console.log("file is uploaded on cloudinary", response.url);
        fs.unlinkSync(localFilePath)
        return response
    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}
const deleteFromCloudinary = async (publicId) => {
    try {
        if (!publicId) return null;
        const response = await cloudinary.uploader.destroy(publicId);
        return response;
    } catch (error) {
        console.log("cloudinary delete error:", error);
        return null;
    }
}

export {uploadOnCloudinary, deleteFromCloudinary}

// import { v2 as cloudinary } from 'cloudinary'
// import fs from "fs"
// import path from "path"

// cloudinary.config({ 
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
//   api_key: process.env.CLOUDINARY_API_KEY, 
//   api_secret: process.env.CLOUDINARY_API_SECRET
// });

// const uploadOnCloudinary = async (localFilePath) => {
//     try {
//         if (!localFilePath) return null
        
//         const response = await cloudinary.uploader.upload(localFilePath, {
//             resource_type: "auto"
//         })
        
//         fs.unlinkSync(localFilePath)
//         return response
//     } catch (error) {
//         console.log("Cloudinary upload failed:", error);
//         // Don't delete the file yet, we might use it for local storage
//         return null;
//     }
// }

// const saveFileLocally = async (localFilePath) => {
//     try {
//         if (!localFilePath) return null
        
//         const fileName = path.basename(localFilePath)
//         const uploadDir = './public/uploads'
        
//         // Create uploads directory if it doesn't exist
//         if (!fs.existsSync(uploadDir)) {
//             fs.mkdirSync(uploadDir, { recursive: true })
//         }
        
//         const newPath = path.join(uploadDir, `${Date.now()}-${fileName}`)
        
//         // Copy file to uploads directory
//         fs.copyFileSync(localFilePath, newPath)
        
//         // Delete temporary file
//         fs.unlinkSync(localFilePath)
        
//         // Return local URL
//         return {
//             url: `/uploads/${path.basename(newPath)}`,
//             public_id: path.basename(newPath, path.extname(newPath))
//         }
//     } catch (error) {
//         console.log("Local file save failed:", error);
//         // Clean up original file
//         if (fs.existsSync(localFilePath)) {
//             fs.unlinkSync(localFilePath)
//         }
//         return null
//     }
// }

// const uploadFile = async (localFilePath, useLocal = false) => {
//     if (useLocal) {
//         return await saveFileLocally(localFilePath)
//     }
    
//     // Try Cloudinary first
//     const cloudinaryResult = await uploadOnCloudinary(localFilePath)
    
//     if (cloudinaryResult) {
//         return cloudinaryResult
//     }
    
//     // Fallback to local storage
//     console.log("Falling back to local storage...")
//     return await saveFileLocally(localFilePath)
// }

// export { uploadOnCloudinary, saveFileLocally, uploadFile }