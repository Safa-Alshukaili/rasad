// client/src/Components/SubmitReport.jsx
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { createReport } from "../Features/reportSlice";

const CATEGORY_LABELS = {
  roads: "طرق",
  water: "مياه",
  electricity: "كهرباء",
  waste: "نفايات",
  other: "أخرى",
  unclassified: "غير مصنّف",
};

export default function SubmitReport() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading } = useSelector((s) => s.reports);

  const [description, setDescription] = useState("");
  const [media, setMedia] = useState(null);
  const [location, setLocation] = useState(null); // { lat, lng }
  const [locationName, setLocationName] = useState("");
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [submittedReport, setSubmittedReport] = useState(null);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setError("المتصفح لا يدعم تحديد الموقع");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setError("تعذّر تحديد موقعك. تأكدي من تفعيل صلاحية الموقع");
        setLocating(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!description.trim()) {
      setError("يرجى كتابة وصف للبلاغ");
      return;
    }

    const formData = new FormData();
    formData.append("description", description);
    if (media) formData.append("media", media);
    if (location) {
      formData.append("lat", location.lat);
      formData.append("lng", location.lng);
      formData.append("locationName", locationName);
    }

    const result = await dispatch(createReport(formData));
    if (!result.error) {
      setSubmittedReport(result.payload);
      setDescription("");
      setMedia(null);
      setLocation(null);
    } else {
      setError(result.payload || "حدث خطأ، حاولي مرة أخرى");
    }
  };

  return (
    <div className="page" dir="rtl">
      <h2>تقديم بلاغ جديد</h2>

      {submittedReport && (
        <div className="success-box">
          <p>✅ تم استلام بلاغك بنجاح.</p>
          <p>
            التصنيف المبدئي بالذكاء الاصطناعي:{" "}
            <strong>{CATEGORY_LABELS[submittedReport.category]}</strong>
            {" "}(سيتم تأكيده من قبل الموظف المختص)
          </p>
          <button onClick={() => navigate("/my-reports")}>عرض بلاغاتي</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="report-form">
        {error && <div className="error-box">{error}</div>}

        <label>وصف المشكلة</label>
        <textarea
          rows={4}
          placeholder="مثال: يوجد حفرة كبيرة في الطريق الرئيسي بجانب المسجد..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        <label>صورة (اختياري)</label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setMedia(e.target.files[0])}
        />

        <label>الموقع</label>
        <button type="button" onClick={detectLocation} disabled={locating}>
          {locating ? "جاري تحديد الموقع..." : "📍 تحديد موقعي الحالي"}
        </button>
        {location && (
          <p className="location-confirm">
            ✓ تم تحديد الموقع ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})
          </p>
        )}

        <label>اسم المنطقة (اختياري)</label>
        <input
          type="text"
          placeholder="مثال: مسقط - بوشر"
          value={locationName}
          onChange={(e) => setLocationName(e.target.value)}
        />

        <button type="submit" disabled={isLoading}>
          {isLoading ? "جاري الإرسال..." : "إرسال البلاغ"}
        </button>
      </form>
    </div>
  );
}
