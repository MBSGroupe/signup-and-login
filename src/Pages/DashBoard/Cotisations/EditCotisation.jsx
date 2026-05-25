import { useState, useContext, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { UserContext } from "../../../Context/dataCont";
import { fetchWithRefresh } from "../../../Components/api";
import Title from "../../../Components/Title";

const API_URL = import.meta.env.VITE_NEST_API_URL;

export default function EditCotisation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authData, setAuthData } = useContext(UserContext);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [permissions, setPermissions] = useState(null);
  const [formData, setFormData] = useState(null);

  useEffect(() => {
    if (!authData?.token) return;

    const fetchCotisation = async () => {
      try {
        setLoading(true);
        // 1. Récupérer la cotisation
        const cotRes = await fetch(`${API_URL}/fees/${id}`, {
          headers: { Authorization: `Bearer ${authData.token}` }
        });
        const cotData = await cotRes.json();
        if (!cotRes.ok) throw new Error(cotData.message || "Erreur lors du chargement");

        const cotisation = cotData;
        // 2. Récupérer l'ID du propriétaire (l'utilisateur concerné)
        const ownerId = cotisation.userId;
        if (!ownerId) throw new Error("Propriétaire de la cotisation introuvable");

        // 3. Récupérer les permissions pour le modèle Fee
        const permRes = await fetch(
          `${API_URL}/permissions/user/${ownerId}/editable-fields?model=Fee`,
          { headers: { Authorization: `Bearer ${authData.token}` } }
        );
        const permData = await permRes.json();

        if (!permRes.ok) throw new Error(permData.message || "Erreur de permissions");

        setPermissions({
          fields: permData.fields || [],
          configs: permData.configs || {}
        });

        // 4. Initialiser le formulaire avec les champs éditables et les valeurs actuelles
        const initialForm = {};
        (permData.fields || []).forEach((field) => {
          if (cotisation[field] !== undefined) {
            initialForm[field] = cotisation[field];
          }
        });
        setFormData(initialForm);
      } catch (error) {
        console.error(error);
        setMessage(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCotisation();
  }, [id, authData]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? "" : Number(value)) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetchWithRefresh(
        `${API_URL}/fees/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        },
        authData.token,
        setAuthData
      );

      const data = await response.json();
      if (response.ok) {
        setMessage("✅ Cotisation mise à jour !");
        setTimeout(() => navigate(-1), 2000);
      } else {
        setMessage(data.message || "❌ Échec de la mise à jour");
      }
    } catch (error) {
      console.error(error);
      setMessage("⚠️ Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  };

  // Render field based on config type
  const renderField = (fieldName) => {
    if (!permissions?.configs || !permissions.configs[fieldName]) return null;

    const config = permissions.configs[fieldName];
    const value = formData?.[fieldName] ?? "";

    // Determine input type
    let inputElement = null;
    switch (config.type) {
      case "select":
        inputElement = (
          <select
            name={fieldName}
            value={value}
            onChange={handleChange}
            className="w-full p-3 rounded-lg bg-gray-900/60 border border-gray-700 text-gray-200 focus:ring-2 focus:ring-yellow-400"
          >
            <option value="">Sélectionner...</option>
            {config.validation?.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
        break;
      case "date":
        inputElement = (
          <input
            type="date"
            name={fieldName}
            value={value ? value.split("T")[0] : ""}
            onChange={handleChange}
            className="w-full p-3 rounded-lg bg-gray-900/60 border border-gray-700 text-gray-200 focus:ring-2 focus:ring-yellow-400"
          />
        );
        break;
      case "number":
        inputElement = (
          <input
            type="number"
            name={fieldName}
            value={value}
            onChange={handleChange}
            min={config.validation?.min}
            max={config.validation?.max}
            step="1"
            className="w-full p-3 rounded-lg bg-gray-900/60 border border-gray-700 text-gray-200 focus:ring-2 focus:ring-yellow-400"
          />
        );
        break;
      case "textarea":
        inputElement = (
          <textarea
            name={fieldName}
            value={value}
            onChange={handleChange}
            rows="3"
            className="w-full p-3 rounded-lg bg-gray-900/60 border border-gray-700 text-gray-200 focus:ring-2 focus:ring-yellow-400"
          />
        );
        break;
      default:
        // text, email, etc.
        inputElement = (
          <input
            type={config.type || "text"}
            name={fieldName}
            value={value}
            onChange={handleChange}
            placeholder={config.ui?.placeholder}
            className="w-full p-3 rounded-lg bg-gray-900/60 border border-gray-700 text-gray-200 focus:ring-2 focus:ring-yellow-400"
          />
        );
    }

    return (
      <div key={fieldName}>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          {config.label}
        </label>
        {inputElement}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-yellow-300">Chargement...</div>
      </div>
    );
  }

  if (!formData || !permissions) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-400">Erreur : impossible de charger le formulaire</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-10 bg-gradient-to-br from-gray-900 to-gray-800 font-urbanist">
      <div className="w-full max-w-md bg-gray-800/80 backdrop-blur-xl border border-yellow-400/20 rounded-2xl shadow-xl p-8">
        <Title title="Modifier la cotisation" textColor="text-yellow-300" />
        <p className="text-gray-400 text-center mb-6">Année {formData.year}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Render fields dynamically in order */}
          {permissions.fields
            .sort(
              (a, b) =>
                (permissions.configs[a]?.ui?.order || 0) -
                (permissions.configs[b]?.ui?.order || 0)
            )
            .map((fieldName) => renderField(fieldName))}

          {message && (
            <p
              className={`text-sm text-center ${
                message.includes("✅") ? "text-green-400" : "text-red-400"
              }`}
            >
              {message}
            </p>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 rounded-lg font-semibold bg-yellow-400 text-gray-900 hover:bg-yellow-500 transition disabled:opacity-50"
            >
              {submitting ? "Enregistrement..." : "Enregistrer"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/dash/allCotisations")}
              className="flex-1 py-3 rounded-lg font-semibold bg-gray-700 text-gray-300 hover:bg-gray-600 transition"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}