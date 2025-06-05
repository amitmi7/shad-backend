const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const response = require("../utils/response");
const User = require("../models/User");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Google Auth Controller
exports.googleAuth = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return response(res, {
        status: 400,
        msg: "Token is required",
      });
    }

    console.log("Google token received:", token);

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    console.log(ticket);
    

    const { name, email, picture, sub: googleId } = ticket.getPayload();
    console.log(name, email);

    // Only allow login if user already exists in Admin collection
    let user = await User.findOne({ email });
    console.log(!user);

    if (!user) {
      return res.send(response(409, false, "You are not authorized"));
    }

    // // Update name or profileImage if changed
    // const updates = {};
    // if (user.name !== name) updates.name = name;
    // if (user.profileImage !== picture) updates.profileImage = picture;
    // if (Object.keys(updates).length > 0) {
    //     await Admin.updateOne({ _id: user._id }, { $set: updates });
    //     user = await Admin.findById(user._id); // refresh user data
    // }

    // Generate JWT
    const jwtToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Send response
    res.send(
      response(200, true, "Login successful", {
        authToken: token,
        user: { id: user._id, name: user.name, email: user.email },
      })
    );
  } catch (error) {
    console.log(error);
    return response(res, {
      status: 500,
      msg: "Google authentication failed",
      error: error.message,
    });
  }
};
