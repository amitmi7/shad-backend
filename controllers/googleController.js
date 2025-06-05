const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const response = require("../utils/response");
const User = require("../models/User");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.googleAuth = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: "Token is required" });
    }
    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { name, email, picture } = ticket.getPayload();
    // Check if the user exists
    let user = await User.findOne({ email });
    // If user does not exist, register a new user
    if (!user) {
      const defaultPasswordHash =
        "$2b$10$0PQybQkqvqN3Uy8P4.97Cei/W0NuZxxQxsvTppF7RGk/8Uobed7pi"; // Manual hashed password
      user = new User({
        name: name || "Google User",
        email,
        password: defaultPasswordHash,
      });

      await user.save();
    }
    // Generate JWT token
    const jwtToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    // Send response
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        authToken: jwtToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          picture: picture || null,
        },
      },
    });
  } catch (error) {
    console.error("Error in Google authentication:", error);
    res.status(500).json({
      success: false,
      message: "Google authentication failed",
      error: error.message,
    });
  }
};

