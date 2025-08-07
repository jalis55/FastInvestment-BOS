import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";
import Spinner from "../components/Spinner";

const RedirectRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <Spinner />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default RedirectRoute;