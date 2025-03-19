import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthContext } from "./contexts/AuthContext";
import Spinner from "./components/Spinner";


const ProtectedRoute = () => {
  const { user, isLoading } = useContext(AuthContext);

  if (isLoading) return <Spinner/>;

  return user ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute;
