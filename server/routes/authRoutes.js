// server/routes/authRoutes.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");

const User = require("../Models/UserModel");

const router = express.Router();

// يحد من محاولات تسجيل الدخول لمنع تخمين كلمات المرور (Brute Force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 10, // 10 محاولات كحد أقصى
  message: { message: "محاولات كثيرة جداً، حاولي مرة أخرى بعد قليل" },
  standardHeaders: true,
  legacyHeaders: false,
});

function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role, department: user.department },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function publicUser(user) {
  return {
    _id: user._id,
    firstname: user.firstname,
    lastname: user.lastname,
    email: user.email,
    role: user.role,
    department: user.department,
    avatarUrl: user.avatarUrl || "",
  };
}

/* =========================================================
   REGISTER
   POST /auth/register
   ========================================================= */
router.post("/auth/register", async (req, res) => {
  try {
    const { firstname, lastname, email, password, role, department } = req.body;

    if (!firstname || !lastname || !email || !password) {
      return res.status(400).json({ message: "جميع الحقول مطلوبة" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ message: "البريد الإلكتروني مستخدم بالفعل" });

    const hashed = await bcrypt.hash(password, 10);

    // ملاحظة أمنية مهمة: لا نسمح بتسجيل "admin" من نفس صفحة التسجيل العامة.
    // فقط "citizen" أو "employee" يمكن اختيارهما من الواجهة.
    const safeRole = role === "employee" ? "employee" : "citizen";

    // القسم له معنى فقط لو المستخدم موظف، ولازم يكون من القيم المسموحة بالموديل
    const ALLOWED_DEPARTMENTS = ["roads", "water", "electricity", "waste", "general"];
    const safeDepartment =
      safeRole === "employee" && ALLOWED_DEPARTMENTS.includes(department)
        ? department
        : safeRole === "employee"
        ? "general" // موظف بدون اختيار قسم محدد يُعتبر "عام" ويشوف كل البلاغات
        : null;

    const user = await User.create({
      firstname,
      lastname,
      email: email.toLowerCase(),
      password: hashed,
      role: safeRole,
      department: safeDepartment,
    });

    const token = signToken(user);
    res.status(201).json({ user: publicUser(user), token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "فشل التسجيل" });
  }
});

/* =========================================================
   LOGIN
   POST /auth/login
   ========================================================= */
router.post("/auth/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "البريد وكلمة المرور مطلوبان" });
    }

    const user = await User.findOne({ email: String(email).toLowerCase() });
    // رسالة موحّدة سواء كان الإيميل غير موجود أو كلمة المرور خاطئة
    // (لا نكشف للمهاجم أي جزء كان صحيحاً)
    if (!user) return res.status(400).json({ message: "بيانات الدخول غير صحيحة" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: "بيانات الدخول غير صحيحة" });

    const token = signToken(user);
    res.json({ user: publicUser(user), token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "فشل تسجيل الدخول" });
  }
});

/* =========================================================
   ME — يرجع بيانات المستخدم الحالي بناءً على التوكن
   GET /auth/me
   ========================================================= */
const { requireAuth } = require("../middleware/auth");

router.get("/auth/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });
    res.json({ user: publicUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "فشل جلب البيانات" });
  }
});

module.exports = router;
