// Frontend (React) - App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = "http://localhost:8000";

// Signup Component
function Signup() {
  const [formData, setFormData] = useState({ email: '', password: '', full_name: '' });
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/signup`, formData);
      localStorage.setItem('tempEmail', formData.email);
      setMessage('OTP sent to your email');
    } catch (error) {
      setMessage(error.response?.data?.detail || 'Registration failed');
    }
  };

  return (
    <div>
      <h2>Sign Up</h2>
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" required 
          onChange={e => setFormData({...formData, email: e.target.value})} />
        <input type="password" placeholder="Password" required 
          onChange={e => setFormData({...formData, password: e.target.value})} />
        <input type="text" placeholder="Full Name" required 
          onChange={e => setFormData({...formData, full_name: e.target.value})} />
        <button type="submit">Sign Up</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}

// Verify OTP Component
function VerifyOTP() {
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const email = localStorage.getItem('tempEmail');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/verify-otp`, { email, otp });
      localStorage.removeItem('tempEmail');
      setMessage('Account verified! You can now login');
    } catch (error) {
      setMessage(error.response?.data?.detail || 'Verification failed');
    }
  };

  return (
    <div>
      <h2>Verify OTP</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="OTP" required 
          onChange={e => setOtp(e.target.value)} />
        <button type="submit">Verify</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}

// Login Component
function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_BASE}/token`, 
        `username=${formData.email}&password=${formData.password}`,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      localStorage.setItem('token', response.data.access_token);
      window.location.href = '/dashboard';
    } catch (error) {
      setMessage(error.response?.data?.detail || 'Login failed');
    }
  };

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" required 
          onChange={e => setFormData({...formData, email: e.target.value})} />
        <input type="password" placeholder="Password" required 
          onChange={e => setFormData({...formData, password: e.target.value})} />
        <button type="submit">Login</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Signup />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;