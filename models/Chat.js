const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Reference to the User model
    message: { type: String, required: true }, // User's message
    response: { type: String, required: true }, // AI's response
  },
  { timestamps: true }
);

module.exports = mongoose.model("Chat", chatSchema);
