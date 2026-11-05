// RoleRoute.jsx (independent of RequiredAuth)
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/use-auth';

export default function RoleRoute({ roles = [], children }) {
  const { user } = useAuth();
  const location = useLocation();

  const hasAccess =
    user?.is_super_admin ||
    roles.length === 0 ||
    (roles.includes('admin') && user?.is_admin) ||
    (roles.includes('super_admin') && user?.is_super_admin) ||
    (roles.includes('user') && user && !user.is_admin);

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return hasAccess ? children : <Navigate to="/" replace />;
}
