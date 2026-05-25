import { useContext, useEffect, useState } from "react";
import DataCards from "../../../Components/Cards/DataCards";
import { UserDataContext } from '../../../Context/userDataCont';
import { UserContext } from '../../../Context/dataCont';
import Title from '../../../Components/Title';
import { SearchBarContext } from "../../../Context/searchContext";
import { IoSearchOutline } from "react-icons/io5";
import { fetchWithRefresh } from '../../../Components/api';

export default function GetUsers({ mode }) { // mode: "membres" or "users"
  const API_URL = import.meta.env.VITE_API_URL;
  const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;
  const { data, setData } = useContext(UserDataContext);
  const { authData, setAuthData } = useContext(UserContext);
  const { keyWord, handleChange } = useContext(SearchBarContext);

  // États pour les filtres supplémentaires
  const [selectedSexe, setSelectedSexe] = useState("all");
  const [selectedWilaya, setSelectedWilaya] = useState("all");
  const [selectedProfession, setSelectedProfession] = useState("all");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedRegion, setSelectedRegion] = useState("all");
  // useEffect(() => {
  //   if (!authData?.token) return;

  //   const getElements = async () => {
  //     try {
  //       const response = await fetchWithRefresh(
  //         `${NEST_API_URL}/users/`,
  //         { method: "GET" },
  //         authData.token,
  //         setAuthData
  //       );
  //       const results = await response.json();
  //       console.log(results)
  //       setData(results);
  //     } catch (error) {
  //       console.error("Error fetching users:", error);
  //     }
  //   };

  //   getElements();
  // }, [authData.token, setAuthData]);

  useEffect(() => {
  if (!authData?.token) return;

  const getElements = async () => {
    try {
      const response = await fetch(`${NEST_API_URL}/users/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authData.token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const results = await response.json();
      setData(results);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  getElements();
}, [authData.token]); // setAuthData no longer needed

  // Extraire les valeurs uniques pour les filtres
  const users = data?.users || [];
  const uniqueSexes = [...new Set(users.map(u => u.Sexe).filter(Boolean))];
  const uniqueWilayas = [...new Set(users.map(u => u.wilaya).filter(Boolean))].sort();
  const uniqueProfessions = [...new Set(users.map(u => u.profession).filter(Boolean))].sort();
  const uniqueRoles = [...new Set(users.map(u => u.role).filter(Boolean))];
  const uniqueRegions = [...new Set(users.map(u => u.Region).filter(Boolean))].sort();
  const searchableFields = ["name", "lastname", "email"];

  // Filtrage combiné
  const displayedUsers = users.filter((user) => {
    // Filtre par mode
    if (mode === "membres" && user.role !== "user") return false;
    if (mode === "users" && user.role !== "admin" && user.role !== "super_admin") return false;

    // Filtre par mot‑clé
    const matchesSearch = searchableFields.some((field) =>
      String(user[field] || "").toLowerCase().includes(keyWord.toLowerCase())
    );
    if (!matchesSearch) return false;

    // Filtre par sexe
    if (selectedSexe !== "all" && user.Sexe !== selectedSexe) return false;
    

    // Filtre par wilaya
    if (selectedWilaya !== "all" && user.wilaya !== selectedWilaya) return false;

    // Filtre par profession
    if (selectedProfession !== "all" && user.profession !== selectedProfession) return false;
    // Filtre par role
    if (selectedRole !== "all" && user.role !== selectedRole) return false;

    // Filtre par region
    if (selectedRegion !== "all" && user.Region !== selectedRegion) return false;
    return true;
  });

  const titleText = mode === "membres" ? "Gestion des Membres" : "Gestion des Utilisateurs (Admin)";
  const searchPlaceholder = mode === "membres"
    ? "Rechercher un membre par nom, prénom, email..."
    : "Rechercher un admin par nom, prénom, email...";

  // Réinitialiser tous les filtres
    const resetFilters = () => {
      setSelectedSexe("all");
      setSelectedWilaya("all");
      setSelectedProfession("all");
      setSelectedRole("all");
      setSelectedRegion("all");
      handleChange({ target: { name: "search", value: "" } });
    };

  return (
    <div className="UsersPage min-h-screen ml-[80px] p-8 bg-gradient-to-br from-gray-900 to-gray-800 text-yellow-400 font-urbanist">

      <Title title={titleText} />

      {/* Barre de recherche et filtres */}
      <div className="relative mb-6 mt-4 flex flex-wrap items-center gap-3">
        <IoSearchOutline size={22} className="text-yellow-300" />
        <input
          type="text"
          name="search"
          onChange={handleChange}
          value={keyWord}
          placeholder={searchPlaceholder}
          className="w-64 px-4 py-2 rounded-xl outline-none text-yellow-300 placeholder-yellow-200/40
                     bg-gray-900/40 backdrop-blur-md border border-gray-700/40 shadow-lg shadow-black/30 transition-all animate-fadeIn"
        />

        {/* Filtre par sexe */}
        {uniqueSexes.length > 0 && (
          <select
            value={selectedSexe}
            onChange={(e) => setSelectedSexe(e.target.value)}
            className="px-4 py-2 rounded-xl bg-gray-900/40 backdrop-blur-md text-yellow-300 border border-gray-700/40 shadow-lg outline-none"
          >
            <option value="all">Tous sexes</option>
            {uniqueSexes.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}

        {/* Filtre par wilaya */}
        {uniqueWilayas.length > 0 && (
          <select
            value={selectedWilaya}
            onChange={(e) => setSelectedWilaya(e.target.value)}
            className="px-4 py-2 rounded-xl bg-gray-900/40 backdrop-blur-md text-yellow-300 border border-gray-700/40 shadow-lg outline-none"
          >
            <option value="all">Toutes wilayas</option>
            {uniqueWilayas.map(w => (
              <option key={w} value={w}>Wilaya {w}</option>
            ))}
          </select>
        )}

        {/* Filtre par profession */}
        {/* {uniqueProfessions.length > 0 && (
          <select
            value={selectedProfession}
            onChange={(e) => setSelectedProfession(e.target.value)}
            className="px-4 py-2 rounded-xl bg-gray-900/40 backdrop-blur-md text-yellow-300 border border-gray-700/40 shadow-lg outline-none"
          >
            <option value="all">Toutes professions</option>
            {uniqueProfessions.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        )} */}
        {/* Filtre par role */}
        {uniqueRoles.length > 0 && mode==="users" && (
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-4 py-2 rounded-xl bg-gray-900/40 backdrop-blur-md text-yellow-300 border border-gray-700/40 shadow-lg outline-none"
          >
            <option value="all">Tous les rôles</option>
            {uniqueRoles.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        )}
        {/* Filtre par region */}
        {uniqueRegions.length > 0 && (
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="px-4 py-2 rounded-xl bg-gray-900/40 backdrop-blur-md text-yellow-300 border border-gray-700/40 shadow-lg outline-none"
            >
              <option value="all">Toutes régions</option>
              {uniqueRegions.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          )}
        {/* Bouton de réinitialisation */}
        <button
          onClick={resetFilters}
          className="px-4 py-2 rounded-xl bg-yellow-400 text-gray-900 font-semibold hover:bg-yellow-300 transition"
        >
          Réinitialiser
        </button>
      </div>

      {/* Compteur de résultats */}
      <p className="mb-4 text-gray-400">
        {displayedUsers.length} utilisateur(s) trouvé(s)
      </p>

      {/* Cartes utilisateur */}
      <div className="CardsContainer grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedUsers.map((item) => (
          <DataCards key={item._id || item.id } userItem={item} />
        ))}
      </div>
    </div>
  );
}