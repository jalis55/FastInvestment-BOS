import { useContext, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../contexts/AuthContext";

const Logout = () => {
    const { logout } = useContext(AuthContext);

    useEffect(() => {
        logout();
    }, [logout]);

    return <Navigate to="/login" />;
};

export default Logout;
