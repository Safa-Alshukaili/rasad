// server/middleware/auth.js
const jwt = require("jsonwebtoken");

/**
 * يتحقق من وجود توكن صحيح في الطلب.
 * بعد النجاح، يضع بيانات المستخدم في req.user
 * بحيث باقي الكود يعتمد على req.user.id
 * وليس على أي قيمة يرسلها العميل بنفسه (وهذا الفرق الجوهري عن VOX).
 */
function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "غير مصرح: التوكن مفقود" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, department }
    next();
  } catch (err) {
    return res.status(401).json({ message: "غير مصرح: التوكن غير صالح" });
  }
}

/**
 * يتحقق إن المستخدم موظف (وليس مواطن عادي).
 * يُستخدم على routes تغيير حالة البلاغ أو لوحة التحكم.
 */
function requireEmployee(req, res, next) {
  if (!req.user || (req.user.role !== "employee" && req.user.role !== "admin")) {
    return res.status(403).json({ message: "هذا الإجراء يتطلب صلاحية موظف" });
  }
  next();
}

module.exports = { requireAuth, requireEmployee };
