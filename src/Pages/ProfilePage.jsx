import Title from '../Components/Title';
import { useContext, useEffect, useState, useRef } from "react";
import { UserContext } from "../Context/dataCont";
import { useParams, useNavigate } from "react-router-dom";

import sabAvatar from '../assets/SabrinaAvatar.jpg';
import FileCard from '../Components/Cards/FileCrad';
import CotisationCard from '../Components/Cards/CotisationCard';
import AddFileCard from '../Components/Cards/AddFileCard';
import CreditTransactionCard from '../Components/Cards/CreditTransactionCard';
import PaymentCard from '../Components/Cards/PayementCard';

const API_URL = import.meta.env.VITE_API_URL;
const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

export default function ProfilePage({ user }) {
  const { authData, setAuthData } = useContext(UserContext);
  const { id } = useParams();
  const navigate = useNavigate();

  const [displayUser, setDisplayUser] = useState(user || authData.user);
  const [permissions, setPermissions] = useState(null);
  const [perform, setPerform] = useState(null);
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [payments, setPayments] = useState([]);
  const [userFees, setUserFees] = useState([]);
  const [creditTransactions, setCreditTransactions] = useState([]);

  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionType, setTransactionType] = useState('deposit');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionMethod, setTransactionMethod] = useState('cash');
  const [transactionNotes, setTransactionNotes] = useState('');

  // Menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const targetUserId = user?.id || id || authData.user?.id;
  const isOwner = authData.user?.id === targetUserId;
  const isAdmin = authData.user?.role === 'admin' || authData.user?.role === 'super_admin';

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePopup = (type, message, duration = 3000) => {
    setPopup({ type, message });
    setTimeout(() => setPopup(null), duration);
  };

  // ---------- File handlers  ----------
  const handleUpload = async (file) => {
    try {
      setIsUploading(true);
      const uploadData = new FormData();
      uploadData.append("file", file);
      uploadData.append("folder", "uploads");
      const response = await fetch(`${NEST_API_URL}/files/${displayUser.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authData.token}` },
        body: uploadData,
      });
      const data = await response.json();
      console.log(data)
      if (response.status === 413) {
        handlePopup("error", data.message || "File is too large");
        return;
      }
      if (!response.ok) {
        handlePopup("error", data.message || "Upload failed");
        return;
      }
      if (isOwner) setAuthData(prev => ({ token: data.token || prev.token, user: data.user || prev.user }));
      else setDisplayUser(data.user);
      handlePopup("success", "File uploaded successfully ✅");
    } catch (err) {
      console.error(err);
      handlePopup("error", "Network error. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleReplace = async (file, newFile) => {
    try {
      setIsUploading(true);
      const uploadData = new FormData();
      uploadData.append("file", newFile);
      uploadData.append("folder", "uploads");
      const response = await fetch(`${NEST_API_URL}/files/${file.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${authData.token}` },
        body: uploadData,
      });
      const data = await response.json();
      console.log(data)
      if (response.status === 413) {
        handlePopup("error", data.message || "File is too large");
        return;
      }
      if (!response.ok) {
        handlePopup("error", data.message || "Replace failed");
        return;
      }
      if (isOwner) setAuthData(prev => ({ token: data.token || prev.token, user: data.user || prev.user }));
      else setDisplayUser(data.user);
      handlePopup("success", "File replaced successfully ✅");
    } catch (err) {
      console.error(err);
      handlePopup("error", "Network error. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (file) => {
    try {
      setIsUploading(true);
      const response = await fetch(`${NEST_API_URL}/files/${file.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authData.token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        handlePopup("error", data.message || "Delete failed");
        return;
      }
      if (isOwner) setAuthData(prev => ({ token: data.token || prev.token, user: data.user || prev.user }));
      else setDisplayUser(data.user);
      handlePopup("success", "File deleted successfully ✅");
    } catch (err) {
      console.error(err);
      handlePopup("error", "Network error. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  // ---------- Refresh functions ----------
  const refreshUserAndFees = async () => {
    try {
      const userRes = await fetch(`${API_URL}/user/${targetUserId}`, {
        headers: { Authorization: `Bearer ${authData.token}` }
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        const updatedUser = userData.user;
        setDisplayUser(updatedUser);
        if (isOwner) setAuthData(prev => ({ ...prev, user: updatedUser }));
      }
      await refreshUserFees();
      await fetchCreditTransactions();
    } catch (error) {
      console.error("Error refreshing user and fees:", error);
    }
  };

  const refreshUserFees = async () => {
    try {
      const feesRes = await fetch(`${API_URL}/fee/user/${targetUserId}`, {
        headers: { Authorization: `Bearer ${authData.token}` }
      });
      if (feesRes.ok) {
        const feesData = await feesRes.json();
        setUserFees(feesData.cotisations);
      } else {
        console.warn("Erreur lors du rafraîchissement des cotisations");
      }
    } catch (error) {
      console.error("Error refreshing fees:", error);
    }
  };

  const fetchCreditTransactions = async () => {
    try {
      const res = await fetch(`${NEST_API_URL}/fees/credit/user/${targetUserId}`, {
        headers: { Authorization: `Bearer ${authData.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCreditTransactions(data.transactions || data);
      } else {
        console.warn("Impossible de charger les transactions de crédit");
      }
    } catch (error) {
      console.error("Error fetching credit transactions:", error);
    }
  };

  // ---------- Transaction handler (deposit / withdraw) ----------
  const handleTransaction = async (amount, method, notes, type) => {
    const finalAmount = type === 'deposit' ? Math.abs(amount) : -Math.abs(amount);
    try {
      const res = await fetch(`${NEST_API_URL}/fees/versement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authData.token}` },
        body: JSON.stringify({ userId: targetUserId, amount: finalAmount, paymentMethod: method, notes })
      });
      const data = await res.json();
      if (res.ok) {
        if (type === 'deposit') {
          handlePopup('success', `${data.usedForFees} DA utilisé pour les cotisations, ${data.creditAdded} DA ajoutés au crédit.`);
        } else {
          handlePopup('success', `Retrait de ${Math.abs(finalAmount)} DA effectué. Nouveau crédit : ${data.newCreditBalance} DA.`);
        }
        await refreshUserAndFees();
        setShowTransactionModal(false);
        setTransactionAmount('');
        setTransactionMethod('cash');
        setTransactionNotes('');
      } else {
        handlePopup('error', data.error);
      }
    } catch (err) {
      console.error(err);
      handlePopup('error', 'Erreur réseau');
    }
  };

  // ---------- User actions ---------- 
  const handleEditUser = () => {
    navigate(`/auth/update/${targetUserId}`); 
  };

  const handleValidateUser = async () => {
    try {
      const response = await fetch(`${NEST_API_URL}/user/validate/${targetUserId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authData.token}` }
      });
      const data = await response.json();
      if (response.ok) {
        handlePopup('success', 'Utilisateur validé avec succès');
        await refreshUserAndFees(); // refresh to show updated verification status
      } else {
        handlePopup('error', data.message || 'Erreur lors de la validation');
      }
    } catch (err) {
      console.error(err);
      handlePopup('error', 'Erreur réseau');
    }
  };

  // ---------- Initial data fetch ----------
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        let userData = user;
        if (!userData && id) {
          const userRes = await fetch(`${NEST_API_URL}/users/${id}`, {
            headers: { Authorization: `Bearer ${authData.token}` }
          });
          const result = await userRes.json();
          userData = result.user;
        }
        setDisplayUser(userData || authData.user);

        const permRes = await fetch(`${NEST_API_URL}/permissions/user/${targetUserId}/viewable-fields?model=User`, {
          headers: { Authorization: `Bearer ${authData.token}` }
        });
        const permData = await permRes.json();
        setPermissions(permData);

        const opRes = await fetch(`${NEST_API_URL}/permissions/${targetUserId}/check-operation`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authData.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ operation: "create", model: "File" })
        });
        const opData = await opRes.json();
        setPerform(opData.canPerform);


        const feesRes = await fetch(`${NEST_API_URL}/fees/user/${targetUserId}`, {
          headers: { Authorization: `Bearer ${authData.token}` }
        });
        if (feesRes.ok) {
          const feesData = await feesRes.json();
          setUserFees(feesData);
        }

        const paymentsRes = await fetch(`${NEST_API_URL}/fees/payements/user/${targetUserId}`, {
          headers: { Authorization: `Bearer ${authData.token}` }
        });
        if (paymentsRes.ok) {
          const paymentsData = await paymentsRes.json();
          setPayments(paymentsData);
        }



        await fetchCreditTransactions();
      } catch (error) {
        console.error("Error fetching data:", error);
        handlePopup("error", "Erreur lors du chargement des données");
      } finally {
        setLoading(false);
      }
    };
    if (authData?.token && targetUserId) fetchData();
  }, [id, user, authData, targetUserId]);

  const totalDebt = userFees.reduce((sum, fee) => {
    const computed = fee.computed || {};
    const remaining = computed.remaining || 0;
    return sum + (remaining > 0 ? remaining : 0);
  }, 0);

  const PROFILE_URL = displayUser?.profilePicture || sabAvatar;
  const files = displayUser?.files || [];

  const roleColors = {
    admin: "bg-red-200/20 text-red-300 border-red-400/40",
    user: "bg-blue-200/20 text-blue-300 border-blue-400/40",
    moderator: "bg-purple-200/20 text-purple-300 border-purple-400/40",
  };

  const verificationTag = displayUser?.isAdminVerified
    ? "bg-slate-200/20 text-slate-100 border-slate-300/30"
    : "bg-yellow-400/20 text-yellow-300 border-yellow-400/40";

  const verificationText = displayUser?.isAdminVerified ? "Validé" : "En attente de validation";

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-yellow-300">Chargement...</div>
      </div>
    );
  }

  const visibleFields = permissions?.fields || [];
  const isVisible = (fieldName) => visibleFields.includes(fieldName);

  // Only admin or the user themselves can see the menu (if owner, you can still edit/validate? Adjust as needed)
  const showMenu = isAdmin || isOwner;

  return (
    <>
      <div className="min-h-screen bg-gray-900 pb-16 relative">
        {/* Spinner Overlay */}
        {isUploading && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
            <div className="w-16 h-16 border-4 border-yellow-300 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* Popup Toast */}
        {popup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className={`px-6 py-4 rounded-lg shadow-xl border text-sm font-medium pointer-events-auto
              transform transition-all duration-300
              ${popup.type === "error"
                ? "bg-red-500/20 text-red-300 border-red-400/40"
                : "bg-green-500/20 text-green-300 border-green-400/40"}`}>
              {popup.message}
            </div>
          </div>
        )}

        {/* Gold Cover */}
        <div className="h-40 bg-yellow-400/80 shadow-md"></div>

        {/* Profile Card */}
        <div className="w-3/4 mx-auto -mt-20 bg-gray-800/80 backdrop-blur-xl border border-yellow-400/30 rounded-xl shadow-xl p-10 flex gap-10 items-center relative">
          {displayUser?.profilePicture && (
            <img src={PROFILE_URL} alt="Profile" className="w-40 h-40 object-cover rounded-full border-4 border-yellow-300 shadow-[0_0_20px_rgba(255,215,100,0.4)]" />
          )}
          <div className="flex-1 space-y-2">
            {isVisible('name') && isVisible('lastname') && (
              <h2 className="text-3xl font-semibold text-white tracking-tight">
                {displayUser?.name} {displayUser?.lastname}
              </h2>
            )}
            {isVisible('email') && <p className="text-gray-300 text-lg">{displayUser?.email}</p>}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {isVisible('role') && (
                <span className={`px-3 py-1 rounded-full border text-sm font-medium ${roleColors[displayUser?.role] || "bg-yellow-300/20 text-yellow-300 border-yellow-400/40"}`}>
                  {displayUser?.role.toUpperCase()}
                </span>
              )}
              <span className={`px-3 py-1 rounded-full border text-sm font-medium ${verificationTag}`}>
                {verificationText}
              </span>
            </div>
          </div>

          {/* Three-dots menu */}
          {showMenu && (
            <div className="absolute top-6 right-6" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="text-gray-400 hover:text-yellow-300 text-2xl leading-none focus:outline-none"
              >
                ⋮
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10">
                  <ul className="py-1 text-sm text-gray-300">
                    <li
                      onClick={() => {
                        setMenuOpen(false);
                        setTransactionType('deposit');
                        setShowTransactionModal(true);
                      }}
                      className="px-4 py-2 hover:bg-green-600 hover:text-white cursor-pointer"
                    >
                      + Versement
                    </li>
                    <li
                      onClick={() => {
                        setMenuOpen(false);
                        setTransactionType('withdraw');
                        setShowTransactionModal(true);
                      }}
                      className="px-4 py-2 hover:bg-red-600 hover:text-white cursor-pointer"
                    >
                      - Retrait
                    </li>
                    <li
                      onClick={() => {
                        setMenuOpen(false);
                        handleEditUser();
                      }}
                      className="px-4 py-2 hover:bg-yellow-400 hover:text-gray-900 cursor-pointer"
                    >
                      Modifier l'utilisateur
                    </li>
                    {!displayUser?.isAdminVerified && isAdmin && (
                      <li
                        onClick={() => {
                          setMenuOpen(false);
                          handleValidateUser();
                        }}
                        className="px-4 py-2 hover:bg-blue-600 hover:text-white cursor-pointer"
                      >
                        Valider l'utilisateur
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Credit & Debt Card  */}
          <div className="w-2/4 mx-auto mt-6 bg-blue-900/30 border border-blue-400/30 rounded-xl p-4">
            <div className="flex justify-between items-center">
              <span className="text-blue-300 font-medium">Crédit disponible :</span>
              <div className="flex items-center gap-3">
                <span className="text-blue-200 font-mono text-xl">{displayUser.credit} DA</span>
              </div>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-blue-300 font-medium">Créances :</span>
              <span className="text-blue-200 font-mono text-xl">{totalDebt} DA</span>
            </div>
          </div>
        </div>

        {/* Personal Details */}
        <div className="w-3/4 mx-auto mt-12 bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-xl border border-yellow-400/20 p-10">
          <div className="flex justify-between items-center mb-6">
            <Title title="Personal Details" textColor="text-yellow-300" />
          </div>
          <div className="grid grid-cols-2 gap-8 text-gray-200">
            {isVisible('name') && <DetailBox label="Name" value={displayUser?.name} />}
            {isVisible('lastname') && <DetailBox label="Last Name" value={displayUser?.lastname} />}
            {isVisible('role') && <DetailBox label="Role" value={displayUser?.role} />}
            {isVisible('email') && <DetailBox label="Email" value={displayUser?.email} />}
            {isVisible('wilaya') && <DetailBox label="Wilaya" value={displayUser?.wilaya} />}
            {isVisible('commune') && <DetailBox label="Commune" value={displayUser?.commune} />}
            {isVisible('profession') && <DetailBox label="Profession" value={displayUser?.profession} />}
            {isVisible('specialty') && <DetailBox label="Specialty" value={displayUser?.specialty} />}
            {isVisible('registrationNumber') && (
              <DetailBox label="Registration Number" value={displayUser?.registrationNumber} />
            )}
            {isVisible('dateOfBirth') && (
              <DetailBox label="Date of Birth" value={displayUser?.dateOfBirth ? new Date(displayUser.dateOfBirth).toLocaleDateString() : ''} />
            )}
          </div>
        </div>

        {/* Files */}
        <div className="w-3/4 mx-auto mt-12 bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-xl border border-yellow-400/20 p-10">
          <div className="flex justify-between items-center mb-6">
            <Title title="Files" textColor="text-yellow-300" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {files.filter(file => file.folder !== "profile").map((file, idx) => (
              <FileCard key={file.id} file={file} handleDelete={handleDelete} handleReplace={handleReplace} />
            ))}
            {perform && <AddFileCard onUpload={handleUpload} />}
          </div>
        </div>

        {/* Cotisations */}
        <div className="w-3/4 mx-auto mt-12 bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-xl border border-yellow-400/20 p-10">
          <div className="flex justify-between items-center mb-6">
            <Title title="Cotisations" textColor="text-yellow-300" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {userFees && userFees.length > 0 ? (
              userFees.map((fee) => (
                <CotisationCard
                  key={fee.id}
                  cotisation={fee}
                  isOwner={isOwner}
                  onCotisationUpdated={refreshUserFees}
                />
              ))
            ) : (
              <p className="text-gray-400 col-span-full text-center py-8">Aucune cotisation trouvée pour ce membre.</p>
            )}
          </div>
        </div>

        {/* Payments */}
        <div className="w-3/4 mx-auto mt-12 bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-xl border border-yellow-400/20 p-10">
          <div className="flex justify-between items-center mb-6">
            <Title title="Historique des paiements" textColor="text-yellow-300" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {payments.length > 0 ? (
              payments.map((payment) => (
                <PaymentCard key={payment.id} payment={payment} handlePopup={handlePopup} />
              ))
            ) : (
              <p className="text-gray-400 col-span-full text-center py-8">Aucun paiement enregistré.</p>
            )}
          </div>
        </div>

        {/* Credit Transactions */}
        <div className="w-3/4 mx-auto mt-12 bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-xl border border-blue-400/20 p-10">
          <div className="flex justify-between items-center mb-6">
            <Title title="Historique des crédits" textColor="text-blue-300" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {creditTransactions.length > 0 ? (
              creditTransactions.map((tx) => (
                <CreditTransactionCard key={tx.id} transaction={tx} handlePopup={handlePopup} />
              ))
            ) : (
              <p className="text-gray-400 col-span-full text-center py-8">Aucune transaction de crédit trouvée.</p>
            )}
          </div>
        </div>
      </div>

      {/* Transaction Modal (deposit/withdraw)*/}
      {showTransactionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-800 rounded-xl p-6 w-96 border border-yellow-400/30 shadow-2xl">
            <h3 className="text-xl font-bold text-yellow-300 mb-4">
              {transactionType === 'deposit' ? 'Versement' : 'Retrait de crédit'}
            </h3>
            <div className="space-y-4">
              <input
                type="number"
                placeholder="Montant (DA)"
                value={transactionAmount}
                onChange={(e) => setTransactionAmount(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 rounded text-white border border-gray-700 focus:outline-none focus:border-yellow-400"
              />
              <select
                value={transactionMethod}
                onChange={(e) => setTransactionMethod(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 rounded text-white border border-gray-700 focus:outline-none focus:border-yellow-400"
              >
                <option value="cash">Espèces</option>
                <option value="bank_transfer">Virement</option>
                <option value="check">Chèque</option>
                <option value="online">En ligne</option>
                <option value="other">Autre</option>
              </select>
              <textarea
                placeholder="Notes (optionnel)"
                value={transactionNotes}
                onChange={(e) => setTransactionNotes(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 rounded text-white border border-gray-700 focus:outline-none focus:border-yellow-400"
                rows="2"
              />
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowTransactionModal(false)}
                  className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500 transition text-white"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    const amountNum = parseFloat(transactionAmount);
                    if (isNaN(amountNum) || amountNum <= 0) {
                      handlePopup('error', 'Montant invalide (doit être positif)');
                      return;
                    }
                    if (transactionType === 'withdraw' && amountNum > displayUser.credit) {
                      handlePopup('error', 'Crédit insuffisant');
                      return;
                    }
                    handleTransaction(amountNum, transactionMethod, transactionNotes, transactionType);
                  }}
                  className="px-4 py-2 bg-green-600 rounded hover:bg-green-500 transition text-white"
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DetailBox({ label, value }) {
  return (
    <div className="p-4 rounded-lg bg-gray-900/40 border border-yellow-400/10">
      <p className="text-yellow-300 text-sm font-medium">{label}</p>
      <p className="text-gray-300 mt-1">{value || '-'}</p>
    </div>
  );
}