// client/src/api.js
import axios from "axios";

export const API_BASE = process.env.REACT_APP_SERVER_URL || "http://localhost:3001";

const api = axios.create({ baseURL: API_BASE });

// يرفق التوكن تلقائياً بكل طلب إذا كان موجوداً
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("rasad_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// إذا رجع السيرفر 401 (توكن منتهي أو غير صالح)، نسجّل خروج المستخدم تلقائياً
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("rasad_token");
      localStorage.removeItem("rasad_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
