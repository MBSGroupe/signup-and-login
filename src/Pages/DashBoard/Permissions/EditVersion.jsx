// pages/DashBoard/Permissions/EditVersion.jsx
import { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { UserContext } from "../../../Context/dataCont";
import { fetchWithRefresh } from "../../../Components/api";
import VersionForm from "../../../Components/Forms/VersionForm";

const API_URL = import.meta.env.VITE_API_URL;
const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;


export default function EditVersion() {
  const { versionId } = useParams();
  const navigate = useNavigate();
  const { authData, setAuthData } = useContext(UserContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schema, setSchema] = useState(null);
  const [initialStatus, setInitialStatus] = useState("active");

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const res = await fetch(`${NEST_API_URL}/permissions/schemas/${versionId}`, {
          headers: { Authorization: `Bearer ${authData.token}` }
        });
        const data = await res.json();
        if (res.ok) {
          
          if (data.version) {
            setSchema({ fields: data.version.fields || [], operations: data.version.operations || [] });
            setInitialStatus(data.version.status || "active");
          } else {
            alert("Version non trouvée");
            navigate(-1);
          }
        } else {
          alert(data.message || "Erreur");
        }
      } catch (err) {
        console.error(err);
        alert("Erreur réseau");
      } finally {
        setLoading(false);
      }
    };
    if (authData?.token) fetchVersion();
  }, [versionId, authData, navigate]);

  const handleSubmit = async (updatedSchema, status) => {
    console.log(updatedSchema)
    setSaving(true);
    try {
      const res = await fetchWithRefresh(
        `${NEST_API_URL}/permissions/versions/${versionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fields: updatedSchema.fields,
            operations: updatedSchema.operations,
            status,
            reason: "Modification manuelle"
          })
        },
        authData.token,
        setAuthData
      );
      const data = await res.json();
      if (res.ok) {
        navigate(-1);
      } else {
        alert(data.message || "Erreur lors de la mise à jour");
      }
    } catch (err) {
      alert("Erreur réseau");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-yellow-300">Chargement...</div>;
  if (!schema) return null;

  return (
    <VersionForm
      initialSchema={schema}
      initialStatus={initialStatus}
      onSubmit={handleSubmit}
      submitLabel="Enregistrer les modifications"
      title="Modifier la version"
      loading={saving}
    />
  );
}