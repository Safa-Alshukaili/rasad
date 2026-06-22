// client/src/App.js
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Header from "./Components/Header";
import Login from "./Components/Login";
import Register from "./Components/Register";
import SubmitReport from "./Components/SubmitReport";
import MyReports from "./Components/MyReports";
import ReportsMap from "./Components/ReportsMap";
import EmployeeDashboard from "./Components/EmployeeDashboard";
import ProtectedRoute from "./Components/ProtectedRoute";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Header />
      <main>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Navigate to="/map" replace />
              </ProtectedRoute>
            }
          />

          <Route
            path="/map"
            element={
              <ProtectedRoute>
                <ReportsMap />
              </ProtectedRoute>
            }
          />

          <Route
            path="/submit"
            element={
              <ProtectedRoute>
                <SubmitReport />
              </ProtectedRoute>
            }
          />

          <Route
            path="/my-reports"
            element={
              <ProtectedRoute>
                <MyReports />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <EmployeeDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
