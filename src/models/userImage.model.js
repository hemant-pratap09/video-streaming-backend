import mongoose from "mongoose";
const userImageSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    imageType: {
        type: String,
        enum: ["avatar", "cover"],
        required: true
    },
    url: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        required: true
    },
    publicId: {
        type: String,
        required: true
    }
}, {timestamps: true})

export const UserImage = mongoose.model("UserIamge", userImageSchema)