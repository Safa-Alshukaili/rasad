// server/Models/ReportModel.js
const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    // صاحب البلاغ
    citizen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // نص البلاغ كما كتبه المواطن (لغة طبيعية)
    description: {
      type: String,
      required: true,
      trim: true,
    },

    // صورة البلاغ (اختياري)
    mediaUrl: {
      type: String,
      default: "",
    },

    // ===== التصنيف بالذكاء الاصطناعي =====
    category: {
      type: String,
      enum: ["roads", "water", "electricity", "waste", "other", "unclassified"],
      default: "unclassified",
    },

    // مدى ثقة الذكاء الاصطناعي بالتصنيف (0-1)
    categoryConfidence: {
      type: Number,
      default: 0,
    },

    // هل الموظف أكّد التصنيف أو غيّره يدوياً
    categoryConfirmed: {
      type: Boolean,
      default: false,
    },

    // ===== الموقع الجغرافي =====
    location: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number], // [lng, lat]
      },
    },

    locationName: {
      type: String,
      default: "",
    },

    // ===== حالة البلاغ =====
    status: {
      type: String,
      enum: ["new", "in_progress", "resolved", "rejected"],
      default: "new",
    },

    // الموظف المسؤول عن البلاغ (إن وُجد)
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ملاحظات الموظف عند تغيير الحالة
    statusNote: {
      type: String,
      default: "",
    },

    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// فهرس جغرافي - ضروري لاستعلامات "البلاغات القريبة" و"المناطق الساخنة"
reportSchema.index({ location: "2dsphere" });

// فهرس مساعد للتحليل حسب التصنيف والوقت
reportSchema.index({ category: 1, createdAt: -1 });

module.exports = mongoose.model("Report", reportSchema);
