// src/pages/OTPVerificationPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import '../styles/Auth.css';

const OTPVerificationPage = () => {
  const { verifyOTP, tempData, requestOTP } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    // Redirect if no email is in tempData
    if (!tempData?.email) {
      navigate('/register');
    }
  }, [tempData, navigate]);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else {
      setResendDisabled(false);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const validationSchema = Yup.object({
    otp: Yup.string()
      .required('OTP is required')
      .matches(/^\d+$/, 'OTP must contain only digits')
      .length(6, 'OTP must be exactly 6 digits'),
  });

  const handleSubmit = async (values) => {
    try {
      setError('');
      setLoading(true);
      await verifyOTP(tempData.email, values.otp);
      navigate('/complete-registration');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      setError('');
      setResendDisabled(true);
      await requestOTP(tempData.email);
      setCountdown(60);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to resend OTP');
      setResendDisabled(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Enter Verification Code</h2>
        <p>We've sent a 6-digit verification code to {tempData?.email}</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <Formik
          initialValues={{ otp: '' }}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting }) => (
            <Form>
              <div className="form-group">
                <label htmlFor="otp">Verification Code</label>
                <Field
                  type="text"
                  id="otp"
                  name="otp"
                  placeholder="Enter 6-digit code"
                  maxLength="6"
                />
                <ErrorMessage name="otp" component="div" className="error-text" />
              </div>
              
              <button 
                type="submit" 
                className="submit-button" 
                disabled={loading || isSubmitting}
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </Form>
          )}
        </Formik>
        
        <div className="auth-footer">
          <button 
            className="link-button" 
            onClick={handleResendOTP} 
            disabled={resendDisabled}
          >
            {resendDisabled 
              ? `Resend OTP in ${countdown}s` 
              : 'Resend OTP'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OTPVerificationPage;