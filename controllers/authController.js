const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const config = require("../config");
const response = require("../utils/response");
const { default: axios } = require("axios");
// const { GoogleGenAI } = require("@google/genai");
const { GoogleGenAI, Type } = require("@google/genai");
const schedule = require("node-schedule");
const fs = require("fs/promises");
const fetch = require('node-fetch');
const Chat = require("../models/Chat");
const OpenAI = require("openai");
const nodemailer = require("nodemailer");
const Otp = require("../models/Otp");
const { sendEmail } = require("../utils/sendEmail");

// Generate random OTP
const generateOtp = () => Math.floor(100000 + Math.random() * 900000);

exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.send(response(400, false, "Email is required"));

    const otp = generateOtp();
    await Otp.findOneAndUpdate(
      { email },
      { otp, createdAt: Date.now() },
      { upsert: true }
    );

    await sendEmail(email, "Your OTP for Registration", `Your OTP is ${otp}`);
    res.send(response(200, true, "OTP sent successfully"));
  } catch (error) {
    res.send(response(500, false, "Error sending OTP"));
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.send(response(400, false, "Email and OTP are required"));
    const otpRecord = await Otp.findOne({ email });
    if (!otpRecord || otpRecord.otp !== otp) {
      return res.send(response(400, false, "Invalid or expired OTP"));
    }
    await Otp.deleteOne({ email }); // OTP verified, delete it from DB
    res.send(response(200, true, "OTP verified successfully"));
  } catch (error) {
    res.send(response(500, false, "Error verifying OTP"));
  }
};

exports.registerUser = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.send(response(400, false, "Email and Password are required"));

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.send(response(409, false, "Email already registered"));
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name: name || "user", email, password: hashedPassword });
    await newUser.save();
    res.send(response(200, true, "User registered successfully"));
  } catch (error) {
    res.send(response(500, false, "Error registering user"));
  }
};


exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.send(response(401, false, "Invalid credentials"));
    }
    const token = jwt.sign(
      { id: user._id, email: user.email },
      config.jwtSecret,
      {
        expiresIn: "24h",
      }
    );
    // Return token plus user details (id, name, email)
    res.send(
      response(200, true, "Login successful", {
        authToken: token,
        user: { id: user._id, name: user.name, email: user.email },
      })
    );
  } catch (error) {
    res.send(response());
  }
};

exports.chatWithGemini = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.id;
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
    if (!message) {
      return res.send(response(400, false, "Message is required"));
    }
    // OpenAI API request
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: message,
    });
    if (result && result.text) {
      // Save the chat to the database
      const chat = new Chat({
        user: userId,
        message,
        response: result.text,
      });
      await chat.save();
      return res.send(
        response(200, true, "Message processed successfully", result.text)
      );
    }
  } catch (error) {
    console.error("Error in Gemini:", error);
    res.send(response(500, false, "Failed to communicate with ChatGPT"));
  }
};

exports.chatWithGeminiGPT = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.id;
    if (!message) {
      return res.send(response(400, false, "Message is required"));
    }
    const openai = new OpenAI({
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
    // OpenAI API request
    const result = await openai.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        {
          role: "user",
          content: message,
        },
      ],
    });
    if (result && result.choices[0].message) {
      // Save the chat to the database
      const chat = new Chat({
        user: userId,
        message,
        response: result.choices[0].message.content,
      });
      await chat.save();
      return res.send(
        response(
          200,
          true,
          "Message processed successfully",
          result.choices[0].message.content
        )
      );
    }
  } catch (error) {
    console.error("Error in Gemini:", error);
    res.send(response(500, false, "Failed to communicate with ChatGPT"));
  }
};

exports.chatWithGeminiGPTStream = async (req, res) => {
  try {
    const { message, token } = req.query;

    if (!token) {
      return res.send(response(401, false, "Authorization token is required"));
    }

    // Verify the token
    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET); // Replace `JWT_SECRET` with your secret key
      userId = decoded.id;
    } catch (err) {
      return res.send(response(401, false, "Invalid or expired token"));
    }

    if (!message) {
      return res.send(response(400, false, "Message is required"));
    }

    const openai = new OpenAI({
      apiKey: process.env.GEMINI_API_KEY, // Secure the API key using environment variables
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });

    const completion = await openai.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: message },
      ],
      stream: true,
    });

    // Set headers for streaming response
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || "";
      res.write(`data: ${JSON.stringify(content)}\n\n`);
    }

    res.end();
  } catch (error) {
    console.error("Error in Gemini:", error);
    res.status(500).send("Failed to communicate with Gemini API");
  }
};

exports.getChatHistoryByUserId = async (req, res) => {
  try {
    const userId = req.user.id; // User ID from the authenticateUser middleware

    if (!userId) {
      return res.send(response(400, false, "User ID is required"));
    }

    // Fetch the chat history for the user
    const chatHistory = await Chat.find({ user: userId }).sort({
      createdAt: -1,
    });

    if (!chatHistory.length) {
      return res.send(
        response(404, false, "No chat history found for the user")
      );
    }

    res.send(
      response(200, true, "Chat history retrieved successfully", chatHistory)
    );
  } catch (error) {
    console.error("Error retrieving chat history:", error);
    res.send(response(500, false, "Failed to retrieve chat history"));
  }
};

// Chat with Gemini and Schedule Email

// // Nodemailer transporter setup
// const transporter = nodemailer.createTransport({
//   host: config.emailHost,
//   port: config.emailPort,
//   auth: {
//     user: config.emailUser,
//     pass: config.emailPassword,
//   },
// });

// // Send Email Function
// exports.sendEmail = async (to, subject, text) => {
//   const mailOptions = {
//     from: config.emailUser,
//     to,
//     subject,
//     text,
//   };

//   return transporter.sendMail(mailOptions);
// };

exports.chatWithGeminiEmailSchedule = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.id;
    if (!message) {
      return res.send(response(400, false, "Message is required"));
    }
    // Initialize Gemini API
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
    // Define email scheduling function
    const scheduleEmailFunctionDeclaration = {
      name: "schedule_email",
      description: "Schedules an email to be sent at a specific time.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          recipient: {
            type: Type.STRING,
            description: "Email address of the recipient",
          },
          subject: { type: Type.STRING, description: "Subject of the email" },
          body: { type: Type.STRING, description: "Body of the email" },
          schedule: {
            type: Type.STRING,
            description: "ISO date-time when the email should be sent",
          },
        },
        required: ["recipient", "subject", "body", "schedule"],
      },
    };
    // Generate content and process function call
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: message,
      config: {
        tools: [
          {
            functionDeclarations: [scheduleEmailFunctionDeclaration],
          },
        ],
      },
    });
    if (result.functionCalls && result.functionCalls.length > 0) {
      const functionCall = result.functionCalls[0];
      if (functionCall.name === "schedule_email") {
        const {
          recipient,
          subject,
          body,
          schedule: scheduleTime,
        } = functionCall.args;
        // Validate schedule time
        const scheduledDate = new Date(scheduleTime);
        if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
          return res.send(
            response(400, false, "Invalid or past schedule time")
          );
        }
        console.log(scheduleTime);
        // Schedule email
        schedule.scheduleJob(scheduledDate, async () => {
          try {
            await transporter.sendMail({
              from: config.emailUser,
              to: recipient,
              subject,
              text: body,
            });
            console.log(`Email sent successfully to ${recipient}`);
          } catch (err) {
            console.error(`Failed to send email to ${recipient}:`, err);
          }
        });
        // Save chat and email details
        const chat = new Chat({
          user: userId,
          message,
          response: `Email scheduled successfully for ${scheduledDate.toISOString()}`,
        });
        await chat.save();
        return res.send(
          response(200, true, "Email scheduled successfully", {
            recipient,
            subject,
            body,
            schedule: scheduledDate.toISOString(),
          })
        );
      }
    }
    // Handle fallback response
    if (result && result.text) {
      const chat = new Chat({
        user: userId,
        message,
        response: result.text,
      });
      await chat.save();
      return res.send(
        response(200, true, "Message processed successfully", result.text)
      );
    }
    return res.send(
      response(400, false, "No valid action identified in the message")
    );
  } catch (error) {
    console.error("Error in chatWithGeminiEmailSchedule:", error);
    res.send(response(500, false, "Failed to process the request"));
  }
};





exports.chatWithGeminiImageRecognize = async (req, res) => {
  try {
    const { message, imageUrl } = req.body;
    const userId = req.user && req.user.id;

    if (!message || !imageUrl) {
      return res.status(400).json({ success: false, message: "Message and imageUrl are required" });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Fetch the image and encode it in Base64
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return res.status(400).json({ success: false, message: "Failed to fetch the image from the URL" });
    }

    const imageArrayBuffer = await imageResponse.arrayBuffer();
    const base64ImageData = Buffer.from(imageArrayBuffer).toString("base64");

    // Prepare the payload for the Gemini API
    const payload = {
      model: "gemini-2.0-flash",
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg", // Adjust MIME type if image is not JPEG
            data: base64ImageData,
          },
        },
        {
          text: message, // User's input message
        },
      ],
    };

    console.log("Payload sent to Gemini API:", JSON.stringify(payload, null, 2));

    // Send the request to Gemini API
    const result = await ai.models.generateContent(payload);

    console.log("Gemini API Response:", result);

    const responseText = result.text || "No response received from Gemini API";

    // Save the interaction to the database (optional)
    if (userId && responseText) {
      const chat = new Chat({
        user: userId,
        message,
        response: responseText,
      });
      await chat.save();
    }

    return res.status(200).json({
      success: true,
      message: "Processed successfully",
      data: responseText,
    });
  } catch (error) {
    console.error("Error in chatWithGeminiImageRecognize:", error);
    const errorDetails = error.response?.data || error.message || "Unknown error";
    return res.status(500).json({
      success: false,
      message: "Failed to process the request",
      error: errorDetails,
    });
  }
};

