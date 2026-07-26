// Components/MessagePopup.jsx
import { useError } from '../../Context/ErrorContext';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const MessagePopup = () => {
  const { messages, removeMessage } = useError();

  if (messages.length === 0) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-5 h-5 text-rose-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-400" />;
      default:
        return <Info className="w-5 h-5 text-[#64748B]" />;
    }
  };

  const getBorderColor = (type) => {
    switch (type) {
      case 'error':
        return 'border-rose-500/20';
      case 'warning':
        return 'border-yellow-500/20';
      case 'success':
        return 'border-emerald-500/20';
      case 'info':
        return 'border-blue-500/20';
      default:
        return 'border-[rgba(255,255,255,0.06)]';
    }
  };

  const getBgColor = (type) => {
    switch (type) {
      case 'error':
        return 'bg-rose-500/10';
      case 'warning':
        return 'bg-yellow-500/10';
      case 'success':
        return 'bg-emerald-500/10';
      case 'info':
        return 'bg-blue-500/10';
      default:
        return 'bg-[#111827]';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm pointer-events-auto" />
      <div className="relative flex flex-col items-center pointer-events-auto">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`
              ${getBgColor(msg.type)}
              backdrop-blur-xl 
              border ${getBorderColor(msg.type)} 
              rounded-2xl shadow-2xl shadow-black/50
              p-5 max-w-md w-full mx-4
              transform transition-all duration-300 ease-out
              animate-pop-in
            `}
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 mt-0.5">
                {getIcon(msg.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#F8FAFC] leading-relaxed break-words">
                  {msg.message}
                </p>
              </div>
              <button
                onClick={() => removeMessage(msg.id)}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-[rgba(255,255,255,0.06)] transition-colors"
              >
                <X className="w-4 h-4 text-[#64748B] hover:text-[#F8FAFC] transition-colors" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MessagePopup;