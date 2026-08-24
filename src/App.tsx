/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { AppStorage } from './lib/storage';
import { TrainingAction, Evaluation, EffectivenessFollowup, CompanySettings } from './types';
import { INITIAL_SETTINGS } from './data/initialData';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { EvaluationForm } from './components/EvaluationForm';
import { TrainingActionsList } from './components/TrainingActionsList';
import { EffectivenessTracker } from './components/EffectivenessTracker';
import { AnalyticsView } from './components/AnalyticsView';
import { QrCodeModal } from './components/QrCodeModal';
import { AuditReportModal } from './components/AuditReportModal';
import { SettingsModal } from './components/SettingsModal';
import StrategicProposalsModal from './components/StrategicProposalsModal';
import { CodiagroLogo } from './components/CodiagroLogo';
import { loginWithGoogle } from './lib/firebase';
import { Sparkles, Loader2, Bell, ShieldCheck, Lock, ArrowLeft } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analytics' | 'form' | 'trainings' | 'effectiveness'>('dashboard');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isAttendeePortalMode, setIsAttendeePortalMode] = useState<boolean>(false);

  // Application Data States
  const [trainings, setTrainings] = useState<TrainingAction[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [followups, setFollowups] = useState<EffectivenessFollowup[]>([]);
  const [settings, setSettings] = useState<CompanySettings>(INITIAL_SETTINGS);

  // Preselected course for direct evaluation
  const [preselectedTrainingId, setPreselectedTrainingId] = useState<string | undefined>(undefined);

  // Modals state
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isStrategicProposalsModalOpen, setIsStrategicProposalsModalOpen] = useState<boolean>(false);

  // In-app Push Notification Toast
  const [notificationToast, setNotificationToast] = useState<{
    show: boolean;
    title: string;
    message: string;
    timestamp: string;
  } | null>(null);

  // Request browser push notification permission on first interaction
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {
        // user denied or closed
      });
    }
  }, []);

  // Load initial data and parse URL query params
  useEffect(() => {
    const initApp = async () => {
      try {
        setIsLoading(true);
        const [loadedTrainings, loadedEvals, loadedFollowups, loadedSettings] = await Promise.all([
          AppStorage.getTrainingActions(),
          AppStorage.getEvaluations(),
          AppStorage.getFollowups(),
          AppStorage.getSettings(),
        ]);

        setTrainings(loadedTrainings);
        setEvaluations(loadedEvals);
        setFollowups(loadedFollowups);
        setSettings(loadedSettings);

        // Check URL Search Params for Direct Evaluation link (from invitation email)
        const params = new URLSearchParams(window.location.search);
        const evalParam = params.get('eval');
        const courseIdParam = params.get('courseId');
        const courseCodeParam = params.get('courseCode');
        const modeParam = params.get('mode');

        if (modeParam === 'rrhh' || modeParam === 'company') {
          // RRHH / Empresa completion mode: full access with navigation to main dashboard
          setActiveTab('form');
          setIsAttendeePortalMode(false);
          if (courseIdParam) {
            setPreselectedTrainingId(courseIdParam);
          } else if (courseCodeParam) {
            const foundCourse = loadedTrainings.find(t => t.code === courseCodeParam);
            if (foundCourse) {
              setPreselectedTrainingId(foundCourse.id);
            }
          }
        } else if (evalParam === 'true' || modeParam === 'attendee' || (courseIdParam && modeParam !== 'admin') || (courseCodeParam && modeParam !== 'admin')) {
          setActiveTab('form');
          setIsAttendeePortalMode(true);
          if (courseIdParam) {
            setPreselectedTrainingId(courseIdParam);
          } else if (courseCodeParam) {
            const foundCourse = loadedTrainings.find(t => t.code === courseCodeParam);
            if (foundCourse) {
              setPreselectedTrainingId(foundCourse.id);
            }
          }
        }
        // Daily Digest Check (matinal check for pending questionnaires, only sent if count > 0)
        if (loadedSettings.dailyPendingDigestEnabled !== false) {
          fetch('/api/check-pending-evaluations-daily-digest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              trainings: loadedTrainings,
              evaluations: loadedEvals,
              settings: loadedSettings,
              adminEmail: loadedSettings.adminEmail || 'alma.trilles@codiagro.com',
              forceCheck: false,
            }),
          }).catch((e) => {
            // Silently catch in background if offline
            console.warn('[Daily Digest] Check status:', e);
          });
        }
      } catch (err) {
        console.error('Error loading initial data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initApp();

    // Listen to Firebase Auth
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  // Show Push Notification Helper (Browser Notification + In-App Toast)
  const triggerPushNotification = (title: string, body: string) => {
    // 1. In-app toast banner
    setNotificationToast({
      show: true,
      title,
      message: body,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    setTimeout(() => {
      setNotificationToast(null);
    }, 6500);

    // 2. Web Browser Native Notification (if permitted)
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico'
        });
      } catch (err) {
        console.warn('Native notification error:', err);
      }
    }
  };

  // Handlers for data updates
  const handleEvaluationSubmitted = async (evalData: Omit<Evaluation, 'id'>, existingId?: string) => {
    // 1. Save or update evaluation in database
    let savedEval: Evaluation;
    if (existingId) {
      savedEval = {
        ...evalData,
        id: existingId
      };
      await AppStorage.saveEvaluation(savedEval);
    } else {
      savedEval = await AppStorage.addEvaluation(evalData);
    }
    
    // 2. Update attendee status in training action if matched
    const trainingToUpdate = trainings.find(t => t.id === evalData.trainingActionId);
    if (trainingToUpdate && trainingToUpdate.attendees) {
      const updatedAttendees = trainingToUpdate.attendees.map(att => {
        if (
          (evalData.employeeEmail && att.email.toLowerCase() === evalData.employeeEmail.toLowerCase()) ||
          (evalData.employeeName && att.name.toLowerCase() === evalData.employeeName.toLowerCase())
        ) {
          return {
            ...att,
            hasCompletedEvaluation: true,
            completedAt: new Date().toISOString(),
            evaluationId: savedEval.id
          };
        }
        return att;
      });

      await AppStorage.saveTrainingAction({
        ...trainingToUpdate,
        attendees: updatedAttendees
      });
    }

    const updatedEvals = await AppStorage.getEvaluations();
    const updatedTrainings = await AppStorage.getTrainingActions();
    setEvaluations(updatedEvals);
    setTrainings(updatedTrainings);

    // 3. Trigger Browser & In-App Push Notification
    triggerPushNotification(
      existingId ? `💾 Cuestionario Guardado / Actualizado [${evalData.trainingCode}]` : `🔔 Nuevo Cuestionario Rellenado [${evalData.trainingCode}]`,
      `${evalData.employeeName || 'Participante'} - Nota: ★ ${(evalData.ratings.weightedScore || evalData.ratings.overallSatisfaction).toFixed(2)}/5.`
    );

    // 4. Notify Admin via Backend API Email Dispatch ONLY when a student submits their questionnaire
    // (Do NOT send email if this is an RRHH completion/update or if RRHH has already evaluated)
    const isRrhhCompleted = Boolean(
      evalData.ratings?.companyEvaluation && 
      ((evalData.ratings.companyEvaluation.capacityImprovement && evalData.ratings.companyEvaluation.capacityImprovement > 0) ||
       (evalData.ratings.companyEvaluation.attitudeImprovement && evalData.ratings.companyEvaluation.attitudeImprovement > 0) ||
       (evalData.ratings.companyEvaluation.skillsAcquisition && evalData.ratings.companyEvaluation.skillsAcquisition > 0) ||
       (evalData.ratings.meanCompany && evalData.ratings.meanCompany > 0))
    );

    const isStudentFirstSubmission = !existingId && !isRrhhCompleted;

    if (isStudentFirstSubmission) {
      try {
        const appUrl = window.location.origin;
        await fetch('/api/notify-admin-evaluation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adminEmail: settings.adminEmail || 'alma.trilles@codiagro.com',
            trainingCode: evalData.trainingCode,
            trainingTitle: evalData.trainingTitle,
            courseId: evalData.trainingActionId,
            evaluationId: savedEval.id,
            employeeName: evalData.employeeName || 'Participante',
            department: evalData.department,
            rating: evalData.ratings.weightedScore ? evalData.ratings.weightedScore.toFixed(2) : (evalData.ratings.overallSatisfaction ? evalData.ratings.overallSatisfaction.toFixed(2) : undefined),
            overallSatisfaction: evalData.ratings.overallSatisfaction,
            highlightedStrengths: evalData.qualitative?.highlightedStrengths,
            actionPlanCommitment: evalData.qualitative?.actionPlanCommitment,
            appUrl,
            smtpConfig: {
              host: settings.smtpHost || 'smtp.office365.com',
              port: settings.smtpPort || 587,
              user: settings.smtpUser || settings.adminEmail || 'alma.trilles@codiagro.com',
              pass: settings.smtpPass
            }
          })
        });
      } catch (notifyErr) {
        console.warn('Admin email notification attempt:', notifyErr);
      }
    }
  };

  const handleSaveTraining = async (action: TrainingAction) => {
    await AppStorage.saveTrainingAction(action);
    const updatedTrainings = await AppStorage.getTrainingActions();
    setTrainings(updatedTrainings);
  };

  const handleDeleteTraining = async (id: string) => {
    await AppStorage.deleteTrainingAction(id);
    const updatedTrainings = await AppStorage.getTrainingActions();
    setTrainings(updatedTrainings);
  };

  const handleSaveFollowup = async (followup: EffectivenessFollowup) => {
    await AppStorage.saveFollowup(followup);
    const updatedFollowups = await AppStorage.getFollowups();
    setFollowups(updatedFollowups);
  };

  const handleDeleteFollowup = async (id: string) => {
    await AppStorage.deleteFollowup(id);
    const updatedFollowups = await AppStorage.getFollowups();
    setFollowups(updatedFollowups);
  };

  const handleDeleteEvaluation = async (id: string) => {
    await AppStorage.deleteEvaluation(id);
    const [updatedEvals, updatedTrainings] = await Promise.all([
      AppStorage.getEvaluations(),
      AppStorage.getTrainingActions()
    ]);
    setEvaluations(updatedEvals);
    setTrainings(updatedTrainings);
  };

  const handleSaveSettings = async (newSettings: CompanySettings) => {
    await AppStorage.saveSettings(newSettings);
    setSettings(newSettings);
  };

  const handleResetToDemo = async () => {
    await AppStorage.resetToInitialDemo();
    const [t, e, f, s] = await Promise.all([
      AppStorage.getTrainingActions(),
      AppStorage.getEvaluations(),
      AppStorage.getFollowups(),
      AppStorage.getSettings(),
    ]);
    setTrainings(t);
    setEvaluations(e);
    setFollowups(f);
    setSettings(s);
  };

  const handleSelectForEvaluation = (trainingId: string) => {
    setPreselectedTrainingId(trainingId);
    setActiveTab('form');
  };

  const authorizedAdmins = [
    settings.adminEmail || 'codiagrooscar@gmail.com',
    ...(settings.authorizedAdminEmails || []),
    'codiagrooscar@gmail.com'
  ].map(e => e.toLowerCase());

  const isAdmin = currentUser?.email ? authorizedAdmins.includes(currentUser.email.toLowerCase()) : false;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09101C] flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
        <h2 className="text-lg font-bold text-slate-100">Cargando Plan de Formación CODIAGRO...</h2>
        <p className="text-xs text-slate-400 mt-1">Conectando con base de datos Firebase ISO 9001</p>
      </div>
    );
  }

  // RESTRICTED ATTENDEE EVALUATION PORTAL (When entering via email link or QR)
  if (isAttendeePortalMode) {
    return (
      <div className="min-h-screen bg-[#09101C] text-slate-200 flex flex-col font-sans antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
        {/* Attendee Portal Navbar */}
        <header className="bg-[#101C2E] border-b border-[#1A2B44] sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <CodiagroLogo className="h-8 w-auto" />
            <div className="hidden sm:block h-5 w-px bg-slate-700" />
            <div className="hidden sm:flex flex-col">
              <span className="text-xs font-bold text-white tracking-wide">Portal de Evaluación del Alumno</span>
              <span className="text-[11px] text-slate-400">Sistema de Gestión de Calidad ISO 9001:2015</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-mono font-bold tracking-wider">
              {settings.documentCode || 'RE0180104'} · Ed. {settings.documentEdition || '07'}
            </span>
          </div>
        </header>

        {/* Main Content: Only the Evaluation Form */}
        <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
          <EvaluationForm
            key={preselectedTrainingId || 'attendee-portal-eval'}
            trainings={trainings}
            evaluations={evaluations}
            settings={settings}
            onEvaluationSubmitted={handleEvaluationSubmitted}
            preselectedTrainingId={preselectedTrainingId}
            isAttendeeView={true}
          />
        </main>

        {/* Footer */}
        <footer className="py-6 border-t border-[#1A2B44]/60 text-center text-xs text-slate-500">
          CODIAGRO S.A. · Departamento de Calidad & Recursos Humanos · Registro RE0180104 Ed.07
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09101C] text-slate-200 flex font-sans antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
      
      {/* Toast Notification for Form Submissions / Real-Time Push */}
      {notificationToast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-[#101C2E] border-2 border-emerald-500/60 rounded-2xl p-4 shadow-2xl animate-bounce">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-[#00c282] border border-emerald-500/40 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-white truncate">{notificationToast.title}</p>
                <span className="text-[10px] text-slate-400 font-mono">{notificationToast.timestamp}</span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{notificationToast.message}</p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Email enviado a {settings.adminEmail || 'Admin'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Left Sidebar (Desktop) + Slide-out Drawer (Mobile) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab !== 'form') setPreselectedTrainingId(undefined);
          setActiveTab(tab);
        }}
        currentUser={currentUser}
        settings={settings}
        onOpenQrModal={() => setIsQrModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenAuditReportModal={() => setIsAuditModalOpen(true)}
        onOpenStrategicProposalsModal={() => setIsStrategicProposalsModalOpen(true)}
        trainingsCount={trainings.length}
        evaluationsCount={evaluations.length}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 xl:pl-72">
        {/* Top Header / Action Bar */}
        <Header
          activeTab={activeTab}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
        />

        {/* Page Views Container */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
          {activeTab === 'dashboard' && (
            <Dashboard
              trainings={trainings}
              evaluations={evaluations}
              followups={followups}
              settings={settings}
              onNavigateToForm={() => setActiveTab('form')}
              onNavigateToAnalytics={() => setActiveTab('analytics')}
              onOpenAuditReportModal={() => setIsAuditModalOpen(true)}
              onOpenSettings={() => setIsSettingsModalOpen(true)}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView
              trainings={trainings}
              evaluations={evaluations}
              followups={followups}
              settings={settings}
              onSelectCourse={(trainingId) => {
                setPreselectedTrainingId(trainingId);
                setActiveTab('trainings');
              }}
            />
          )}

          {activeTab === 'form' && (
            <EvaluationForm
              key={preselectedTrainingId || 'default-eval-form'}
              trainings={trainings}
              evaluations={evaluations}
              settings={settings}
              onEvaluationSubmitted={handleEvaluationSubmitted}
              preselectedTrainingId={preselectedTrainingId}
              onNavigateToMain={() => {
                window.history.pushState({}, '', window.location.pathname);
                setActiveTab('dashboard');
              }}
            />
          )}

          {activeTab === 'trainings' && (
            <TrainingActionsList
              trainings={trainings}
              evaluations={evaluations}
              settings={settings}
              onSaveTraining={handleSaveTraining}
              onDeleteTraining={handleDeleteTraining}
              onDeleteEvaluation={handleDeleteEvaluation}
              onSelectForEvaluation={handleSelectForEvaluation}
            />
          )}

          {activeTab === 'effectiveness' && (
            <EffectivenessTracker
              trainings={trainings}
              followups={followups}
              evaluations={evaluations}
              settings={settings}
              onSaveFollowup={handleSaveFollowup}
              onDeleteFollowup={handleDeleteFollowup}
              onDeleteEvaluation={handleDeleteEvaluation}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <QrCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        onNavigateToForm={() => {
          setIsQrModalOpen(false);
          setActiveTab('form');
        }}
      />

      <AuditReportModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        trainings={trainings}
        settings={settings}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        trainings={trainings}
        evaluations={evaluations}
        onSaveSettings={handleSaveSettings}
        onResetToDemo={handleResetToDemo}
      />

      {isStrategicProposalsModalOpen && (
        <StrategicProposalsModal
          onClose={() => setIsStrategicProposalsModalOpen(false)}
        />
      )}

    </div>
  );
}
