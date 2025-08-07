// RoleRoute.jsx (independent of RequiredAuth)
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function RoleRoute({ allowedRoles = [], children }) {
  const { user } = useAuth();

  const hasAccess =
    allowedRoles.length === 0 ||
    (allowedRoles.includes('admin') && user?.isAdmin) ||
    (allowedRoles.includes('superAdmin') && user?.isSuperAdmin);
  


  return hasAccess ? children : <Navigate to="/unauthorized" replace />;
}