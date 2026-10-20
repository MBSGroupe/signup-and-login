// pages/DashBoard/Backgrounds/BackgroundManager.jsx

import { useContext, useEffect, useState } from "react";
import { UserContext } from "../../../Context/dataCont";
import { useError } from "../../../Context/ErrorContext";
import { useModal } from "../../../Context/ModalContext";
import BackButton from "../../../Components/Buttons/BackButton";
import { fetchWithRefresh } from "../../../Components/api"; // ✅ IMPORT
import { previewDocument } from "../../../Components/documents";
import PDFPreviewModal from "../../../Components/Modals/pdfPreviexModal";
import { useProtectedFileUrl } from "../../../Hooks/useProtectedFileUrl";

import {
  Eye,
  BookOpen,
  FileText,
  Upload,
  Trash2,
  Save,
  Loader2,
  Plus,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Code2,
  Palette,
  Database,
  Settings2,
  CheckCircle2,
} from "lucide-react";

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

export default function BackgroundManager() {
  const { authData, setAuthData } = useContext(UserContext); // ✅ added setAuthData
  const { showError, showSuccess } = useError();
  const { confirm } = useModal();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [uploading, setUploading] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [refreshing, setRefreshing] = useState(null);
  const [expanded, setExpanded] = useState({});

  // Authoring reference (models + fields, helpers, enrichers) from the backend.
  const [authoring, setAuthoring] = useState(null);
  // "New template" form.
  const [newTemplate, setNewTemplate] = useState(null);
  const [creating, setCreating] = useState(false);
  // Preview: record id typed per template, and the modal.
  const [previewIds, setPreviewIds] = useState({});
  const [previewing, setPreviewing] = useState(null);
  const [pdfPreview, setPdfPreview] = useState(null);

  // ============================================================
  // LOAD ALL TEMPLATES FROM DATABASE
  // ============================================================

  useEffect(() => {
    loadTemplates();
    loadAuthoring();
  }, []);

  const loadAuthoring = async () => {
    try {
      const response = await fetchWithRefresh(
        `${NEST_API_URL}/pdf/documents/authoring`,
        { method: "GET" },
        authData.token,
        setAuthData
      );
      if (!response.ok) return;
      const result = await response.json();
      setAuthoring(result?.data || null);
    } catch (error) {
      console.error("Failed to load authoring reference:", error);
    }
  };

  const loadTemplates = async () => {
    setLoading(true);

    try {
      const response = await fetchWithRefresh(
        `${NEST_API_URL}/pdf/templates`,
        { method: "GET" },
        authData.token,
        setAuthData
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message || "Impossible de charger les modèles."
        );
      }

      const data =
        Array.isArray(result)
          ? result
          : Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result?.data?.data)
          ? result.data.data
          : [];

      setTemplates(data);

      const initialExpanded = {};
      data.forEach((template) => {
        if (template?.key) {
          initialExpanded[template.key] = true;
        }
      });
      setExpanded(initialExpanded);
    } catch (error) {
      console.error("Failed to load PDF templates:", error);
      showError(error.message || "Impossible de charger les modèles.");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // LOCAL EDITING
  // ============================================================

  const updateLocalTemplate = (templateKey, field, value) => {
    setTemplates((current) =>
      current.map((template) =>
        template.key === templateKey
          ? { ...template, [field]: value }
          : template
      )
    );
  };

  // ============================================================
  // JSON FIELD EDITING
  // ============================================================

  const updateJsonField = (templateKey, field, value) => {
    let parsed = null;
    try {
      parsed = value.trim() === "" ? null : JSON.parse(value);
    } catch {
      parsed = value;
    }
    updateLocalTemplate(templateKey, field, parsed);
  };

  const jsonToText = (value) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return "";
    }
  };

  // ============================================================
  // SAVE TEMPLATE
  // ============================================================

  const handleSave = async (template) => {
    setSaving(template.key);

    try {
      const payload = {
        name: template.name || null,
        description: template.description || null,
        category: template.category || null,
        orientation: template.orientation || "portrait",
        paperSize: template.paperSize || "A4",
        customHtml: template.customHtml || "",
        customCss: template.customCss || null,
        backgroundPublicId: template.backgroundPublicId || null,
        backgroundUrl: template.backgroundUrl || null,
        fieldSchema: normalizeJsonValue(template.fieldSchema),
        defaultData: normalizeJsonValue(template.defaultData),
        metadata: normalizeJsonValue(template.metadata),
        version: Number(template.version) || 1,
        isActive: Boolean(template.isActive),
      };

      const response = await fetchWithRefresh(
        `${NEST_API_URL}/pdf/templates/${encodeURIComponent(template.key)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        authData.token,
        setAuthData
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || "Échec de la sauvegarde.");
      }

      const updated = result?.data || result;

      setTemplates((current) =>
        current.map((item) =>
          item.key === template.key
            ? {
                ...item,
                ...(updated && typeof updated === "object" ? updated : {}),
                origin: "database",
              }
            : item
        )
      );

      showSuccess(`Modèle "${template.key}" enregistré.`);
    } catch (error) {
      console.error("Failed to save template:", error);
      showError(error.message || "Échec de la sauvegarde.");
    } finally {
      setSaving(null);
    }
  };

  // ============================================================
  // MANUAL RENDERER REFRESH
  // ============================================================

  const handleRefresh = async (template) => {
    setRefreshing(template.key);

    try {
      const response = await fetchWithRefresh(
        `${NEST_API_URL}/pdf/templates/${encodeURIComponent(template.key)}/refresh`,
        { method: "POST" },
        authData.token,
        setAuthData
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || "Échec du rafraîchissement.");
      }

      showSuccess(`Template "${template.key}" rechargé.`);
    } catch (error) {
      showError(error.message || "Échec du rafraîchissement.");
    } finally {
      setRefreshing(null);
    }
  };

  // ============================================================
  // DELETE TEMPLATE
  // ============================================================

  const handleDelete = async (template) => {
    const confirmed = await confirm({
      title: template.hasBuiltin ? "Réinitialiser le modèle" : "Supprimer le modèle",
      message: template.hasBuiltin
        ? `Supprimer la version personnalisée de "${template.key}" ? Le modèle intégré sera de nouveau utilisé.`
        : `Voulez-vous vraiment supprimer le modèle "${template.key}" ? Les documents de ce type ne pourront plus être générés.`,
    });

    if (!confirmed) return;

    setDeleting(template.key);

    try {
      const response = await fetchWithRefresh(
        `${NEST_API_URL}/pdf/templates/${encodeURIComponent(template.key)}`,
        { method: "DELETE" },
        authData.token,
        setAuthData
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || "Échec de la suppression.");
      }

      if (template.hasBuiltin) {
        // The built-in definition takes over again.
        await loadTemplates();
      } else {
        setTemplates((current) =>
          current.filter((item) => item.key !== template.key)
        );
      }

      showSuccess(`Modèle "${template.key}" supprimé.`);
    } catch (error) {
      showError(error.message || "Échec de la suppression.");
    } finally {
      setDeleting(null);
    }
  };

  // ============================================================
  // BACKGROUND UPLOAD
  // ============================================================

  const handleUpload = async (template, file) => {
    if (!file) return;

    setUploading(template.key);

    try {
      const formData = new FormData();
      formData.append("background", file);

      const response = await fetchWithRefresh(
        `${NEST_API_URL}/pdf/templates/${encodeURIComponent(template.key)}/background`,
        {
          method: "POST",
          body: formData,
          // ❌ No Content-Type header – fetch will set it with boundary
        },
        authData.token,
        setAuthData
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || "Échec de l'upload.");
      }

      await loadTemplates();
      showSuccess("Arrière-plan téléchargé avec succès.");
    } catch (error) {
      showError(error.message || "Échec de l'upload.");
    } finally {
      setUploading(null);
    }
  };

  // ============================================================
  // BACKGROUND DELETE
  // ============================================================

  const handleDeleteBackground = async (template) => {
    const confirmed = await confirm({
      title: "Supprimer l'arrière-plan",
      message: `Supprimer l'arrière-plan de "${template.key}" ?`,
    });

    if (!confirmed) return;

    setDeleting(`${template.key}-background`);

    try {
      const response = await fetchWithRefresh(
        `${NEST_API_URL}/pdf/templates/${encodeURIComponent(template.key)}/background/clear`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
        },
        authData.token,
        setAuthData
      );

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message || "Échec de la suppression de l'arrière-plan.");
      }

      await loadTemplates();
      showSuccess("Arrière-plan supprimé.");
    } catch (error) {
      showError(error.message || "Échec de la suppression.");
    } finally {
      setDeleting(null);
    }
  };

  // ============================================================
  // CREATE TEMPLATE
  // ============================================================

  const handleCreate = async () => {
    const key = (newTemplate?.key || "").trim();
    const model = newTemplate?.model || "";
    if (!key || !newTemplate?.name?.trim() || !model) {
      showError("Clé, nom et modèle source sont obligatoires.");
      return;
    }

    setCreating(true);
    try {
      const response = await fetchWithRefresh(
        `${NEST_API_URL}/pdf/templates`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key,
            name: newTemplate.name.trim(),
            orientation: newTemplate.orientation || "portrait",
            paperSize: "A4",
            customHtml: starterHtml(model),
            metadata: { source: { model } },
          }),
        },
        authData.token,
        setAuthData
      );
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        const message = Array.isArray(result?.message) ? result.message.join(", ") : result?.message;
        throw new Error(message || "Échec de la création.");
      }

      setNewTemplate(null);
      await loadTemplates();
      setExpanded((current) => ({ ...current, [key]: true }));
      showSuccess(`Modèle "${key}" créé.`);
    } catch (error) {
      showError(error.message || "Échec de la création.");
    } finally {
      setCreating(false);
    }
  };

  // ============================================================
  // PREVIEW (saved version, with a real record)
  // ============================================================

  const handlePreview = async (template) => {
    const entityId = (previewIds[template.key] || "").trim();
    if (!entityId) {
      showError("Indiquez l'identifiant d'un enregistrement pour l'aperçu.");
      return;
    }
    setPreviewing(template.key);
    try {
      const blob = await previewDocument(template.key, entityId, { token: authData.token, setAuthData });
      setPdfPreview({ title: `Aperçu — ${template.name || template.key}`, blobUrl: URL.createObjectURL(blob) });
    } catch (error) {
      showError(error.message || "Échec de l'aperçu.");
    } finally {
      setPreviewing(null);
    }
  };

  const closePreview = () => {
    if (pdfPreview?.blobUrl) URL.revokeObjectURL(pdfPreview.blobUrl);
    setPdfPreview(null);
  };

  // ============================================================
  // TOGGLE
  // ============================================================

  const toggleExpanded = (key) => {
    setExpanded((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center ml-[30px] mt-16">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
          <p className="text-[#94A3B8] text-sm">
            Chargement des modèles depuis la base de données...
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div className="min-h-screen bg-[#0A0F1C] p-6 md:p-8 ml-[30px] mt-16">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <BackButton fallbackPath="/dash" />
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <FileText className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-[#F8FAFC]">
                  Gestion des modèles PDF
                </h1>
                <p className="text-[#94A3B8] text-sm mt-1">
                  Modèles chargés directement depuis la base de données
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setNewTemplate(newTemplate ? null : { key: "", name: "", model: "User", orientation: "portrait" })}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition"
            >
              <Plus className="w-4 h-4" />
              Nouveau modèle
            </button>
            <button
              onClick={loadTemplates}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#111827] border border-white/10 text-[#CBD5E1] hover:bg-[#1F2937] transition"
            >
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </button>
          </div>
        </div>

        {/* NEW TEMPLATE */}
        {newTemplate && (
          <div className="bg-[#111827] border border-emerald-500/20 rounded-2xl p-6 mb-6">
            <SectionTitle icon={<Plus />} title="Nouveau modèle" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                label="Clé (ex. carte-membre)"
                value={newTemplate.key}
                onChange={(value) => setNewTemplate((t) => ({ ...t, key: value.toLowerCase() }))}
              />
              <Input
                label="Nom"
                value={newTemplate.name}
                onChange={(value) => setNewTemplate((t) => ({ ...t, name: value }))}
              />
              <Select
                label="Modèle source"
                value={newTemplate.model}
                options={(authoring?.models || [{ name: "User" }]).map((m) => m.name)}
                onChange={(value) => setNewTemplate((t) => ({ ...t, model: value }))}
              />
              <Select
                label="Orientation"
                value={newTemplate.orientation}
                options={["portrait", "landscape"]}
                onChange={(value) => setNewTemplate((t) => ({ ...t, orientation: value }))}
              />
            </div>
            <p className="text-xs text-[#64748B] mt-3">
              Le document est construit à partir d'un enregistrement du modèle source ({"{{record.*}}"}).
              Le HTML, les champs, le stockage et l'email se configurent ensuite dans le modèle — sans code.
            </p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleCreate}
                disabled={creating}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Créer
              </button>
              <button
                onClick={() => setNewTemplate(null)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1F2937] text-[#CBD5E1]"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* EMPTY */}
        {templates.length === 0 && (
          <div className="bg-[#111827] border border-white/10 rounded-2xl p-10 text-center">
            <Database className="w-12 h-12 mx-auto mb-4 text-[#475569]" />
            <h2 className="text-lg font-semibold text-white mb-2">
              Aucun modèle en base de données
            </h2>
            <p className="text-sm text-[#64748B]">
              Le endpoint GET /pdf/templates n'a retourné aucun template.
            </p>
          </div>
        )}

        {/* TEMPLATES */}
        <div className="space-y-6">
          {templates.map((template) => {
            const isExpanded = expanded[template.key];
            const isSaving = saving === template.key;
            const isUploading = uploading === template.key;
            const isDeleting = deleting === template.key;
            const isRefreshing = refreshing === template.key;

            return (
              <div
                key={template.key}
                className="bg-[#111827] rounded-2xl border border-white/[0.06] shadow-2xl overflow-hidden"
              >
                {/* TEMPLATE HEADER */}
                <div className="p-6 border-b border-white/[0.06]">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <button
                      onClick={() => toggleExpanded(template.key)}
                      className="flex items-center gap-3 text-left"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-[#64748B]" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-[#64748B]" />
                      )}
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="text-xl font-semibold text-white">
                            {template.name || template.key}
                          </h2>
                          <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-mono">
                            {template.key}
                          </span>
                          {template.isActive && (
                            <span className="flex items-center gap-1 text-xs text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Active
                            </span>
                          )}
                          {template.origin === "builtin" && (
                            <span className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-300 text-xs">
                              Intégré — sera enregistré à la première modification
                            </span>
                          )}
                          {template.metadata?.source?.model && (
                            <span className="px-2 py-1 rounded-lg bg-white/5 text-[#94A3B8] text-xs font-mono">
                              {template.metadata.source.model}
                            </span>
                          )}
                        </div>
                        {template.description && (
                          <p className="text-sm text-[#64748B] mt-1">
                            {template.description}
                          </p>
                        )}
                      </div>
                    </button>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleRefresh(template)}
                        disabled={isRefreshing}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 disabled:opacity-50"
                      >
                        <RefreshCw
                          className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
                        />
                        Recharger
                      </button>
                      {template.origin !== "builtin" && (
                        <button
                          onClick={() => handleDelete(template)}
                          disabled={isDeleting}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 disabled:opacity-50"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          {template.hasBuiltin ? "Réinitialiser" : "Supprimer"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* CONTENT */}
                {isExpanded && (
                  <div className="p-6 space-y-8">
                    {/* BASIC CONFIG */}
                    <section>
                      <SectionTitle icon={<Settings2 />} title="Configuration" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Nom"
                          value={template.name || ""}
                          onChange={(value) =>
                            updateLocalTemplate(template.key, "name", value)
                          }
                        />
                        <Input
                          label="Catégorie"
                          value={template.category || ""}
                          onChange={(value) =>
                            updateLocalTemplate(template.key, "category", value)
                          }
                        />
                        <Input
                          label="Description"
                          value={template.description || ""}
                          onChange={(value) =>
                            updateLocalTemplate(template.key, "description", value)
                          }
                        />
                        <Input
                          label="Version"
                          type="number"
                          value={template.version ?? 1}
                          onChange={(value) =>
                            updateLocalTemplate(
                              template.key,
                              "version",
                              Number(value)
                            )
                          }
                        />
                        <Select
                          label="Orientation"
                          value={template.orientation || "portrait"}
                          options={["portrait", "landscape"]}
                          onChange={(value) =>
                            updateLocalTemplate(template.key, "orientation", value)
                          }
                        />
                        <Select
                          label="Format papier"
                          value={template.paperSize || "A4"}
                          options={["A4", "A3", "A5", "Letter", "Legal"]}
                          onChange={(value) =>
                            updateLocalTemplate(template.key, "paperSize", value)
                          }
                        />
                      </div>

                      <label className="flex items-center gap-3 mt-5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(template.isActive)}
                          onChange={(e) =>
                            updateLocalTemplate(
                              template.key,
                              "isActive",
                              e.target.checked
                            )
                          }
                          className="w-4 h-4 accent-emerald-500"
                        />
                        <span className="text-sm text-[#CBD5E1]">
                          Template actif
                        </span>
                      </label>
                    </section>

                    {/* BACKGROUND */}
                    <section>
                      <SectionTitle icon={<ImageIcon />} title="Arrière-plan" />
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-medium uppercase tracking-wider text-[#94A3B8] mb-2">
                            URL de l'arrière-plan
                          </label>
                          <input
                            value={template.backgroundUrl || ""}
                            onChange={(e) =>
                              updateLocalTemplate(
                                template.key,
                                "backgroundUrl",
                                e.target.value
                              )
                            }
                            className="w-full bg-[#0A0F1C] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            placeholder="https://..."
                          />

                          <label className="block text-xs font-medium uppercase tracking-wider text-[#94A3B8] mb-2 mt-4">
                            Public ID
                          </label>
                          <input
                            value={template.backgroundPublicId || ""}
                            onChange={(e) =>
                              updateLocalTemplate(
                                template.key,
                                "backgroundPublicId",
                                e.target.value
                              )
                            }
                            className="w-full bg-[#0A0F1C] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            placeholder="Cloudinary public ID"
                          />

                          <div className="flex flex-wrap gap-2 mt-4">
                            <label
                              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer ${
                                isUploading
                                  ? "bg-[#1F2937] text-[#64748B]"
                                  : "bg-emerald-500 hover:bg-emerald-600 text-white"
                              }`}
                            >
                              {isUploading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Upload className="w-4 h-4" />
                              )}
                              {isUploading ? "Upload..." : "Uploader une image"}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={isUploading}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleUpload(template, file);
                                  }
                                  e.target.value = "";
                                }}
                              />
                            </label>

                            {template.backgroundUrl && (
                              <button
                                onClick={() => handleDeleteBackground(template)}
                                disabled={deleting === `${template.key}-background`}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20"
                              >
                                <Trash2 className="w-4 h-4" />
                                Supprimer
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="h-64 rounded-xl bg-[#0A0F1C] border border-white/[0.06] overflow-hidden flex items-center justify-center">
                          {template.backgroundUrl ? (
                            <BackgroundImage
                              url={template.backgroundUrl}
                              alt={`Background ${template.key}`}
                            />
                          ) : (
                            <div className="text-center text-[#475569]">
                              <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
                              <p className="text-sm">Aucun arrière-plan</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </section>

                    {/* HTML */}
                    <section>
                      <SectionTitle icon={<Code2 />} title="HTML / Handlebars" />
                      <textarea
                        value={template.customHtml || ""}
                        onChange={(e) =>
                          updateLocalTemplate(
                            template.key,
                            "customHtml",
                            e.target.value
                          )
                        }
                        spellCheck={false}
                        rows={18}
                        className="w-full bg-[#0A0F1C] border border-white/[0.06] rounded-xl p-4 text-sm text-[#E2E8F0] font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-y"
                        placeholder={`<div>\n  <h1>{{institutionName}}</h1>\n  <p>{{recipientName}}</p>\n</div>`}
                      />
                      <p className="text-xs text-[#64748B] mt-2">
                        Le HTML est compilé comme template Handlebars par le backend.
                      </p>
                    </section>

                    {/* CSS */}
                    <section>
                      <SectionTitle icon={<Palette />} title="CSS personnalisé" />
                      <textarea
                        value={template.customCss || ""}
                        onChange={(e) =>
                          updateLocalTemplate(
                            template.key,
                            "customCss",
                            e.target.value
                          )
                        }
                        spellCheck={false}
                        rows={14}
                        className="w-full bg-[#0A0F1C] border border-white/[0.06] rounded-xl p-4 text-sm text-[#E2E8F0] font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-y"
                        placeholder={`body {\n  font-family: Arial, sans-serif;\n}`}
                      />
                    </section>

                    {/* FIELD SCHEMA */}
                    <section>
                      <SectionTitle icon={<Database />} title="Field Schema" />
                      <textarea
                        value={jsonToText(template.fieldSchema)}
                        onChange={(e) =>
                          updateJsonField(
                            template.key,
                            "fieldSchema",
                            e.target.value
                          )
                        }
                        spellCheck={false}
                        rows={12}
                        className="w-full bg-[#0A0F1C] border border-white/[0.06] rounded-xl p-4 text-sm text-[#E2E8F0] font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-y"
                        placeholder={`{\n  "recipientName": {\n    "type": "string",\n    "required": true\n  }\n}`}
                      />
                      <p className="text-xs text-[#64748B] mt-2">
                        JSON décrivant les champs disponibles pour ce template.
                      </p>
                    </section>

                    {/* DEFAULT DATA */}
                    <section>
                      <SectionTitle icon={<Database />} title="Default Data" />
                      <textarea
                        value={jsonToText(template.defaultData)}
                        onChange={(e) =>
                          updateJsonField(
                            template.key,
                            "defaultData",
                            e.target.value
                          )
                        }
                        spellCheck={false}
                        rows={10}
                        className="w-full bg-[#0A0F1C] border border-white/[0.06] rounded-xl p-4 text-sm text-[#E2E8F0] font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-y"
                        placeholder={`{\n  "institutionName": "Votre institution"\n}`}
                      />
                    </section>

                    {/* METADATA */}
                    <section>
                      <SectionTitle icon={<Settings2 />} title="Metadata" />
                      <textarea
                        value={jsonToText(template.metadata)}
                        onChange={(e) =>
                          updateJsonField(
                            template.key,
                            "metadata",
                            e.target.value
                          )
                        }
                        spellCheck={false}
                        rows={16}
                        className="w-full bg-[#0A0F1C] border border-white/[0.06] rounded-xl p-4 text-sm text-[#E2E8F0] font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-y"
                        placeholder={METADATA_PLACEHOLDER}
                      />
                      <p className="text-xs text-[#64748B] mt-2">
                        Décrit le document : source (modèle + relations), champs calculés, stockage, certification (QR),
                        email et permissions. Pour un modèle intégré, seules les clés indiquées ici remplacent la configuration intégrée.
                      </p>
                      <ReferencePanel
                        authoring={authoring}
                        model={template.metadata?.source?.model}
                      />
                    </section>

                    {/* PREVIEW */}
                    <section>
                      <SectionTitle icon={<Eye />} title="Aperçu" />
                      <div className="flex flex-col md:flex-row gap-2">
                        <input
                          value={previewIds[template.key] || ""}
                          onChange={(e) =>
                            setPreviewIds((current) => ({ ...current, [template.key]: e.target.value }))
                          }
                          className="flex-1 bg-[#0A0F1C] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                          placeholder={`Identifiant ${template.metadata?.source?.model || "de l'enregistrement"} (ex. cm...)`}
                        />
                        <button
                          onClick={() => handlePreview(template)}
                          disabled={previewing === template.key}
                          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-500/10 text-blue-300 border border-blue-500/20 hover:bg-blue-500/20 disabled:opacity-50"
                        >
                          {previewing === template.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                          Aperçu
                        </button>
                      </div>
                      <p className="text-xs text-[#64748B] mt-2">
                        L'aperçu utilise la version enregistrée du modèle — enregistrez d'abord vos modifications.
                      </p>
                    </section>

                    {/* SAVE */}
                    <div className="pt-2">
                      <button
                        onClick={() => handleSave(template)}
                        disabled={isSaving}
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Sauvegarde...
                          </>
                        ) : (
                          <>
                            <Save className="w-5 h-5" />
                            Enregistrer le modèle
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {pdfPreview && (
        <PDFPreviewModal
          type="template"
          data={pdfPreview}
          onClose={closePreview}
        />
      )}
    </div>
  );
}

// ================================================================
// HELPERS
// ================================================================

const METADATA_PLACEHOLDER = `{
  "source": { "model": "User", "include": { "fees": true } },
  "fields": {
    "fullName": "{{record.name}} {{record.lastname}}",
    "wilayaAr": "{{wilayaArabic record.wilaya}}"
  },
  "output": { "store": true, "fileRecord": true, "mode": "replace" },
  "email": { "subject": "Votre document", "attachment": "storedOrGenerate" },
  "aliases": []
}
// Accès : permission "Pdf" (preview / generate / email), sauf si
// "permission": { "resource": "...", "operations": { ... } } est indiqué.`;

/** Starting HTML for a new template: lists the source record's fields. */
function starterHtml(model) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; }
    {{{customStyles}}}
  </style>
</head>
<body>
  <h1>{{companyName}}</h1>
  <p>Document généré le {{generatedAt}} à partir de ${model} {{record.id}}.</p>
  <!-- Variables : {{record.*}}, {{owner.*}}, {{params.*}}, champs de metadata.fields -->
</body>
</html>`;
}

/** Fields of the source model + helpers/enrichers, for template authors. */
function ReferencePanel({ authoring, model }) {
  const [open, setOpen] = useState(false);
  if (!authoring) return null;
  const description = authoring.models?.find((m) => m.name.toLowerCase() === (model || "").toLowerCase());

  return (
    <div className="mt-4 bg-[#0A0F1C] border border-white/[0.06] rounded-xl">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-[#CBD5E1]"
      >
        <BookOpen className="w-4 h-4 text-emerald-400" />
        Référence {model ? `(${model})` : ""}
        {open ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 text-xs text-[#94A3B8]">
          {description ? (
            <div>
              <p className="font-semibold text-[#CBD5E1] mb-1">Champs de {"{{record}}"}</p>
              <p className="font-mono leading-relaxed">
                {description.fields
                  .map((f) => (f.relation ? `${f.name} → ${f.type}${f.isList ? "[]" : ""} (include)` : f.name))
                  .join(" · ")}
              </p>
            </div>
          ) : (
            <p>Définissez metadata.source.model pour voir les champs disponibles.</p>
          )}
          <div>
            <p className="font-semibold text-[#CBD5E1] mb-1">Variables</p>
            <p className="font-mono">{(authoring.variables || []).join(" · ")}</p>
          </div>
          <div>
            <p className="font-semibold text-[#CBD5E1] mb-1">Helpers</p>
            <p className="font-mono">{(authoring.helpers || []).join(" · ")}</p>
          </div>
          <div>
            <p className="font-semibold text-[#CBD5E1] mb-1">Enrichers (metadata.enrichers)</p>
            <p className="font-mono">{(authoring.enrichers || []).join(" · ") || "—"}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function normalizeJsonValue(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      throw new Error("Un des champs JSON contient un JSON invalide.");
    }
  }
  return value;
}

// ================================================================
// UI COMPONENTS
// ================================================================

// /storage/* needs the JWT, so the background is shown through a blob: URL.
function BackgroundImage({ url, alt }) {
  const { src, error } = useProtectedFileUrl(url);
  if (error) return <p className="text-sm text-rose-400">{error}</p>;
  if (!src) return <Loader2 className="w-6 h-6 animate-spin text-[#475569]" />;
  return <img src={src} alt={alt} className="max-w-full max-h-full object-contain" />;
}

function SectionTitle({ icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="text-emerald-400">{icon}</div>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-[#CBD5E1]">
        {title}
      </h3>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wider text-[#94A3B8] mb-2">
        {label}
      </label>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#0A0F1C] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
      />
    </div>
  );
}

function Select({ label, value, options, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wider text-[#94A3B8] mb-2">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#0A0F1C] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}