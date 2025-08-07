import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Spinner from '@/components/Spinner';

export default function RequiredAuth({ children }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <Spinner/>;
  return user ? children : <Navigate to="/login" state={{ from: location }} replace />;
}