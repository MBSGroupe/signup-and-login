import { useState } from 'react';
import { ZoomIn, ZoomOut, Maximize, ExternalLink, File, Image, FileText } from 'lucide-react';

export default function FilePreviewWithZoom({ file }) {
  const [zoom, setZoom] = useState(1);

  const zoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const zoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.25));
  const resetZoom = () => setZoom(1);

  const imageFormats = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'];
  const isImage = imageFormats.includes(file.type?.toLowerCase());
  const isPdf = file.type?.toLowerCase() === 'pdf';

  return (
    <div className="space-y-3">
      {/* File name with icon */}
      <div className="flex items-center gap-2">
        {isImage ? (
          <Image className="w-4 h-4 text-emerald-400" />
        ) : isPdf ? (
          <FileText className="w-4 h-4 text-rose-400" />
        ) : (
          <File className="w-4 h-4 text-[#64748B]" />
        )}
        <p className="text-sm font-medium text-[#F8FAFC] truncate">{file.fileName}</p>
      </div>

      {/* Preview container */}
      <div className="relative bg-[#0A0F1C] rounded-xl border border-[rgba(255,255,255,0.06)] overflow-hidden">
        {/* Zoom controls – positioned top-right over the preview */}
        {isImage && (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-[#111827]/90 backdrop-blur-sm rounded-lg border border-[rgba(255,255,255,0.06)] p-1 shadow-lg">
            <button
              onClick={zoomOut}
              className="p-1.5 rounded hover:bg-[#1F2937] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
              title="Zoom arrière"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs text-[#94A3B8] min-w-[40px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={zoomIn}
              className="p-1.5 rounded hover:bg-[#1F2937] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
              title="Zoom avant"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={resetZoom}
              className="p-1.5 rounded hover:bg-[#1F2937] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
              title="Réinitialiser"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Preview area */}
        <div className="flex items-center justify-center min-h-[200px] p-4">
          {isImage ? (
            <div className="overflow-auto max-h-[400px] w-full flex items-center justify-center">
              <img
                src={file.url}
                alt={file.fileName}
                className="transition-transform duration-200 ease-out"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center center',
                  maxWidth: '100%',
                  height: 'auto',
                  maxHeight: '400px',
                  objectFit: 'contain'
                }}
              />
            </div>
          ) : isPdf ? (
            <iframe
              src={file.url}
              title={file.fileName}
              className="w-full h-[400px] rounded-lg"
              frameBorder="0"
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-[#64748B]">
              <File className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Prévisualisation non disponible</p>
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-all text-sm font-medium"
              >
                <ExternalLink className="w-4 h-4" />
                Ouvrir le fichier
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Quick file info – optional */}
      <div className="text-xs text-[#64748B] flex items-center gap-4">
        <span>Type: {file.type || 'Inconnu'}</span>
        {file.size && <span>• {(file.size / 1024).toFixed(1)} KB</span>}
      </div>
    </div>
  );
}