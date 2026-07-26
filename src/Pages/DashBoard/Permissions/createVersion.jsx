// pages/DashBoard/Permissions/NewVersion.jsx
import { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { UserContext } from "../../../Context/dataCont";
import { fetchWithRefresh } from "../../../Components/api";
import VersionForm from "../../../Components/Forms/VersionForm";
import BackButton from "../../../Components/Buttons/BackButton";
import { Loader2, PlusCircle } from "lucide-react";

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
        if (res.ok && data.success !== false) {
          const schemasData = data.data?.schemas || data.schemas || [];
          const active = schemasData.find(s => s.isActive);
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
    console.log(schema, status);
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
      if (res.ok && data.success !== false) {
        navigate(`/dash/permissions/${model}/${data.data?.result?.version || data.result?.version || '?'}`);
      } else {
        alert(data.message || "Erreur lors de la création");
      }
    } catch (err) {
      alert("Erreur réseau");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center ml-[30px] mt-16">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
          <p className="text-[#94A3B8] text-sm">Chargement du modèle...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1C] p-6 md:p-8 ml-[30px] mt-16">
      <div className="max-w-7xl mx-auto">
        {/* Header with back button and title */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <BackButton fallbackPath="/dash/permissions" />
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <PlusCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#F8FAFC] tracking-tight">
                Nouvelle version pour {model}
              </h1>
              <p className="text-[#94A3B8] text-sm mt-1">
                Créez une nouvelle version du schéma de permissions
              </p>
            </div>
          </div>
        </div>

        {/* Form wrapper */}
        <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50 p-6 md:p-8">
          <VersionForm
            initialSchema={initialSchema}
            initialStatus="active"
            onSubmit={handleSubmit}
            submitLabel="Créer la version"
            title="Nouvelle version"
            loading={saving}
            backPath="/dash/permissions"
          />
        </div>
      </div>
    </div>
  );
}