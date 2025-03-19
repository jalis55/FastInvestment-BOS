import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthContext } from "./contexts/AuthContext";
import Spinner from "./components/Spinner";

const RedirectRoute = () => {
  const { user, isLoading } = useContext(AuthContext);

  if (isLoading) return <Spinner/>;

  return user ? <Navigate to="/" /> : <Outlet />;
};

export default RedirectRoute;
