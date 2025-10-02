import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js"
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { UserImage } from "../models/userImage.model.js"


const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return { accessToken, refreshToken }

    } catch (error) {
        console.log(error);
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    
    }
}

const registerUser = asyncHandler( async (req, res) => {
    try {
        console.log("request files:", req.files);
        console.log("Request body:", req.body);
         
        // get user detail from frontend
        const { fullName, email, username, password } = req.body
        
        //validation - not empty
        if ([fullName, email, username, password].some((field) => 
            field?.trim() === "")
        ) {
            throw new ApiError(400, "All fields are required")
        }

        // Check if user already exists
        const existedUser = await User.findOne({
            $or: [{ username }, { email }]
        })

        if (existedUser) {
            throw new ApiError(409, "User with email or username already exists")
        }
        
        // check for images, check for avatar
        const avatarLocalPath = req.files?.avatar?.[0]?.path;
        const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

        if (!avatarLocalPath) {
            throw new ApiError(400, "Avatar file is required")
        }

        // Upload avatar
        const avatar = await uploadOnCloudinary(avatarLocalPath)
        
        if (!avatar || !avatar.url) {
            throw new ApiError(400, "Avatar upload failed")
        }

        // Upload cover image (optional)
        let coverImage = null;
        if (coverImageLocalPath) {
            coverImage = await uploadOnCloudinary(coverImageLocalPath)
        }

        //create user object - create entry in db
        const user = await User.create({
            fullName,  
            email,
            username: username.toLowerCase(),
            password,
            avatar: avatar.url,
            coverImage: coverImage?.url || ""
        })

        const createdUser = await User.findById(user._id).select(
            "-password -refreshToken"
        )

        if (!createdUser) {
            throw new ApiError(500, "Something went wrong while registering the user")
        }
        
        return res.status(201).json(
            new ApiResponse(201, createdUser, "User registered successfully")
        )
    } catch (error) {
        throw new ApiError(400, `Error in registration: ${error.message}`)
    }
})

const loginUser = asyncHandler(async (req, res) => {
    // set up route
    //validate input
    // check if User exists in the database
    //Compare password with stored hashed password 
    // Handle wrong credentials
    //generate JWT Token with user ID/role as payload
    // Send token in resposne 
    //return access token 

    const {email, username, password} = req.body
    console.log(email);

    if (!username && !email) {
        throw new ApiError(400, "username or email id required")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if (!user){
        throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid){
        throw new ApiError(401, "Invalid user credentials")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)
    
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const option = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .cookie("accessToken", accessToken, option)
    .cookie("refreshToken", refreshToken, option)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )
})

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refershToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET,
        )
    
        const user = User.findById(decodedToken?._id)
        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token")
        }
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
        }
        const options = {
            httponly: true,
            secure: true
        }
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken, refershToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword, confirmPassword} = req.body
    
    if (!(newPassword === confirmPassword)) {
        throw new ApiError(400, "password doesn't match")
    }
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Ivalid old password")
    }

    user.password = newPassword
    user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(200, req.user, "current user fetched successfully")
})

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email} = req.body

    if (!fullName || !email) {
        throw new ApiError(400, " All fields are requi")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
})




const uploadUserImage = asyncHandler(async(req, res) => {
    const imageType = req.query.type
    const imageLocalPath = req.file?.path

    if (!imageLocalPath) {
        throw new ApiError(400, "Image file is missing")
    }
    if (!["avatar", "cover"].includes(imageType)) {
        throw new ApiError(400, "Invalid image type")
    }

    const uploadedImage = await uploadOnCloudinary(imageLocalPath)
    if (!uploadedImage?.url) {
        throw new ApiError(400, "Error while uploading image")
    }

    const userImage = await UserImage.create({
        userId: req.user._id,
        imageType,
        url: uploadedImage.url,
        publicId: uploadedImage.public_id,
        isActive: false
    })

    return res
    .status(200)
    .json(new ApiResponse(200, userImage, `${imageType} uploaded successfully`))
})

const setActiveImage = asyncHandler(async(req, res) => {
    const { imageId, imageType } = req.body

    await UserImage.updateMany(
        {
            userId: req.user._id,
            imageType,
            isActive: true
        },
        {
            $set: { isActive: false }
        }
    )

    const activatedImage = await UserImage.findOneAndUpdate(
        {
            _id: imageId,
            userId: req.user._id
        },
        {
            $set: { isActive: true }
        },
        { new: true }
    )

    if (!activatedImage) {
        throw new ApiError(404, "Image not found")
    }

    const updateField = imageType === "avatar" ? "avatar" : "coverImage"
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            [updateField]: activatedImage.url
        },
        { new: true }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, { user, activatedImage }, `${imageType} set as active successfully`))
})

const getUserImages = asyncHandler(async(req, res) => {
    const images = await UserImage.find({
        userId: req.user._id
    }).sort("-createdAt")

    return res
    .status(200)
    .json(new ApiResponse(200, images, "User images fetched successfully"))
})

const deleteUserImage = asyncHandler(async(req, res) => {
    const { imageId } = req.params

    const image = await UserImage.findOne({
        _id: imageId,
        userId: req.user._id
    })

    if (!image) {
        throw new ApiError(404, "Image not found")
    }

    if (image.isActive) {
        throw new ApiError(400, "Cannot delete active image")
    }

    await deleteFromCloudinary(image.publicId)
    await image.deleteOne()

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Image deleted successfully"))
})

const getUserChannelProfile = asyncHandler(async(req, res) => {
    const {username} = req.params
    if (!username?.trim()) {
        throw new ApiError(400, "username is missing")
    }
    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "Subscriptions",
                localField: "._id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "Subscriptions",
                localField: "._id",
                foreignField: "subscribers",
                as: "SubscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subcribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])
    if (!channel?.length) {
        throw new ApiError(404, " Channel does not exists")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    )
})

const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await user.aggregate([
        {
            $match: {
                _id: new mongoose.Types.objectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "user",
                            lacalfield: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }

                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].WatchHistory,
            "watch history fetched successfully"
        )
    )
})


export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    uploadUserImage,
    setActiveImage,
    getUserImages,
    deleteUserImage,
    getUserChannelProfile,
    getWatchHistory
}

