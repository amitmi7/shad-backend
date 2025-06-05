exports.validateRegister = (req, res, next) => {
  const { name, email, password } = req.body;
  if ( !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }
  next();
};
