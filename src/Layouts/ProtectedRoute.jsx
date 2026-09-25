// src/Layouts/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { useContext } from "react";
import { UserContext } from "../Context/dataCont";

export default function ProtectedRoute({ children, requiredGrade, requiredRole }) {
  const { authData, loading } = useContext(UserContext);

  if (loading) return null;

  if (!authData?.token) {
    return <Navigate to="/" replace />;
  }

  // Grade check (backend field: user.grade)
  if (requiredGrade) {
    const userGrade = authData?.user?.grade;
    const requiredGrades = Array.isArray(requiredGrade) ? requiredGrade : [requiredGrade];
    if (!requiredGrades.includes(userGrade)) {
      return <Navigate to="/" replace />;
    }
  }

  // Role check (backend field: user.roleName) — phantom user.role.name removed
  if (requiredRole) {
    const userRole = authData?.user?.roleName;
    const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!requiredRoles.includes(userRole)) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}