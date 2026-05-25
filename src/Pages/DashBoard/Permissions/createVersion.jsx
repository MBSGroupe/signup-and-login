// pages/DashBoard/Permissions/NewVersion.jsx
import { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { UserContext } from "../../../Context/dataCont";
import { fetchWithRefresh } from "../../../Components/api";
import VersionForm from "../../../Components/Forms/VersionForm";

const API_URL = import.meta.env.VITE_API_URL;
const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;


export default function NewVersion() {
  const { model } = useParams();
  const navigate = useNavigate();
  const { authData, setAuthData } = useContext(UserContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialSchema, setInitialSchema] = useState({ fields: [], operations: [] });

  useEffect(() => {
    const fetchCurrentSchema = async () => {
      try {
        const res = await fetch(`${NEST_API_URL}/permissions/schemas?model=${model}`, {
          headers: { Authorization: `Bearer ${authData.token}` }
        });
        const data = await res.json();
        if (res.ok) {
          const active = data.schemas.find(s => s.isActive);
          if (active) {
            setInitialSchema({ fields: active.fields || [], operations: active.operations || [] });
          } else {
            setInitialSchema({ fields: [], operations: [] });
          }
        } else {
          console.error(data.message);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (authData?.token) fetchCurrentSchema();
  }, [model, authData]);

  const handleSubmit = async (schema, status) => {
    console.log(schema, status)
    setSaving(true);
    try {
      const res = await fetchWithRefresh(
        `${NEST_API_URL}/permissions/versions/${model}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ schema, status }) 
        },
        authData.token,
        setAuthData
      );
      const data = await res.json();
      if (res.ok) {
        navigate(`/dash/permissions/${model}/${data.result?.version || '?'}`);
      } else {
        alert(data.message || "Erreur lors de la création");
      }
    } catch (err) {
      alert("Erreur réseau");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-yellow-300">Chargement...</div>;

  return (
    <VersionForm
      initialSchema={initialSchema}
      initialStatus="active"          // default status for new version
      onSubmit={handleSubmit}
      submitLabel="Créer la version"
      title={`Nouvelle version pour ${model}`}
      loading={saving}
    />
  );
}