import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  const [activeTab, setActiveTab] = useState('login'); // 'login' or 'signup'
  const [user_id, setUser_id] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('patient');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const result = await login(user_id, password);
    if (result.success) {
      navigate(`/${result.user.role}`);
    } else {
      setError(result.error);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    const result = await signup(password, role, name);
    if (result.success) {
      setSuccessMessage(result.message || 'Account created successfully!');
      setTimeout(() => {
        navigate(`/${result.user.role}`);
      }, 2000);
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="auth-tabs">
          <button
            className={`tab-button ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('login');
              setError('');
              setSuccessMessage('');
            }}
          >
            Login
          </button>
          <button
            className={`tab-button ${activeTab === 'signup' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('signup');
              setError('');
              setSuccessMessage('');
            }}
          >
            Sign Up
          </button>
        </div>

        {activeTab === 'login' ? (
          <div>
            <h2>Login</h2>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>User ID</label>
                <input
                  type="text"
                  value={user_id}
                  onChange={(e) => setUser_id(e.target.value.toUpperCase())}
                  placeholder="e.g., PAT001, DOC001, VEND001"
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && <div className="error-message">{error}</div>}
              {successMessage && <div className="success-message">{successMessage}</div>}
              <button type="submit" className="btn btn-primary btn-block">
                Login
              </button>
            </form>
            <div className="demo-accounts">
              {/* <h3>Demo Accounts:</h3>
              <p>Patient: PAT001 / password123</p>
              <p>Doctor: DOC001 / password123</p>
              <p>Vendor: VEND001 / password123</p> */}
            </div>
          </div>
        ) : (
          <div>
            <h2>Sign Up</h2>
            <form onSubmit={handleSignup}>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                >
                  <option value="patient">Patient</option>
                  <option value="doctor">Doctor</option>
                  <option value="vendor">Vendor</option>
                </select>
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                />
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              {error && <div className="error-message">{error}</div>}
              {successMessage && <div className="success-message">{successMessage}</div>}
              <button type="submit" className="btn btn-primary btn-block">
                Sign Up
              </button>
            </form>
            <div className="info-box">
              <p>Your User ID will be automatically generated (e.g., PAT001, DOC001, VEND001) based on your role.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
