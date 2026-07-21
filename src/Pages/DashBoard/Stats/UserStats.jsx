// UserStats.jsx
import { useContext, useEffect, useState } from 'react';
import { UserContext } from '../../../Context/dataCont';
import Title from '../../../Components/Title';
import { fetchWithRefresh } from '../../../Components/api';
import {
  IoPerson,
  IoPeople,
  IoCalendar,
  IoCheckmarkCircle,
  IoTime,
  IoStatsChart,
  IoLocation,
  IoBriefcase,
  IoMale,
  IoFemale,
  IoDocumentText,
  IoShield,
  IoMedal,
  IoWallet,
  IoTrendingUp,
  IoTrendingDown,
  IoAlertCircle,
} from 'react-icons/io5';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';

const API_URL = import.meta.env.VITE_NEST_API_URL;

// Colors for charts - Banking theme (emerald, teal, blue, etc.)
const CHART_COLORS = ['#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#6b7280', '#06b6d4'];
const CHART_PIE = ['#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#6b7280', '#06b6d4'];

export default function UserStats() {
  const { authData, setAuthData } = useContext(UserContext);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetchWithRefresh(
          `${API_URL}/users/stats`,
          { method: 'GET' },
          authData.token,
          setAuthData
        );
        const responseData = await res.json();
        if (res.ok && responseData.success !== false) {
          const data = responseData.data || responseData;
          setStats(data);
        } else {
          setError(responseData.message || responseData.data?.message || 'Impossible de charger les statistiques');
        }
      } catch (err) {
        console.error(err);
        setError('Erreur réseau');
      } finally {
        setLoading(false);
      }
    };
    if (authData?.token) fetchStats();
  }, [authData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-[#64748B] text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] p-8 flex items-center justify-center">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  const {
    totalUsers,
    activeUsers,
    inactiveUsers,
    newUsersToday,
    newUsersLast7Days,
    newUsersLast30Days,
    byRole = [],
    byStatus = [],
    byWilaya = [],
    byProfession = [],
    bySexe = [],
    byVerification,
    byCivility = [],
    byMaritalStatus = [],
    byNationality = [],
    byServiceNationalStatus = [],
    byProfessionalMode = [],
    byDiplomaType = [],
    byRegistrationStatus = [],
    byBenefitStateAid = [],
    byIsAccredited = [],
    byCompanyStatus = [],
    creditStats = {},
    monthlyRegistrations = [],
    withRegistrationNumber = 0,
    withoutRegistrationNumber = 0,
    usersWithFiles = 0,
    usersWithoutFiles = 0,
  } = stats || {};

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: <IoStatsChart /> },
    { id: 'demographics', label: 'Démographie', icon: <IoPeople /> },
    { id: 'cnoa', label: 'CNOA', icon: <IoMedal /> },
    { id: 'activity', label: 'Activité', icon: <IoTime /> },
  ];

  const StatCard = ({ label, value, icon, accentColor = 'emerald' }) => {
    const colorMap = {
      emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
      blue: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
      purple: 'border-purple-500/30 bg-purple-500/10 text-purple-400',
      teal: 'border-teal-500/30 bg-teal-500/10 text-teal-400',
      amber: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
      red: 'border-red-500/30 bg-red-500/10 text-red-400',
      gray: 'border-gray-500/30 bg-gray-500/10 text-gray-400',
    };
    const colors = colorMap[accentColor] || colorMap.emerald;
    return (
      <div className={`bg-[#111827] border ${colors.split(' ')[0]} rounded-xl p-6 shadow-lg transition-all hover:border-emerald-500/50 hover:shadow-emerald-500/5`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[#94A3B8] text-sm">{label}</p>
            <p className={`text-2xl font-bold mt-2 ${colors.split(' ')[2]}`}>{value}</p>
          </div>
          <div className={`text-2xl ${colors.split(' ')[2]} opacity-60`}>{icon}</div>
        </div>
      </div>
    );
  };

  const preparePieData = (data) => {
    if (!data || data.length === 0) return [];
    return data.map(item => ({
      name: item._id !== null && item._id !== undefined ? String(item._id) : 'Non spécifié',
      value: item.count || 0
    }));
  };

  const hasData = (data) => {
    return data && data.length > 0 && data.some(item => item.count > 0);
  };

  const EmptyChart = ({ message }) => (
    <div className="flex flex-col items-center justify-center h-72 text-[#64748B]">
      <IoAlertCircle className="text-4xl mb-2 text-[#64748B]/40" />
      <p className="text-sm">{message || 'Aucune donnée disponible'}</p>
    </div>
  );

  return (
    <div className=" ml-[30px] min-h-screen bg-[#0A0F1C] p-8 font-sans">
      <Title title="Statistiques des utilisateurs" />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-white/5 pb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg transition flex items-center gap-2 text-sm font-medium ${
              activeTab === tab.id
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'bg-[#111827] text-[#94A3B8] hover:bg-[#182233] hover:text-white border border-white/5'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard label="Total utilisateurs" value={totalUsers} icon={<IoPeople />} accentColor="emerald" />
            <StatCard label="Utilisateurs actifs" value={activeUsers} icon={<IoPerson />} accentColor="teal" />
            <StatCard label="Nouveaux (30 jours)" value={newUsersLast30Days} icon={<IoCalendar />} accentColor="blue" />
            <StatCard label="Admin vérifiés" value={byVerification?.adminVerified || 0} icon={<IoShield />} accentColor="purple" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard label="Aujourd'hui" value={newUsersToday} icon={<IoTime />} accentColor="blue" />
            <StatCard label="7 derniers jours" value={newUsersLast7Days} icon={<IoTrendingUp />} accentColor="teal" />
            <StatCard label="Crédit total" value={`${creditStats?.total || 0} DA`} icon={<IoWallet />} accentColor="amber" />
            <StatCard label="Crédit moyen" value={`${creditStats?.average || 0} DA`} icon={<IoWallet />} accentColor="amber" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-[#111827] border border-white/5 rounded-xl p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">Inscriptions mensuelles</h3>
              {hasData(monthlyRegistrations) ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyRegistrations}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                      <XAxis dataKey="month" stroke="#64748B" />
                      <YAxis stroke="#64748B" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#182233', borderColor: '#22c55e' }}
                        labelStyle={{ color: '#F8FAFC' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#22c55e" 
                        fill="#22c55e" 
                        fillOpacity={0.15}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart message="Aucune inscription mensuelle disponible" />
              )}
            </div>

            <div className="bg-[#111827] border border-white/5 rounded-xl p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">Répartition par rôle</h3>
              {hasData(byRole) ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={preparePieData(byRole)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {preparePieData(byRole).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_PIE[index % CHART_PIE.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#182233', borderColor: '#22c55e' }}
                        labelStyle={{ color: '#F8FAFC' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart message="Aucune donnée sur les rôles" />
              )}
            </div>
          </div>
        </>
      )}

      {/* Demographics Tab */}
      {activeTab === 'demographics' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard label="Sexe Masculin" value={bySexe.find(s => s._id === 'M')?.count || 0} icon={<IoMale />} accentColor="blue" />
            <StatCard label="Sexe Féminin" value={bySexe.find(s => s._id === 'F')?.count || 0} icon={<IoFemale />} accentColor="purple" />
            <StatCard label="Avec N° inscription" value={withRegistrationNumber} icon={<IoDocumentText />} accentColor="teal" />
            <StatCard label="Sans N° inscription" value={withoutRegistrationNumber} icon={<IoDocumentText />} accentColor="red" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#111827] border border-white/5 rounded-xl p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">Top Wilayas</h3>
              {hasData(byWilaya) ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byWilaya.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                      <XAxis type="number" stroke="#64748B" />
                      <YAxis dataKey="_id" type="category" stroke="#64748B" width={60} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#182233', borderColor: '#22c55e' }}
                        labelStyle={{ color: '#F8FAFC' }}
                      />
                      <Bar dataKey="count" fill="#22c55e" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart message="Aucune wilaya disponible" />
              )}
            </div>

            <div className="bg-[#111827] border border-white/5 rounded-xl p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">Top Professions</h3>
              {hasData(byProfession) ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byProfession.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                      <XAxis type="number" stroke="#64748B" />
                      <YAxis dataKey="_id" type="category" stroke="#64748B" width={80} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#182233', borderColor: '#22c55e' }}
                        labelStyle={{ color: '#F8FAFC' }}
                      />
                      <Bar dataKey="count" fill="#14b8a6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart message="Aucune profession disponible" />
              )}
            </div>
          </div>

          <div className="bg-[#111827] border border-white/5 rounded-xl p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">Statut du compte</h3>
            {hasData(byStatus) ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byStatus}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                    <XAxis dataKey="_id" stroke="#64748B" />
                    <YAxis stroke="#64748B" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#182233', borderColor: '#22c55e' }}
                      labelStyle={{ color: '#F8FAFC' }}
                    />
                    <Bar dataKey="count" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart message="Aucune donnée sur les statuts" />
            )}
          </div>
        </div>
      )}

      {/* CNOA Tab */}
      {activeTab === 'cnoa' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard label="Architectes agréés" value={byIsAccredited.find(a => a._id === true)?.count || 0} icon={<IoMedal />} accentColor="amber" />
            <StatCard label="Bénéficiaires aide d'État" value={byBenefitStateAid.find(b => b._id === true)?.count || 0} icon={<IoShield />} accentColor="emerald" />
            <StatCard label="Avec fichiers" value={usersWithFiles} icon={<IoDocumentText />} accentColor="teal" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#111827] border border-white/5 rounded-xl p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">Mode d'exercice</h3>
              {hasData(byProfessionalMode) ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={preparePieData(byProfessionalMode)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {preparePieData(byProfessionalMode).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_PIE[index % CHART_PIE.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#182233', borderColor: '#22c55e' }}
                        labelStyle={{ color: '#F8FAFC' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart message="Aucune donnée sur les modes d'exercice" />
              )}
            </div>

            <div className="bg-[#111827] border border-white/5 rounded-xl p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">Type de diplôme</h3>
              {hasData(byDiplomaType) ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={preparePieData(byDiplomaType)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {preparePieData(byDiplomaType).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_PIE[index % CHART_PIE.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#182233', borderColor: '#22c55e' }}
                        labelStyle={{ color: '#F8FAFC' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart message="Aucune donnée sur les diplômes" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#111827] border border-white/5 rounded-xl p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">Statut d'inscription</h3>
              {hasData(byRegistrationStatus) ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byRegistrationStatus}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                      <XAxis dataKey="_id" stroke="#64748B" />
                      <YAxis stroke="#64748B" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#182233', borderColor: '#22c55e' }}
                        labelStyle={{ color: '#F8FAFC' }}
                      />
                      <Bar dataKey="count" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart message="Aucune donnée sur les statuts d'inscription" />
              )}
            </div>

            <div className="bg-[#111827] border border-white/5 rounded-xl p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">Civilité</h3>
              {hasData(byCivility) ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={preparePieData(byCivility)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {preparePieData(byCivility).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_PIE[index % CHART_PIE.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#182233', borderColor: '#22c55e' }}
                        labelStyle={{ color: '#F8FAFC' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart message="Aucune donnée sur les civilités" />
              )}
            </div>
          </div>

          <div className="bg-[#111827] border border-white/5 rounded-xl p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">Situation familiale</h3>
            {hasData(byMaritalStatus) ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byMaritalStatus}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                    <XAxis dataKey="_id" stroke="#64748B" />
                    <YAxis stroke="#64748B" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#182233', borderColor: '#22c55e' }}
                      labelStyle={{ color: '#F8FAFC' }}
                    />
                    <Bar dataKey="count" fill="#14b8a6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart message="Aucune donnée sur les situations familiales" />
            )}
          </div>
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard label="Utilisateurs vérifiés" value={byVerification?.verified || 0} icon={<IoCheckmarkCircle />} accentColor="emerald" />
            <StatCard label="Non vérifiés" value={byVerification?.notVerified || 0} icon={<IoTime />} accentColor="amber" />
            <StatCard label="Avec fichiers" value={usersWithFiles} icon={<IoDocumentText />} accentColor="teal" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#111827] border border-white/5 rounded-xl p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">Service national</h3>
              {hasData(byServiceNationalStatus) ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byServiceNationalStatus}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                      <XAxis dataKey="_id" stroke="#64748B" />
                      <YAxis stroke="#64748B" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#182233', borderColor: '#22c55e' }}
                        labelStyle={{ color: '#F8FAFC' }}
                      />
                      <Bar dataKey="count" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart message="Aucune donnée sur le service national" />
              )}
            </div>

            <div className="bg-[#111827] border border-white/5 rounded-xl p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">Nationalité</h3>
              {hasData(byNationality) ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={preparePieData(byNationality.slice(0, 5))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {preparePieData(byNationality.slice(0, 5)).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_PIE[index % CHART_PIE.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#182233', borderColor: '#22c55e' }}
                        labelStyle={{ color: '#F8FAFC' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart message="Aucune donnée sur les nationalités" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}