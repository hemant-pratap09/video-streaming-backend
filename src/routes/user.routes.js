import { Router } from "express";
import { 
    changeCurrentPassword, 
    deleteUserImage, 
    getCurrentUser, 
    getUserImages, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    registerUser, 
    setActiveImage, 
    updateAccountDetails, 
    uploadUserImage 
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

// Public routes
router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage", 
            maxCount: 1
        }
    ]),
    registerUser
)
router.route("/login").post(loginUser)
router.route("/refresh-token").post(refreshAccessToken)

// Protected routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/current-user").get(verifyJWT, getCurrentUser)
router.route("/update-account").patch(verifyJWT, updateAccountDetails)

// Image management routes
router.route("/images")
    .post(verifyJWT, upload.single("image"), uploadUserImage)
    .get(verifyJWT, getUserImages)

router.route("/images/set-active").patch(verifyJWT, setActiveImage)
router.route("/images/:imageId").delete(verifyJWT, deleteUserImage)

export default router