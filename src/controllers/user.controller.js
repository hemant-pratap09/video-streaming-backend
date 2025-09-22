import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const generateAccessAndRefresh = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refershtoken = user.generateRefreshToken()
        
        user.refershToken = refershtoken
        await user.save({validateBeforeSave: false})

        return (accessToken, refershtoken)

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler( async (req, res) => {
    // get user detail from frontend
    //validation - not empty
    // check if user already exist: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - creat entry in db
    // reove password and refersh token field from response
    // check fro user creation
    // return res
     

    // get user detail from frontend
    const {fullname, email, username, password} = req.body
    console.log("email: ", email);
    console.log("fullname: ", fullname);
    console.log("username: ", username);
    
    
    
    //validation - not empty
    if ([fullname, email, username, password].some((field) => 
        field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    // Check if user already exists
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with wmail or username already exists")
    }
    
  
    
    // check for images, check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        username: username.toLowerCase
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }
    
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully") // Fixed response format
    )
})

const loginUser = asyncHandler(async (req, res) => {
    // set up route
    //validate input
    // check if User exists in the database
    //Compare password with stored hashed password 
    // Handle wrong credentials
    //generate JWT Token with user ID/role as payload
    // Send toekn in resposne 
    //return access token 

    const {email, username, password} = req.body
    if (!username || !email) {
        throw new ApiError(400, "username or eamil id required")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if (!user){
        throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid){
        throw new ApiError(401, "Invalid use credentials")
    }

    const {accessToken, refershToken} = await generateAccessToken(user._id)
    
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    const option = {
        httpOnly: true,
        secure: true
    }
    return res.status(200).cookie("accessToken", accessToken, option)
    .cookie("refreshToken", refershToken, option)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken,
                refershToken
            },
            "User logged In Successfully"
        )
    )
})

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refershToken: undefined
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



export { 
    registerUser,
    loginUser,
    logoutUser
 }