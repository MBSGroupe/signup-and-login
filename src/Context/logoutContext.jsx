// src/Context/LogoutContext.jsx
import { createContext, useContext, useCallback } from "react";
import { UserContext } from "../Context/dataCont";
import { fetchWithRefresh } from "../Components/api"; // adjust path if needed

export const logoutContext = createContext();

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

export default function LogoutProvider({ children }) {
  const { authData, setAuthData, logout } = useContext(UserContext);

  const handleLogout = useCallback(async () => {
    const isAdmin = ["admin", "super_admin"].includes(authData?.user?.grade);
    const logoutPath = isAdmin ? "/auth/admin/logout" : "/auth/logout";
    const redirectPath = isAdmin
      ? "/adminlogin?reason=logged-out"
      : "/?reason=logged-out";

    const token = authData?.token;

    // ★ Use RAW fetch for logout — not fetchWithRefresh. If the logout
    // request itself 401s, fetchWithRefresh would trigger forceLogout's
    // window.location.replace and race with our own redirect below.
    // We're discarding the session either way, so a clean failure is fine.
    try {
      await fetch(`${NEST_API_URL}${logoutPath}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    } catch (error) {
      console.warn("Logout network error:", error?.message);
    } finally {
      // Always clear local session
      try {
        logout?.();
      } catch {
        /* noop */
      }
      try {
        setAuthData?.(null);
      } catch {
        /* noop */
      }
      try {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("authUser");
      } catch {
        /* noop */
      }

      // ★ replace (not navigate) so the back button doesn't return to
      // a dead authenticated route.
      window.location.replace(redirectPath);
    }
  }, [authData?.user?.grade, authData?.token, setAuthData, logout]);

  return (
    <logoutContext.Provider value={{ handleLogout }}>
      {children}
    </logoutContext.Provider>
  );
}