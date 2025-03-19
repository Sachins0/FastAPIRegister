// src/pages/RegisterPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import '../styles/Auth.css';

const RegisterPage = () => {
  const { requestOTP } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validationSchema = Yup.object({
    email: Yup.string()
      .email('Invalid email address')
      .required('Email is required'),
  });

  const handleSubmit = async (values) => {
    try {
      setError('');
      setLoading(true);
      await requestOTP(values.email);
      navigate('/verify-otp');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to request OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Register as Job Seeker</h2>
        <p>Enter your email to begin registration</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <Formik
          initialValues={{ email: '' }}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting }) => (
            <Form>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <Field
                  type="email"
                  id="email"
                  name="email"
                  placeholder="Enter your email"
                />
                <ErrorMessage name="email" component="div" className="error-text" />
              </div>
              
              <button 
                type="submit" 
                className="submit-button" 
                disabled={loading || isSubmitting}
              >
                {loading ? 'Sending OTP...' : 'Continue'}
              </button>
            </Form>
          )}
        </Formik>
        
        <div className="auth-footer">
          Already have an account? <a href="/login">Login</a>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;