// client/src/Components/Header.jsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../Features/authSlice";

export default function Header() {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  return (
    <header className="app-header" dir="rtl">
      <Link to="/" className="logo">رصد | Rasad</Link>

      <nav>
        {user ? (
          <>
            <Link to="/map">الخريطة</Link>
            {user.role === "citizen" && (
              <>
                <Link to="/submit">تقديم بلاغ</Link>
                <Link to="/my-reports">بلاغاتي</Link>
              </>
            )}
            {(user.role === "employee" || user.role === "admin") && (
              <Link to="/dashboard">لوحة التحكم</Link>
            )}
            <span className="user-name">{user.firstname}</span>
            <button onClick={handleLogout}>تسجيل خروج</button>
          </>
        ) : (
          <>
            <Link to="/login">دخول</Link>
            <Link to="/register">تسجيل</Link>
          </>
        )}
      </nav>
    </header>
  );
}
