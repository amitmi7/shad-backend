const jwt = require("jsonwebtoken");

exports.authenticateUser = (req, res, next) => {
  const token = req.header("Authorization");
  // Check if token exists
  if (!token) {
    return res.status(401).json({ success: false, message: "Access denied. No token provided." });
  }
  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach the decoded user info to the request    
    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    console.log(error);
    res.status(400).json({ success: false, message: "Invalid token." });
  }
};
