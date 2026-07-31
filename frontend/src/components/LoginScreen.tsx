import React, { useState } from "react";
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";

type LoginScreenProps = {
  onLoginSuccess: (token: string) => void;
};

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const switchMode = (toLogin: boolean) => {
    setIsLogin(toLogin);
    setErrorMsg("");
    setSuccessMsg("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    if (!isLogin && password !== confirmPassword) {
      setErrorMsg("Mật khẩu xác nhận không khớp");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Mật khẩu phải có ít nhất 6 ký tự");
      setLoading(false);
      return;
    }

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const contentType = res.headers.get("content-type");
      let data: any = {};

      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || "Lỗi máy chủ, vui lòng thử lại");
      }

      if (!res.ok) {
        throw new Error(data.detail || data.message || "Đăng nhập thất bại");
      }

      if (isLogin) {
        onLoginSuccess(data.access_token);
      } else {
        if (data.access_token) {
          onLoginSuccess(data.access_token);
        } else {
          setSuccessMsg("Tạo tài khoản thành công! Vui lòng đăng nhập.");
          setIsLogin(true);
          setPassword("");
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Đã xảy ra lỗi, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Subtle background glow */}
      <div className="auth-glow" />

      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-mark">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
            </svg>
          </div>
          <span className="auth-logo-text">TCGA</span>
        </div>

        {/* Header */}
        <div className="auth-header">
          <h1 className="auth-title">
            {isLogin ? "Welcome back" : "Create your account"}
          </h1>
          <p className="auth-subtitle">
            {isLogin
              ? "Sign in to your TCGA account"
              : "Start managing your test studio"}
          </p>
        </div>

        {/* Stepper (Only for Register) */}
        {!isLogin && (
          <div className="auth-stepper">
            <div className="auth-step active">
              <div className="auth-step-circle">1</div>
              <span>Account</span>
            </div>
            <div className="auth-step-divider" />
            <div className="auth-step">
              <div className="auth-step-circle">2</div>
              <span>Verify</span>
            </div>
          </div>
        )}

        {/* Messages */}
        {successMsg && (
          <div className="auth-message auth-message-success">
            <CheckCircle2 size={16} />
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="auth-message auth-message-error">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-form-group">
            <label className="auth-form-label">Email</label>
            <div className="auth-input-wrapper">
              <div className="auth-input-icon">
                <Mail size={18} />
              </div>
              <input
                type="email"
                className="auth-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={loading}
              />
            </div>
          </div>

          <div className="auth-form-group">
            <div className="auth-form-label">
              Password
              {isLogin && (
                <span className="auth-link" style={{ fontSize: "13px" }}>
                  Forgot password?
                </span>
              )}
            </div>
            <div className="auth-input-wrapper">
              <div className="auth-input-icon">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                className="auth-input"
                placeholder={isLogin ? "Enter your password" : "At least 6 characters"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={isLogin ? "current-password" : "new-password"}
                disabled={loading}
              />
              <div
                className="auth-input-icon-right"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </div>
            </div>
          </div>

          {!isLogin && (
            <div className="auth-form-group">
              <label className="auth-form-label">Confirm Password</label>
              <div className="auth-input-wrapper">
                <div className="auth-input-icon">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  className="auth-input"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <button type="submit" className="btn-neon" disabled={loading}>
            {loading ? (
              <Loader2 size={18} className="auth-spinner" />
            ) : isLogin ? (
              "Sign In"
            ) : (
              <>
                Continue <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          {isLogin ? (
            <>
              Don't have an account?{" "}
              <span className="auth-link" onClick={() => switchMode(false)}>
                Create one
              </span>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <span className="auth-link" onClick={() => switchMode(true)}>
                Sign in
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
