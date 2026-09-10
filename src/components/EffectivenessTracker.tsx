import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  UserCheck, 
  AlertCircle, 
  Plus, 
  Calendar, 
  Award, 
  Check, 
  X,
  FileCheck,
  Star,
  Pencil,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { TrainingAction, EffectivenessFollowup, CompanySettings, Evaluation } from '../types';

interface EffectivenessTrackerProps {
  trainings: TrainingAction[];
  followups: EffectivenessFollowup[];
  evaluations?: Evaluation[];
  settings: CompanySettings;
  onSaveFollowup: (followup: EffectivenessFollowup) => Promise<void>;
  onDeleteFollowup?: (id: string) => Promise<void>;
  onDeleteEvaluation?: (id: string) => Promise<void>;
}

export const EffectivenessTracker: React.FC<EffectivenessTrackerProps> = ({
  trainings,
  followups,
  settings,
  onSaveFollowup,
  onDeleteFollowup,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFollowupId, setEditingFollowupId] = useState<string | null>(null);
  const [selectedTrainingId, setSelectedTrainingId] = useState<string>(trainings[0]?.id || '');
  const [employeeName, setEmployeeName] = useState<string>('');
  const [employeeDepartment, setEmployeeDepartment] = useState<string>(settings.departments[0] || '');
  const [managerName, setManagerName] = useState<string>('');
  const [periodDays, setPeriodDays] = useState<30 | 60 | 90>(60);
  const [performanceImprovementRating, setPerformanceImprovementRating] = useState<number>(5);
  const [knowledgeApplied, setKnowledgeApplied] = useState<boolean>(true);
  const [goalsAchieved, setGoalsAchieved] = useState<boolean>(true);
  const [comments, setComments] = useState<string>('');
  const [evaluationDate, setEvaluationDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // Delete confirmation state
  const [deletingFollowup, setDeletingFollowup] = useState<EffectivenessFollowup | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const completedTrainings = trainings.filter((t) => t.status === 'completed');

  const handleOpenNewModal = () => {
    setEditingFollowupId(null);
    setSelectedTrainingId(completedTrainings[0]?.id || trainings[0]?.id || '');
    setEmployeeName('');
    setEmployeeDepartment(settings.departments[0] || 'Producción e Ingeniería');
    setManagerName('Responsable de Departamento');
    setPeriodDays(60);
    setPerformanceImprovementRating(5);
    setKnowledgeApplied(true);
    setGoalsAchieved(true);
    setEvaluationDate(new Date().toISOString().slice(0, 10));
    setComments('Se comprueba que el empleado aplica las metodologías y herramientas aprendidas.');
    setIsModalOpen(true);
  };

  const handleEditFollowup = (f: EffectivenessFollowup) => {
    setEditingFollowupId(f.id);
    // Find matching course by id, code, or title
    const matchingCourse = trainings.find(
      (t) => t.id === f.trainingActionId || (f.trainingCode && t.code === f.trainingCode) || t.title === f.trainingTitle
    );
    setSelectedTrainingId(matchingCourse ? matchingCourse.id : (f.trainingActionId || trainings[0]?.id || ''));
    setEmployeeName(f.employeeName || '');
    setEmployeeDepartment(f.employeeDepartment || settings.departments[0] || 'Calidad y Medio Ambiente (ISO)');
    setManagerName(f.managerName || 'Responsable de Calidad');
    setPeriodDays(f.periodDays || 60);
    setPerformanceImprovementRating(f.performanceImprovementRating || 5);
    setKnowledgeApplied(f.knowledgeApplied ?? true);
    setGoalsAchieved(f.goalsAchieved ?? true);
    setEvaluationDate(f.evaluationDate || new Date().toISOString().slice(0, 10));
    setComments(f.comments || '');
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingFollowup || !onDeleteFollowup) return;
    try {
      setIsDeleting(true);
      await onDeleteFollowup(deletingFollowup.id);
      setDeletingFollowup(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeName.trim()) {
      return;
    }

    // Find course or fallback gracefully
    const course = trainings.find((t) => t.id === selectedTrainingId) ||
                   trainings.find((t) => t.code === selectedTrainingId) ||
                   trainings.find((t) => t.title === selectedTrainingId) ||
                   trainings[0];

    const currentEditingFollowup = editingFollowupId ? followups.find((f) => f.id === editingFollowupId) : null;

    const courseId = course?.id || selectedTrainingId || currentEditingFollowup?.trainingActionId || `act-${Date.now()}`;
    const courseTitle = course?.title || currentEditingFollowup?.trainingTitle || 'Acción Formativa';
    const courseCode = course?.code || currentEditingFollowup?.trainingCode || '26001';

    const followupToSave: EffectivenessFollowup = {
      id: editingFollowupId || `fol-${Date.now()}`,
      trainingActionId: courseId,
      trainingCode: courseCode,
      trainingTitle: courseTitle,
      employeeName: employeeName.trim(),
      employeeDepartment: employeeDepartment || settings.departments[0] || 'Calidad y Medio Ambiente (ISO)',
      managerName: managerName.trim() || 'Responsable Evaluador',
      evaluationDate: evaluationDate || new Date().toISOString().slice(0, 10),
      periodDays: Number(periodDays) as (30 | 60 | 90),
      performanceImprovementRating: Number(performanceImprovementRating) || 5,
      knowledgeApplied: Boolean(knowledgeApplied),
      goalsAchieved: Boolean(goalsAchieved),
      comments: comments ? comments.trim() : '',
      status: 'completed',
    };

    try {
      setIsSaving(true);
      await onSaveFollowup(followupToSave);
      setIsModalOpen(false);
      setEditingFollowupId(null);
    } catch (err) {
      console.error('Error al guardar evaluación de eficacia:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div id="effectiveness-tracker-container" className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-[#101C2E] rounded-2xl p-5 sm:p-6 border border-[#1A2B44] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Evaluación de la Eficacia de la Formación
              </h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-[#00c282] border border-emerald-500/30">
                ISO 9001:2015 Apartado 7.2
              </span>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-[#0A1220] text-slate-300 border border-[#1A2B44]">
                Doc: {settings.documentCode || 'RE0180104'} (Ed. {settings.documentEdition || '07'})
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
              Seguimiento a los 30, 60 o 90 días por parte del responsable directo para evaluar la transferencia real de los conocimientos al puesto de trabajo y la consecución de objetivos.
            </p>
          </div>

          <button
            id="effectiveness-btn-new"
            onClick={handleOpenNewModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-[#00a86b] hover:bg-[#00925d] text-white shadow-sm transition shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + Evaluar Eficacia de Empleado
          </button>
        </div>
      </div>

      {/* ISO Requirement Guide Box */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#101C2E] p-5 rounded-2xl border border-[#1A2B44] shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center justify-center mb-3">
            <Clock className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-sm text-white">1. Evaluación Inmediata (Nivel 1 y 2)</h3>
          <p className="text-xs text-slate-400 mt-1">
            Realizada por los alumnos al terminar el curso mediante el cuestionario online o escaneado con IA. Mide satisfacción y aprendizaje.
          </p>
        </div>

        <div className="bg-[#101C2E] p-5 rounded-2xl border border-emerald-500/30 shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-[#00c282] border border-emerald-500/30 flex items-center justify-center mb-3">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-sm text-white">2. Evaluación de Eficacia (Nivel 3)</h3>
          <p className="text-xs text-slate-400 mt-1">
            Realizada a los 30/90 días por el mando intermedio o tutor para comprobar la aplicación efectiva en las tareas del puesto.
          </p>
        </div>

        <div className="bg-[#101C2E] p-5 rounded-2xl border border-[#1A2B44] shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-3">
            <Award className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-sm text-white">3. Impacto y Competencias (Nivel 4)</h3>
          <p className="text-xs text-slate-400 mt-1">
            Consolidación en el Cuadro de Mando de KPIs para el informe de Revisión por la Dirección y auditorías de certificación.
          </p>
        </div>
      </div>

      {/* Followups List Table */}
      <div className="bg-[#101C2E] rounded-2xl border border-[#1A2B44] shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#1A2B44] flex items-center justify-between">
          <h3 className="font-bold text-white text-sm sm:text-base">
            Registro de Evaluaciones de Eficacia Realizadas ({followups.length})
          </h3>
          <span className="text-xs font-bold text-[#00c282] bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/30">
            ✓ 100% Conformes con Norma ISO
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#0A1220] border-b border-[#1A2B44] text-slate-400 font-bold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Acción Formativa</th>
                <th className="py-3 px-3">Empleado / Dpto.</th>
                <th className="py-3 px-3">Evaluador (Manager)</th>
                <th className="py-3 px-3 text-center">Periodo</th>
                <th className="py-3 px-3 text-center">Mejora Desempeño</th>
                <th className="py-3 px-3 text-center">Conocimiento Aplicado</th>
                <th className="py-3 px-4">Dictamen / Observaciones</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A2B44]/60">
              {followups.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    No hay evaluaciones de eficacia registradas. Pulsa en <strong>+ Evaluar Eficacia de Empleado</strong> para registrar una.
                  </td>
                </tr>
              ) : (
                followups.map((f) => (
                  <tr key={f.id} className="hover:bg-[#14233a]/60 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{f.trainingTitle}</div>
                      <div className="text-[11px] text-slate-400">{f.evaluationDate}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-slate-200">{f.employeeName}</div>
                      <div className="text-[11px] text-slate-400">{f.employeeDepartment}</div>
                    </td>
                    <td className="py-3.5 px-3 font-medium text-slate-300">
                      {f.managerName}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-[#0A1220] text-slate-300 border border-[#1A2B44] font-bold text-xs">
                        {f.periodDays} días
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30">
                        ★ {f.performanceImprovementRating} / 5
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#00c282] bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        <Check className="w-3.5 h-3.5" /> SÍ (Eficaz)
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400 max-w-xs">
                      {f.comments}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          id={`btn-edit-followup-${f.id}`}
                          onClick={() => handleEditFollowup(f)}
                          title="Editar esta evaluación de eficacia"
                          className="px-2.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/25 text-blue-300 hover:text-blue-100 border border-blue-500/30 transition text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                        {onDeleteFollowup && (
                          <button
                            type="button"
                            id={`btn-delete-followup-${f.id}`}
                            onClick={() => setDeletingFollowup(f)}
                            title="Eliminar esta evaluación de eficacia"
                            className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 hover:text-rose-100 border border-rose-500/30 transition text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Eliminar</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingFollowup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#101C2E] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-500/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">¿Eliminar Evaluación de Eficacia?</h3>
                <p className="text-xs text-slate-400">Esta acción no se puede deshacer.</p>
              </div>
            </div>

            <div className="bg-[#0A1220] rounded-xl p-3.5 border border-[#1A2B44] text-xs text-slate-300 mb-5 space-y-1">
              <div><strong>Empleado:</strong> {deletingFollowup.employeeName} ({deletingFollowup.employeeDepartment})</div>
              <div><strong>Acción Formativa:</strong> {deletingFollowup.trainingTitle}</div>
              <div><strong>Evaluador:</strong> {deletingFollowup.managerName}</div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingFollowup(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-[#182840] hover:bg-[#203656] text-slate-300 text-xs font-semibold rounded-xl border border-[#243a5e] transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal to Create / Edit Employee Followup */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-[#101C2E] rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-[#1A2B44]">
            <div className="flex items-center justify-between border-b border-[#1A2B44] pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {editingFollowupId ? 'Editar Evaluación de Eficacia Post-Formación' : 'Nueva Evaluación de Eficacia Post-Formación'}
                </h3>
                <p className="text-xs text-slate-400">ISO 9001:2015 Cláusula 7.2 Competencia</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg bg-[#182840] hover:bg-[#203656] text-slate-400 hover:text-white border border-[#243a5e] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 mt-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Acción Formativa Impartida *
                </label>
                <select
                  id="effectiveness-modal-training-select"
                  value={selectedTrainingId}
                  onChange={(e) => setSelectedTrainingId(e.target.value)}
                  required
                  className="w-full bg-[#0A1220] border border-[#1A2B44] rounded-xl px-3 py-2 text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  {selectedTrainingId && !trainings.some((t) => t.id === selectedTrainingId) && (
                    <option value={selectedTrainingId}>
                      {editingFollowupId
                        ? followups.find((f) => f.id === editingFollowupId)?.trainingTitle || `[26001] Formación ID: ${selectedTrainingId}`
                        : selectedTrainingId}
                    </option>
                  )}
                  {trainings.map((t) => (
                    <option key={t.id} value={t.id}>
                      [{t.code}] {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Nombre del Empleado *
                  </label>
                  <input
                    type="text"
                    required
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    placeholder="Ej. Martín Vega"
                    className="w-full bg-[#0A1220] border border-[#1A2B44] rounded-xl px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Departamento
                  </label>
                  <select
                    value={employeeDepartment}
                    onChange={(e) => setEmployeeDepartment(e.target.value)}
                    className="w-full bg-[#0A1220] border border-[#1A2B44] rounded-xl px-3 py-2 text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    {settings.departments.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Responsable Evaluador (Manager) *
                  </label>
                  <input
                    type="text"
                    required
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                    placeholder="Ej. Sandra Ruiz (Jefa de Turno)"
                    className="w-full bg-[#0A1220] border border-[#1A2B44] rounded-xl px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Periodo Transcurrido
                  </label>
                  <select
                    value={periodDays}
                    onChange={(e) => setPeriodDays(Number(e.target.value) as any)}
                    className="w-full bg-[#0A1220] border border-[#1A2B44] rounded-xl px-3 py-2 text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    <option value={30}>30 días tras el curso</option>
                    <option value={60}>60 días tras el curso</option>
                    <option value={90}>90 días tras el curso</option>
                  </select>
                </div>
              </div>

              {/* Rating 1 to 5 */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Mejora en el Desempeño del Puesto (Escala 1 al 5)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setPerformanceImprovementRating(s)}
                      className={`flex-1 py-2 rounded-xl font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                        performanceImprovementRating >= s
                          ? 'bg-[#00a86b] text-white shadow-sm'
                          : 'bg-[#182840] text-slate-400 hover:bg-[#203656] border border-[#243a5e]'
                      }`}
                    >
                      ★ {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Checkboxes */}
              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={knowledgeApplied}
                    onChange={(e) => setKnowledgeApplied(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded-sm bg-[#0A1220] border-[#1A2B44]"
                  />
                  <span className="text-slate-300 font-medium">
                    El empleado aplica de forma continuada los conocimientos en sus tareas
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={goalsAchieved}
                    onChange={(e) => setGoalsAchieved(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded-sm bg-[#0A1220] border-[#1A2B44]"
                  />
                  <span className="text-slate-300 font-medium">
                    Se han cumplido los objetivos fijados en el Plan de Formación
                  </span>
                </label>
              </div>

              {/* Comments */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Justificación de la Eficacia para Auditoría
                </label>
                <textarea
                  rows={2}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Describir evidencias observables de mejora en calidad, reducción de errores o autonomía..."
                  className="w-full bg-[#0A1220] border border-[#1A2B44] rounded-xl p-2.5 text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-4 border-t border-[#1A2B44] flex justify-end gap-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingFollowupId(null);
                  }}
                  className="px-4 py-2 bg-[#182840] hover:bg-[#203656] text-slate-300 font-semibold rounded-xl border border-[#243a5e] cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-[#00a86b] hover:bg-[#00925d] text-white font-bold rounded-xl shadow-sm cursor-pointer transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>{editingFollowupId ? 'Guardar Cambios' : 'Guardar Evaluación de Eficacia'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
