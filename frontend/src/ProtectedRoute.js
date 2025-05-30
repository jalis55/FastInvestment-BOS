// src/ProtectedRoute.jsx
import { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "./contexts/AuthContext";
import LoadingSpinner from "./components/Spinner";
import Forbidden from './layouts/Forbidden';

const ProtectedRoute = ({ children, roles = [] }) => {
  const { user, isLoading, hasRole } = useContext(AuthContext);
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner/>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Super admin bypasses all checks
  if (user.is_super_admin) {
    return children;
  }

  // Check if user has any of the required roles
  if (!hasRole(roles)) {
    return <Forbidden/>;
  }

  return children;
};

export default ProtectedRoute;