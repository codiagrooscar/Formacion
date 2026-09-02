import React, { useState, useRef } from 'react';
import { 
  X, 
  Send, 
  FileText, 
  CheckCircle2, 
  UserPlus, 
  Trash2, 
  ExternalLink, 
  Copy, 
  Clock, 
  Calendar, 
  ClipboardCheck, 
  Paperclip, 
  Info, 
  FileUp, 
  AlertCircle 
} from 'lucide-react';
import { TrainingAction, TrainingAttendee, CompanySettings } from '../types';
import { getEvaluationPdfBase64 } from '../utils/documentGenerator';
import { CodiagroLogo } from './CodiagroLogo';

interface EmailInvitationsModalProps {
  training: TrainingAction;
  settings: CompanySettings;
  onClose: () => void;
  onUpdateTrainingAttendees: (trainingId: string, updatedAttendees: TrainingAttendee[]) => void;
}

type EmailWorkflowTab = 'convocation' | 'evaluation';

export default function EmailInvitationsModal({
  training,
  settings,
  onClose,
  onUpdateTrainingAttendees
}: EmailInvitationsModalProps) {
  const [activeTab, setActiveTab] = useState<EmailWorkflowTab>('convocation');
  
  const [attendees, setAttendees] = useState<TrainingAttendee[]>(
    training.attendees && training.attendees.length > 0 
      ? training.attendees 
      : [
          { id: 'att-1', name: 'Laura Martínez Gómez', email: 'laura.martinez@codiagro.com', department: training.department || 'Calidad' },
          { id: 'att-2', name: 'Carlos Ruiz Segarra', email: 'carlos.ruiz@codiagro.com', department: training.department || 'Producción' },
          { id: 'att-3', name: 'Elena Beltrán Costa', email: 'elena.beltran@codiagro.com', department: training.department || 'I+D+i' }
        ]
  );

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDept, setNewDept] = useState(training.department || 'Operaciones');
  
  // Tab 1 (Convocatoria) Form state
  const [convocationDesc, setConvocationDesc] = useState(
    training.justification || `Acción formativa oficial sobre ${training.title} orientada a la mejora de competencias y cumplimiento normativo ISO 9001.`
  );
  const [convocationNote, setConvocationNote] = useState('Rogamos puntualidad y asistencia. Se requiere confirmar asistencia en caso de incompatibilidad.');
  
  // Syllabus / Program PDF Upload state (For Pre-Course Convocation)
  const [syllabusFileName, setSyllabusFileName] = useState<string | null>(null);
  const [syllabusFileBase64, setSyllabusFileBase64] = useState<string | null>(null);
  const [syllabusFileSize, setSyllabusFileSize] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab 2 (Evaluación Post-Curso) Form state
  const [attachPdfToEmail, setAttachPdfToEmail] = useState(true);
  const [evaluationNote, setEvaluationNote] = useState('Tu valoración es imprescindible para el cumplimiento de los estándares de calidad ISO 9001.');

  const [isSending, setIsSending] = useState(false);
  const [sentSuccessCount, setSentSuccessCount] = useState<{ 
    count: number; 
    tab: EmailWorkflowTab; 
    hasPdf?: boolean;
    hasSyllabus?: boolean;
  } | null>(null);

  const [copiedLinkFor, setCopiedLinkFor] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>(attendees.map(a => a.id));

  const baseUrl = window.location.origin;

  const getEvaluationLink = (attendee?: TrainingAttendee) => {
    const params = new URLSearchParams();
    params.set('eval', 'true');
    params.set('courseId', training.id);
    if (attendee?.name) params.set('name', attendee.name);
    if (attendee?.email) params.set('email', attendee.email);
    return `${baseUrl}?${params.toString()}`;
  };

  const handleSyllabusFileUpload = (file: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Por favor selecciona un archivo en formato PDF.');
      return;
    }

    // Format size
    const sizeKb = Math.round(file.size / 1024);
    const formattedSize = sizeKb > 1024 
      ? `${(sizeKb / 1024).toFixed(1)} MB` 
      : `${sizeKb} KB`;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Content = result.split(',')[1] || '';
      setSyllabusFileName(file.name);
      setSyllabusFileBase64(base64Content);
      setSyllabusFileSize(formattedSize);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveSyllabusFile = () => {
    setSyllabusFileName(null);
    setSyllabusFileBase64(null);
    setSyllabusFileSize(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddAttendee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    const newAtt: TrainingAttendee = {
      id: `att-${Date.now()}`,
      name: newName.trim(),
      email: newEmail.trim(),
      department: newDept.trim()
    };

    const updated = [...attendees, newAtt];
    setAttendees(updated);
    setSelectedIds([...selectedIds, newAtt.id]);
    onUpdateTrainingAttendees(training.id, updated);

    setNewName('');
    setNewEmail('');
  };

  const handleRemoveAttendee = (id: string) => {
    const updated = attendees.filter(a => a.id !== id);
    setAttendees(updated);
    setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    onUpdateTrainingAttendees(training.id, updated);
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const [resendPrompt, setResendPrompt] = useState<{
    targets: TrainingAttendee[];
    previouslySent: TrainingAttendee[];
    typeLabel: string;
  } | null>(null);

  // Trigger send check
  const handleSendEmails = () => {
    const targets = attendees.filter(a => selectedIds.includes(a.id));
    if (targets.length === 0) return;

    // Check if any targeted attendee has already been sent this email before
    const previouslySentTargets = targets.filter(a => 
      activeTab === 'convocation' ? Boolean(a.convokedAt || a.invitedAt) : Boolean(a.evaluationRequestedAt)
    );

    const typeLabel = activeTab === 'convocation' ? 'convocatoria' : 'solicitud de evaluación';

    if (previouslySentTargets.length > 0) {
      setResendPrompt({
        targets,
        previouslySent: previouslySentTargets,
        typeLabel
      });
      return;
    }

    executeSendEmails(targets);
  };

  // Dispatch emails according to active tab
  const executeSendEmails = async (targets: TrainingAttendee[]) => {
    setIsSending(true);
    let success = 0;

    const now = new Date().toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const updatedAttendees = [...attendees];

    // Pre-generate PDF base64 if evaluating and requested
    let evalPdfBase64 = '';
    if (activeTab === 'evaluation' && attachPdfToEmail) {
      try {
        evalPdfBase64 = await getEvaluationPdfBase64(training, settings);
      } catch (pdfErr) {
        console.error('Error generating base64 PDF for attachment:', pdfErr);
      }
    }

    const syllabusAttachment = (syllabusFileBase64 && syllabusFileName) ? {
      filename: syllabusFileName,
      base64: syllabusFileBase64
    } : undefined;

    for (const attendee of targets) {
      try {
        if (activeTab === 'convocation') {
          // Send Pre-Course Notification / Convocation + Optional Syllabus PDF
          const res = await fetch('/api/send-convocation-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: attendee.email,
              participantName: attendee.name,
              trainingCode: training.code,
              trainingTitle: training.title,
              description: convocationDesc,
              plannedDate: training.plannedDate,
              endDate: training.endDate,
              durationHours: training.durationHours,
              modality: training.modality,
              location: training.locationOrPlatform,
              trainerName: training.trainerName,
              department: attendee.department || training.department,
              customMessage: convocationNote,
              syllabusAttachment,
              smtpConfig: {
                host: settings.smtpHost || 'smtp.gmail.com',
                port: settings.smtpPort || 465,
                user: settings.smtpUser || settings.adminEmail || 'formacioncodiagro@gmail.com',
                pass: settings.smtpPass
              }
            })
          });

          if (res.ok) {
            success++;
            const idx = updatedAttendees.findIndex(a => a.id === attendee.id);
            if (idx !== -1) {
              updatedAttendees[idx] = {
                ...updatedAttendees[idx],
                convokedAt: now,
                invitedAt: now
              };
            }
          }
        } else {
          // Send Post-Course Evaluation Request (with Web Link + PDF attached)
          const link = getEvaluationLink(attendee);
          const pdfAttachment = (attachPdfToEmail && evalPdfBase64) ? {
            filename: `Codiagro_Cuestionario_${training.code || 'RE0180104'}_Ed07.pdf`,
            base64: evalPdfBase64
          } : undefined;

          const res = await fetch('/api/send-evaluation-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: attendee.email,
              participantName: attendee.name,
              trainingCode: training.code,
              trainingTitle: training.title,
              plannedDate: training.executedDate || training.plannedDate,
              durationHours: training.durationHours,
              trainerName: training.trainerName,
              onlineLink: link,
              customMessage: evaluationNote,
              pdfAttachment,
              smtpConfig: {
                host: settings.smtpHost || 'smtp.gmail.com',
                port: settings.smtpPort || 465,
                user: settings.smtpUser || settings.adminEmail || 'formacioncodiagro@gmail.com',
                pass: settings.smtpPass
              }
            })
          });

          if (res.ok) {
            success++;
            const idx = updatedAttendees.findIndex(a => a.id === attendee.id);
            if (idx !== -1) {
              updatedAttendees[idx] = {
                ...updatedAttendees[idx],
                evaluationRequestedAt: now
              };
            }
          }
        }
      } catch (err) {
        console.error(`Error sending ${activeTab} email to`, attendee.email, err);
      }
    }

    setAttendees(updatedAttendees);
    onUpdateTrainingAttendees(training.id, updatedAttendees);
    setIsSending(false);
    setSentSuccessCount({ 
      count: success, 
      tab: activeTab, 
      hasPdf: activeTab === 'evaluation' && attachPdfToEmail,
      hasSyllabus: activeTab === 'convocation' && !!syllabusFileBase64
    });

    setTimeout(() => {
      setSentSuccessCount(null);
    }, 6000);
  };

  const handleCopySingleLink = (attendee: TrainingAttendee) => {
    const link = getEvaluationLink(attendee);
    navigator.clipboard.writeText(link);
    setCopiedLinkFor(attendee.id);
    setTimeout(() => setCopiedLinkFor(null), 2500);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-[#101C2E] rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-[#1A2B44] max-h-[94vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1A2B44] pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-xl px-2.5 py-1 shadow-xs inline-flex items-center shrink-0">
              <CodiagroLogo size="sm" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-emerald-500/15 text-[#00c282] border border-emerald-500/30">
                  {training.code}
                </span>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Comunicaciones de Formación & Calidad ISO
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                {training.title} · {training.plannedDate} · {training.durationHours}h ({training.modality || 'Presencial'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#182840] hover:bg-[#203656] text-slate-400 hover:text-slate-200 border border-[#243a5e]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* WORKFLOW TABS: Separating Pre-Course Convocation from Post-Course Evaluation */}
        <div className="mt-3 grid grid-cols-2 gap-2 bg-[#0A1220] p-1 rounded-2xl border border-[#1A2B44] shrink-0">
          <button
            onClick={() => setActiveTab('convocation')}
            className={`py-2 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
              activeTab === 'convocation'
                ? 'bg-[#00a86b] text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#182840]'
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <div className="text-left">
              <div className="leading-none font-bold">1. Convocatoria Pre-Curso</div>
              <div className="text-[10px] font-normal opacity-85 mt-0.5">Aviso previo: fechas, horas, temario PDF</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('evaluation')}
            className={`py-2 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
              activeTab === 'evaluation'
                ? 'bg-[#00a86b] text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#182840]'
            }`}
          >
            <ClipboardCheck className="w-4 h-4 shrink-0" />
            <div className="text-left">
              <div className="leading-none font-bold">2. Solicitud de Evaluación</div>
              <div className="text-[10px] font-normal opacity-85 mt-0.5">Post-curso: Web + PDF adjunto (boli)</div>
            </div>
          </button>
        </div>

        {/* TAB SPECIFIC COMPACT INFO CARD */}
        {activeTab === 'convocation' ? (
          <div className="bg-[#0A1220] p-3 rounded-2xl border border-emerald-500/20 my-2.5 space-y-2 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                Contenido del Correo de Convocatoria (Aviso Pre-Curso):
              </span>
              <span className="text-[10px] text-slate-400 bg-[#182840] px-2 py-0.5 rounded-md">
                Sin enlaces de evaluación
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Descripción / Objetivos:
                </label>
                <input
                  type="text"
                  value={convocationDesc}
                  onChange={e => setConvocationDesc(e.target.value)}
                  className="w-full bg-[#101C2E] border border-[#1A2B44] rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-[#00c282]"
                  placeholder="Descripción y competencias del curso..."
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Nota adicional de RRHH / Responsable:
                </label>
                <input
                  type="text"
                  value={convocationNote}
                  onChange={e => setConvocationNote(e.target.value)}
                  className="w-full bg-[#101C2E] border border-[#1A2B44] rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-[#00c282]"
                  placeholder="Instrucciones específicas (ej: sala, puntualidad)..."
                />
              </div>
            </div>

            {/* COMPACT SYLLABUS PDF UPLOAD SECTION */}
            <div className="pt-2 border-t border-[#1A2B44] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Paperclip className="w-3.5 h-3.5 text-[#00c282] shrink-0" />
                <div>
                  <span className="text-[11px] font-bold text-slate-200 block">
                    Adjuntar Temario / Programa en PDF <span className="text-[10px] text-slate-400 font-normal">(Opcional)</span>
                  </span>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleSyllabusFileUpload(file);
                }}
              />

              {!syllabusFileName ? (
                <div
                  onDragOver={e => { e.preventDefault(); setIsDraggingFile(true); }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setIsDraggingFile(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleSyllabusFileUpload(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`px-3 py-1.5 rounded-xl border border-dashed text-xs font-semibold cursor-pointer transition flex items-center justify-center gap-2 shrink-0 ${
                    isDraggingFile 
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300' 
                      : 'border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-[#00c282]'
                  }`}
                >
                  <FileUp className="w-3.5 h-3.5" />
                  <span>Haz clic para subir o arrastra el Temario (.PDF)</span>
                </div>
              ) : (
                <div className="bg-[#182840] border border-emerald-500/40 rounded-xl px-3 py-1.5 flex items-center gap-2.5 shrink-0 shadow-xs">
                  <FileText className="w-4 h-4 text-[#00c282] shrink-0" />
                  <div className="text-xs font-bold text-white max-w-[200px] sm:max-w-[280px] truncate">
                    {syllabusFileName}
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">({syllabusFileSize})</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[10px] text-slate-300 hover:text-white underline ml-1 cursor-pointer"
                  >
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveSyllabusFile}
                    className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                    title="Quitar temario adjunto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-[#0A1220] p-3 rounded-2xl border border-amber-500/20 my-2.5 space-y-2 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <ClipboardCheck className="w-3.5 h-3.5" />
                Contenido del Correo Post-Curso (Evaluación de Eficacia ISO 9001):
              </span>
              <span className="text-[10px] text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-md font-bold">
                Web + PDF Oficial Adjunto
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
              <div className="bg-[#101C2E] p-2.5 rounded-xl border border-[#1A2B44] flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="chk-attach-pdf-eval"
                  checked={attachPdfToEmail}
                  onChange={e => setAttachPdfToEmail(e.target.checked)}
                  className="w-4 h-4 rounded-md accent-[#00a86b] cursor-pointer shrink-0"
                />
                <label htmlFor="chk-attach-pdf-eval" className="cursor-pointer">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Paperclip className="w-3 h-3 text-[#00c282]" />
                    Adjuntar PDF oficial (RE0180104)
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Para rellenar en papel con bolígrafo.
                  </span>
                </label>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Mensaje recordatorio:
                </label>
                <input
                  type="text"
                  value={evaluationNote}
                  onChange={e => setEvaluationNote(e.target.value)}
                  className="w-full bg-[#101C2E] border border-[#1A2B44] rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-[#00c282]"
                  placeholder="Instrucciones para la entrega..."
                />
              </div>
            </div>
          </div>
        )}

        {/* Add Attendee Form */}
        <form onSubmit={handleAddAttendee} className="bg-[#0A1220] p-2.5 rounded-2xl border border-[#1A2B44] mb-2.5 shrink-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
            <UserPlus className="w-3.5 h-3.5 text-[#00c282]" />
            <span>Añadir Trabajador Convocado</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <input
              type="text"
              placeholder="Nombre y Apellidos..."
              required
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="sm:col-span-5 bg-[#101C2E] border border-[#1A2B44] rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:ring-1 focus:ring-[#00c282]"
            />
            <input
              type="email"
              placeholder="correo@codiagro.com..."
              required
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              className="sm:col-span-5 bg-[#101C2E] border border-[#1A2B44] rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:ring-1 focus:ring-[#00c282]"
            />
            <button
              type="submit"
              className="sm:col-span-2 px-3 py-1.5 bg-[#00a86b] hover:bg-[#00925d] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Añadir
            </button>
          </div>
        </form>

        {/* Attendees List - GENEROUS EXPANDED CONTAINER */}
        <div className="flex-1 min-h-[200px] flex flex-col overflow-hidden bg-[#070D17] border border-[#1A2B44] rounded-2xl p-3">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1A2B44] shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">
                Trabajadores Convocados
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-[#00c282] border border-emerald-500/30">
                {attendees.length} {attendees.length === 1 ? 'persona' : 'personas'}
              </span>
            </div>
            <button
              onClick={() => {
                if (selectedIds.length === attendees.length) {
                  setSelectedIds([]);
                } else {
                  setSelectedIds(attendees.map(a => a.id));
                }
              }}
              className="text-[11px] font-semibold text-[#00c282] hover:underline cursor-pointer"
            >
              {selectedIds.length === attendees.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {attendees.length === 0 ? (
              <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center p-4 text-slate-500">
                <UserPlus className="w-8 h-8 mb-2 opacity-40 text-slate-400" />
                <p className="text-xs font-semibold text-slate-300">No hay trabajadores convocados todavía.</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Usa el formulario superior para añadir los participantes de este curso.</p>
              </div>
            ) : (
              attendees.map(att => {
                const isSelected = selectedIds.includes(att.id);
                const isCopied = copiedLinkFor === att.id;

                return (
                  <div
                    key={att.id}
                    className={`p-2.5 sm:p-3 rounded-xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 ${
                      isSelected ? 'bg-[#0E1A2C] border-emerald-500/40 shadow-xs' : 'bg-[#0A1220]/70 border-[#1A2B44] opacity-90'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(att.id)}
                        className="w-4 h-4 rounded-md accent-[#00a86b] cursor-pointer shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white flex items-center gap-2 flex-wrap">
                          <span className="truncate">{att.name}</span>
                          {att.department && (
                            <span className="text-[10px] px-2 py-0.2 rounded-full bg-[#182840] text-slate-300">
                              {att.department}
                            </span>
                          )}
                          {att.hasCompletedEvaluation && (
                            <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Cuestionario Rellenado
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2.5 mt-0.5 flex-wrap">
                          <span className="text-slate-300 font-mono">{att.email}</span>
                          {att.convokedAt && (
                            <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                              <Calendar className="w-2.5 h-2.5" /> Convocado: {att.convokedAt}
                            </span>
                          )}
                          {att.evaluationRequestedAt && (
                            <span className="text-[10px] text-amber-400 font-medium flex items-center gap-1 bg-amber-500/10 px-1.5 py-0.2 rounded">
                              <ClipboardCheck className="w-2.5 h-2.5" /> Evaluación Pedida: {att.evaluationRequestedAt}
                            </span>
                          )}
                          {!att.convokedAt && !att.evaluationRequestedAt && att.invitedAt && (
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" /> Enviado: {att.invitedAt}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => handleCopySingleLink(att)}
                        className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-[#182840] hover:bg-[#203656] text-slate-300 border border-[#243a5e] flex items-center gap-1 cursor-pointer transition"
                        title="Copiar enlace directo personalizado de evaluación"
                      >
                        <Copy className="w-3 h-3 text-[#00c282]" />
                        {isCopied ? '¡Copiado!' : 'Enlace Web'}
                      </button>
                      <a
                        href={getEvaluationLink(att)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded-lg bg-[#182840] hover:bg-[#203656] text-slate-300 border border-[#243a5e] transition"
                        title="Abrir formulario web interactivo"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => handleRemoveAttendee(att.id)}
                        className="p-1 rounded-lg bg-[#182840] hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-[#243a5e] cursor-pointer transition"
                        title="Eliminar de la lista"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Success message */}
        {sentSuccessCount !== null && (
          <div className="mt-2.5 p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300 shrink-0">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#00c282]" />
            <span>
              {sentSuccessCount.tab === 'convocation' ? (
                <>¡Convocatoria enviada con éxito a <strong>{sentSuccessCount.count}</strong> destinatarios{sentSuccessCount.hasSyllabus ? ' con temario PDF adjunto' : ''}!</>
              ) : (
                <>¡Solicitud de evaluación enviada con éxito a <strong>{sentSuccessCount.count}</strong> participantes con enlace web{sentSuccessCount.hasPdf ? ' y PDF adjunto' : ''}!</>
              )}
            </span>
          </div>
        )}

        {/* Footer actions */}
        <div className="mt-3 pt-3 border-t border-[#1A2B44] flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400">
            Seleccionados: <span className="font-bold text-white">{selectedIds.length}</span> de {attendees.length}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#182840] hover:bg-[#203656] text-slate-300 font-semibold text-xs rounded-xl border border-[#243a5e] cursor-pointer"
            >
              Cerrar
            </button>
            <button
              onClick={handleSendEmails}
              disabled={isSending || selectedIds.length === 0}
              className="px-5 py-2 bg-[#00a86b] hover:bg-[#00925d] disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition cursor-pointer"
            >
              <Send className={`w-3.5 h-3.5 ${isSending ? 'animate-spin' : ''}`} />
              {isSending ? (
                'Enviando correos...'
              ) : activeTab === 'convocation' ? (
                `Enviar Convocatoria Pre-Curso (${selectedIds.length})`
              ) : (
                `Enviar Solicitud con PDF Adjunto (${selectedIds.length})`
              )}
            </button>
          </div>
        </div>

        {/* Custom Dark/Violet Themed Resend Confirmation Modal */}
        {resendPrompt && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-60 p-4 animate-in fade-in duration-200">
            <div className="bg-[#0B1528] border border-[#243a5e] shadow-2xl rounded-2xl p-5 sm:p-6 max-w-md w-full text-slate-200 space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">
                    {resendPrompt.typeLabel === 'convocatoria' ? 'Aviso de Reenvío de Convocatoria' : 'Aviso de Reenvío de Evaluación'}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {resendPrompt.previouslySent.length === 1 ? (
                      <>
                        El <span className="text-amber-400 font-semibold font-mono">{resendPrompt.previouslySent[0].convokedAt || resendPrompt.previouslySent[0].invitedAt || resendPrompt.previouslySent[0].evaluationRequestedAt}</span> ya se envió una {resendPrompt.typeLabel} a <strong className="text-white">{resendPrompt.previouslySent[0].name}</strong>.
                      </>
                    ) : (
                      <>
                        A los siguientes <strong className="text-white">{resendPrompt.previouslySent.length} trabajadores</strong> ya se les envió una {resendPrompt.typeLabel} anteriormente:
                      </>
                    )}
                  </p>
                </div>
              </div>

              {resendPrompt.previouslySent.length > 1 && (
                <div className="max-h-36 overflow-y-auto rounded-xl bg-[#070D18] border border-[#1A2B44] p-3 space-y-1.5 text-[11px] text-slate-300 divide-y divide-[#1A2B44]/50">
                  {resendPrompt.previouslySent.map(a => (
                    <div key={a.id} className="flex items-center justify-between gap-2 pt-1.5 first:pt-0">
                      <span className="font-semibold text-white truncate">• {a.name}</span>
                      <span className="text-[10px] text-amber-400/90 shrink-0 font-mono">
                        {activeTab === 'convocation' ? (a.convokedAt || a.invitedAt) : a.evaluationRequestedAt}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-3 bg-[#111C2E] border border-[#1A2B44] rounded-xl text-xs text-emerald-300 font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>¿Quieres volver a enviarla de nuevo?</span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setResendPrompt(null)}
                  className="px-4 py-2 bg-[#182840] hover:bg-[#203656] text-slate-300 font-semibold text-xs rounded-xl border border-[#243a5e] transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const targetsToSend = resendPrompt.targets;
                    setResendPrompt(null);
                    executeSendEmails(targetsToSend);
                  }}
                  className="px-5 py-2 bg-[#00a86b] hover:bg-[#00925d] text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
