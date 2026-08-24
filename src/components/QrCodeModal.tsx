import React, { useState } from 'react';
import { QrCode, Copy, Check, X, Share2, Smartphone, ExternalLink } from 'lucide-react';
import { CodiagroLogo } from './CodiagroLogo';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToForm: () => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  isOpen,
  onClose,
  onNavigateToForm,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentUrl = window.location.href.split('#')[0];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-[#101C2E] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#1A2B44] text-center">
        
        <div className="flex items-center justify-between border-b border-[#1A2B44] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="bg-white rounded-xl px-2.5 py-1 shadow-xs inline-flex items-center shrink-0">
              <CodiagroLogo size="sm" />
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#182840] hover:bg-[#203656] text-slate-400 hover:text-slate-200 border border-[#243a5e]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <h4 className="text-base font-bold text-white mb-1">
          Acceso Rápido para Alumnos CODIAGRO
        </h4>
        <p className="text-xs text-slate-400 mb-5">
          Proyecta este código QR en el aula para que los asistentes respondan la encuesta inmediatamente desde su smartphone.
        </p>

        {/* Visual Crisp SVG QR Code */}
        <div className="bg-[#0A1220] p-6 rounded-2xl border border-[#1A2B44] inline-block shadow-inner mb-4">
          <div className="w-48 h-48 bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-center relative shadow-sm">
            {/* Crisp QR Vector Graphic */}
            <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900">
              {/* Corner 1 */}
              <rect x="5" y="5" width="30" height="30" fill="currentColor" rx="4" />
              <rect x="10" y="10" width="20" height="20" fill="white" rx="2" />
              <rect x="15" y="15" width="10" height="10" fill="currentColor" rx="1" />
              
              {/* Corner 2 */}
              <rect x="65" y="5" width="30" height="30" fill="currentColor" rx="4" />
              <rect x="70" y="10" width="20" height="20" fill="white" rx="2" />
              <rect x="75" y="15" width="10" height="10" fill="currentColor" rx="1" />
              
              {/* Corner 3 */}
              <rect x="5" y="65" width="30" height="30" fill="currentColor" rx="4" />
              <rect x="10" y="70" width="20" height="20" fill="white" rx="2" />
              <rect x="15" y="75" width="10" height="10" fill="currentColor" rx="1" />

              {/* Data Blocks */}
              <rect x="42" y="10" width="8" height="8" fill="currentColor" />
              <rect x="52" y="18" width="6" height="6" fill="currentColor" />
              <rect x="42" y="28" width="12" height="6" fill="currentColor" />
              <rect x="10" y="42" width="6" height="12" fill="currentColor" />
              <rect x="22" y="42" width="8" height="8" fill="currentColor" />
              <rect x="34" y="42" width="16" height="16" fill="currentColor" />
              <rect x="54" y="38" width="10" height="10" fill="currentColor" />
              <rect x="68" y="42" width="8" height="8" fill="currentColor" />
              <rect x="80" y="42" width="10" height="6" fill="currentColor" />
              <rect x="42" y="62" width="10" height="8" fill="currentColor" />
              <rect x="56" y="56" width="12" height="12" fill="currentColor" />
              <rect x="74" y="58" width="8" height="16" fill="currentColor" />
              <rect x="42" y="76" width="16" height="14" fill="currentColor" />
              <rect x="62" y="76" width="8" height="8" fill="currentColor" />
              <rect x="74" y="80" width="16" height="10" fill="currentColor" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-8 h-8 rounded-lg bg-[#00a86b] text-white flex items-center justify-center font-extrabold text-[10px] shadow-md border-2 border-white">
                ISO
              </div>
            </div>
          </div>
        </div>

        {/* Copy Link Input */}
        <div className="flex items-center gap-2 bg-[#0A1220] border border-[#1A2B44] rounded-xl p-1.5 mb-4">
          <input
            type="text"
            readOnly
            value={currentUrl}
            className="w-full text-xs bg-transparent px-2 text-slate-300 font-mono outline-hidden truncate"
          />
          <button
            onClick={handleCopyLink}
            className="px-3 py-1.5 bg-[#00a86b] hover:bg-[#00925d] text-white rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0 transition shadow-xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copiar
              </>
            )}
          </button>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => {
              onClose();
              onNavigateToForm();
            }}
            className="w-full py-2.5 bg-[#00a86b] hover:bg-[#00925d] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
          >
            Abrir Formulario en Pantalla Completa →
          </button>
        </div>
      </div>
    </div>
  );
};
