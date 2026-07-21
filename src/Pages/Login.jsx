import { React, useState, useEffect, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { UserContext } from "../Context/dataCont";
import SectionTitle from "../Components/Title";

const API_URL = import.meta.env.VITE_API_URL;
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
        // Extract data from the wrapper
        const { user, token } = respData.data;
        setAuthData({ user, token });
        
        // Redirect based on role
        if (user.role === 'admin' || user.role === 'super_admin') {
          navigate('/dash');
        } else if (user.role === 'user') {
          navigate('/auth/profile');
        } else {
          navigate('/');
        }
      } else if (response.status === 429) {
        // Lockout response – extract remainingTime from data
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
    <div className="flex flex-col justify-center items-center min-h-screen gap-10 font-urbanist bg-gray-800 text-yellow-300 p-10">
      <SectionTitle title="Welcome Back" />
      <p className="text-center text-yellow-300 mb-6">
        Log in and access your profile
      </p>

      <div className="w-full max-w-md bg-gray-900 p-8 rounded-2xl shadow-xl border border-yellow-300/40">
        <h2 className="text-2xl font-bold text-center text-yellow-300 mb-6">
          Login
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            name="email"
            placeholder="E-mail"
            value={formData.email}
            onChange={handleChange}
            disabled={lockTime > 0}
            className="w-full p-3 bg-gray-800 text-yellow-300 placeholder-yellow-500 border border-yellow-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            disabled={lockTime > 0}
            className="w-full p-3 bg-gray-800 text-yellow-300 placeholder-yellow-500 border border-yellow-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />

          <button
            type="submit"
            disabled={lockTime > 0}
            className="w-full py-3 text-lg font-semibold text-yellow-300 border-2 border-yellow-300 rounded-md bg-transparent hover:bg-yellow-300 hover:text-gray-900 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {lockTime > 0 ? `Bloqué (${formatTime(lockTime)})` : "Log In"}
          </button>
        </form>

        {message && (
          <p className="mt-4 text-center text-red-500 font-medium">{message}</p>
        )}
      </div>

      <div className="text-center text-yellow-300 mt-4">
        By continuing, you agree to our Terms and Privacy Policy. <br />
        Don't have an account?{" "}
        <Link to="/signup" className="underline hover:text-yellow-400">
          Sign Up
        </Link>
      </div>
    </div>
  );
};

export default LoginForm;