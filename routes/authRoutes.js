const express = require("express");
const multer = require("multer");
const { loginUser, registerUser, chatWithGemini, getChatHistoryByUserId, chatWithGeminiGPT, chatWithGeminiGPTStream, chatWithGeminiEmailSchedule, chatWithGeminiImageRecognize, sendOtp, verifyOtp, sendOtpForResetPassword, verifyOtpForResetPassword, resetPassword } = require("../controllers/authController");
const {googleAuth} = require("../controllers/googleController")
const { validateRegister } = require("../middleware/validateRequest");
const { authenticateUser } = require("../middleware/authenticateUser");
const path = require("path");
// Multer setup for handling file uploads
const upload = multer({
  dest: "uploads/", // Directory to store uploaded files
  limits: { fileSize: 5 * 1024 * 1024 }, // Max file size: 5MB
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png/;
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = fileTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Images only! (jpeg, jpg, png)"));
    }
  },
});

const router = express.Router();

router.post("/sendotp", sendOtp);
router.post("/verifyotp", verifyOtp);
router.post("/register", registerUser);
router.post("/sendotpforresetpassword", sendOtpForResetPassword);
router.post("/verifyotpforresetpassword", verifyOtpForResetPassword);
router.post("/resetpassword", resetPassword);
router.post("/login", loginUser);
router.post("/chat",authenticateUser, chatWithGeminiGPT);
router.get("/stream-chat", chatWithGeminiGPTStream);
router.get("/chat-history", authenticateUser, getChatHistoryByUserId);
router.post("/scheduleEmail",authenticateUser, chatWithGeminiEmailSchedule);
router.post("/recognize-image",upload.single("imagePath"), authenticateUser, chatWithGeminiImageRecognize);
router.post("/google", googleAuth);


module.exports = router;
