// src/RedirectRoute.jsx
import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthContext } from "./contexts/AuthContext";
import LoadingSpinner from "./components/Spinner";

const RedirectRoute = () => {
  const { user, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return <LoadingSpinner/>;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default RedirectRoute;