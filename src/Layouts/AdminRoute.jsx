// src/Layouts/AdminRoute.jsx
import { Navigate } from "react-router-dom";
import { useContext } from "react";
import { UserContext } from "../Context/dataCont";

export default function AdminRoute({ children }) {
  const { authData, loading, isAdminOrSuper } = useContext(UserContext);

  if (loading) return null; // wait for hydration

  if (!authData?.token) {
    return <Navigate to="/" replace />;
  }

  if (!isAdminOrSuper()) {
    return <Navigate to="/auth/profile" replace />;
  }

  return children;
}