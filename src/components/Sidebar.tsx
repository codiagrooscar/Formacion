import React, { useState } from 'react';
import { 
  BarChart3, 
  GraduationCap, 
  FileText, 
  ShieldCheck, 
  Sparkles, 
  QrCode, 
  Settings, 
  LogIn, 
  LogOut, 
  Award,
  ChevronRight,
  ExternalLink,
  Layers,
  Leaf,
  Lightbulb,
  Mail,
  TrendingUp
} from 'lucide-react';
import { User } from 'firebase/auth';
import { loginWithGoogle, logoutUser } from '../lib/firebase';
import { CodiagroLogo } from './CodiagroLogo';
import { CompanySettings } from '../types';

interface SidebarProps {
  activeTab: 'dashboard' | 'analytics' | 'form' | 'trainings' | 'effectiveness';
  setActiveTab: (tab: 'dashboard' | 'analytics' | 'form' | 'trainings' | 'effectiveness') => void;
  currentUser: User | null;
  settings?: CompanySettings;
  onOpenQrModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenAuditReportModal: () => void;
  onOpenStrategicProposalsModal: () => void;
  trainingsCount?: number;
  evaluationsCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  settings,
  onOpenQrModal,
  onOpenSettingsModal,
  onOpenAuditReportModal,
  onOpenStrategicProposalsModal,
  trainingsCount = 0,
  evaluationsCount = 0,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      await loginWithGoogle();
    } catch (error) {
      console.error('Error logging in:', error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const authorizedList = [
    settings?.adminEmail || 'alma.trilles@codiagro.com',
    ...(settings?.authorizedAdminEmails || []),
    'alma.trilles@codiagro.com',
    'codiagrooscar@gmail.com'
  ].map(e => e.toLowerCase());

  const isAdmin = currentUser?.email ? authorizedList.includes(currentUser.email.toLowerCase()) : false;

  const navItems = [
    {
      id: 'dashboard' as const,
      label: 'Cuadro de Mando',
      subtitle: 'KPIs e Indicadores ISO',
      icon: BarChart3,
      badge: null,
    },
    {
      id: 'analytics' as const,
      label: 'Estadísticas & KPIs',
      subtitle: 'Por Alumno, Docente y Centro',
      icon: TrendingUp,
      badge: 'KPIs',
      badgeColor: 'bg-[#00c282] text-slate-950',
    },
    {
      id: 'trainings' as const,
      label: 'Plan de Formación',
      subtitle: 'Bonificaciones y Convocatorias',
      icon: GraduationCap,
      badge: trainingsCount > 0 ? `${trainingsCount}` : null,
      badgeColor: 'bg-[#f59e0b] text-slate-950',
    },
    {
      id: 'form' as const,
      label: 'Evaluar Curso (IA)',
      subtitle: 'Online, Escaneo y Cámara',
      icon: Sparkles,
      badge: 'IA OCR',
      badgeColor: 'bg-[#f59e0b] text-slate-950',
    },
    {
      id: 'effectiveness' as const,
      label: 'Eficacia ISO 7.2',
      subtitle: 'Seguimiento a 30/90 días',
      icon: ShieldCheck,
      badge: 'ISO 9001',
      badgeColor: 'bg-[#00c282] text-slate-950',
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#09101C] border-r border-[#152338] text-slate-200 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#152338] bg-[#0A1220]">
        <div className="bg-white rounded-xl p-2.5 shadow-sm flex items-center justify-center">
          <CodiagroLogo size="md" />
        </div>
        <div className="mt-3">
          <h2 className="text-sm font-bold text-white tracking-tight">
            Gestión de Formación ISO 9001
          </h2>
          <p className="text-[11px] text-slate-400">
            CODIAGRO S.A. · Registro de Competencias
          </p>
        </div>
        <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-[#152338]">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00c282]">
            <ShieldCheck className="w-3.5 h-3.5" />
            ISO 9001 · 7.2
          </span>
          <span className="font-mono text-[10px] font-bold text-slate-300 bg-[#101C2E] px-2 py-0.5 rounded-md border border-[#1A2B44]" title="Código de Documento Oficial">
            RE0180104 Ed.07
          </span>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Navegación Principal
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl font-medium transition flex items-center justify-between group ${
                isActive 
                  ? 'bg-[#00a86b] text-white font-bold shadow-md' 
                  : 'bg-[#101C2E]/70 hover:bg-[#152740] text-slate-200 border border-[#1A2B44] hover:border-emerald-500/30'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition shrink-0 ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-[#182840] text-slate-300 group-hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-slate-100'}`}>
                    {item.label}
                  </div>
                  <div className={`text-[10px] truncate ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>
                    {item.subtitle}
                  </div>
                </div>
              </div>

              {item.badge && (
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 shadow-xs ${
                    isActive ? 'bg-white text-emerald-900' : (item.badgeColor || 'bg-[#1A2B44] text-slate-200')
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Strategic 5 Proposals Button */}
        <div className="pt-3 pb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Estrategia y Mejoras
        </div>

        <button
          onClick={() => {
            onOpenStrategicProposalsModal();
            if (onCloseMobile) onCloseMobile();
          }}
          className="w-full text-left px-3.5 py-2.5 rounded-xl font-medium transition flex items-center justify-between bg-purple-500/10 hover:bg-purple-500/20 text-purple-200 border border-purple-500/30 group"
        >
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center group-hover:scale-105 transition">
              <Lightbulb className="w-4 h-4 text-purple-300" />
            </div>
            <div>
              <div className="text-xs font-bold text-purple-200 group-hover:text-white transition">
                5 Mejoras Estratégicas
              </div>
              <div className="text-[10px] text-purple-300/70">FUNDAE, Matriz, Diplomas...</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-purple-400" />
        </button>

        {/* Quick Actions / ISO Tools Section */}
        <div className="pt-3 pb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Herramientas y Auditoría
        </div>

        {/* AI Audit Report */}
        <button
          onClick={() => {
            onOpenAuditReportModal();
            if (onCloseMobile) onCloseMobile();
          }}
          className="w-full text-left px-3.5 py-2.5 rounded-xl font-medium transition flex items-center justify-between bg-[#101C2E]/70 hover:bg-[#152740] text-slate-200 border border-[#1A2B44] hover:border-emerald-500/40 group"
        >
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-100 group-hover:text-emerald-300 transition">
                Informe Auditoría IA
              </div>
              <div className="text-[10px] text-slate-400">Revisión por Dirección</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-200" />
        </button>

        {/* QR Access */}
        <button
          onClick={() => {
            onOpenQrModal();
            if (onCloseMobile) onCloseMobile();
          }}
          className="w-full text-left px-3.5 py-2.5 rounded-xl font-medium transition flex items-center justify-between bg-[#101C2E]/70 hover:bg-[#152740] text-slate-200 border border-[#1A2B44] hover:border-amber-500/40 group"
        >
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center group-hover:scale-105 transition">
              <QrCode className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-100 group-hover:text-amber-300 transition">
                Acceso QR Alumnos
              </div>
              <div className="text-[10px] text-slate-400">Encuestas en el aula</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-200" />
        </button>

        {/* Settings */}
        <button
          onClick={() => {
            onOpenSettingsModal();
            if (onCloseMobile) onCloseMobile();
          }}
          className="w-full text-left px-3.5 py-2.5 rounded-xl font-medium transition flex items-center justify-between bg-[#101C2E]/70 hover:bg-[#152740] text-slate-200 border border-[#1A2B44] hover:border-slate-400 group"
        >
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#182840] text-slate-300 flex items-center justify-center group-hover:text-white transition">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-100">Configuración & Metas</div>
              <div className="text-[10px] text-slate-400">Control documental y plantilla</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-200" />
        </button>
      </div>

      {/* User / Auth Footer */}
      <div className="p-3.5 border-t border-[#152338] bg-[#0A1220]">
        {currentUser ? (
          <div className="relative">
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#101C2E] border border-[#1A2B44]">
              <div className="flex items-center gap-2.5 min-w-0">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt="User avatar"
                    className="w-8 h-8 rounded-full border border-emerald-500/40"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
                    {currentUser.displayName ? currentUser.displayName.charAt(0) : 'U'}
                  </div>
                )}
                <div className="truncate">
                  <p className="text-xs font-bold text-white truncate flex items-center gap-1">
                    {currentUser.displayName || (isAdmin ? 'Admin Oscar' : 'Usuario')}
                    {isAdmin && (
                      <span className="text-[9px] bg-emerald-500/20 text-[#00c282] px-1 py-0.2 rounded font-bold">
                        Admin
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {currentUser.email}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full py-2.5 px-3 rounded-xl bg-[#00a86b] hover:bg-[#00925d] text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm"
          >
            <LogIn className="w-4 h-4" />
            <span>Acceso Admin (Google Auth)</span>
          </button>
        )}

        <div className="mt-2 text-center">
          <p className="text-[10px] text-slate-500 font-medium">
            CODIAGRO S.A. · Sistema de Gestión Integrado
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Left Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 xl:w-72 fixed inset-y-0 left-0 z-30 shadow-xl">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#0E1310] z-10 shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
