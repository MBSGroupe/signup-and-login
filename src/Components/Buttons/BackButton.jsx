// Components/BackButton.jsx
import { useNavigate } from 'react-router-dom';

export default function BackButton({ fallbackPath = '/dash', label = '← Retour', className = '' }) {
  const navigate = useNavigate();

  const handleClick = () => {
    // If there's history, go back; otherwise use fallback
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition inline-flex items-center gap-2 ${className}`}
    >
      {label}
    </button>
  );
}