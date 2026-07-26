// pages/DashBoard/Permissions/EditVersion.jsx
import { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { UserContext } from "../../../Context/dataCont";
import { fetchWithRefresh } from "../../../Components/api";
import VersionForm from "../../../Components/Forms/VersionForm";
import BackButton from "../../../Components/Buttons/BackButton";
import { Loader2, Shield, Edit } from "lucide-react";

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
        if (res.ok && data.success !== false) {
          const versionData = data.data?.version || data.version;
          if (versionData) {
            setSchema({ fields: versionData.fields || [], operations: versionData.operations || [] });
            setInitialStatus(versionData.status || "active");
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
    console.log(updatedSchema);
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
      if (res.ok && data.success !== false) {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center ml-[30px] mt-16">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
          <p className="text-[#94A3B8] text-sm">Chargement de la version...</p>
        </div>
      </div>
    );
  }

  if (!schema) return null;

  return (
    <div className="min-h-screen bg-[#0A0F1C] p-6 md:p-8 ml-[30px] mt-16">
      <div className="max-w-7xl mx-auto">
        {/* Header with back button and title */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <BackButton fallbackPath="/dash/permissions" />
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Edit className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#F8FAFC] tracking-tight">
                Modifier la version
              </h1>
              <p className="text-[#94A3B8] text-sm mt-1">
                Mettez à jour les champs et opérations de cette version
              </p>
            </div>
          </div>
        </div>

        {/* Form wrapper */}
        <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50 p-6 md:p-8">
          <VersionForm
            initialSchema={schema}
            initialStatus={initialStatus}
            onSubmit={handleSubmit}
            submitLabel="Enregistrer les modifications"
            title="Modifier la version"
            loading={saving}
          />
        </div>
      </div>
    </div>
  );
}