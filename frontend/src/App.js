import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Layout from "./components/Layout/Layout";
import ProtectedRoute from "./components/Layout/ProtectedRoute";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            
            {/* Placeholder routes - will be implemented in next phases */}
            <Route path="members" element={<PlaceholderPage title="Members" />} />
            <Route path="groups" element={<PlaceholderPage title="Groups" />} />
            <Route path="events" element={<PlaceholderPage title="Events" />} />
            <Route path="donations" element={<PlaceholderPage title="Donations" />} />
            <Route path="prayers" element={<PlaceholderPage title="Prayer Requests" />} />
            <Route path="content" element={<PlaceholderPage title="Content Management" />} />
            <Route path="spiritual-journey" element={<PlaceholderPage title="Spiritual Journey" />} />
            <Route path="churches" element={<PlaceholderPage title="Churches" />} />
            <Route path="settings" element={<PlaceholderPage title="Settings" />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

// Placeholder component for routes not yet implemented
function PlaceholderPage({ title }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-600 mt-1">This feature is coming soon...</p>
      </div>
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="text-gray-400 mb-4">
          <svg className="h-24 w-24 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">{title} Module</h3>
        <p className="text-gray-500">This module will be available in the next phase of development.</p>
      </div>
    </div>
  );
}

export default App;
