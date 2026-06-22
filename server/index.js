// server/index.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(express.json());

// ===== فحص سريع: المتغيرات المطلوبة موجودة؟ =====
if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
  console.error("❌ متغيرات البيئة ناقصة. تأكدي من ملف .env (راجعي .env.example)");
  process.exit(1);
}

// ===== CORS =====
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:3000",
  "http://127.0.0.1:3000",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS: " + origin));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ===== مجلد رفع الملفات =====
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use("/uploads", express.static(UPLOAD_DIR));

// ===== Routes =====
const authRoutes = require("./routes/authRoutes");
const reportRoutes = require("./routes/reportRoutes");

app.use(authRoutes);
app.use(reportRoutes);

// فحص صحة السيرفر
app.get("/", (req, res) => res.send("Rasad server is up and running"));

// معالج أخطاء multer (مثل: نوع ملف غير مسموح، حجم كبير جداً)
app.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({ message: err.message || "حدث خطأ" });
  }
  next();
});

const PORT = process.env.PORT || 3001;

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
})();
