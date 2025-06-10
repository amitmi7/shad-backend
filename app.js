const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./utils/db");
const authRoutes = require("./routes/authRoutes");
// const userRoutes = require("./routes/userRoutes");
// const surveyRoutes = require("./routes/surveyRoutes"); hello server connected again and again 

dotenv.config();
connectDB();

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173" || '*', // Allow the frontend origin
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true, // Allow cookies and authorization headers
};

// app.use(cors(corsOptions));
app.use(cors()); // This allows all origins and methods

app.use(express.json());
app.use(morgan("common"));

// Base API Router
const apiRouter = express.Router();

apiRouter.use("/auth", authRoutes);
// apiRouter.use("/users", userRoutes);
// apiRouter.use("/surveys", surveyRoutes);

// Use the base router for all API routes
app.use("/api", apiRouter);

// Add a root route for verification or to prevent 403
app.get("/", (req, res) => {
  res.send("Welcome to the API!");
});

const PORT =  5003;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
