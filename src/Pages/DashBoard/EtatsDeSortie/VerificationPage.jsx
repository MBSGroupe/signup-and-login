// src/pages/VerifyDegree.jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, FileText } from 'lucide-react';

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL; // your backend URL

export default function VerifyDegree() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid verification link');
      setLoading(false);
      return;
    }

    const verify = async () => {
      try {
        const response = await fetch(`${NEST_API_URL}/verify/degree/${token}`, {
          headers: {
            Accept: 'application/json',
          },
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Verification failed');
        }

        setData(result);
      } catch (err) {
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
          <p className="text-[#94A3B8]">Vérification en cours...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#182233] border border-white/10 rounded-2xl p-8 text-center shadow-xl">
          <XCircle className="w-16 h-16 mx-auto text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Document non vérifié</h2>
          <p className="text-[#94A3B8]">{error}</p>
        </div>
      </div>
    );
  }

  if (data?.verified) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#182233] border border-white/10 rounded-2xl p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
            <h2 className="text-2xl font-bold text-white">Document vérifié</h2>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-[#94A3B8] uppercase tracking-wider">Type de document</p>
              <p className="text-lg font-medium text-white">{data.documentType || 'Diplôme'}</p>
            </div>
            <div>
              <p className="text-sm text-[#94A3B8] uppercase tracking-wider">Titulaire</p>
              <p className="text-lg font-medium text-white">{data.holder}</p>
            </div>
            <div>
              <p className="text-sm text-[#94A3B8] uppercase tracking-wider">Numéro d'inscription</p>
              <p className="text-lg font-medium text-white">{data.registrationNumber || 'Non renseigné'}</p>
            </div>
            <div>
              <p className="text-sm text-[#94A3B8] uppercase tracking-wider">Date d'émission</p>
              <p className="text-lg font-medium text-white">
                {data.issuedAt ? new Date(data.issuedAt).toLocaleDateString('fr-FR') : 'Non renseignée'}
              </p>
            </div>
            <div>
              <p className="text-sm text-[#94A3B8] uppercase tracking-wider">Statut</p>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                {data.status || 'Valide'}
              </span>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-white/5">
            <p className="text-xs text-[#64748B] text-center">
              Ce document a été émis par {import.meta.env.VITE_COMPANY_NAME || 'l\'organisme'}.
              <br />
              Vérifiez toujours l'authenticité via ce lien.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#182233] border border-white/10 rounded-2xl p-8 text-center shadow-xl">
        <XCircle className="w-16 h-16 mx-auto text-yellow-400 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Document introuvable</h2>
        <p className="text-[#94A3B8]">Le document que vous cherchez n'existe pas ou a été révoqué.</p>
      </div>
    </div>
  );
}