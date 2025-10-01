import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


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



export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}

// import { asyncHandler } from "../utils/asyncHandler.js";
// import { ApiError } from "../utils/ApiError.js";
// import { User } from "../models/user.model.js"
// import { uploadFile } from "../utils/cloudinary.js";
// import { ApiResponse } from "../utils/ApiResponse.js";
// import jwt from "jsonwebtoken"

// const generateAccessAndRefreshTokens = async(userId) => {
//     try {
//         const user = await User.findById(userId)
//         const accessToken = user.generateAccessToken()
//         const refreshToken = user.generateRefreshToken()
        
//         user.refreshToken = refreshToken
//         await user.save({validateBeforeSave: false})

//         return { accessToken, refreshToken }

//     } catch (error) {
//         console.log(error);
//         throw new ApiError(500, "Something went wrong while generating refresh and access token")
//     }
// }

// const registerUser = asyncHandler( async (req, res) => {
//     try {
//         console.log("request files:", req.files);
//         console.log("Request body:", req.body);
         
//         const { fullName, email, username, password } = req.body
        
//         if ([fullName, email, username, password].some((field) => 
//             field?.trim() === "")
//         ) {
//             throw new ApiError(400, "All fields are required")
//         }

//         const existedUser = await User.findOne({
//             $or: [{ username }, { email }]
//         })

//         if (existedUser) {
//             throw new ApiError(409, "User with email or username already exists")
//         }
        
//         const avatarLocalPath = req.files?.avatar?.[0]?.path;
//         const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

//         if (!avatarLocalPath) {
//             throw new ApiError(400, "Avatar file is required")
//         }

//         // Upload avatar with fallback to local storage
//         const avatar = await uploadOnCloudinary(avatarLocalPath)
        
//         if (!avatar || !avatar.url) {
//             throw new ApiError(500, "Avatar upload failed to both Cloudinary and local storage")
//         }

//         // Upload cover image with fallback
//         let coverImage = null;
//         if (coverImageLocalPath) {
//             coverImage = await uploadOnCloudinary(coverImageLocalPath)
//         }

//         const user = await User.create({
//             fullName: fullName,  // Changed from 'fullname' to 'fullName'
//             avatar: avatar.url,
//             coverImage: coverImage?.url || "",
//             email,
//             password,
//             username: username.toLowerCase(),
//         })

//         const createdUser = await User.findById(user._id).select(
//             "-password -refreshToken"
//         )

//         if (!createdUser) {
//             throw new ApiError(500, "Something went wrong while registering the user")
//         }
        
//         return res.status(201).json(
//             new ApiResponse(201, createdUser, "User registered successfully")
//         )
//     } catch (error) {
//         throw new ApiError(400, `Error in registration: ${error.message}`)
//     }
// })

// const loginUser = asyncHandler(async (req, res) => {
//     const {email, username, password} = req.body
//     console.log(email);

//     if (!username && !email) {
//         throw new ApiError(400, "username or email id required")
//     }

//     const user = await User.findOne({
//         $or: [{username}, {email}]
//     })

//     if (!user){
//         throw new ApiError(404, "User does not exist")
//     }

//     const isPasswordValid = await user.isPasswordCorrect(password)

//     if (!isPasswordValid){
//         throw new ApiError(401, "Invalid user credentials")
//     }

//     const {accessToken, refreshToken} = await generateAccessAndRefresh(user._id)
    
//     const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

//     const options = {
//         httpOnly: true,
//         secure: true
//     }

//     return res.status(200)
//     .cookie("accessToken", accessToken, options)
//     .cookie("refreshToken", refreshToken, options)
//     .json(
//         new ApiResponse(
//             200,
//             {
//                 user: loggedInUser, accessToken, refreshToken
//             },
//             "User logged In Successfully"
//         )
//     )
// })

// const logoutUser = asyncHandler(async(req, res) => {
//     await User.findByIdAndUpdate(
//         req.user._id,
//         {
//             $unset: {
//                 refreshToken: 1
//             }
//         },
//         {
//             new: true
//         }
//     )
//     const options = {
//         httpOnly: true,
//         secure: true
//     }

//     return res
//     .status(200)
//     .clearCookie("accessToken", options)
//     .clearCookie("refreshToken", options)
//     .json(new ApiResponse(200, {}, "User logged Out"))
// })

// const refreshAccessToken = asyncHandler(async (req, res) => {
//     const incomingRefreshToken = req.cookies.refershToken || req.body.refreshToken

//     if (incomingRefreshToken) {
//         throw new ApiError(401, "unauthorized request")
//     }

//     try {
//         const decodedToken = jwt.verify(
//             incomingRefreshToken,
//             process.env.REFRESH_TOKEN_SECRET,
//         )
    
//         const user = User.findById(decodedToken?._id)
//         if (!user) {
//             throw new ApiError(401, "Invalid Refresh Token")
//         }
//         if (incomingRefreshToken !== user?.refreshToken) {
//             throw new ApiError(401, "Refresh token is expired or used")
//         }
//         const options = {
//             httponly: true,
//             secure: true
//         }
//         const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
//         return res
//         .status(200)
//         .cookie("accessToken", accessToken, options)
//         .cookie("refreshToken", newRefreshToken, options)
//         .json(
//             new ApiResponse(
//                 200,
//                 {accessToken, refershToken: newRefreshToken},
//                 "Access token refreshed"
//             )
//         )
//     } catch (error) {
//         throw new ApiError(401, error?.message || "Invalid refresh token")
//     }
// })

// export { 
//     registerUser,
//     loginUser,
//     logoutUser,
//     refreshAccessToken
// }