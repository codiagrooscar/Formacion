import React from 'react';
import { 
  Menu,
  ShieldCheck
} from 'lucide-react';
import { User } from 'firebase/auth';
import { CodiagroLogo } from './CodiagroLogo';

interface HeaderProps {
  activeTab: 'dashboard' | 'analytics' | 'form' | 'trainings' | 'effectiveness';
  currentUser?: User | null;
  onOpenQrModal?: () => void;
  onOpenSettingsModal?: () => void;
  onOpenAuditReportModal?: () => void;
  onOpenStrategicProposalsModal?: () => void;
  onToggleMobileSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onToggleMobileSidebar,
}) => {
  const titles: Record<string, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Cuadro de Mando & KPIs',
      subtitle: 'Seguimiento integral del plan anual y objetivos de calidad',
    },
    analytics: {
      title: 'Estadísticas & KPIs Avanzados',
      subtitle: 'Análisis multidimensional por alumno, docente, centro formativo y departamento',
    },
    trainings: {
      title: 'Plan de Acciones Formativas',
      subtitle: 'Catálogo con bonificaciones FUNDAE, costes y envío de invitaciones por email',
    },
    form: {
      title: 'Evaluación de Eficacia & Satisfacción',
      subtitle: 'Autorelleno con Gemini IA mediante cámara o subida de cuestionarios',
    },
    effectiveness: {
      title: 'Evaluación de Eficacia Post-Formación',
      subtitle: 'Evidencia documental a los 30/90 días para Cláusula 7.2 ISO 9001',
    },
  };

  const currentInfo = titles[activeTab] || titles.dashboard;

  return (
    <header className="bg-[#09101C]/95 border-b border-[#152338] text-white sticky top-0 z-20 shadow-sm backdrop-blur-md">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          
          {/* Mobile Menu Button & Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleMobileSidebar}
              className="p-2 rounded-xl bg-[#101C2E] hover:bg-[#152740] text-slate-300 lg:hidden border border-[#1A2B44] transition"
              aria-label="Abrir menú de navegación"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="lg:hidden flex items-center bg-white px-2 py-1 rounded-lg">
              <CodiagroLogo size="sm" />
            </div>

            {/* Desktop Current Section Breadcrumb */}
            <div className="hidden lg:block">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#00c282]">
                  CODIAGRO
                </span>
                <span className="text-slate-600">/</span>
                <h1 className="text-base font-bold text-white tracking-tight">
                  {currentInfo.title}
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-[#00c282] border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3" />
                  ISO 9001: 7.2
                </span>
                <span className="hidden xl:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#101C2E] text-slate-300 border border-[#1A2B44]">
                  Doc. RE0180104 (Ed. 07)
                </span>
              </div>
              <p className="text-xs text-slate-400 -mt-0.5 font-medium">
                {currentInfo.subtitle}
              </p>
            </div>
          </div>

          {/* Quick Actions & Header Tools (Cleaned up as per user preference) */}
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold bg-[#101C2E] text-slate-300 border border-[#1A2B44]">
              CODIAGRO S.A.
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
