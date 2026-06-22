// client/src/Components/Register.jsx
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../Features/authSlice";

export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading, errorMessage } = useSelector((s) => s.auth);

  const [form, setForm] = useState({
    firstname: "",
    lastname: "",
    email: "",
    password: "",
    role: "citizen",
    department: "general",
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(register(form));
    if (!result.error) navigate("/");
  };

  return (
    <div className="auth-page" dir="rtl">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>إنشاء حساب جديد</h2>

        {errorMessage && <div className="error-box">{errorMessage}</div>}

        <label>الاسم الأول</label>
        <input name="firstname" value={form.firstname} onChange={handleChange} required />

        <label>الاسم الأخير</label>
        <input name="lastname" value={form.lastname} onChange={handleChange} required />

        <label>البريد الإلكتروني</label>
        <input type="email" name="email" value={form.email} onChange={handleChange} required />

        <label>كلمة المرور</label>
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          minLength={6}
          required
        />

        <label>نوع الحساب</label>
        <select name="role" value={form.role} onChange={handleChange}>
          <option value="citizen">مواطن</option>
          <option value="employee">موظف جهة حكومية</option>
        </select>

        {form.role === "employee" && (
          <>
            <label>القسم المسؤول عنه</label>
            <select name="department" value={form.department} onChange={handleChange}>
              <option value="general">عام (يشاهد كل البلاغات)</option>
              <option value="roads">طرق</option>
              <option value="water">مياه</option>
              <option value="electricity">كهرباء</option>
              <option value="waste">نفايات</option>
            </select>
          </>
        )}

        <button type="submit" disabled={isLoading}>
          {isLoading ? "جاري التسجيل..." : "تسجيل"}
        </button>

        <p>
          لديك حساب؟ <Link to="/login">سجّلي الدخول</Link>
        </p>
      </form>
    </div>
  );
}
