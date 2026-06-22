// client/src/Components/ReportsMap.jsx
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
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

// لون مميّز لكل حالة — يسمح للمستخدم يفرّق بسرعة بصرية بدون فتح كل بلاغ
const STATUS_COLORS = {
  new: "#facc15", // أصفر — جديد، يحتاج انتباه
  in_progress: "#3b82f6", // أزرق — قيد المعالجة
  resolved: "#22c55e", // أخضر — تم الحل
  rejected: "#ef4444", // أحمر — مرفوض
};

// مركز مسقط كموقع افتراضي للخريطة
const DEFAULT_CENTER = [23.588, 58.3829];

export default function ReportsMap() {
  const dispatch = useDispatch();
  const { reports, isLoading } = useSelector((s) => s.reports);

  useEffect(() => {
    dispatch(fetchReports());
  }, [dispatch]);

  const reportsWithLocation = reports.filter((r) => r.location?.coordinates);

  return (
    <div className="page" dir="rtl">
      <h2>خريطة البلاغات</h2>
      {isLoading && <p>جاري تحميل البلاغات...</p>}

      {/* ===== مفتاح الألوان (Legend) ===== */}
      <div className="map-legend">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <span key={key} className="map-legend-item">
            <span
              className="map-legend-dot"
              style={{ backgroundColor: STATUS_COLORS[key] }}
            />
            {label}
          </span>
        ))}
      </div>

      <MapContainer
        center={DEFAULT_CENTER}
        zoom={11}
        style={{ height: "500px", width: "100%", borderRadius: "8px" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        {reportsWithLocation.map((r) => {
          const [lng, lat] = r.location.coordinates;
          const color = STATUS_COLORS[r.status] || "#6b7280";
          return (
            <CircleMarker
              key={r._id}
              center={[lat, lng]}
              radius={9}
              pathOptions={{
                color: "#1f2937", // حدّ خفيف غامق حول النقطة لوضوح أكبر
                weight: 1.5,
                fillColor: color,
                fillOpacity: 0.85,
              }}
            >
              <Popup>
                <strong>{CATEGORY_LABELS[r.category]}</strong>
                <br />
                {r.description}
                <br />
                الحالة:{" "}
                <span style={{ color, fontWeight: "bold" }}>
                  {STATUS_LABELS[r.status]}
                </span>
                <br />
                {r.locationName}
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {reportsWithLocation.length === 0 && !isLoading && (
        <p>لا توجد بلاغات لها موقع محدد حتى الآن.</p>
      )}
    </div>
  );
}
