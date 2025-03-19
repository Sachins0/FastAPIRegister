import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tempData, setTempData] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUserData(token);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserData = async (token) => {
    try {
      const response = await axios.get('http://localhost:8000/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentUser(response.data);
    } catch (error) {
      console.error('Error fetching user data:', error);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);

      const response = await axios.post('http://localhost:8000/token', formData);
      localStorage.setItem('token', response.data.access_token);
      await fetchUserData(response.data.access_token);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
  };

  const requestOTP = async (email) => {
    try {
      await axios.post('http://localhost:8000/request-otp', { email });
      setTempData({ email });
      return true;
    } catch (error) {
      console.error('OTP request error:', error);
      throw error;
    }
  };

  const verifyOTP = async (email, otp) => {
    try {
      await axios.post('http://localhost:8000/verify-otp', { email, otp });
      return true;
    } catch (error) {
      console.error('OTP verification error:', error);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post('http://localhost:8000/register', userData);
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const value = {
    currentUser,
    loading,
    tempData,
    setTempData,
    login,
    logout,
    requestOTP,
    verifyOTP,
    register
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};