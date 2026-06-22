// client/src/Components/EmployeeDashboard.jsx
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchReports,
  fetchStats,
  fetchHotspots,
  updateReportStatus,
} from "../Features/reportSlice";
import { API_BASE } from "../api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

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

export default function EmployeeDashboard() {
  const dispatch = useDispatch();
  const { reports, stats, hotspots } = useSelector((s) => s.reports);
  const { user } = useSelector((s) => s.auth);

  const [filterStatus, setFilterStatus] = useState("");
  const [previewImage, setPreviewImage] = useState(null); // رابط الصورة المكبّرة حالياً، أو null
  const [showAllDepartments, setShowAllDepartments] = useState(false);

  const hasDepartmentScope =
    user?.role === "employee" && user?.department && user.department !== "general";

  useEffect(() => {
    const departmentParam = showAllDepartments ? { allDepartments: "true" } : {};

    dispatch(
      fetchReports({
        ...(filterStatus ? { status: filterStatus } : {}),
        ...departmentParam,
      })
    );
    dispatch(fetchStats({ allDepartments: showAllDepartments }));
    dispatch(fetchHotspots({ days: 30, allDepartments: showAllDepartments }));
  }, [dispatch, filterStatus, showAllDepartments]);

  if (user?.role !== "employee" && user?.role !== "admin") {
    return <p dir="rtl">هذه الصفحة مخصصة للموظفين فقط.</p>;
  }

  const categoryChartData = (stats?.byCategory || []).map((c) => ({
    name: CATEGORY_LABELS[c._id] || c._id,
    عدد: c.count,
  }));

  const handleStatusChange = (reportId, newStatus) => {
    dispatch(updateReportStatus({ id: reportId, status: newStatus }));
  };

  const handleCategoryChange = (reportId, newCategory) => {
    dispatch(updateReportStatus({ id: reportId, category: newCategory }));
  };

  return (
    <div className="page" dir="rtl">
      <h2>لوحة تحكم الموظف</h2>

      {/* ===== مؤشر نطاق القسم ===== */}
      {hasDepartmentScope && (
        <div className="department-scope-banner">
          <span>
            📁 أنت تشاهد فقط بلاغات قسم <strong>{CATEGORY_LABELS[user.department]}</strong>
          </span>
          <label className="toggle-all-departments">
            <input
              type="checkbox"
              checked={showAllDepartments}
              onChange={(e) => setShowAllDepartments(e.target.checked)}
            />
            عرض كل الأقسام
          </label>
        </div>
      )}

      {/* ===== إحصائيات سريعة ===== */}
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-number">{stats?.total ?? "..."}</span>
          <span>إجمالي البلاغات</span>
        </div>
      </div>

      {/* ===== مخطط حسب التصنيف ===== */}
      {categoryChartData.length > 0 && (
        <div style={{ height: 250, marginBottom: 24 }}>
          <h3>البلاغات حسب التصنيف</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="عدد" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ===== المناطق الساخنة (تنبؤ مبسّط) ===== */}
      <div className="hotspots-section">
        <h3>مناطق متكررة المشاكل (آخر 30 يوم)</h3>
        {hotspots.length === 0 && <p>لا توجد مناطق ذات بلاغات متكررة حالياً.</p>}
        <ul>
          {hotspots.map((h, i) => (
            <li key={i}>
              📍 {h.locationName || `${h.lat}, ${h.lng}`} — {h.count} بلاغ
              {" "}({Object.entries(h.categories)
                .map(([cat, n]) => `${CATEGORY_LABELS[cat] || cat}: ${n}`)
                .join("، ")})
            </li>
          ))}
        </ul>
      </div>

      {/* ===== فلتر وقائمة البلاغات ===== */}
      <div className="filter-row">
        <label>تصفية حسب الحالة: </label>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">الكل</option>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      <table className="reports-table">
        <thead>
          <tr>
            <th>الصورة</th>
            <th>الوصف</th>
            <th>التصنيف</th>
            <th>الحالة</th>
            <th>التاريخ</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => (
            <tr key={r._id}>
              <td>
                {r.mediaUrl ? (
                  <img
                    src={`${API_BASE}${r.mediaUrl}`}
                    alt="صورة البلاغ"
                    className="report-thumbnail"
                    onClick={() => setPreviewImage(`${API_BASE}${r.mediaUrl}`)}
                  />
                ) : (
                  <span className="no-image">لا توجد صورة</span>
                )}
              </td>
              <td>{r.description}</td>
              <td>
                <select
                  value={r.category}
                  onChange={(e) => handleCategoryChange(r._id, e.target.value)}
                >
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                {!r.categoryConfirmed && (
                  <span className="ai-badge" title="تصنيف الذكاء الاصطناعي لم يتم تأكيده بعد">
                    🤖 مبدئي
                  </span>
                )}
              </td>
              <td>
                <select
                  value={r.status}
                  onChange={(e) => handleStatusChange(r._id, e.target.value)}
                >
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </td>
              <td>{new Date(r.createdAt).toLocaleDateString("ar-OM")}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ===== نافذة معاينة الصورة المكبّرة ===== */}
      {previewImage && (
        <div className="image-modal-backdrop" onClick={() => setPreviewImage(null)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="image-modal-close" onClick={() => setPreviewImage(null)}>
              ✕
            </button>
            <img src={previewImage} alt="معاينة البلاغ" />
          </div>
        </div>
      )}
    </div>
  );
}
