import { createContext, useContext } from "react";
import { UserContext } from "../Context/dataCont";
import { useNavigate } from "react-router-dom";
export const logoutContext = createContext();

export default function LogoutProvider({ children }) {
    const {authData, logout} = useContext(UserContext);
    const id = authData.user?.id || authData.user?._id;
    const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;
    const navigate = useNavigate();
      const handleLogout = async () => { 
      const response = await fetch(`${NEST_API_URL}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authData.token}`
      }
    });
    if (response.ok) {
      logout();
      navigate("/")
    } else {
      console.error("Logout error");
    }  

  }
  return (
    <logoutContext.Provider value={{ handleLogout }}>
      {children}
    </logoutContext.Provider>
  );
}
