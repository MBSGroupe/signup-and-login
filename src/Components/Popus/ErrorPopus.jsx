// Components/MessagePopup.jsx
import { useError } from '../../Context/ErrorContext';

const MessagePopup = () => {
  const { messages, removeMessage } = useError();

  if (messages.length === 0) return null;

  const getBorderColor = (type) => {
    switch (type) {
      case 'error':
        return 'border-red-500/30';
      case 'warning':
        return 'border-yellow-500/30';
      case 'success':
        return 'border-green-500/30';
      case 'info':
        return 'border-blue-500/30';
      default:
        return 'border-gray-500/30';
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'success':
        return '✅';
      case 'info':
        return 'ℹ️';
      default:
        return '📢';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Backdrop – subtle blur, allows clicks through unless a message is shown */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto" />
      <div className="relative flex flex-col items-center pointer-events-auto">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`
              bg-gray-900/90 backdrop-blur-xl 
              border ${getBorderColor(msg.type)} 
              rounded-2xl shadow-2xl shadow-black/40
              p-8 max-w-lg w-full mx-4
              transform transition-all duration-300 ease-out
              animate-pop-in
              text-white
            `}
          >
            <div className="flex items-start gap-4">
              <div className="text-3xl flex-shrink-0">{getIcon(msg.type)}</div>
              <div className="flex-1">
                <p className="text-lg font-medium leading-relaxed">{msg.message}</p>
              </div>
              <button
                onClick={() => removeMessage(msg.id)}
                className="text-white/50 hover:text-white transition-colors flex-shrink-0 text-xl"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MessagePopup;