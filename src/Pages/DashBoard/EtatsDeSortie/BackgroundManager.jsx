// pages/DashBoard/Backgrounds/BackgroundManager.jsx
import { useContext, useEffect, useState } from "react";
import { UserContext } from "../../../Context/dataCont";
import { useError } from '../../../Context/ErrorContext';        
import Title from "../../../Components/Title";
import BackButton from "../../../Components/Buttons/BackButton";
import { useModal } from "../../../Context/ModalContext";

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

      // Clear the database record
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
      <div className="min-h-screen p-8 bg-gradient-to-br from-gray-900 to-gray-800 text-yellow-400 font-urbanist">
        <div className="text-center text-yellow-300 mt-10">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-gray-900 to-gray-800 text-yellow-400 font-urbanist">
      <div className="mb-4">
        <BackButton fallbackPath="/dash" />
      </div>
      <Title title="Gestion des modèles PDF" />

      <div className="mt-6 space-y-8">
        {templates.map(template => (
          <div
            key={template.name}
            className="bg-gray-800/60 backdrop-blur-sm border border-yellow-400/20 rounded-xl p-6"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-yellow-300 capitalize">{template.name}</h2>
              <div className="space-x-3">
                <label
                  className={`px-4 py-2 rounded-lg transition cursor-pointer inline-block ${
                    uploading === template.name
                      ? "bg-gray-600 text-gray-400"
                      : "bg-yellow-400 text-gray-900 hover:bg-yellow-500"
                  }`}
                >
                  {uploading === template.name ? "Chargement..." : "Image de fond"}
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
                    className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition"
                  >
                    Supprimer
                  </button>
                )}
              </div>
            </div>

            {/* Background preview */}
            <div className="mb-6">
              <div className="w-full h-48 bg-gray-700 rounded-lg overflow-hidden border border-gray-600">
                {template.backgroundUrl ? (
                  <img
                    src={template.backgroundUrl}
                    alt={`Background ${template.name}`}
                    className="w-full h-full object-contain bg-gray-800"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    Aucun arrière-plan
                  </div>
                )}
              </div>
              {template.hasBackground && (
                <p className="text-xs text-gray-500 mt-1">
                  Arrière-plan actif. Il sera utilisé dans les nouveaux documents.
                </p>
              )}
            </div>

            {/* CSS editor */}
            <div className="mb-4">
              <h3 className="text-sm text-gray-400 mb-2">CSS personnalisé</h3>
              <textarea
                value={customCssMap[template.name] || ''}
                onChange={(e) => setCustomCssMap(prev => ({ ...prev, [template.name]: e.target.value }))}
                rows={10}
                className="w-full bg-gray-900 text-gray-200 font-mono text-sm p-3 rounded-lg border border-gray-700 focus:border-amber-400 outline-none resize-none"
                placeholder=".degree-institution { font-size: 18px; }"
              />
            </div>

            {/* HTML editor */}
            <div className="mb-4">
              <h3 className="text-sm text-gray-400 mb-2">
                Modèle HTML <span className="text-xs text-gray-500">(code Handlebars complet)</span>
              </h3>
              <textarea
                value={customHtmlMap[template.name] || ''}
                onChange={(e) => setCustomHtmlMap(prev => ({ ...prev, [template.name]: e.target.value }))}
                rows={18}
                className="w-full bg-gray-900 text-gray-200 font-mono text-sm p-3 rounded-lg border border-gray-700 focus:border-amber-400 outline-none resize-none"
                placeholder={`<div class="degree-institution">{{institutionName}}</div>\n<div class="degree-recipient">{{recipientName}}</div>\n...`}
              />
              <p className="text-xs text-gray-500 mt-1">
                Vous pouvez supprimer le DOCTYPE et mettre uniquement le contenu intérieur. Le système injectera automatiquement la mise en page paysage.
              </p>
            </div>

            {/* Save button */}
            <button
              onClick={() => handleSave(template.name)}
              disabled={saving === template.name}
              className="w-full px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-gray-900 font-semibold rounded-xl transition disabled:opacity-50"
            >
              {saving === template.name ? "Sauvegarde..." : "Enregistrer le modèle"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}