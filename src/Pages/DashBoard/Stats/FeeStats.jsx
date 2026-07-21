// FeeStats.jsx
import { useContext, useEffect, useState } from 'react';
import { UserContext } from '../../../Context/dataCont';
import Title from '../../../Components/Title';
import { fetchWithRefresh } from '../../../Components/api';
import {
  IoWallet,
  IoCash,
  IoCard,
  IoCalendar,
  IoStatsChart,
  IoCheckmarkCircle,
  IoTime,
  IoWarning,
  IoClose,
  IoTrendingUp,
  IoTrendingDown,
  IoRefresh,
  IoPieChart,
} from 'react-icons/io5';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const API_URL = import.meta.env.VITE_NEST_API_URL;

// Colors for charts - Banking theme
const CHART_PIE = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#6b7280', '#8b5cf6', '#14b8a6'];

export default function FeeStats() {
  const { authData, setAuthData } = useContext(UserContext);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetchWithRefresh(
          `${API_URL}/fees/stats`,
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
    totalFees = 0,
    totalProjected = 0,
    totalPaid = 0,
    totalRemaining = 0,
    totalPaidByCredit = 0,
    totalPaidByCash = 0,
    totalVersements = 0,
    totalRepayments = 0,
    netCreditAdded = 0,
    byStatus = {}
  } = stats || {};

  const paymentRate = totalProjected > 0 ? ((totalPaid / totalProjected) * 100).toFixed(1) : 0;

  const formatAmount = (amount) => {
    if (amount === undefined || amount === null) return '0 DA';
    return new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(amount || 0);
  };

  const statusData = [
    { name: 'Payées', value: byStatus.paid || 0, color: '#22c55e' },
    { name: 'Partielles', value: byStatus.partial || 0, color: '#3b82f6' },
    { name: 'En attente', value: byStatus.pending || 0, color: '#f59e0b' },
    { name: 'En retard', value: byStatus.overdue || 0, color: '#ef4444' },
    { name: 'Annulées', value: byStatus.cancelled || 0, color: '#6b7280' },
  ].filter(item => item.value > 0);

  const paymentMethodData = [
    { name: 'Par crédit', value: totalPaidByCredit, color: '#8b5cf6' },
    { name: 'Par espèces/autre', value: totalPaidByCash, color: '#14b8a6' },
  ].filter(item => item.value > 0);

  const StatCard = ({ label, value, icon, accentColor = 'emerald' }) => {
    const colorMap = {
      emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
      green: 'border-green-500/30 bg-green-500/10 text-green-400',
      yellow: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
      blue: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
      purple: 'border-purple-500/30 bg-purple-500/10 text-purple-400',
      indigo: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400',
      cyan: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
      rose: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
      orange: 'border-orange-500/30 bg-orange-500/10 text-orange-400',
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

  return (
    <div className="min-h-screen bg-[#0A0F1C] p-8 font-sans">
      <Title title="Statistiques des cotisations" />

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard label="Total collecté" value={formatAmount(totalPaid)} icon={<IoWallet />} accentColor="emerald" />
        <StatCard label="Total restant dû" value={formatAmount(totalRemaining)} icon={<IoTime />} accentColor="yellow" />
        <StatCard label="Nombre de cotisations" value={totalFees} icon={<IoStatsChart />} accentColor="blue" />
        <StatCard label="Taux de paiement" value={`${paymentRate}%`} icon={<IoCheckmarkCircle />} accentColor="purple" />
      </div>

      {/* Financial Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard label="Payé par crédit" value={formatAmount(totalPaidByCredit)} icon={<IoCard />} accentColor="indigo" />
        <StatCard label="Payé par espèces" value={formatAmount(totalPaidByCash)} icon={<IoCash />} accentColor="cyan" />
        <StatCard label="Total versements" value={formatAmount(totalVersements)} icon={<IoTrendingUp />} accentColor="green" />
        <StatCard label="Total retraits" value={formatAmount(totalRepayments)} icon={<IoTrendingDown />} accentColor="rose" />
      </div>

      {/* Net Credit Added & Total Projected */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="col-span-1">
          <StatCard 
            label="Net crédit ajouté (versements - retraits)" 
            value={formatAmount(netCreditAdded)} 
            icon={<IoRefresh />} 
            accentColor={netCreditAdded >= 0 ? 'orange' : 'rose'} 
          />
        </div>
        <div className="col-span-1">
          <StatCard 
            label="Total projeté" 
            value={formatAmount(totalProjected)} 
            icon={<IoCalendar />} 
            accentColor="gray" 
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-[#111827] border border-white/5 rounded-xl p-6 shadow-xl">
          <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4 flex items-center gap-2">
            <IoPieChart className="text-emerald-400" />
            Répartition par statut
          </h3>
          {statusData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#182233', borderColor: '#22c55e' }}
                    labelStyle={{ color: '#F8FAFC' }}
                    formatter={(value) => formatAmount(value)}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-72 text-[#64748B]">
              <IoStatsChart className="text-4xl mb-2 text-[#64748B]/40" />
              <p className="text-sm">Aucune donnée disponible</p>
            </div>
          )}
        </div>

        {/* Payment Methods */}
        <div className="bg-[#111827] border border-white/5 rounded-xl p-6 shadow-xl">
          <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4 flex items-center gap-2">
            <IoWallet className="text-emerald-400" />
            Méthodes de paiement
          </h3>
          {paymentMethodData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {paymentMethodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#182233', borderColor: '#22c55e' }}
                    labelStyle={{ color: '#F8FAFC' }}
                    formatter={(value) => formatAmount(value)}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-72 text-[#64748B]">
              <IoStatsChart className="text-4xl mb-2 text-[#64748B]/40" />
              <p className="text-sm">Aucune donnée disponible</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}