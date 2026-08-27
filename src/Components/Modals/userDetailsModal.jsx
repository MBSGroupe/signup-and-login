import { useEffect, useRef, useState } from 'react';
import { IoClose } from 'react-icons/io5';

const NEST_API_URL = import.meta.env.VITE_NEST_API_URL;

export default function UserDetailsModal({ user, onClose, authToken }) {
  const modalRef = useRef(null);
  const [visibleFields, setVisibleFields] = useState([]);
  const [fieldConfigs, setFieldConfigs] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!authToken) {
        // No token → no fields, no loading
        setVisibleFields([]);
        setFieldConfigs({});
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(
          `${NEST_API_URL}/permissions/user/${user.id}/viewable-fields?model=User`,
          {
            headers: { Authorization: `Bearer ${authToken}` },
          }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        // Extract fields and configs
        const fields = data?.data?.fields || data?.fields || [];
        const configs = data?.data?.configs || data?.configs || {};

        setVisibleFields(fields);
        setFieldConfigs(configs);
      } catch (err) {
        console.error('Permission fetch error:', err);
        // On error: show nothing
        setVisibleFields([]);
        setFieldConfigs({});
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user, authToken]);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('keydown', handleEsc);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const formatValue = (value) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
    if (typeof value === 'string' && (value.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(value))) {
      try {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
      } catch {}
    }
    if (value instanceof Date) {
      if (!isNaN(value.getTime())) {
        return value.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      }
      return 'Date invalide';
    }
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const getSexeLabel = (value) => {
    if (value === 'M') return 'Homme';
    if (value === 'F') return 'Femme';
    return value || '-';
  };

  // Build grouped fields from configs + visibleFields
  const buildGroupedFields = () => {
    const groups = {};

    // Only include fields that are visible and have a config
    visibleFields.forEach((fieldKey) => {
      const config = fieldConfigs[fieldKey];
      if (!config) return;

      const groupKey = config.ui?.group || 'Autres';
      if (!groups[groupKey]) {
        groups[groupKey] = {
          label: config.ui?.groupLabel || groupKey,
          fields: [],
        };
      }

      groups[groupKey].fields.push({
        key: fieldKey,
        label: config.label || fieldKey,
        labelAr: config.labelAr || '',
        isArabic: false, // we can detect from labelAr if needed, but keep false
        formatter: fieldKey === 'sexe' ? getSexeLabel : null,
      });
    });

    // Sort fields within each group by ui.order
    Object.keys(groups).forEach((groupKey) => {
      groups[groupKey].fields.sort((a, b) => {
        const orderA = fieldConfigs[a.key]?.ui?.order || 999;
        const orderB = fieldConfigs[b.key]?.ui?.order || 999;
        return orderA - orderB;
      });
    });

    return groups;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-[#111827] rounded-2xl p-8 border border-[rgba(255,255,255,0.06)] shadow-2xl">
          <div className="w-10 h-10 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto" />
          <p className="text-[#64748B] mt-4 text-center">Chargement des permissions…</p>
        </div>
      </div>
    );
  }

  // If no visible fields, show an empty state
  if (visibleFields.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-[#111827] rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50 p-6">
          <div className="flex flex-col items-center gap-3 py-12 text-[#64748B]">
            <IoClose size={24} className="text-[#64748B]" />
            <p className="text-sm">Aucune information disponible</p>
          </div>
          <div className="sticky bottom-0 bg-[#111827] border-t border-[rgba(255,255,255,0.06)] p-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-all duration-200 shadow-lg shadow-emerald-500/20"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

  const groupedFields = buildGroupedFields();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        ref={modalRef}
        className="relative bg-[#111827] rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50 modal-scrollbar"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#111827] border-b border-[rgba(255,255,255,0.06)] p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-[#F8FAFC] tracking-tight">
              {user.name} {user.lastname}
            </h2>
            <p className="text-[#94A3B8] text-sm">{user.email}</p>
            {user.nomArabe && (
              <p className="text-emerald-400/80 text-lg font-arabic" dir="rtl">
                {user.nomArabe} {user.prenomArabe}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#1F2937] rounded-lg transition-colors"
          >
            <IoClose size={24} className="text-[#64748B] hover:text-[#F8FAFC]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {Object.entries(groupedFields).map(([groupKey, group]) => {
            // Filter fields that have a non-empty value
            const fieldsWithValue = group.fields.filter((field) => {
              const val = user[field.key];
              return val !== undefined && val !== null && val !== '';
            });
            if (fieldsWithValue.length === 0) return null;

            return (
              <div key={groupKey}>
                <h3 className="text-lg font-semibold text-emerald-400 border-b border-[rgba(255,255,255,0.06)] pb-2 mb-4 tracking-wide">
                  {group.label}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fieldsWithValue.map((field) => {
                    const value = user[field.key];
                    let displayValue = field.formatter ? field.formatter(value) : formatValue(value);
                    return (
                      <div
                        key={field.key}
                        className="p-3 rounded-lg bg-[#182233] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] transition-colors"
                      >
                        <p className="text-[#64748B] text-xs font-medium uppercase tracking-wider">
                          {field.label}
                        </p>
                        <p
                          className={`text-[#F8FAFC] mt-1 text-sm break-words ${field.isArabic ? 'font-arabic text-right' : ''}`}
                          dir={field.isArabic ? 'rtl' : 'ltr'}
                        >
                          {displayValue}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#111827] border-t border-[rgba(255,255,255,0.06)] p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-all duration-200 shadow-lg shadow-emerald-500/20"
          >
            Fermer
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .modal-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
          border-radius: 10px;
        }
        .modal-scrollbar::-webkit-scrollbar-thumb {
          background: #22C55E;
          border-radius: 10px;
        }
        .modal-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #16A34A;
        }
        .modal-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #22C55E rgba(31, 41, 55, 0.5);
        }
        .modal-scrollbar {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
}