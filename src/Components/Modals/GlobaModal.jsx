// Components/GlobalModal.jsx
import { AlertCircle, CheckCircle, X, Loader2 } from "lucide-react";

export default function GlobalModal({
  isOpen,
  type,
  title,
  message,
  inputValue,
  inputPlaceholder,
  onConfirm,
  onCancel,
  onInputChange,
}) {
  if (!isOpen) return null;

  const isConfirm = type === 'confirm';
  const isAlert = type === 'alert';
  const isPrompt = type === 'prompt';

  // Determine icon and color based on type
  const getIcon = () => {
    if (isAlert) return <AlertCircle className="w-6 h-6 text-blue-400" />;
    if (isConfirm) return <CheckCircle className="w-6 h-6 text-emerald-400" />;
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div 
        className="bg-[#111827] rounded-2xl border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-black/50 max-w-md w-full mx-4 p-6 animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with icon and title */}
        <div className="flex items-start gap-4">
          {getIcon() && (
            <div className="flex-shrink-0 mt-1">
              {getIcon()}
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-xl font-bold text-[#F8FAFC] tracking-tight">
              {title}
            </h3>
            <p className="mt-2 text-[#94A3B8] text-sm leading-relaxed">
              {message}
            </p>
          </div>
          {/* Optional close button for alerts? Not in original, but we can keep */}
          {isAlert && (
            <button
              onClick={onConfirm}
              className="p-1 hover:bg-[#1F2937] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-[#64748B] hover:text-[#F8FAFC]" />
            </button>
          )}
        </div>

        {/* Prompt input */}
        {isPrompt && (
          <div className="mt-4">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder={inputPlaceholder}
              className="w-full px-4 py-2.5 bg-[#0A0F1C] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200 placeholder-[#64748B]"
              autoFocus
            />
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-6 flex justify-end gap-3">
          {(isConfirm || isPrompt) && (
            <button
              onClick={onCancel}
              className="px-5 py-2.5 text-sm font-medium text-[#94A3B8] bg-[#1F2937] hover:bg-[#182233] rounded-xl transition-all duration-200 border border-[rgba(255,255,255,0.06)]"
            >
              Annuler
            </button>
          )}
          <button
            onClick={isPrompt ? () => onConfirm(inputValue) : onConfirm}
            className={`px-5 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 shadow-lg ${
              isAlert
                ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/20'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
            }`}
          >
            {isAlert ? 'OK' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
}