import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js"



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

    const {fullname, email, username, password} = req.body
    console.log("email: ", email);

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

    const avatarLocalPath = req.file?.avatar[0]?.path

    // Handle file uplaods and response 
    try {
        return res.status(201).json({
            success: true,
            message: "User registerd successfully"
        })
    } catch (error) {
        throw new ApiError(500, "Error while registering user", error)
    }
        
    
})
export { registerUser }