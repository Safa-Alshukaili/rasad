// client/src/Components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

// يمنع وصول أي صفحة محمية بدون تسجيل دخول صحيح (توكن موجود)
export default function ProtectedRoute({ children }) {
  const { token } = useSelector((s) => s.auth);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}
