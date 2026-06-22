// client/src/Components/MyReports.jsx
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchReports } from "../Features/reportSlice";

const CATEGORY_LABELS = {
  roads: "طرق",
  water: "مياه",
  electricity: "كهرباء",
  waste: "نفايات",
  other: "أخرى",
  unclassified: "غير مصنّف",
};

const STATUS_LABELS = {
  new: "جديد",
  in_progress: "قيد المعالجة",
  resolved: "تم الحل",
  rejected: "مرفوض",
};

export default function MyReports() {
  const dispatch = useDispatch();
  const { reports, isLoading } = useSelector((s) => s.reports);

  useEffect(() => {
    dispatch(fetchReports({ mine: "true" }));
  }, [dispatch]);

  return (
    <div className="page" dir="rtl">
      <h2>بلاغاتي</h2>
      {isLoading && <p>جاري التحميل...</p>}
      {!isLoading && reports.length === 0 && <p>لم تقدّمي أي بلاغ حتى الآن.</p>}

      <div className="reports-list">
        {reports.map((r) => (
          <div key={r._id} className="report-card">
            {r.mediaUrl && (
              <img
                src={`${process.env.REACT_APP_SERVER_URL}${r.mediaUrl}`}
                alt="صورة البلاغ"
                className="report-image"
              />
            )}
            <p>{r.description}</p>
            <div className="report-meta">
              <span className="badge">{CATEGORY_LABELS[r.category]}</span>
              <span className={`badge status-${r.status}`}>
                {STATUS_LABELS[r.status]}
              </span>
              <span>{new Date(r.createdAt).toLocaleDateString("ar-OM")}</span>
            </div>
            {r.statusNote && <p className="status-note">ملاحظة: {r.statusNote}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
