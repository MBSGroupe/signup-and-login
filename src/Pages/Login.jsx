import { React, useState, useEffect, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { UserContext } from "../Context/dataCont";
import SectionTitle from "../Components/Title";
import { Mail, Lock, LogIn, Shield, AlertCircle } from "lucide-react";


const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

const LoginForm = () => {
  const { authData, setAuthData } = useContext(UserContext);
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [lockTime, setLockTime] = useState(null);
  const LOCK_STORAGE_KEY = "loginLockUntil";

  useEffect(() => {
    const storedLockUntil = localStorage.getItem(LOCK_STORAGE_KEY);
    if (storedLockUntil) {
      const lockUntil = parseInt(storedLockUntil, 10);
      const now = Date.now();
      if (lockUntil > now) {
        const remaining = Math.ceil((lockUntil - now) / 1000);
        setLockTime(remaining);
      } else {
        localStorage.removeItem(LOCK_STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    let interval;
    if (lockTime > 0) {
      interval = setInterval(() => {
        setLockTime((prev) => {
          if (prev <= 1) {
            localStorage.removeItem(LOCK_STORAGE_KEY);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockTime]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setFormData((prev) => ({ ...prev, password: "" }));
    try {
      const response = await fetch(`${NEST_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const respData = await response.json();
      console.log(respData);
      
      if (response.ok && respData.success) {
        const { user, token } = respData.data;
        setAuthData({ user, token });
        
        if (user.role === 'admin' || user.role === 'super_admin') {
          navigate('/dash');
        } else if (user.role === 'user') {
          navigate('/auth/profile');
        } else {
          navigate('/');
        }
      } else if (response.status === 429) {
        const remaining = respData.data?.remainingTime || 60;
        const lockUntil = Date.now() + remaining * 1000;
        localStorage.setItem(LOCK_STORAGE_KEY, lockUntil);
        setLockTime(remaining);
        setMessage(respData.message || respData.data?.message || "Trop de tentatives. Veuillez patienter.");
      } else {
        setMessage(respData.message || respData.data?.message || "Erreur de connexion.");
      }
    } catch (err) {
      console.error("Network error:", err);
      setMessage("⚠️ Erreur réseau. Veuillez réessayer.");
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="min-h-screen bg-[#0A0F1C] flex flex-col items-center justify-center p-6 font-sans antialiased">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <Shield className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-[#F8FAFC] tracking-tight">
            Welcome Back
          </h1>
          <p className="text-[#94A3B8] mt-2 text-sm">
            Log in to your secure dashboard
          </p>
        </div>

        <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                <input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={lockTime > 0}
                  className="w-full pl-9 pr-4 py-2.5 bg-[#0A0F1C] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200 placeholder-[#64748B] disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#94A3B8] uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                <input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={lockTime > 0}
                  className="w-full pl-9 pr-4 py-2.5 bg-[#0A0F1C] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200 placeholder-[#64748B] disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={lockTime > 0}
              className="w-full py-3 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {lockTime > 0 ? (
                <>
                  <AlertCircle className="w-4 h-4" />
                  Bloqué ({formatTime(lockTime)})
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Log In
                </>
              )}
            </button>
          </form>

          {message && (
            <div className={`mt-5 p-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
              message.includes('Trop de tentatives') || message.includes('Erreur')
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {message}
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-[#64748B] text-sm">
          <p>
            By continuing, you agree to our{" "}
            <a href="#" className="text-emerald-400 hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="text-emerald-400 hover:underline">
              Privacy Policy
            </a>
            .
          </p>
          <p className="mt-2">
            Don't have an account?{" "}
            <Link to="/signup" className="text-emerald-400 hover:underline font-medium">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;