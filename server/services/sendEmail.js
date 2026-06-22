// server/services/sendEmail.js
//
// خدمة إرسال بريد إلكتروني حقيقي عبر Gmail SMTP باستخدام nodemailer.
// تُستخدم لإشعار المواطن عند تغيير حالة بلاغه.
//
// لو متغيرات البريد (EMAIL_USER / EMAIL_APP_PASSWORD) غير موجودة بـ .env،
// الإرسال يتجاهَل بهدوء (لا يكسر النظام) — تماماً كما فعلنا مع مفتاح الذكاء الاصطناعي.

const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    return null;
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });

  return transporter;
}

const STATUS_LABELS_AR = {
  new: "جديد",
  in_progress: "قيد المعالجة",
  resolved: "تم الحل",
  rejected: "مرفوض",
};

const CATEGORY_LABELS_AR = {
  roads: "طرق",
  water: "مياه",
  electricity: "كهرباء",
  waste: "نفايات",
  other: "أخرى",
  unclassified: "غير مصنّف",
};

/**
 * يرسل إيميل للمواطن عند تغيير حالة بلاغه.
 * لا يرمي استثناء أبداً للخارج — فشل الإيميل لا يجب أن يكسر تحديث البلاغ نفسه.
 */
async function sendStatusUpdateEmail({ toEmail, citizenName, report }) {
  try {
    const t = getTransporter();
    if (!t) {
      console.log("📭 تخطّي إرسال البريد: متغيرات البريد غير مهيأة بملف .env");
      return { sent: false, reason: "email_not_configured" };
    }

    const statusLabel = STATUS_LABELS_AR[report.status] || report.status;
    const categoryLabel = CATEGORY_LABELS_AR[report.category] || report.category;

    const html = `
      <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width: 480px; margin: auto;">
        <h2 style="color: #1e3a8a;">رصد | Rasad</h2>
        <p>عزيزي/عزيزتي ${citizenName}،</p>
        <p>تم تحديث حالة بلاغك:</p>
        <blockquote style="background: #f3f4f6; padding: 12px; border-radius: 8px; margin: 12px 0;">
          ${report.description}
        </blockquote>
        <p><strong>التصنيف:</strong> ${categoryLabel}</p>
        <p><strong>الحالة الجديدة:</strong> ${statusLabel}</p>
        ${report.statusNote ? `<p><strong>ملاحظة من الموظف المسؤول:</strong> ${report.statusNote}</p>` : ""}
        <p style="margin-top: 24px; color: #6b7280; font-size: 13px;">
          هذا إيميل تلقائي من نظام رصد لمتابعة البلاغات. لا حاجة للرد عليه.
        </p>
      </div>
    `;

    await t.sendMail({
      from: `"رصد | Rasad" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `تحديث على بلاغك — الحالة: ${statusLabel}`,
      html,
    });

    return { sent: true };
  } catch (err) {
    console.error("sendStatusUpdateEmail error:", err.message);
    return { sent: false, reason: "send_failed" };
  }
}

module.exports = { sendStatusUpdateEmail };
