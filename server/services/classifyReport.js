// server/services/classifyReport.js
//
// يصنّف نص البلاغ تلقائياً إلى تصنيف من تصنيفات محددة.
// الطريقة الافتراضية (مجانية): تصنيف بالكلمات المفتاحية (keywordClassifier.js)
// الطريقة الأقوى (تحتاج مفتاح API): Claude، تُستخدم تلقائياً إذا توفر المفتاح
//
// مهم جداً: الذكاء الاصطناعي/التصنيف هنا "يساعد" الموظف، ولا يحل محل قراره.
// لهذا categoryConfirmed تبدأ false دوماً حتى يؤكدها موظف بشري.

const { classifyByKeywords } = require("./keywordClassifier");

const CATEGORIES = ["roads", "water", "electricity", "waste", "other"];

async function classifyReport(description) {
  // إذا لم يكن مفتاح API موجوداً، نستخدم التصنيف المجاني بالكلمات المفتاحية
  // بدل تعطيل الميزة بالكامل أو إرجاع "غير مصنّف" دوماً
  if (!process.env.ANTHROPIC_API_KEY) {
    return classifyByKeywords(description);
  }

  const systemPrompt = `أنت مصنّف بلاغات لمنصة خدمات حكومية في عُمان.
مهمتك: تصنيف نص البلاغ إلى واحد فقط من هذه التصنيفات بالضبط:
roads (طرق وحفر ورصف)
water (مياه وتسريبات وانقطاع)
electricity (كهرباء وأعمدة وانقطاع تيار)
waste (نفايات وقمامة ونظافة)
other (أي شيء آخر لا ينطبق على ما سبق)

أجب فقط بصيغة JSON بدون أي نص إضافي وبدون علامات markdown:
{"category": "roads", "confidence": 0.92}

confidence هو رقم بين 0 و1 يعبّر عن ثقتك بالتصنيف.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 100,
        system: systemPrompt,
        messages: [{ role: "user", content: description }],
      }),
    });

    const data = await response.json();
    const textBlock = data.content?.find((b) => b.type === "text");
    if (!textBlock) return { category: "unclassified", confidence: 0 };

    const cleaned = textBlock.text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (!CATEGORIES.includes(parsed.category)) {
      return { category: "unclassified", confidence: 0 };
    }

    return {
      category: parsed.category,
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
    };
  } catch (err) {
    console.error("classifyReport (Claude) error:", err.message);
    // فشل الذكاء الاصطناعي لا يجب أن يمنع تسجيل البلاغ نفسه
    // نستخدم الكلمات المفتاحية كخطة بديلة بدل ترك البلاغ بدون تصنيف
    return classifyByKeywords(description);
  }
}

module.exports = { classifyReport, CATEGORIES };
