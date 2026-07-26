// Components/BackButton.jsx
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function BackButton({ fallbackPath = '/dash', label = 'Retour', className = '' }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#94A3B8] hover:text-[#F8FAFC] bg-[#1F2937] hover:bg-[#22C55E]/10 rounded-xl transition-all duration-200 border border-[rgba(255,255,255,0.06)] ${className}`}
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </button>
  );
}