import { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ProfilePage from "../../../ProfilePage";
import { UserContext } from "../../../../Context/dataCont";
import { fetchWithRefresh } from "../../../../Components/api"; // ✅ correct path

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

export default function AdminUserView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authData, setAuthData } = useContext(UserContext);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [validating, setValidating] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  // Fetch user data
  useEffect(() => {
    const getUser = async () => {
      try {
        const res = await fetchWithRefresh(
          `${NEST_API_URL}/users/${id}`,
          { method: "GET" },
          authData.token,
          setAuthData
        );
        const userData = await res.json();
        setUser(userData.data.user);
        setMessage(userData.data.message);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };
    if (authData?.token) getUser();
  }, [id, authData?.token, setAuthData]);

  // Validate user
  const handleValidate = async () => {
    setValidating(true);
    try {
      const res = await fetchWithRefresh(
        `${NEST_API_URL}/user/validate/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
        },
        authData.token,
        setAuthData
      );
      const ValidationData = await res.json();
      setMessage(ValidationData.data.message || "User validated");
      setUser((prev) => ({ ...prev, isAdminVerified: true }));
      setShowPopup(true);
      setTimeout(() => setShowPopup(false), 3000);
    } catch (err) {
      console.error(err);
      setMessage("Validation failed");
      setShowPopup(true);
      setTimeout(() => setShowPopup(false), 3000);
    } finally {
      setValidating(false);
    }
  };

  const handleEdit = () => navigate(`/auth/update/${id}`);

  if (loading) return <div className="text-center text-yellow-300 py-10">Loading…</div>;
  if (!user) return <div className="text-center text-red-400 py-10">User not found.</div>;

  return (
    <div className="min-h-screen bg-gray-900 py-16 px-4 relative">
      <div className="max-w-5xl mx-auto">
        <ProfilePage user={user} />
      </div>

      {showPopup && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-gray-800/90 text-yellow-300
                        px-6 py-4 rounded-xl shadow-lg border border-yellow-400/30 transition-all">
          {message}
        </div>
      )}
    </div>
  );
}