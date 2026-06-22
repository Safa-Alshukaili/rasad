// client/src/Components/Login.jsx
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../Features/authSlice";

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading, errorMessage } = useSelector((s) => s.auth);

  const [form, setForm] = useState({ email: "", password: "" });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(login(form));
    if (!result.error) navigate("/");
  };

  return (
    <div className="auth-page" dir="rtl">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>تسجيل الدخول</h2>

        {errorMessage && <div className="error-box">{errorMessage}</div>}

        <label>البريد الإلكتروني</label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          required
        />

        <label>كلمة المرور</label>
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          required
        />

        <button type="submit" disabled={isLoading}>
          {isLoading ? "جاري الدخول..." : "دخول"}
        </button>

        <p>
          ليس لديك حساب؟ <Link to="/register">سجّلي الآن</Link>
        </p>
      </form>
    </div>
  );
}
