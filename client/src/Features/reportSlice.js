// client/src/Features/reportSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api";

const initialState = {
  reports: [],
  hotspots: [],
  stats: null,
  isLoading: false,
  errorMessage: "",
};

export const fetchReports = createAsyncThunk(
  "reports/fetchAll",
  async (params, { rejectWithValue }) => {
    try {
      const res = await api.get("/reports", { params });
      return res.data.reports;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "فشل جلب البلاغات");
    }
  }
);

export const createReport = createAsyncThunk(
  "reports/create",
  async (formData, { rejectWithValue }) => {
    try {
      const res = await api.post("/reports", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data.report;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "فشل إرسال البلاغ");
    }
  }
);

export const updateReportStatus = createAsyncThunk(
  "reports/updateStatus",
  async ({ id, ...body }, { rejectWithValue }) => {
    try {
      const res = await api.patch(`/reports/${id}/status`, body);
      return res.data.report;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "فشل تحديث البلاغ");
    }
  }
);

export const fetchHotspots = createAsyncThunk(
  "reports/fetchHotspots",
  async ({ days, allDepartments } = {}, { rejectWithValue }) => {
    try {
      const res = await api.get("/reports-hotspots", {
        params: { days, ...(allDepartments ? { allDepartments: "true" } : {}) },
      });
      return res.data.hotspots;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "فشل جلب التحليل");
    }
  }
);

export const fetchStats = createAsyncThunk(
  "reports/fetchStats",
  async ({ allDepartments } = {}, { rejectWithValue }) => {
    try {
      const res = await api.get("/reports-stats", {
        params: allDepartments ? { allDepartments: "true" } : {},
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "فشل جلب الإحصائيات");
    }
  }
);

const reportSlice = createSlice({
  name: "reports",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReports.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchReports.fulfilled, (state, action) => {
        state.isLoading = false;
        state.reports = action.payload;
      })
      .addCase(fetchReports.rejected, (state, action) => {
        state.isLoading = false;
        state.errorMessage = action.payload;
      })
      .addCase(createReport.fulfilled, (state, action) => {
        state.reports.unshift(action.payload);
      })
      .addCase(updateReportStatus.fulfilled, (state, action) => {
        const idx = state.reports.findIndex((r) => r._id === action.payload._id);
        if (idx !== -1) state.reports[idx] = action.payload;
      })
      .addCase(fetchHotspots.fulfilled, (state, action) => {
        state.hotspots = action.payload;
      })
      .addCase(fetchStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      });
  },
});

export default reportSlice.reducer;
