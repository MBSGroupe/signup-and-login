import { createContext, useContext } from "react";
import { UserContext } from "../Context/dataCont";
import { useNavigate } from "react-router-dom";
import { fetchWithRefresh } from "../Components/api"; // adjust path if needed

export const logoutContext = createContext();

export default function LogoutProvider({ children }) {
    const { authData, setAuthData, logout } = useContext(UserContext);
    const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;
    const navigate = useNavigate();

    const handleLogout = async () => { 
      try {
        const response = await fetchWithRefresh(
          `${NEST_API_URL}/auth/logout`,
          { method: "POST" },
          authData.token,
          setAuthData
        );
        if (!response.ok) {
          console.error("Logout error from server");
        }
      } catch (error) {
        console.error("Logout network error:", error);
      } finally {
        // Always clear local session and redirect
        logout();
        navigate("/");
      }
    };

    return (
      <logoutContext.Provider value={{ handleLogout }}>
        {children}
      </logoutContext.Provider>
    );
}