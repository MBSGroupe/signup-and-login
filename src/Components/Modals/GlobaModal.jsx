// Components/GlobalModal.jsx
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-yellow-400/20 shadow-xl animate-fadeIn">
        <h3 className="text-lg font-semibold text-yellow-400 mb-2">{title}</h3>
        <p className="text-gray-300 mb-6">{message}</p>

        {isPrompt && (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={inputPlaceholder}
            className="w-full p-2 mb-4 bg-gray-700 border border-gray-600 rounded text-gray-200 focus:outline-none focus:border-yellow-400"
            autoFocus
          />
        )}

        <div className="flex justify-end gap-3">
          {(isConfirm || isPrompt) && (
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition"
            >
              Annuler
            </button>
          )}
          <button
            onClick={isPrompt ? () => onConfirm(inputValue) : onConfirm}
            className={`px-4 py-2 rounded-lg transition ${
              isAlert
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-yellow-600 hover:bg-yellow-700 text-white'
            }`}
          >
            {isAlert ? 'OK' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
}