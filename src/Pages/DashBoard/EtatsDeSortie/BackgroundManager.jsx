// pages/DashBoard/Backgrounds/BackgroundManager.jsx
import { useContext, useEffect, useState } from "react";
import { UserContext } from "../../../Context/dataCont";
import { useError } from '../../../Context/ErrorContext';        
import Title from "../../../Components/Title";
import BackButton from "../../../Components/Buttons/BackButton";
import { useModal } from "../../../Context/ModalContext";
import { Image, Upload, Trash2, Save, Loader2, FileText, AlertCircle } from "lucide-react";

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;
const TEMPLATES = ["degree", "attestation"];

export default function BackgroundManager() {
  const { authData } = useContext(UserContext);
  const { showError, showSuccess } = useError();             
  const { confirm } = useModal();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null);
  const [saving, setSaving] = useState(null);

  const [customCssMap, setCustomCssMap] = useState({});
  const [customHtmlMap, setCustomHtmlMap] = useState({});

  useEffect(() => {
    fetchAllTemplateData();
  }, []);

  const fetchAllTemplateData = async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        TEMPLATES.map(async (name) => {
          const [bgRes, cssRes, htmlRes] = await Promise.all([
            fetch(`${NEST_API_URL}/pdf/templates/${name}/background`, {
              headers: { Authorization: `Bearer ${authData.token}` },
            }).then(r => r.json()),
            fetch(`${NEST_API_URL}/pdf/templates/${name}/css`, {
              headers: { Authorization: `Bearer ${authData.token}` },
            }).then(r => r.json()),
            fetch(`${NEST_API_URL}/pdf/templates/${name}/html`, {
              headers: { Authorization: `Bearer ${authData.token}` },
            }).then(r => r.json()),
          ]);

          return {
            name,
            backgroundUrl: bgRes?.data?.data?.url || null,
            hasBackground: bgRes?.data?.data?.hasBackground || false,
            customCss: cssRes?.data?.data?.customCss || '',
            customHtml: htmlRes?.data?.data?.customHtml || '',
          };
        })
      );

      setTemplates(results);

      const cssMap = {};
      const htmlMap = {};
      results.forEach(t => {
        cssMap[t.name] = t.customCss;
        htmlMap[t.name] = t.customHtml;
      });
      setCustomCssMap(cssMap);
      setCustomHtmlMap(htmlMap);
    } catch (error) {
      console.error("Failed to load template data", error);
      showError("Impossible de charger les modèles.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (templateName, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("background", file);
    setUploading(templateName);
    try {
      const res = await fetch(`${NEST_API_URL}/pdf/templates/${templateName}/background`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authData.token}` },
        body: formData,
      });
      if (!res.ok) throw new Error((await res.json()).message || "Échec de l'upload");
      await fetchAllTemplateData();
      showSuccess("Image de fond téléchargée avec succès !");
    } catch (err) {
      showError(err.message);
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (templateName) => {
    const confirmed = await confirm({
      title: "Supprimer l'arrière-plan",
      message: `Voulez-vous vraiment supprimer l'arrière-plan pour "${templateName}" ?`,
    });
    if (!confirmed) return;

    try {
      const listRes = await fetch(`${NEST_API_URL}/pdf/templates/backgrounds`, {
        headers: { Authorization: `Bearer ${authData.token}` },
      });
      const listData = await listRes.json();
      const all = listData?.data?.data || [];

      if (!Array.isArray(all) || all.length === 0) {
        showError("Aucun arrière-plan trouvé pour ce modèle.");
        return;
      }

      const bg = all.find(b =>
        b.public_id && b.public_id.includes(`pdf-templates/backgrounds/${templateName}`)
      );
      if (!bg) {
        showError("Aucun arrière-plan trouvé pour ce modèle.");
        return;
      }

      const delRes = await fetch(`${NEST_API_URL}/pdf/templates/background/${bg.public_id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authData.token}` },
      });
      if (!delRes.ok) {
        const err = await delRes.json().catch(() => ({ message: "Échec de la suppression" }));
        throw new Error(err.message || "Échec de la suppression");
      }

      await fetch(`${NEST_API_URL}/pdf/templates/${templateName}/background/clear`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authData.token}` },
      });

      await fetchAllTemplateData();
      showSuccess("Arrière-plan supprimé ✅");
    } catch (err) {
      showError(err.message);
    }
  };

  const handleSave = async (templateName) => {
    setSaving(templateName);
    try {
      const css = customCssMap[templateName] || '';
      const html = customHtmlMap[templateName] || '';

      await fetch(`${NEST_API_URL}/pdf/templates/${templateName}/css`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authData.token}` },
        body: JSON.stringify({ customCss: css }),
      });
      await fetch(`${NEST_API_URL}/pdf/templates/${templateName}/html`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authData.token}` },
        body: JSON.stringify({ customHtml: html }),
      });

      showSuccess("Modèle enregistré ✅");
    } catch (err) {
      showError(err.message);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center ml-[30px] mt-16">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
          <p className="text-[#94A3B8] text-sm">Chargement des modèles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1C] p-6 md:p-8 ml-[30px] mt-16">
      <div className="max-w-7xl mx-auto">
        {/* Header with back button */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <BackButton fallbackPath="/dash" />
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <FileText className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#F8FAFC] tracking-tight">
                Gestion des modèles PDF
              </h1>
              <p className="text-[#94A3B8] text-sm mt-1">
                Personnalisez l'apparence des documents
              </p>
            </div>
          </div>
        </div>

        {/* Templates list */}
        <div className="space-y-8">
          {templates.map(template => (
            <div
              key={template.name}
              className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50 p-6 md:p-8"
            >
              {/* Template header */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <h2 className="text-xl font-semibold text-[#F8FAFC] capitalize flex items-center gap-2">
                  {template.name === 'degree' ? 'Diplôme' : 'Attestation'}
                  <span className="text-sm font-normal text-[#64748B] ml-2">({template.name})</span>
                </h2>
                <div className="flex flex-wrap gap-3">
                  <label
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all ${
                      uploading === template.name
                        ? 'bg-[#1F2937] text-[#64748B] cursor-not-allowed'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                    }`}
                  >
                    {uploading === template.name ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Chargement...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Image de fond
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleUpload(template.name, e.target.files[0]);
                      }}
                      disabled={uploading === template.name}
                    />
                  </label>
                  {template.hasBackground && (
                    <button
                      onClick={() => handleDelete(template.name)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 transition-all text-sm font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      Supprimer
                    </button>
                  )}
                </div>
              </div>

              {/* Background preview */}
              <div className="mb-6">
                <div className="relative w-full h-48 bg-[#0A0F1C] rounded-xl overflow-hidden border border-[rgba(255,255,255,0.06)]">
                  {template.backgroundUrl ? (
                    <img
                      src={template.backgroundUrl}
                      alt={`Background ${template.name}`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-[#64748B]">
                      <Image className="w-10 h-10 mb-2 opacity-30" />
                      <span className="text-sm">Aucun arrière-plan</span>
                    </div>
                  )}
                </div>
                {template.hasBackground && (
                  <p className="text-xs text-[#64748B] mt-2">
                    ✅ Arrière-plan actif – sera utilisé dans les nouveaux documents.
                  </p>
                )}
              </div>

              {/* CSS Editor */}
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-[#94A3B8] uppercase tracking-wider">CSS personnalisé</span>
                  <span className="text-[10px] text-[#64748B]">(styles supplémentaires)</span>
                </div>
                <textarea
                  value={customCssMap[template.name] || ''}
                  onChange={(e) => setCustomCssMap(prev => ({ ...prev, [template.name]: e.target.value }))}
                  rows={6}
                  className="w-full bg-[#0A0F1C] text-[#F8FAFC] font-mono text-sm p-4 rounded-xl border border-[rgba(255,255,255,0.06)] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all resize-none"
                  placeholder=".degree-institution { font-size: 18px; }"
                />
              </div>

              {/* HTML Editor */}
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Modèle HTML</span>
                  <span className="text-[10px] text-[#64748B]">(contenu Handlebars)</span>
                </div>
                <textarea
                  value={customHtmlMap[template.name] || ''}
                  onChange={(e) => setCustomHtmlMap(prev => ({ ...prev, [template.name]: e.target.value }))}
                  rows={12}
                  className="w-full bg-[#0A0F1C] text-[#F8FAFC] font-mono text-sm p-4 rounded-xl border border-[rgba(255,255,255,0.06)] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all resize-none"
                  placeholder={`<div class="degree-institution">{{institutionName}}</div>\n<div class="degree-recipient">{{recipientName}}</div>`}
                />
                <p className="text-xs text-[#64748B] mt-2">
                  ⚠️ Vous pouvez omettre le DOCTYPE et mettre uniquement le contenu intérieur. Le système injectera automatiquement la mise en page paysage.
                </p>
              </div>

              {/* Save button */}
              <button
                onClick={() => handleSave(template.name)}
                disabled={saving === template.name}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all duration-200 disabled:opacity-50"
              >
                {saving === template.name ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Enregistrer le modèle
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}