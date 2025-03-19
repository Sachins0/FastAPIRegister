import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import '../styles/Auth.css';

const CompleteRegistrationPage = () => {
  const { register, tempData, login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tempData?.email) {
      navigate('/register');
    }
  }, [tempData, navigate]);

  const validationSchema = Yup.object({
    full_name: Yup.string()
      .required('Full name is required')
      .min(2, 'Name must be at least 2 characters'),
    password: Yup.string()
      .required('Password is required')
      .min(8, 'Password must be at least 8 characters')
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password'), null], 'Passwords must match')
      .required('Confirm password is required'),
  });

  const handleSubmit = async (values) => {
    try {
      setError('');
      setLoading(true);
      
      const userData = {
        email: tempData.email,
        full_name: values.full_name,
        password: values.password
      };
      
      await register(userData);
      
      await login(tempData.email, values.password);
      
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to complete registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Complete Your Registration</h2>
        <p>Enter your details to finish setting up your account</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <Formik
          initialValues={{ full_name: '', password: '', confirmPassword: '' }}
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
                  value={tempData?.email || ''}
                  disabled
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="full_name">Full Name</label>
                <Field
                  type="text"
                  id="full_name"
                  name="full_name"
                  placeholder="Enter your full name"
                />
                <ErrorMessage name="full_name" component="div" className="error-text" />
              </div>
              
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <Field
                  type="password"
                  id="password"
                  name="password"
                  placeholder="Create a password"
                />
                <ErrorMessage name="password" component="div" className="error-text" />
              </div>
              
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <Field
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="Confirm your password"
                />
                <ErrorMessage name="confirmPassword" component="div" className="error-text" />
              </div>
              
              <button 
                type="submit" 
                className="submit-button" 
                disabled={loading || isSubmitting}
              >
                {loading ? 'Completing Registration...' : 'Complete Registration'}
              </button>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default CompleteRegistrationPage;