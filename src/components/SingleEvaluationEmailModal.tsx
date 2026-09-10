import React, { useState } from 'react';
import { Mail, X, Send, CheckCircle, AlertCircle, FileText, Paperclip, Loader2, Sparkles, Key, ExternalLink, Download, Copy, Check } from 'lucide-react';
import { Evaluation, TrainingAction, CompanySettings } from '../types';
import { getEvaluationPdfBase64, generateEvaluationPdf } from '../utils/documentGenerator';

interface SingleEvaluationEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluation: Evaluation | null;
  training?: TrainingAction | null;
  settings: CompanySettings;
  onSaveSettings?: (newSettings: CompanySettings) => Promise<void>;
}

export const SingleEvaluationEmailModal: React.FC<SingleEvaluationEmailModalProps> = ({
  isOpen,
  onClose,
  evaluation,
  training,
  settings,
  onSaveSettings,
}) => {
  if (!isOpen || !evaluation) return null;

  const employeeName = evaluation.employeeName || 'Participante';
  const employeeEmail = evaluation.employeeEmail || '';
  const trainingTitle = training?.title || evaluation.trainingTitle || 'Acción Formativa';
  const trainingCode = training?.code || evaluation.trainingCode || 'RE0180104';
  const adminEmail = settings.adminEmail || 'formacioncodiagro@gmail.com';

  const defaultRecipientType = employeeEmail ? 'student' : 'admin';
  const [recipientType, setRecipientType] = useState<'student' | 'admin' | 'custom'>(defaultRecipientType);
  const [customEmail, setCustomEmail] = useState<string>(employeeEmail || adminEmail);
  const [subject, setSubject] = useState<string>(
    `📋 [CODIAGRO] Justificante Evaluación: ${employeeName} - ${trainingTitle}`
  );
  const [customNote, setCustomNote] = useState<string>('');
  const [attachPdf, setAttachPdf] = useState<boolean>(true);

  // SMTP Password & Configuration Assistant State
  const [showSmtpConfig, setShowSmtpConfig] = useState<boolean>(false);
  const [smtpUser, setSmtpUser] = useState<string>(settings.smtpUser || adminEmail);
  const [smtpPass, setSmtpPass] = useState<string>(settings.smtpPass || '');
  const [isSavingSmtp, setIsSavingSmtp] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<boolean>(false);

  const [isSending, setIsSending] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ 
    type: 'success' | 'error' | 'warning'; 
    message: string;
    isAuthError?: boolean;
    hint?: string;
  } | null>(null);

  const activeRecipientEmail = 
    recipientType === 'student' 
      ? (employeeEmail || customEmail) 
      : recipientType === 'admin' 
      ? adminEmail 
      : customEmail;

  const handleSaveSmtpPassword = async () => {
    if (!smtpPass.trim()) return;
    setIsSavingSmtp(true);
    try {
      const cleanPass = smtpPass.trim().replace(/\s+/g, '');
      const updatedSettings: CompanySettings = {
        ...settings,
        smtpUser: smtpUser.trim(),
        smtpPass: cleanPass,
      };
      if (onSaveSettings) {
        await onSaveSettings(updatedSettings);
      } else {
        await fetch('/api/db/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedSettings)
        });
      }
      setShowSmtpConfig(false);
      // Immediately retry sending with new password
      await executeSendEmail(cleanPass);
    } catch (err: any) {
      console.error('Error saving SMTP password:', err);
    } finally {
      setIsSavingSmtp(false);
    }
  };

  const executeSendEmail = async (overridePass?: string) => {
    if (!activeRecipientEmail || !activeRecipientEmail.includes('@')) {
      setFeedback({
        type: 'error',
        message: 'Por favor introduce una dirección de correo electrónico válida.'
      });
      return;
    }

    setIsSending(true);
    setFeedback(null);

    try {
      let pdfBase64 = '';
      if (attachPdf) {
        try {
          pdfBase64 = await getEvaluationPdfBase64(evaluation, settings);
        } catch (pdfErr) {
          console.warn('Error generating PDF base64 attachment, sending email without attachment:', pdfErr);
        }
      }

      const activePass = (overridePass !== undefined ? overridePass : (smtpPass || settings.smtpPass || '')).replace(/\s+/g, '');

      const response = await fetch('/api/send-individual-evaluation-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluation,
          training: training || {
            id: evaluation.trainingActionId,
            title: evaluation.trainingTitle,
            code: evaluation.trainingCode,
            department: evaluation.department
          },
          recipientEmail: activeRecipientEmail.trim(),
          recipientName: recipientType === 'student' ? employeeName : recipientType === 'admin' ? 'Responsable de Calidad / RRHH' : activeRecipientEmail,
          customSubject: subject,
          customNote,
          pdfBase64,
          settings: {
            ...settings,
            smtpUser: smtpUser.trim() || settings.smtpUser || adminEmail,
            smtpPass: activePass
          },
          smtpConfig: {
            host: settings.smtpHost || 'smtp.gmail.com',
            port: settings.smtpPort || 465,
            user: smtpUser.trim() || settings.smtpUser || adminEmail,
            pass: activePass
          }
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setFeedback({
          type: 'success',
          message: `¡Justificante enviado con éxito a ${activeRecipientEmail}! ${attachPdf ? 'Se ha adjuntado el informe oficial PDF ISO 9001.' : ''}`
        });
        setTimeout(() => {
          onClose();
        }, 2400);
      } else {
        const isAuth = result.errorCode === 'AUTH_FAILED' || 
          result.error?.includes('535') || 
          result.error?.includes('BadCredentials') || 
          result.error?.includes('Username and Password') ||
          result.error?.includes('Invalid login');

        if (isAuth) {
          setShowSmtpConfig(true);
        }

        setFeedback({
          type: 'error',
          isAuthError: isAuth,
          message: result.error || 'No se pudo enviar el correo. Revisa las credenciales SMTP.',
          hint: result.hint
        });
      }
    } catch (err: any) {
      console.error('Error sending evaluation email:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Error de conexión al enviar el correo electrónico.'
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = () => {
    executeSendEmail();
  };

  const handleOpenMailto = () => {
    const bodyText = `Hola,\n\nAdjuntamos la confirmación del cuestionario de evaluación de la formación:\n` +
      `- Acción Formativa: ${trainingTitle} (${trainingCode})\n` +
      `- Alumno/a: ${employeeName}\n` +
      `- Departamento: ${evaluation.department || 'General'}\n` +
      `- Puntuación de Satisfacción: ${evaluation.ratings?.overallSatisfaction || 0} / 5.0\n` +
      `${customNote ? `\nNota: ${customNote}\n` : ''}\n` +
      `CODIAGRO S.A. · Sistema de Gestión de Calidad ISO 9001 (RE0180104 Ed.07)`;

    const mailtoUrl = `mailto:${encodeURIComponent(activeRecipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
    window.location.href = mailtoUrl;
  };

  const handleDownloadPdf = () => {
    try {
      generateEvaluationPdf(evaluation, settings);
    } catch (err) {
      console.error('Error downloading evaluation PDF:', err);
    }
  };

  const handleCopySummary = () => {
    const text = `JUSTIFICANTE DE EVALUACIÓN OFICIAL ISO 9001 - CODIAGRO S.A.\n` +
      `Curso: ${trainingTitle} [${trainingCode}]\n` +
      `Alumno: ${employeeName} (${evaluation.employeeEmail || 'N/A'})\n` +
      `Departamento: ${evaluation.department || 'General'}\n` +
      `Fecha: ${evaluation.submissionDate || 'N/A'}\n` +
      `Puntuación: ${evaluation.ratings?.overallSatisfaction || 0}/5.0\n` +
      `Registro Oficial: RE-018-01-04 Edición 07`;
    
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
      <div className="bg-[#101C2E] rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-[#1A2B44] text-slate-100 relative my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1A2B44] pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Enviar Justificante de Evaluación
              </h3>
              <p className="text-xs text-slate-400">
                Registro RE-018-01-04 · ISO 9001:2015 Cláusula 7.2
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-[#182840] hover:bg-[#203656] text-slate-400 hover:text-white border border-[#243a5e] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Evaluation Summary Card */}
        <div className="bg-[#0A1220] rounded-2xl p-3.5 border border-[#1A2B44] mb-4 text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono font-bold text-emerald-400">[{trainingCode}]</span>
            <span className="font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md">
              ★ {evaluation.ratings?.overallSatisfaction || 0} / 5
            </span>
          </div>
          <div className="font-bold text-white text-sm mb-1">{trainingTitle}</div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
            <span>Alumno: <strong className="text-slate-200">{employeeName}</strong></span>
            <span>•</span>
            <span>Dpto: <strong className="text-slate-200">{evaluation.department || 'General'}</strong></span>
            <span>•</span>
            <span>Fecha: <strong className="text-slate-200">{evaluation.submissionDate || 'Hoy'}</strong></span>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className={`p-3.5 rounded-xl text-xs mb-4 border ${
            feedback.type === 'success' 
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
              : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
          }`}>
            <div className="flex items-start gap-2.5">
              {feedback.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1 text-left flex-1">
                <p className="font-semibold leading-snug">{feedback.message}</p>
                {feedback.hint && (
                  <p className="text-[11px] text-slate-300 leading-normal opacity-90">{feedback.hint}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Google App Password Assistant (If auth error or explicitly opened) */}
        {showSmtpConfig && (
          <div className="bg-[#0A1220] p-4 rounded-2xl border border-amber-500/40 mb-4 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                <Key className="w-4 h-4 text-amber-400" />
                <span>Configurar Contraseña de Aplicación de Google (16 letras)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowSmtpConfig(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                Ocultar
              </button>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              Google/Gmail no permite contraseñas estándar para enviar correo vía SMTP. Requiere una <strong>Contraseña de Aplicación de 16 caracteres</strong> generada en tu cuenta de Google.
            </p>

            <a
              href="https://myaccount.google.com/apppasswords"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 underline font-semibold"
            >
              <span>1. Abrir Google &gt; Contraseñas de aplicaciones</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <div className="space-y-2 pt-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  2. Pega aquí tu Contraseña de Aplicación (16 caracteres)
                </label>
                <input
                  type="password"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  placeholder="ej: abcd efgh ijkl mnop"
                  className="w-full bg-[#101C2E] border border-amber-500/50 rounded-xl px-3 py-2 text-xs font-mono text-emerald-300 placeholder:text-slate-500 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveSmtpPassword}
                  disabled={isSavingSmtp || !smtpPass.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  {isSavingSmtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                  <span>Guardar Clave y Reintentar Envío</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Form Controls */}
        <div className="space-y-3.5">
          
          {/* Recipient Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Destinatario del Correo *
              </label>
              {!showSmtpConfig && (
                <button
                  type="button"
                  onClick={() => setShowSmtpConfig(true)}
                  className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Key className="w-3 h-3" />
                  <span>Configurar SMTP / Clave</span>
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setRecipientType('student');
                  if (employeeEmail) setCustomEmail(employeeEmail);
                }}
                className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition cursor-pointer flex flex-col justify-between ${
                  recipientType === 'student'
                    ? 'bg-blue-500/20 border-blue-500/50 text-white'
                    : 'bg-[#0A1220] border-[#1A2B44] text-slate-400 hover:bg-[#182840]'
                }`}
              >
                <span className="font-bold text-white text-[11px]">👤 Al Alumno</span>
                <span className="text-[10px] truncate text-slate-300">
                  {employeeEmail || '(Ingresar manual)'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRecipientType('admin');
                  setCustomEmail(adminEmail);
                }}
                className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition cursor-pointer flex flex-col justify-between ${
                  recipientType === 'admin'
                    ? 'bg-blue-500/20 border-blue-500/50 text-white'
                    : 'bg-[#0A1220] border-[#1A2B44] text-slate-400 hover:bg-[#182840]'
                }`}
              >
                <span className="font-bold text-white text-[11px]">🏢 Calidad / RRHH</span>
                <span className="text-[10px] truncate text-slate-300">{adminEmail}</span>
              </button>

              <button
                type="button"
                onClick={() => setRecipientType('custom')}
                className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition cursor-pointer flex flex-col justify-between ${
                  recipientType === 'custom'
                    ? 'bg-blue-500/20 border-blue-500/50 text-white'
                    : 'bg-[#0A1220] border-[#1A2B44] text-slate-400 hover:bg-[#182840]'
                }`}
              >
                <span className="font-bold text-white text-[11px]">✉️ Otro Email</span>
                <span className="text-[10px] text-slate-300">Personalizado</span>
              </button>
            </div>
          </div>

          {/* Email input field */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">
              Dirección de Correo Electrónico
            </label>
            <input
              type="email"
              required
              value={recipientType === 'student' && employeeEmail ? employeeEmail : customEmail}
              onChange={(e) => setCustomEmail(e.target.value)}
              placeholder="ejemplo@codiagro.com"
              className="w-full bg-[#0A1220] border border-[#1A2B44] rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">
              Asunto del Mensaje
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-[#0A1220] border border-[#1A2B44] rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Custom Note */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">
              Mensaje o Comentarios Adicionales (Opcional)
            </label>
            <textarea
              rows={2}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Ej. Adjuntamos la confirmación oficial del cuestionario de satisfacción de la formación..."
              className="w-full bg-[#0A1220] border border-[#1A2B44] rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-hidden resize-none"
            />
          </div>

          {/* Attachment Toggle */}
          <div className="bg-[#0A1220] p-3 rounded-xl border border-[#1A2B44] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Adjuntar Justificante Oficial PDF</div>
                <div className="text-[10px] text-slate-400">Documento RE-018-01-04 Edición 07 firmado y puntuado</div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={attachPdf}
                onChange={(e) => setAttachPdf(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-[#182840] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00c282]"></div>
            </label>
          </div>

        </div>

        {/* Alternative direct actions (Mailto, Download PDF, Copy) */}
        <div className="mt-4 pt-3 border-t border-[#1A2B44] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-2.5 py-1.5 bg-[#0A1220] hover:bg-[#182840] border border-[#1A2B44] text-slate-300 hover:text-white rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition cursor-pointer"
              title="Descargar PDF en tu equipo"
            >
              <Download className="w-3 h-3 text-emerald-400" />
              <span>Descargar PDF</span>
            </button>

            <button
              type="button"
              onClick={handleOpenMailto}
              className="px-2.5 py-1.5 bg-[#0A1220] hover:bg-[#182840] border border-[#1A2B44] text-slate-300 hover:text-white rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition cursor-pointer"
              title="Abrir en tu programa de correo local (Outlook/Thunderbird/Mail)"
            >
              <Mail className="w-3 h-3 text-blue-400" />
              <span>Abrir Mailto</span>
            </button>

            <button
              type="button"
              onClick={handleCopySummary}
              className="px-2.5 py-1.5 bg-[#0A1220] hover:bg-[#182840] border border-[#1A2B44] text-slate-300 hover:text-white rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition cursor-pointer"
              title="Copiar texto resumen al portapapeles"
            >
              {copiedText ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
              <span>{copiedText ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>

          <span className="text-[10px] text-slate-500 font-mono">ISO 9001 · 7.2</span>
        </div>

        {/* Footer Actions */}
        <div className="mt-4 pt-3 border-t border-[#1A2B44] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="px-4 py-2 bg-[#182840] hover:bg-[#203656] text-slate-300 font-semibold text-xs rounded-xl border border-[#243a5e] transition cursor-pointer"
          >
            Cerrar
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={isSending}
            className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Enviando correo...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Enviar Justificante por Email</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
