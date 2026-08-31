// pages/DashBoard/Backgrounds/BackgroundManager.jsx

import { useContext, useEffect, useState } from "react";
import { UserContext } from "../../../Context/dataCont";
import { useError } from "../../../Context/ErrorContext";
import { useModal } from "../../../Context/ModalContext";
import BackButton from "../../../Components/Buttons/BackButton";

import {
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
  const { authData } = useContext(UserContext);
  const { showError, showSuccess } = useError();
  const { confirm } = useModal();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [uploading, setUploading] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [refreshing, setRefreshing] = useState(null);
  const [expanded, setExpanded] = useState({});

  // ============================================================
  // LOAD ALL TEMPLATES FROM DATABASE
  // ============================================================

  useEffect(() => {
    loadTemplates();
  }, []);

  const getHeaders = () => ({
    Authorization: `Bearer ${authData.token}`,
    "Content-Type": "application/json",
  });

  const loadTemplates = async () => {
    setLoading(true);

    try {
      const response = await fetch(
        `${NEST_API_URL}/pdf/templates`,
        {
          headers: {
            Authorization: `Bearer ${authData.token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message || "Impossible de charger les modèles."
        );
      }

      /*
       * Your backend may return:
       *
       * { success: true, data: [...] }
       *
       * or directly:
       *
       * [...]
       *
       * Handle both.
       */
      const data =
        Array.isArray(result)
          ? result
          : Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result?.data?.data)
          ? result.data.data
          : [];

      setTemplates(data);

      // Expand every template by default.
      const initialExpanded = {};

      data.forEach((template) => {
        if (template?.key) {
          initialExpanded[template.key] = true;
        }
      });

      setExpanded(initialExpanded);
    } catch (error) {
      console.error(
        "Failed to load PDF templates:",
        error
      );

      showError(
        error.message ||
          "Impossible de charger les modèles."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // LOCAL EDITING
  // ============================================================

  const updateLocalTemplate = (
    templateKey,
    field,
    value
  ) => {
    setTemplates((current) =>
      current.map((template) =>
        template.key === templateKey
          ? {
              ...template,
              [field]: value,
            }
          : template
      )
    );
  };

  // ============================================================
  // JSON FIELD EDITING
  // ============================================================

  const updateJsonField = (
    templateKey,
    field,
    value
  ) => {
    let parsed = null;

    try {
      parsed =
        value.trim() === ""
          ? null
          : JSON.parse(value);
    } catch {
      // Keep invalid JSON in a temporary string so the
      // user can continue editing.
      parsed = value;
    }

    updateLocalTemplate(
      templateKey,
      field,
      parsed
    );
  };

  const jsonToText = (value) => {
    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }

    if (typeof value === "string") {
      return value;
    }

    try {
      return JSON.stringify(
        value,
        null,
        2
      );
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
        description:
          template.description || null,
        category:
          template.category || null,

        orientation:
          template.orientation || "portrait",

        paperSize:
          template.paperSize || "A4",

        customHtml:
          template.customHtml || "",

        customCss:
          template.customCss || null,

        backgroundPublicId:
          template.backgroundPublicId ||
          null,

        backgroundUrl:
          template.backgroundUrl ||
          null,

        fieldSchema:
          normalizeJsonValue(
            template.fieldSchema
          ),

        defaultData:
          normalizeJsonValue(
            template.defaultData
          ),

        metadata:
          normalizeJsonValue(
            template.metadata
          ),

        version:
          Number(template.version) || 1,

        isActive:
          Boolean(template.isActive),
      };

      const response = await fetch(
        `${NEST_API_URL}/pdf/templates/${encodeURIComponent(
          template.key
        )}`,
        {
          method: "PATCH",
          headers: getHeaders(),
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ||
            "Échec de la sauvegarde."
        );
      }

      /*
       * The backend updateTemplate() already calls:
       *
       * renderer.refresh(templateName)
       *
       * so there is no need for a second refresh request.
       */

      const updated =
        result?.data || result;

      setTemplates((current) =>
        current.map((item) =>
          item.key === template.key
            ? {
                ...item,
                ...(updated &&
                typeof updated === "object"
                  ? updated
                  : {}),
              }
            : item
        )
      );

      showSuccess(
        `Modèle "${template.key}" enregistré.`
      );
    } catch (error) {
      console.error(
        "Failed to save template:",
        error
      );

      showError(
        error.message ||
          "Échec de la sauvegarde."
      );
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
      const response = await fetch(
        `${NEST_API_URL}/pdf/templates/${encodeURIComponent(
          template.key
        )}/refresh`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authData.token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ||
            "Échec du rafraîchissement."
        );
      }

      showSuccess(
        `Template "${template.key}" rechargé.`
      );
    } catch (error) {
      showError(
        error.message ||
          "Échec du rafraîchissement."
      );
    } finally {
      setRefreshing(null);
    }
  };

  // ============================================================
  // DELETE TEMPLATE
  // ============================================================

  const handleDelete = async (template) => {
    const confirmed = await confirm({
      title: "Supprimer le modèle",
      message:
        `Voulez-vous vraiment supprimer le modèle "${template.key}" ? ` +
        "Le système utilisera alors le template fallback intégré.",
    });

    if (!confirmed) {
      return;
    }

    setDeleting(template.key);

    try {
      const response = await fetch(
        `${NEST_API_URL}/pdf/templates/${encodeURIComponent(
          template.key
        )}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${authData.token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ||
            "Échec de la suppression."
        );
      }

      setTemplates((current) =>
        current.filter(
          (item) =>
            item.key !== template.key
        )
      );

      showSuccess(
        `Modèle "${template.key}" supprimé.`
      );
    } catch (error) {
      showError(
        error.message ||
          "Échec de la suppression."
      );
    } finally {
      setDeleting(null);
    }
  };

  // ============================================================
  // BACKGROUND UPLOAD
  // ============================================================

  const handleUpload = async (
    template,
    file
  ) => {
    if (!file) {
      return;
    }

    setUploading(template.key);

    try {
      const formData = new FormData();

      formData.append(
        "background",
        file
      );

      const response = await fetch(
        `${NEST_API_URL}/pdf/templates/${encodeURIComponent(
          template.key
        )}/background`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authData.token}`,
          },
          body: formData,
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ||
            "Échec de l'upload."
        );
      }

      /*
       * We reload everything because the background
       * endpoint may update several DB fields:
       *
       * backgroundPublicId
       * backgroundUrl
       * etc.
       */
      await loadTemplates();

      showSuccess(
        "Arrière-plan téléchargé avec succès."
      );
    } catch (error) {
      showError(
        error.message ||
          "Échec de l'upload."
      );
    } finally {
      setUploading(null);
    }
  };

  // ============================================================
  // BACKGROUND DELETE
  // ============================================================

  const handleDeleteBackground = async (
    template
  ) => {
    const confirmed = await confirm({
      title: "Supprimer l'arrière-plan",
      message:
        `Supprimer l'arrière-plan de "${template.key}" ?`,
    });

    if (!confirmed) {
      return;
    }

    setDeleting(
      `${template.key}-background`
    );

    try {
      /*
       * If your backend has a clear route, use it.
       *
       * We first try the template-specific clear route
       * used by your previous architecture.
       */
      const clearResponse =
        await fetch(
          `${NEST_API_URL}/pdf/templates/${encodeURIComponent(
            template.key
          )}/background/clear`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${authData.token}`,
              "Content-Type":
                "application/json",
            },
          }
        );

      if (!clearResponse.ok) {
        const result =
          await clearResponse
            .json()
            .catch(() => null);

        throw new Error(
          result?.message ||
            "Échec de la suppression de l'arrière-plan."
        );
      }

      await loadTemplates();

      showSuccess(
        "Arrière-plan supprimé."
      );
    } catch (error) {
      showError(
        error.message ||
          "Échec de la suppression."
      );
    } finally {
      setDeleting(null);
    }
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

        {/* ======================================================
            HEADER
        ====================================================== */}

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

          <button
            onClick={loadTemplates}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#111827] border border-white/10 text-[#CBD5E1] hover:bg-[#1F2937] transition"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>

        </div>

        {/* ======================================================
            EMPTY
        ====================================================== */}

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

        {/* ======================================================
            TEMPLATES
        ====================================================== */}

        <div className="space-y-6">

          {templates.map((template) => {

            const isExpanded =
              expanded[template.key];

            const isSaving =
              saving === template.key;

            const isUploading =
              uploading === template.key;

            const isDeleting =
              deleting === template.key;

            const isRefreshing =
              refreshing === template.key;

            return (
              <div
                key={template.key}
                className="bg-[#111827] rounded-2xl border border-white/[0.06] shadow-2xl overflow-hidden"
              >

                {/* ==================================================
                    TEMPLATE HEADER
                ================================================== */}

                <div className="p-6 border-b border-white/[0.06]">

                  <div className="flex flex-wrap items-center justify-between gap-4">

                    <button
                      onClick={() =>
                        toggleExpanded(
                          template.key
                        )
                      }
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
                            {template.name ||
                              template.key}
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
                        onClick={() =>
                          handleRefresh(
                            template
                          )
                        }
                        disabled={
                          isRefreshing
                        }
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 disabled:opacity-50"
                      >

                        <RefreshCw
                          className={`w-4 h-4 ${
                            isRefreshing
                              ? "animate-spin"
                              : ""
                          }`}
                        />

                        Recharger
                      </button>

                      <button
                        onClick={() =>
                          handleDelete(
                            template
                          )
                        }
                        disabled={
                          isDeleting
                        }
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 disabled:opacity-50"
                      >

                        {isDeleting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}

                        Supprimer
                      </button>

                    </div>

                  </div>

                </div>

                {/* ==================================================
                    CONTENT
                ================================================== */}

                {isExpanded && (
                  <div className="p-6 space-y-8">

                    {/* ==============================================
                        BASIC CONFIG
                    ============================================== */}

                    <section>

                      <SectionTitle
                        icon={<Settings2 />}
                        title="Configuration"
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        <Input
                          label="Nom"
                          value={
                            template.name ||
                            ""
                          }
                          onChange={(value) =>
                            updateLocalTemplate(
                              template.key,
                              "name",
                              value
                            )
                          }
                        />

                        <Input
                          label="Catégorie"
                          value={
                            template.category ||
                            ""
                          }
                          onChange={(value) =>
                            updateLocalTemplate(
                              template.key,
                              "category",
                              value
                            )
                          }
                        />

                        <Input
                          label="Description"
                          value={
                            template.description ||
                            ""
                          }
                          onChange={(value) =>
                            updateLocalTemplate(
                              template.key,
                              "description",
                              value
                            )
                          }
                        />

                        <Input
                          label="Version"
                          type="number"
                          value={
                            template.version ??
                            1
                          }
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
                          value={
                            template.orientation ||
                            "portrait"
                          }
                          options={[
                            "portrait",
                            "landscape",
                          ]}
                          onChange={(value) =>
                            updateLocalTemplate(
                              template.key,
                              "orientation",
                              value
                            )
                          }
                        />

                        <Select
                          label="Format papier"
                          value={
                            template.paperSize ||
                            "A4"
                          }
                          options={[
                            "A4",
                            "A3",
                            "A5",
                            "Letter",
                            "Legal",
                          ]}
                          onChange={(value) =>
                            updateLocalTemplate(
                              template.key,
                              "paperSize",
                              value
                            )
                          }
                        />

                      </div>

                      <label className="flex items-center gap-3 mt-5 cursor-pointer">

                        <input
                          type="checkbox"
                          checked={
                            Boolean(
                              template.isActive
                            )
                          }
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

                    {/* ==============================================
                        BACKGROUND
                    ============================================== */}

                    <section>

                      <SectionTitle
                        icon={<ImageIcon />}
                        title="Arrière-plan"
                      />

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        <div>

                          <label className="block text-xs font-medium uppercase tracking-wider text-[#94A3B8] mb-2">
                            URL de l'arrière-plan
                          </label>

                          <input
                            value={
                              template.backgroundUrl ||
                              ""
                            }
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
                            value={
                              template.backgroundPublicId ||
                              ""
                            }
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

                              {isUploading
                                ? "Upload..."
                                : "Uploader une image"}

                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={
                                  isUploading
                                }
                                onChange={(e) => {
                                  const file =
                                    e.target
                                      .files?.[0];

                                  if (file) {
                                    handleUpload(
                                      template,
                                      file
                                    );
                                  }

                                  e.target.value =
                                    "";
                                }}
                              />

                            </label>

                            {template.backgroundUrl && (
                              <button
                                onClick={() =>
                                  handleDeleteBackground(
                                    template
                                  )
                                }
                                disabled={
                                  deleting ===
                                  `${template.key}-background`
                                }
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
                            <img
                              src={
                                template.backgroundUrl
                              }
                              alt={`Background ${template.key}`}
                              className="max-w-full max-h-full object-contain"
                            />
                          ) : (
                            <div className="text-center text-[#475569]">

                              <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />

                              <p className="text-sm">
                                Aucun arrière-plan
                              </p>

                            </div>
                          )}

                        </div>

                      </div>

                    </section>

                    {/* ==============================================
                        HTML
                    ============================================== */}

                    <section>

                      <SectionTitle
                        icon={<Code2 />}
                        title="HTML / Handlebars"
                      />

                      <textarea
                        value={
                          template.customHtml ||
                          ""
                        }
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
                        placeholder={`<div>
  <h1>{{institutionName}}</h1>
  <p>{{recipientName}}</p>
</div>`}
                      />

                      <p className="text-xs text-[#64748B] mt-2">
                        Le HTML est compilé comme template Handlebars par le backend.
                      </p>

                    </section>

                    {/* ==============================================
                        CSS
                    ============================================== */}

                    <section>

                      <SectionTitle
                        icon={<Palette />}
                        title="CSS personnalisé"
                      />

                      <textarea
                        value={
                          template.customCss ||
                          ""
                        }
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
                        placeholder={`body {
  font-family: Arial, sans-serif;
}`}
                      />

                    </section>

                    {/* ==============================================
                        FIELD SCHEMA
                    ============================================== */}

                    <section>

                      <SectionTitle
                        icon={<Database />}
                        title="Field Schema"
                      />

                      <textarea
                        value={jsonToText(
                          template.fieldSchema
                        )}
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
                        placeholder={`{
  "recipientName": {
    "type": "string",
    "required": true
  }
}`}
                      />

                      <p className="text-xs text-[#64748B] mt-2">
                        JSON décrivant les champs disponibles pour ce template.
                      </p>

                    </section>

                    {/* ==============================================
                        DEFAULT DATA
                    ============================================== */}

                    <section>

                      <SectionTitle
                        icon={<Database />}
                        title="Default Data"
                      />

                      <textarea
                        value={jsonToText(
                          template.defaultData
                        )}
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
                        placeholder={`{
  "institutionName": "Votre institution"
}`}
                      />

                    </section>

                    {/* ==============================================
                        METADATA
                    ============================================== */}

                    <section>

                      <SectionTitle
                        icon={<Settings2 />}
                        title="Metadata"
                      />

                      <textarea
                        value={jsonToText(
                          template.metadata
                        )}
                        onChange={(e) =>
                          updateJsonField(
                            template.key,
                            "metadata",
                            e.target.value
                          )
                        }
                        spellCheck={false}
                        rows={10}
                        className="w-full bg-[#0A0F1C] border border-white/[0.06] rounded-xl p-4 text-sm text-[#E2E8F0] font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-y"
                        placeholder={`{
  "description": "Template PDF"
}`}
                      />

                    </section>

                    {/* ==============================================
                        SAVE
                    ============================================== */}

                    <div className="pt-2">

                      <button
                        onClick={() =>
                          handleSave(template)
                        }
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
    </div>
  );
}

// ================================================================
// HELPERS
// ================================================================

function normalizeJsonValue(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      throw new Error(
        "Un des champs JSON contient un JSON invalide."
      );
    }
  }

  return value;
}

// ================================================================
// UI COMPONENTS
// ================================================================

function SectionTitle({
  icon,
  title,
}) {
  return (
    <div className="flex items-center gap-2 mb-4">

      <div className="text-emerald-400">
        {icon}
      </div>

      <h3 className="text-sm font-semibold uppercase tracking-wider text-[#CBD5E1]">
        {title}
      </h3>

    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}) {
  return (
    <div>

      <label className="block text-xs font-medium uppercase tracking-wider text-[#94A3B8] mb-2">
        {label}
      </label>

      <input
        type={type}
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="w-full bg-[#0A0F1C] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
      />

    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}) {
  return (
    <div>

      <label className="block text-xs font-medium uppercase tracking-wider text-[#94A3B8] mb-2">
        {label}
      </label>

      <select
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="w-full bg-[#0A0F1C] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
      >

        {options.map((option) => (
          <option
            key={option}
            value={option}
          >
            {option}
          </option>
        ))}

      </select>

    </div>
  );
}