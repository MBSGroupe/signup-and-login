import { useContext, useEffect, useState } from "react";
import { UserContext } from "../../../Context/dataCont";
import Title from "../../../Components/Title";
import { SearchBarContext } from "../../../Context/searchContext";
import { fetchWithRefresh } from "../../../Components/api";
import EditFeeDefinitionModal from "../../../Components/Modals/EditFeeDefinitionModal";
import {
  Search,
  X,
  Edit,
  Trash2,
  Plus,
  Filter,
  ChevronDown,
  ChevronUp,
  Calendar,
  Tag,
  DollarSign,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle
} from "lucide-react";

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
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center ml-[30px] mt-16">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
          <p className="text-[#94A3B8] text-sm">Chargement des campagnes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1C] p-6 md:p-8 ml-[30px] mt-16">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Tag className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#F8FAFC] tracking-tight">
              Gestion des campagnes de cotisation
            </h1>
            <p className="text-[#94A3B8] text-sm mt-1">
              {filteredDefinitions.length} campagne{filteredDefinitions.length > 1 ? 's' : ''} trouvée{filteredDefinitions.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Search and filter bar */}
        <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-4 mb-6 shadow-lg flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="text"
              name="search"
              onChange={handleChange}
              value={keyWord}
              placeholder="Rechercher par titre, année, type, montant..."
              className="w-full pl-9 pr-4 py-2.5 bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] rounded-xl text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none text-sm text-[#94A3B8]">
            <span>Inactives</span>
            <div
              onClick={() => setShowInactive(!showInactive)}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                showInactive ? 'bg-emerald-500' : 'bg-[#1F2937]'
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

        {/* Campaign list */}
        <div className="space-y-4">
          {filteredDefinitions.length === 0 ? (
            <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] p-12 text-center shadow-2xl shadow-black/50">
              <Tag className="w-12 h-12 text-[#64748B] opacity-30 mx-auto mb-4" />
              <p className="text-[#94A3B8] text-lg font-medium">Aucune campagne trouvée</p>
              <p className="text-[#64748B] text-sm mt-1">Modifiez les filtres ou créez une nouvelle campagne.</p>
            </div>
          ) : (
            filteredDefinitions.map((def) => (
              <div
                key={def.id}
                className={`bg-[#111827] rounded-2xl border transition-all duration-200 shadow-lg hover:border-[rgba(255,255,255,0.12)] ${
                  def.isActive === false
                    ? 'border-[rgba(255,255,255,0.06)] opacity-70 hover:opacity-100'
                    : 'border-emerald-500/20'
                }`}
              >
                <div className="p-5 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-[#F8FAFC]">{def.title}</h3>
                      {def.isActive === false && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border border-gray-500/20 bg-gray-500/10 text-gray-400">
                          <EyeOff className="w-3 h-3" />
                          Inactive
                        </span>
                      )}
                      {def.isActive && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-[#64748B]" />
                        <span className="text-[#94A3B8]">Année :</span>
                        <span className="text-[#F8FAFC] font-mono">{def.year}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Tag className="w-4 h-4 text-[#64748B]" />
                        <span className="text-[#94A3B8]">Type :</span>
                        <span className="text-[#F8FAFC] capitalize">{def.feeType}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                        <span className="text-[#94A3B8]">Montant :</span>
                        <span className="text-emerald-400 font-mono font-medium">{def.amount} DA</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-[#64748B]" />
                        <span className="text-[#94A3B8]">Échéance : 
                        {new Date(def.dueDate).toLocaleDateString("fr-FR")}</span>
                      </div>
                    </div>
                    {def.notes && (
                      <div className="mt-2 text-sm text-[#94A3B8] italic border-t border-[rgba(255,255,255,0.06)] pt-2">
                        {def.notes}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setEditingDef(def)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-all text-sm font-medium"
                    >
                      <Edit className="w-4 h-4" />
                      Modifier
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(def.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition-all text-sm font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingDef && (
        <EditFeeDefinitionModal
          definition={editingDef}
          onClose={() => setEditingDef(null)}
          onUpdated={fetchDefinitions}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50 p-6 max-w-md w-full mx-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertCircle className="w-6 h-6 text-rose-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[#F8FAFC]">Confirmer la suppression</h3>
                <p className="text-sm text-[#94A3B8] mt-2 leading-relaxed">
                  Cette action annulera la campagne et toutes les cotisations individuelles associées (ainsi que les paiements liés). Êtes-vous sûr ?
                </p>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="px-5 py-2.5 text-sm font-medium text-[#94A3B8] bg-[#1F2937] hover:bg-[#182233] rounded-xl transition-all duration-200 border border-[rgba(255,255,255,0.06)]"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => handleDelete(showDeleteConfirm)}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-all duration-200 shadow-lg shadow-rose-500/20"
                  >
                    Confirmer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}