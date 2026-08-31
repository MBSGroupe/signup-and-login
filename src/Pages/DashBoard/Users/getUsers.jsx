import { useContext, useEffect, useState, useRef } from "react";
import { UserDataContext } from '../../../Context/userDataCont';
import { UserContext } from '../../../Context/dataCont';
import { useError } from '../../../Context/ErrorContext';
import { useModal } from '../../../Context/ModalContext';
import { SearchBarContext } from "../../../Context/searchContext";
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  User,
  Shield,
  Calendar,
  Plus,
  Download,
  Filter,
  Eye,
  Edit,
  FileText,
  Printer,
  Trash2,
  UserCheck,
  BarChart3,
  Loader2
} from "lucide-react";
import { fetchWithRefresh } from '../../../Components/api';
import UserDetailsModal from '../../../Components/Modals/userDetailsModal';
import PDFPreviewModal from '../../../Components/Modals/pdfPreviexModal';
import { useNavigate } from 'react-router-dom';
import wilayasData from '../../../assets/data/wilayas.json';   // static Wilaya list


const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

// ─────────────────────────────────────────────────
//  Static lists for filter dropdowns
// ─────────────────────────────────────────────────
const SEXE_OPTIONS = ['M', 'F'];
const CIVILITY_OPTIONS = ['Mr', 'Mme', 'Mlle'];
const MARITAL_STATUS_OPTIONS = ['Célibataire', 'Marié(e)', 'Divorcé(e)', 'Veuf(ve)'];
const DIPLOMA_TYPE_OPTIONS = ['Classique', 'LMD'];
const REGISTRATION_STATUS_OPTIONS = ['Inscrit', 'Radié', 'Suspendu'];
const PROFESSIONAL_MODE_OPTIONS = ['Libéral', 'Associé', 'Salarié'];
const SERVICE_NATIONAL_OPTIONS = ['Ayant effectué', 'Exempté', 'En cours', 'Non concerné'];
const STATUS_OPTIONS = ['pending', 'active', 'suspended', 'archived'];
// Professions and regions remain dynamic (you can hardcode them if needed)

export default function GetUsers({ mode }) {
  const { data, setData } = useContext(UserDataContext);
  const { authData, setAuthData } = useContext(UserContext);
  const { keyWord, handleChange } = useContext(SearchBarContext);
  const { showError, showWarning, showSuccess } = useError();
  const { confirm, alert } = useModal();
  const navigate = useNavigate();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Filter states – all start at "all"
  const [selectedSexe, setSelectedSexe] = useState("all");
  const [selectedWilaya, setSelectedWilaya] = useState("all");
  const [selectedProfession, setSelectedProfession] = useState("all");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedCivility, setSelectedCivility] = useState("all");
  const [selectedMaritalStatus, setSelectedMaritalStatus] = useState("all");
  const [selectedDiplomaType, setSelectedDiplomaType] = useState("all");
  const [selectedRegistrationStatus, setSelectedRegistrationStatus] = useState("all");
  const [selectedProfessionalMode, setSelectedProfessionalMode] = useState("all");
  const [selectedServiceNational, setSelectedServiceNational] = useState("all");

  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [displayedUsers, setDisplayedUsers] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRefs = useRef({});

  // PDF Preview state
  const [pdfPreview, setPdfPreview] = useState({
    isOpen: false,
    type: 'situation',
    data: null,
  });

  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Fetch users with pagination and filters
  const fetchUsers = async () => {
    if (!authData?.token) return;
    
    setIsLoading(true);
    
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage);
      params.append('limit', pageSize);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      if (mode && mode !== 'all') {
        params.append('mode', mode);
      }
      
      if (keyWord) params.append('search', keyWord);
      if (selectedSexe !== 'all') params.append('sexe', selectedSexe);
      if (selectedWilaya !== 'all') params.append('wilaya', selectedWilaya);
      if (selectedProfession !== 'all') params.append('profession', selectedProfession);
      if (selectedRegion !== 'all') params.append('region', selectedRegion);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      if (selectedCivility !== 'all') params.append('civility', selectedCivility);
      if (selectedMaritalStatus !== 'all') params.append('maritalStatus', selectedMaritalStatus);
      if (selectedDiplomaType !== 'all') params.append('diplomaType', selectedDiplomaType);
      if (selectedRegistrationStatus !== 'all') params.append('registrationStatus', selectedRegistrationStatus);
      if (selectedProfessionalMode !== 'all') params.append('professionalMode', selectedProfessionalMode);
      if (selectedServiceNational !== 'all') params.append('serviceNationalStatus', selectedServiceNational);

      const response = await fetch(`${NEST_API_URL}/users?${params.toString()}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${authData.token}` },
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const results = await response.json();
      
      let usersArray = [];
      let pagination = {};
      
      if (results.data && results.data.data) {
        usersArray = results.data.data;
        pagination = results.data.pagination;
      } else if (results.data && Array.isArray(results.data)) {
        usersArray = results.data;
        pagination = results.pagination || {};
      } else if (results.users) {
        usersArray = results.users;
        pagination = results.pagination || {};
      }
      
      setDisplayedUsers(usersArray);
      setTotalUsers(pagination.total || usersArray.length);
      setTotalPages(pagination.totalPages || Math.ceil((pagination.total || usersArray.length) / pageSize));
      setData(usersArray);
      
    } catch (error) {
      console.error("Error fetching users:", error);
      showError("Failed to load users. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuId !== null) {
        const menuElement = menuRefs.current[openMenuId];
        if (menuElement && !menuElement.contains(event.target)) {
          setOpenMenuId(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  // Fetch on dependency changes
  useEffect(() => {
    if (authData?.token) {
      fetchUsers();
    }
  }, [
    authData.token, 
    currentPage, 
    pageSize, 
    keyWord,
    selectedSexe,
    selectedWilaya,
    selectedProfession,
    selectedRegion,
    selectedStatus,
    selectedCivility,
    selectedMaritalStatus,
    selectedDiplomaType,
    selectedRegistrationStatus,
    selectedProfessionalMode,
    selectedServiceNational,
    sortBy,
    sortOrder,
    mode
  ]);

  // No longer compute unique values from displayedUsers – use static arrays instead

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const toggleMenu = (userId, event) => {
    event.stopPropagation();
    setOpenMenuId(openMenuId === userId ? null : userId);
  };

  const handleEditUser = (user) => {
    setOpenMenuId(null);
    navigate(`/auth/update/${user.id}`);
  };

  const handleViewDetails = (user) => {
    setOpenMenuId(null);
    handleUserClick(user);
  };

  const handlePrintSituation = async (user) => {
    setOpenMenuId(null);
    
    try {
      const response = await fetch(`${NEST_API_URL}/pdf/preview/situation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authData.token}`,
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to generate preview';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (_) {}
        showError(errorMessage);
        return;
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      setPdfPreview({
        isOpen: true,
        type: 'situation',
        data: {
          blobUrl,
          memberName: `${user.name} ${user.lastname}`,
        },
      });

      showSuccess('Aperçu généré avec succès!');
    } catch (error) {
      console.error('❌ Preview error:', error);
      showError('Network error. Please check your connection.');
    }
  };

  const handlePrintReceipt = (user) => {
    setOpenMenuId(null);
    navigate(`/dash/adminUser/${user.id}`);
  };

  const handleValidateUser = async (user) => {
    setOpenMenuId(null);
    
    try {
      const response = await fetch(`${NEST_API_URL}/users/${user.id}/validate`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authData.token}` },
      });
      
      const data = await response.json();

      if (!response.ok) {
        showError(data.message || 'Failed to validate user');
        return;
      }

      if (data.success) {
        showSuccess('User validated successfully!');
        fetchUsers();
      } else {
        showWarning(data.message || 'Failed to validate user');
      }
    } catch (error) {
      console.error('Error validating user:', error);
      showError('Network error. Please check your connection.');
    }
  };

  const handleDeleteUser = async (user) => {
    setOpenMenuId(null);
    
    const confirmed = await confirm({
      title: 'Delete User',
      message: `Are you sure you want to delete ${user.name} ${user.lastname}? This action cannot be undone.`
    });

    if (confirmed) {
      try {
        const response = await fetch(`${NEST_API_URL}/users/${user.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${authData.token}` },
        });
        
        const data = await response.json();

        if (!response.ok) {
          showError(data.message || 'Failed to delete user');
          return;
        }

        if (data.success) {
          showSuccess('User deleted successfully!');
          fetchUsers();
        } else {
          showWarning(data.message || 'Failed to delete user');
        }
      } catch (error) {
        console.error('Error deleting user:', error);
        showError('Network error. Please check your connection.');
      }
    }
  };

  const titleText = mode === "membres" ? "Gestion des Membres" : "Gestion des Utilisateurs (Admin)";
  const searchPlaceholder = mode === "membres"
    ? "Rechercher un membre par nom, prénom, email, N° inscription..."
    : "Rechercher un admin par nom, prénom, email...";

  const resetFilters = () => {
    setSelectedSexe("all");
    setSelectedWilaya("all");
    setSelectedProfession("all");
    setSelectedRegion("all");
    setSelectedStatus("all");
    setSelectedCivility("all");
    setSelectedMaritalStatus("all");
    setSelectedDiplomaType("all");
    setSelectedRegistrationStatus("all");
    setSelectedProfessionalMode("all");
    setSelectedServiceNational("all");
    setSortBy('createdAt');
    setSortOrder('desc');
    setCurrentPage(1);
    handleChange({ target: { name: "search", value: "" } });
  };

  const activeFilterCount = [
    selectedSexe, selectedWilaya, selectedProfession, 
    selectedRegion, selectedStatus, selectedCivility, selectedMaritalStatus,
    selectedDiplomaType, selectedRegistrationStatus, selectedProfessionalMode,
    selectedServiceNational
  ].filter(f => f !== "all").length;

  // Pagination controls
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToPreviousPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  // Quick action handlers
  const handleAddMember = () => {
    navigate('/dash/createUser');
  };

  const handleExport = () => {
    showSuccess('Export feature coming soon');
  };

  return (
    <div className="min-h-screen ml-[30px] mt-16 bg-[#0A0F1C] text-[#F8FAFC] font-sans antialiased p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* ===== HEADER / ACCOUNT SUMMARY ===== */}
        <div className="bg-[#111827] rounded-2xl p-6 md:p-8 border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-emerald-500/20">
                {authData?.user?.name?.charAt(0) || 'A'}
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-[#F8FAFC] tracking-tight">
                  {authData?.user?.name || 'Admin'} {authData?.user?.lastname || ''}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Shield className="w-3 h-3 mr-1" />
                    {authData?.user?.role || 'Administrator'}
                  </span>
                  <span className="text-sm text-[#94A3B8] flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    ID: {authData?.user?.id || 'N/A'}
                  </span>
                  <span className="text-sm text-[#94A3B8] flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Member since {new Date(authData?.user?.createdAt).getFullYear() || '2024'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== QUICK ACTIONS ===== */}
        <div className="mt-6 flex flex-wrap gap-3">
          <button 
            onClick={handleAddMember}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-all duration-200 shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            Add Member
          </button>
          <button 
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#182233] hover:bg-[#1F2937] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] transition-all duration-200"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-200 ${
              showFilters || activeFilterCount > 0
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-[#182233] hover:bg-[#1F2937] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)]'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 bg-emerald-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button 
            onClick={resetFilters}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all duration-200"
          >
            <X className="w-4 h-4" />
            Reset
          </button>
        </div>

        {/* ===== SEARCH & FILTERS PANEL ===== */}
        <div className="mt-6 flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="text"
              name="search"
              onChange={handleChange}
              value={keyWord}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#111827] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
            />
          </div>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-4 py-2.5 rounded-xl bg-[#111827] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="10">10 / page</option>
            <option value="20">20 / page</option>
            <option value="50">50 / page</option>
            <option value="100">100 / page</option>
          </select>
        </div>

        {showFilters && (
          <div className="mt-4 p-5 bg-[#111827] rounded-xl border border-[rgba(255,255,255,0.06)] shadow-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Sexe */}
              {SEXE_OPTIONS.length > 0 && (
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#64748B] mb-1.5">Sexe</label>
                  <select
                    value={selectedSexe}
                    onChange={(e) => { setSelectedSexe(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="all">Tous les sexes</option>
                    {SEXE_OPTIONS.map(s => (
                      <option key={s} value={s}>{s === 'M' ? 'Homme' : 'Femme'}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Wilaya (CLOA) */}
              {wilayasData.length > 0 && (
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#64748B] mb-1.5">CLOA</label>
                  <select
                    value={selectedWilaya}
                    onChange={(e) => { setSelectedWilaya(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="all">Toutes les CLOA</option>
                    {wilayasData.map(w => (
                      <option key={w.code} value={w.code}>
                        {w.code} - {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Profession – keep dynamic for now, or replace with static if desired */}
              {/* Keeping dynamic for profession (unchanged) */}
              {/* ... same for region ... */}

              {/* Civility */}
              {CIVILITY_OPTIONS.length > 0 && (
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#64748B] mb-1.5">Civilité</label>
                  <select
                    value={selectedCivility}
                    onChange={(e) => { setSelectedCivility(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="all">Toutes les civilités</option>
                    {CIVILITY_OPTIONS.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Marital Status */}
              {MARITAL_STATUS_OPTIONS.length > 0 && (
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#64748B] mb-1.5">Situation Familiale</label>
                  <select
                    value={selectedMaritalStatus}
                    onChange={(e) => { setSelectedMaritalStatus(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="all">Toutes les situations</option>
                    {MARITAL_STATUS_OPTIONS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Diploma Type */}
              {DIPLOMA_TYPE_OPTIONS.length > 0 && (
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#64748B] mb-1.5">Type de Diplôme</label>
                  <select
                    value={selectedDiplomaType}
                    onChange={(e) => { setSelectedDiplomaType(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="all">Tous les types</option>
                    {DIPLOMA_TYPE_OPTIONS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Registration Status */}
              {REGISTRATION_STATUS_OPTIONS.length > 0 && (
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#64748B] mb-1.5">Statut d'inscription</label>
                  <select
                    value={selectedRegistrationStatus}
                    onChange={(e) => { setSelectedRegistrationStatus(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="all">Tous les statuts</option>
                    {REGISTRATION_STATUS_OPTIONS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Professional Mode */}
              {PROFESSIONAL_MODE_OPTIONS.length > 0 && (
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#64748B] mb-1.5">Mode d'exercice</label>
                  <select
                    value={selectedProfessionalMode}
                    onChange={(e) => { setSelectedProfessionalMode(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="all">Tous les modes</option>
                    {PROFESSIONAL_MODE_OPTIONS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Service National */}
              {SERVICE_NATIONAL_OPTIONS.length > 0 && (
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#64748B] mb-1.5">Service National</label>
                  <select
                    value={selectedServiceNational}
                    onChange={(e) => { setSelectedServiceNational(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="all">Toutes les situations</option>
                    {SERVICE_NATIONAL_OPTIONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status */}
              {STATUS_OPTIONS.length > 0 && (
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#64748B] mb-1.5">Statut</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2 rounded-lg bg-[#0A0F1C] border border-[rgba(255,255,255,0.06)] text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="all">Tous les statuts</option>
                    {STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== DATA TABLE ===== */}
        <div className="mt-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            </div>
          ) : (
            <>
              <div className="bg-[#111827] rounded-xl border border-[rgba(255,255,255,0.06)] overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead>
                      <tr className="border-b border-[rgba(255,255,255,0.06)]">
                        <th 
                          className="py-4 px-6 text-left text-xs uppercase tracking-wider text-[#64748B] font-semibold cursor-pointer hover:text-[#F8FAFC] transition"
                          onClick={() => {
                            setSortBy('name');
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                            setCurrentPage(1);
                          }}
                        >
                          Nom {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          className="py-4 px-6 text-left text-xs uppercase tracking-wider text-[#64748B] font-semibold cursor-pointer hover:text-[#F8FAFC] transition"
                          onClick={() => {
                            setSortBy('lastname');
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                            setCurrentPage(1);
                          }}
                        >
                          Prénom {sortBy === 'lastname' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="py-4 px-6 text-left text-xs uppercase tracking-wider text-[#64748B] font-semibold">Email</th>
                        <th className="py-4 px-6 text-left text-xs uppercase tracking-wider text-[#64748B] font-semibold">Profession</th>
                        <th className="py-4 px-6 text-left text-xs uppercase tracking-wider text-[#64748B] font-semibold">CLOA</th>
                        <th className="py-4 px-6 text-left text-xs uppercase tracking-wider text-[#64748B] font-semibold">Rôle</th>
                        <th className="py-4 px-6 text-left text-xs uppercase tracking-wider text-[#64748B] font-semibold">Statut</th>
                        <th className="py-4 px-6 text-right text-xs uppercase tracking-wider text-[#64748B] font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedUsers.length > 0 ? (
                        displayedUsers.map((user) => (
                          <tr 
                            key={user.id || user._id} 
                            className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[#1F2937]/30 transition-colors group"
                          >
                            <td className="py-3 px-6 text-[#F8FAFC] font-medium">{user.name || '-'}</td>
                            <td className="py-3 px-6 text-[#F8FAFC]">{user.lastname || '-'}</td>
                            <td className="py-3 px-6 text-[#94A3B8] truncate max-w-[150px]">{user.email || '-'}</td>
                            <td className="py-3 px-6 text-[#F8FAFC]">{user.profession || '-'}</td>
                            <td className="py-3 px-6 text-[#F8FAFC]">{user.wilaya || '-'}</td>
                            <td className="py-3 px-6">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                user.role === 'admin' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                user.role === 'super_admin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              }`}>
                                {user.role || 'user'}
                              </span>
                            </td>
                            <td className="py-3 px-6">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                user.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                user.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                                'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                              }`}>
                                {user.status || 'inconnu'}
                              </span>
                            </td>
                            <td className="py-3 px-6 text-right">
                              <div className="relative" ref={el => menuRefs.current[user.id] = el}>
                                <button
                                  onClick={(e) => toggleMenu(user.id, e)}
                                  className="p-1.5 rounded-lg hover:bg-[#1F2937] transition-colors"
                                >
                                  <MoreVertical className="w-5 h-5 text-[#64748B] group-hover:text-[#F8FAFC]" />
                                </button>
                                
                                {openMenuId === user.id && (
                                  <div className="absolute right-0 mt-2 w-56 bg-[#182233] border border-[rgba(255,255,255,0.06)] rounded-xl shadow-2xl z-50 py-1 overflow-hidden">
                                    <button
                                      onClick={() => handleViewDetails(user)}
                                      className="w-full px-4 py-2.5 text-left text-[#F8FAFC] hover:bg-[#1F2937] transition-colors flex items-center gap-3 text-sm"
                                    >
                                      <Eye className="w-4 h-4 text-[#64748B]" />
                                      Détails
                                    </button>
                                    <button
                                      onClick={() => handleEditUser(user)}
                                      className="w-full px-4 py-2.5 text-left text-[#F8FAFC] hover:bg-[#1F2937] transition-colors flex items-center gap-3 text-sm"
                                    >
                                      <Edit className="w-4 h-4 text-[#64748B]" />
                                      Modifier
                                    </button>
                                    <div className="border-t border-[rgba(255,255,255,0.06)] my-1"></div>
                                    <button
                                      onClick={() => handlePrintSituation(user)}
                                      className="w-full px-4 py-2.5 text-left text-[#F8FAFC] hover:bg-[#1F2937] transition-colors flex items-center gap-3 text-sm"
                                    >
                                      <FileText className="w-4 h-4 text-[#64748B]" />
                                      Situation du membre
                                    </button>
                                    <button
                                      onClick={() => handlePrintReceipt(user)}
                                      className="w-full px-4 py-2.5 text-left text-[#F8FAFC] hover:bg-[#1F2937] transition-colors flex items-center gap-3 text-sm"
                                    >
                                      <Printer className="w-4 h-4 text-[#64748B]" />
                                      Imprimer un reçu
                                    </button>
                                    <div className="border-t border-[rgba(255,255,255,0.06)] my-1"></div>
                                    {!user.isAdminVerified && (
                                      <button
                                        onClick={() => handleValidateUser(user)}
                                        className="w-full px-4 py-2.5 text-left text-[#F8FAFC] hover:bg-[#1F2937] transition-colors flex items-center gap-3 text-sm"
                                      >
                                        <UserCheck className="w-4 h-4 text-emerald-400" />
                                        Valider le compte
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        navigate(`/dash/adminUser/${user.id}`);
                                      }}
                                      className="w-full px-4 py-2.5 text-left text-[#F8FAFC] hover:bg-[#1F2937] transition-colors flex items-center gap-3 text-sm"
                                    >
                                      <BarChart3 className="w-4 h-4 text-[#64748B]" />
                                      Profil complet
                                    </button>
                                    <button
                                      onClick={() => handleDeleteUser(user)}
                                      className="w-full px-4 py-2.5 text-left text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-3 text-sm border-t border-[rgba(255,255,255,0.06)] mt-1 pt-1"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Supprimer
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" className="text-center py-12 text-[#64748B]">
                            Aucun utilisateur trouvé avec ces critères
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ===== PAGINATION ===== */}
              {totalPages > 1 && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-[#64748B]">
                    Affichage de {(currentPage - 1) * pageSize + 1} à {Math.min(currentPage * pageSize, totalUsers)} sur {totalUsers} utilisateurs
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                      className={`p-2 rounded-lg transition ${
                        currentPage === 1 
                          ? 'bg-[#111827] text-[#64748B] cursor-not-allowed opacity-50' 
                          : 'bg-[#111827] text-[#F8FAFC] hover:bg-[#1F2937] border border-[rgba(255,255,255,0.06)]'
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    {getPageNumbers().map(page => (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`px-4 py-2 rounded-lg transition ${
                          currentPage === page
                            ? 'bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-500/20'
                            : 'bg-[#111827] text-[#F8FAFC] hover:bg-[#1F2937] border border-[rgba(255,255,255,0.06)]'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    
                    <button
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className={`p-2 rounded-lg transition ${
                        currentPage === totalPages 
                          ? 'bg-[#111827] text-[#64748B] cursor-not-allowed opacity-50' 
                          : 'bg-[#111827] text-[#F8FAFC] hover:bg-[#1F2937] border border-[rgba(255,255,255,0.06)]'
                      }`}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ===== MODALS ===== */}
      {pdfPreview.isOpen && (
        <PDFPreviewModal
          type={pdfPreview.type}
          data={pdfPreview.data}
          onClose={() => setPdfPreview({ isOpen: false, type: 'situation', data: null })}
          authData={authData}
        />
      )}

      {isModalOpen && selectedUser && (
        <UserDetailsModal user={selectedUser} onClose={closeModal} authToken={authData.token}/>
      )}
    </div>
  );
}