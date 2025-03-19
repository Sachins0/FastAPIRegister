  import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import RegisterPage from './pages/RegisterPage';
import OTPVerificationPage from './pages/OTPVerificationPage';
import CompleteRegistrationPage from './pages/CompleteRegistrationPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Routes>
            <Route path="/" element={<Navigate to="/register" replace />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-otp" element={<OTPVerificationPage />} />
            <Route path="/complete-registration" element={<CompleteRegistrationPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;