import { useContext, useEffect, useState } from "react";
import { UserContext } from "../../../Context/dataCont";
import Title from "../../../Components/Title";
import { SearchBarContext } from "../../../Context/searchContext";
import { IoSearchOutline } from "react-icons/io5";
import { fetchWithRefresh } from "../../../Components/api";
import EditFeeDefinitionModal from "../../../Components/Modals/EditFeeDefinitionModal";

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

export default function GetCotisations() {
  const { authData, setAuthData } = useContext(UserContext);
  const { keyWord, handleChange } = useContext(SearchBarContext);

  const [definitions, setDefinitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingDef, setEditingDef] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showInactive, setShowInactive] = useState(false);

  const fetchDefinitions = async () => {
    try {
      setLoading(true);
      const res = await fetchWithRefresh(
        `${NEST_API_URL}/fees/definitions`,
        { method: "GET" },
        authData.token,
        setAuthData
      );
      const data = await res.json();
      // Extract from wrapper: { success: true, data: [...] }
      const definitionsData = data.data || data;
      setDefinitions(Array.isArray(definitionsData) ? definitionsData : []);
    } catch (error) {
      console.error("Erreur lors du chargement des définitions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authData?.token) fetchDefinitions();
  }, [authData?.token]);

  const filteredDefinitions = definitions.filter((def) => {
    const searchLower = keyWord.toLowerCase();
    const matchesSearch =
      def.title?.toLowerCase().includes(searchLower) ||
      def.year?.toString().includes(searchLower) ||
      def.feeType?.toLowerCase().includes(searchLower) ||
      def.amount?.toString().includes(searchLower);
    if (!matchesSearch) return false;
    if (!showInactive && def.isActive === false) return false;
    return true;
  });

  const handleDelete = async (defId) => {
    try {
      const res = await fetchWithRefresh(
        `${NEST_API_URL}/fees/definitions/${defId}`,
        { method: "DELETE" },
        authData.token,
        setAuthData
      );
      if (res.ok) {
        await fetchDefinitions();
        setShowDeleteConfirm(null);
      } else {
        const err = await res.json();
        console.error(err);
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen ml-[80px] p-8 bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-yellow-300">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen ml-[80px] p-8 bg-gradient-to-br from-gray-900 to-gray-800 text-yellow-400 font-urbanist">
      <Title title="Gestion des campagnes de cotisation" />

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 mt-4">
        <div className="relative flex-1 max-w-md">
          <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            name="search"
            onChange={handleChange}
            value={keyWord}
            placeholder="Rechercher par titre, année, type, montant..."
            className="w-full pl-10 pr-4 py-2 rounded-xl outline-none text-yellow-300 placeholder-yellow-200/40
                       bg-gray-900/40 backdrop-blur-md border border-gray-700/40 shadow-lg"
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <span className="text-sm text-gray-300">Inactives</span>
          <div
            onClick={() => setShowInactive(!showInactive)}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
              showInactive ? 'bg-yellow-500' : 'bg-gray-600'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${
                showInactive ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </div>
        </label>
      </div>

      <p className="mb-4 text-gray-400">
        {filteredDefinitions.length} campagne(s) trouvée(s)
      </p>

      <div className="space-y-4">
        {filteredDefinitions.map((def) => (
          <div
            key={def.id}
            className={`bg-gray-800/60 backdrop-blur-sm border rounded-xl p-5 shadow-lg transition-all duration-300 ${
              def.isActive === false
                ? 'border-gray-600/50 opacity-80 hover:opacity-100'
                : 'border-yellow-400/20 hover:shadow-xl'
            }`}
          >
            <div className="flex flex-wrap justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-xl font-semibold text-yellow-300">{def.title}</h3>
                  {def.isActive === false && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-gray-700 text-gray-300 rounded-full">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                  <div>
                    <span className="text-gray-400">Année :</span>
                    <span className="ml-2 font-mono">{def.year}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Type :</span>
                    <span className="ml-2 capitalize">{def.feeType}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Montant :</span>
                    <span className="ml-2 font-mono text-green-400">{def.amount} DA</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Échéance :</span>
                    <span className="ml-2">{new Date(def.dueDate).toLocaleDateString("fr-FR")}</span>
                  </div>
                </div>
                {def.notes && (
                  <div className="mt-2 text-gray-400 text-sm italic">{def.notes}</div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingDef(def)}
                  className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
                >
                  Modifier
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(def.id)}
                  className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        ))}
        {filteredDefinitions.length === 0 && (
          <p className="text-center text-gray-400 py-8">Aucune campagne trouvée.</p>
        )}
      </div>

      {editingDef && (
        <EditFeeDefinitionModal
          definition={editingDef}
          onClose={() => setEditingDef(null)}
          onUpdated={fetchDefinitions}
        />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-800 rounded-xl p-6 w-96 border border-red-400/30 shadow-2xl">
            <h3 className="text-xl font-bold text-red-300 mb-4">Confirmer la suppression</h3>
            <p className="text-gray-300 mb-4">
              Cette action annulera la campagne et toutes les cotisations individuelles associées (ainsi que les paiements liés). Êtes-vous sûr ?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 rounded hover:bg-red-500"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}