// server/Models/UserModel.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstname: { type: String, required: true, trim: true },
    lastname: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },

    // مواطن (يقدّم بلاغات) أو موظف (يدير ويصنّف البلاغات)
    role: {
      type: String,
      enum: ["citizen", "employee", "admin"],
      default: "citizen",
    },

    // إذا موظف: أي جهة يتبع (طرق، مياه، نفايات...)
    department: {
      type: String,
      enum: ["roads", "water", "electricity", "waste", "general", null],
      default: null,
    },

    avatarUrl: { type: String, default: "" },
    phone: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
