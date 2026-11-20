import React, { useState } from 'react'
import logoImg from '../assets/logo.png'
import { loginUser } from '../services/api'

interface LoginPageProps {
  onLoginSuccess: (user: { email: string; role: string; name: string }) => void
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState<string>(() => {
    return localStorage.getItem('catamaran_remembered_email') || ''
  })
  const [password, setPassword] = useState<string>('')
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    return localStorage.getItem('catamaran_remember_terminal') === 'true'
  })
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setErrorMessage(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address.')
      return
    }
    if (!password) {
      setErrorMessage('Please enter your password.')
      return
    }

    setIsLoading(true)

    try {
      const auth = await loginUser(trimmedEmail, password)
      if (auth.success) {
        if (rememberMe) {
          localStorage.setItem('catamaran_remember_terminal', 'true')
          localStorage.setItem('catamaran_remembered_email', trimmedEmail)
        } else {
          localStorage.removeItem('catamaran_remember_terminal')
          localStorage.removeItem('catamaran_remembered_email')
        }
        localStorage.setItem('catamaran_auth_token', auth.token)
        localStorage.setItem('catamaran_auth_user', JSON.stringify(auth.user))
        onLoginSuccess(auth.user)
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid email address or password.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="glass-login-container">
      {/* Dynamic Animated Glass Ambient Lights */}
      <div className="glass-ambient-orb orb-primary" />
      <div className="glass-ambient-orb orb-secondary" />
      <div className="glass-ambient-orb orb-tertiary" />

      {/* Main Glassmorphic Card */}
      <div className="glass-login-card">
        {/* Glow Header & Logo */}
        <div className="glass-login-header">
          <div className="glass-logo-wrapper">
            <div className="glass-logo-halo" />
            <img src={logoImg} alt="Catamaran Surf Club Logo" className="glass-login-logo" />
          </div>

          <h1 className="glass-login-title">Catamaran Surf Club</h1>
          <p className="glass-login-subtitle">Beach Restaurant & Surf POS Terminal</p>

          <div className="glass-location-badge">
            <span className="glass-status-dot" />
            <span>Dewata Beach · Galle · Terminal Auth</span>
          </div>
        </div>

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="glass-login-error">
            <svg
              className="glass-error-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="glass-login-form">
          {/* Email Input Field */}
          <div className="glass-input-group">
            <label className="glass-input-label">Email Address</label>
            <div className="glass-input-wrapper">
              <svg
                className="glass-field-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <input
                type="email"
                className="glass-input"
                placeholder="Enter admin / staff email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          {/* Password Input Field */}
          <div className="glass-input-group">
            <label className="glass-input-label">Terminal Password</label>
            <div className="glass-input-wrapper">
              <svg
                className="glass-field-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                type={showPassword ? 'text' : 'password'}
                className="glass-input password-input"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="glass-eye-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Remember Me Option */}
          <div className="glass-form-options">
            <label className="glass-checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="glass-checkbox"
              />
              <span>Remember this POS terminal</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={`glass-submit-btn ${isLoading ? 'btn-loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="glass-btn-spinner-content">
                <span className="glass-spinner" />
                <span>Verifying Access...</span>
              </span>
            ) : (
              <span className="glass-btn-content">
                <span>Unlock Terminal</span>
                <svg
                  className="glass-btn-arrow"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </span>
            )}
          </button>
        </form>

        {/* Bottom Security Footer */}
        <div className="glass-login-footer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>Protected by Nexion Solution · High-Security Terminal</span>
        </div>
      </div>
    </div>
  )
}
