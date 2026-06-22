// server/routes/reportRoutes.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const Report = require("../Models/ReportModel");
const { requireAuth, requireEmployee } = require("../middleware/auth");
const { classifyReport } = require("../services/classifyReport");
const { sendStatusUpdateEmail } = require("../services/sendEmail");

const router = express.Router();

/* ===== Multer مع حماية: نوع وحجم الملف ===== */
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB كحد أقصى
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(new Error("نوع الملف غير مسموح. يُسمح فقط بـ JPG, PNG, WEBP"));
    }
    cb(null, true);
  },
});

/* =========================================================
   CREATE REPORT
   POST /reports  (مواطن مسجّل دخول فقط)
   ========================================================= */
router.post("/reports", requireAuth, upload.single("media"), async (req, res) => {
  try {
    const { description, lat, lng, locationName } = req.body;

    if (!description || !description.trim()) {
      return res.status(400).json({ message: "نص البلاغ مطلوب" });
    }

    const doc = {
      citizen: req.user.id, // من التوكن، لا من الفرونت إند
      description: description.trim(),
      mediaUrl: req.file ? `/uploads/${req.file.filename}` : "",
    };

    const latNum = Number(lat);
    const lngNum = Number(lng);
    const validCoords =
      Number.isFinite(latNum) &&
      Number.isFinite(lngNum) &&
      latNum >= -90 &&
      latNum <= 90 &&
      lngNum >= -180 &&
      lngNum <= 180;

    if (validCoords) {
      doc.location = { type: "Point", coordinates: [lngNum, latNum] };
      doc.locationName = (locationName || "").toString();
    }

    // تصنيف فوري بالذكاء الاصطناعي
    const { category, confidence } = await classifyReport(doc.description);
    doc.category = category;
    doc.categoryConfidence = confidence;

    const report = await Report.create(doc);
    const populated = await Report.findById(report._id).populate(
      "citizen",
      "firstname lastname avatarUrl"
    );

    res.status(201).json({ report: populated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "فشل إرسال البلاغ" });
  }
});

/* =========================================================
   LIST REPORTS (مع فلاتر اختيارية)
   GET /reports?category=roads&status=new
   متاح لأي مستخدم مسجّل (مواطن يشوف بلاغاته، موظف يشوف الكل)
   ========================================================= */
router.get("/reports", requireAuth, async (req, res) => {
  try {
    const { category, status, mine, allDepartments } = req.query;
    const filter = {};

    if (status) filter.status = status;

    // مواطن عادي يشوف بلاغاته الخاصة فقط
    if (req.user.role === "citizen" || mine === "true") {
      filter.citizen = req.user.id;
    }

    // ===== التوجيه حسب الجهة =====
    // موظف لديه قسم محدد (غير "general" وغير admin) يشوف فقط بلاغات قسمه تلقائياً،
    // إلا إذا طلب تصنيفاً معيناً بنفسه (category بالاستعلام) أو طلب رؤية كل الأقسام
    // (allDepartments=true) — مفيد لموظف يحتاج نظرة شاملة عابرة للأقسام.
    if (
      req.user.role === "employee" &&
      req.user.department &&
      req.user.department !== "general" &&
      allDepartments !== "true"
    ) {
      filter.category = category || req.user.department;
    } else if (category) {
      filter.category = category;
    }

    const reports = await Report.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("citizen", "firstname lastname avatarUrl")
      .populate("assignedTo", "firstname lastname department");

    res.json({ reports, scopedToDepartment: filter.category || null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "فشل جلب البلاغات" });
  }
});

/* =========================================================
   GET SINGLE REPORT (مع تحقق ملكية)
   GET /reports/:id
   ========================================================= */
router.get("/reports/:id", requireAuth, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate("citizen", "firstname lastname avatarUrl")
      .populate("assignedTo", "firstname lastname department");

    if (!report) return res.status(404).json({ message: "البلاغ غير موجود" });

    const isOwner = String(report.citizen._id) === String(req.user.id);
    const isStaff = req.user.role === "employee" || req.user.role === "admin";

    if (!isOwner && !isStaff) {
      return res.status(403).json({ message: "غير مصرح لك بعرض هذا البلاغ" });
    }

    res.json({ report });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "فشل جلب البلاغ" });
  }
});

/* =========================================================
   UPDATE STATUS / CATEGORY (موظفين فقط)
   PATCH /reports/:id/status
   ========================================================= */
router.patch("/reports/:id/status", requireAuth, requireEmployee, async (req, res) => {
  try {
    const { status, category, statusNote } = req.body;
    const update = {};

    // نتذكر إذا الحالة فعلياً تغيّرت (لإرسال إيميل فقط عند تغيير حقيقي،
    // وليس عند مجرّد تعديل التصنيف بدون تغيير الحالة)
    const previousReport = await Report.findById(req.params.id).select("status");
    const statusActuallyChanged = status && previousReport && status !== previousReport.status;

    if (status) {
      update.status = status;
      if (status === "resolved") update.resolvedAt = new Date();
    }
    if (category) {
      update.category = category;
      update.categoryConfirmed = true; // الموظف أكّد أو غيّر التصنيف يدوياً
    }
    if (statusNote !== undefined) update.statusNote = statusNote;
    update.assignedTo = req.user.id;

    const report = await Report.findByIdAndUpdate(req.params.id, update, {
      new: true,
    })
      .populate("citizen", "firstname lastname email avatarUrl")
      .populate("assignedTo", "firstname lastname department");

    if (!report) return res.status(404).json({ message: "البلاغ غير موجود" });

    res.json({ report });

    // الإرسال يصير بعد الرد على الموظف، بدون تأخير الواجهة بانتظار البريد.
    // فشل الإيميل لا يؤثر على نجاح تحديث البلاغ (sendStatusUpdateEmail لا ترمي استثناء للخارج).
    if (statusActuallyChanged && report.citizen?.email) {
      sendStatusUpdateEmail({
        toEmail: report.citizen.email,
        citizenName: report.citizen.firstname || "",
        report,
      });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "فشل تحديث البلاغ" });
  }
});

/* =========================================================
   DELETE REPORT (صاحب البلاغ فقط، أو admin)
   DELETE /reports/:id
   ========================================================= */
router.delete("/reports/:id", requireAuth, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: "البلاغ غير موجود" });

    const isOwner = String(report.citizen) === String(req.user.id);
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "غير مصرح لك بحذف هذا البلاغ" });
    }

    await Report.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "فشل حذف البلاغ" });
  }
});

/* =========================================================
   NEARBY REPORTS — بلاغات قريبة من موقع معيّن
   GET /reports/nearby?lat=..&lng=..&radiusKm=5
   ========================================================= */
router.get("/reports-nearby", requireAuth, async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusKm = Number(req.query.radiusKm || 5);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ message: "موقع غير صالح" });
    }

    const reports = await Report.find({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: radiusKm * 1000,
        },
      },
    })
      .limit(100)
      .populate("citizen", "firstname lastname avatarUrl");

    res.json({ reports });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "فشل جلب البلاغات القريبة" });
  }
});

/* =========================================================
   HOTSPOTS — تحليل بسيط: المناطق ذات البلاغات المتكررة
   GET /reports-hotspots?days=30
   متاح للموظفين فقط
   ========================================================= */
router.get("/reports-hotspots", requireAuth, requireEmployee, async (req, res) => {
  try {
    const days = Number(req.query.days || 30);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const queryFilter = {
      createdAt: { $gte: since },
      location: { $exists: true },
    };

    // نفس منطق التوجيه حسب الجهة، لاتساق "المناطق الساخنة" مع بقية لوحة الموظف
    if (
      req.user.role === "employee" &&
      req.user.department &&
      req.user.department !== "general" &&
      req.query.allDepartments !== "true"
    ) {
      queryFilter.category = req.user.department;
    }

    // تجميع البلاغات حسب موقع تقريبي (نقرّب الإحداثيات لشبكة صغيرة)
    // لتحديد "بؤر التكرار" دون الحاجة لمكتبة تحليل مكاني متقدمة
    const reports = await Report.find(queryFilter).select(
      "location category locationName"
    );

    const grid = {};
    for (const r of reports) {
      if (!r.location?.coordinates) continue;
      const [lng, lat] = r.location.coordinates;
      // تقريب لـ 2 رقم عشري (~1km) لتجميع البلاغات المتقاربة معاً
      const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;

      if (!grid[key]) {
        grid[key] = {
          lat: Number(lat.toFixed(2)),
          lng: Number(lng.toFixed(2)),
          count: 0,
          categories: {},
          locationName: r.locationName || "",
        };
      }
      grid[key].count += 1;
      grid[key].categories[r.category] = (grid[key].categories[r.category] || 0) + 1;
    }

    // فقط المناطق اللي فيها 3 بلاغات أو أكثر تعتبر "نقطة ساخنة"
    const hotspots = Object.values(grid)
      .filter((g) => g.count >= 3)
      .sort((a, b) => b.count - a.count);

    res.json({ hotspots, periodDays: days });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "فشل تحليل البيانات" });
  }
});

/* =========================================================
   STATS — إحصائيات عامة للوحة التحكم
   GET /reports-stats
   ========================================================= */
router.get("/reports-stats", requireAuth, requireEmployee, async (req, res) => {
  try {
    const { allDepartments } = req.query;

    // نفس منطق التوجيه حسب الجهة المستخدم بـ GET /reports،
    // لضمان أن الإحصائيات والمخطط يطابقان دوماً ما يراه الموظف بالجدول
    const matchFilter = {};
    if (
      req.user.role === "employee" &&
      req.user.department &&
      req.user.department !== "general" &&
      allDepartments !== "true"
    ) {
      matchFilter.category = req.user.department;
    }

    const byCategory = await Report.aggregate([
      { $match: matchFilter },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);
    const byStatus = await Report.aggregate([
      { $match: matchFilter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const total = await Report.countDocuments(matchFilter);

    res.json({ total, byCategory, byStatus });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "فشل جلب الإحصائيات" });
  }
});

module.exports = router;
