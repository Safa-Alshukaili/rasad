// client/src/app/Store.js
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../Features/authSlice";
import reportReducer from "../Features/reportSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    reports: reportReducer,
  },
});
