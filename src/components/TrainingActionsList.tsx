import React, { useState, useMemo } from 'react';
import { 
  GraduationCap, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  DollarSign, 
  Users, 
  Star, 
  ShieldCheck, 
  ChevronRight, 
  X, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Trash2,
  Edit,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Mail,
  Send,
  Download,
  Printer,
  UserPlus,
  Percent,
  Euro,
  HelpCircle,
  RotateCcw
} from 'lucide-react';
import { TrainingAction, Evaluation, CompanySettings, TrainingAttendee } from '../types';
import { generateNextTrainingCode } from '../data/initialData';
import EmailInvitationsModal from './EmailInvitationsModal';
import { generateEvaluationPdf, generateEvaluationDocx } from '../utils/documentGenerator';

interface TrainingActionsListProps {
  trainings: TrainingAction[];
  evaluations: Evaluation[];
  settings: CompanySettings;
  onSaveTraining: (action: TrainingAction) => Promise<void>;
  onDeleteTraining: (id: string) => Promise<void>;
  onDeleteEvaluation?: (id: string) => Promise<void>;
  onSelectForEvaluation: (trainingId: string) => void;
}

export const TrainingActionsList: React.FC<TrainingActionsListProps> = ({
  trainings,
  evaluations,
  settings,
  onSaveTraining,
  onDeleteTraining,
  onDeleteEvaluation,
  onSelectForEvaluation,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  // Modal for New / Edit Course
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTraining, setEditingTraining] = useState<TrainingAction | null>(null);

  // Email / Invitations Modal
  const [selectedTrainingForEmails, setSelectedTrainingForEmails] = useState<TrainingAction | null>(null);

  // Drawer for Course Details & Individual Evaluations
  const [selectedCourseForDetail, setSelectedCourseForDetail] = useState<TrainingAction | null>(null);

  // Form state for creating / editing
  const [formData, setFormData] = useState<Partial<TrainingAction>>({
    code: '',
    title: '',
    category: 'Calidad e ISO',
    department: settings.departments[0] || 'Producción e Ingeniería',
    targetCompetencies: [settings.competencyCatalog[0] || 'Auditoría Interna ISO 9001/14001'],
    plannedDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    executedDate: '',
    status: 'planned',
    modality: 'presencial',
    durationHours: 8,
    totalParticipantsPlanned: 10,
    totalParticipantsAttended: 0,
    totalCost: 1200,
    isSubsidized: false,
    subsidyType: 'percentage',
    subsidyPercentage: 100,
    subsidyAmount: 1200,
    netCompanyCost: 0,
    justification: '',
    attendees: [],
    provider: '',
    trainerName: '',
    locationOrPlatform: 'Presencial / Aula Central Codiagro',
    isoClause: '7.2 Competencia',
    notes: '',
  });

  // Attendee input inside form
  const [attendeeNameInput, setAttendeeNameInput] = useState('');
  const [attendeeEmailInput, setAttendeeEmailInput] = useState('');

  // Calculate Net Cost for Company
  const calculatedNetCost = useMemo(() => {
    const cost = Number(formData.totalCost) || 0;
    if (!formData.isSubsidized) return cost;
    if (formData.subsidyType === 'percentage') {
      const pct = Math.min(100, Math.max(0, Number(formData.subsidyPercentage) || 0));
      const subAmount = (cost * pct) / 100;
      return Math.max(0, cost - subAmount);
    } else {
      const subAmount = Number(formData.subsidyAmount) || 0;
      return Math.max(0, cost - subAmount);
    }
  }, [formData.totalCost, formData.isSubsidized, formData.subsidyType, formData.subsidyPercentage, formData.subsidyAmount]);

  const calculatedSubsidyValue = useMemo(() => {
    const cost = Number(formData.totalCost) || 0;
    if (!formData.isSubsidized) return 0;
    if (formData.subsidyType === 'percentage') {
      const pct = Math.min(100, Math.max(0, Number(formData.subsidyPercentage) || 0));
      return (cost * pct) / 100;
    } else {
      return Number(formData.subsidyAmount) || 0;
    }
  }, [formData.totalCost, formData.isSubsidized, formData.subsidyType, formData.subsidyPercentage, formData.subsidyAmount]);

  // Filtered list
  const filteredTrainings = useMemo(() => {
    return trainings.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (departmentFilter !== 'all' && t.department !== departmentFilter) return false;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(query);
        const matchCode = t.code.toLowerCase().includes(query);
        const matchProvider = (t.provider || '').toLowerCase().includes(query);
        const matchTrainer = (t.trainerName || '').toLowerCase().includes(query);
        return matchTitle || matchCode || matchProvider || matchTrainer;
      }
      return true;
    });
  }, [trainings, statusFilter, departmentFilter, searchTerm]);

  // Helper to load attendees automatically from a department
  const getEmployeesForDepartment = (deptName: string): TrainingAttendee[] => {
    const list = settings.employees || [];
    return list
      .filter((emp) => emp.department === deptName)
      .map((emp) => ({
        id: emp.id || `att-${Date.now()}-${Math.random()}`,
        name: emp.name,
        email: emp.email,
        department: emp.department,
      }));
  };

  const handleDepartmentChange = (newDept: string) => {
    const autoAttendees = getEmployeesForDepartment(newDept);
    setFormData((prev) => ({
      ...prev,
      department: newDept,
      attendees: autoAttendees.length > 0 ? autoAttendees : prev.attendees || [],
      totalParticipantsPlanned: autoAttendees.length > 0 ? autoAttendees.length : Math.max(1, prev.attendees?.length || 1),
    }));
  };

  const handleOpenNewModal = () => {
    const generatedCode = generateNextTrainingCode(trainings, settings.year || 2026, settings.nextCorrelativeNumber);
    const initialDept = settings.departments[0] || 'Producción e Ingeniería Agronómica';
    const deptAttendees = getEmployeesForDepartment(initialDept);

    setEditingTraining(null);
    setFormData({
      code: generatedCode,
      title: '',
      category: 'Calidad e ISO',
      department: initialDept,
      targetCompetencies: [settings.competencyCatalog[0] || 'Auditoría Interna ISO 9001/14001'],
      plannedDate: new Date().toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      executedDate: '',
      status: 'planned',
      modality: 'presencial',
      durationHours: 8,
      totalParticipantsPlanned: deptAttendees.length || 3,
      totalParticipantsAttended: 0,
      totalCost: 1500,
      isSubsidized: true,
      subsidyType: 'percentage',
      subsidyPercentage: 100,
      subsidyAmount: 1500,
      netCompanyCost: 0,
      justification: 'Detección de necesidades de formación según Plan Estratégico CODIAGRO e ISO 9001: 7.2.',
      attendees: deptAttendees.length > 0 ? deptAttendees : [
        { id: 'att-init-1', name: 'Laura Méndez', email: 'laura.mendez@codiagro.com', department: 'Calidad' },
        { id: 'att-init-2', name: 'Roberto Soler', email: 'roberto.soler@codiagro.com', department: 'Producción' },
        { id: 'att-init-3', name: 'Antonio Gil', email: 'antonio.gil@codiagro.com', department: 'Calidad' }
      ],
      provider: 'Proveedor Homologado',
      trainerName: 'Formador Especialista',
      trainingCenter: settings.trainingCenters?.[0] || 'Codiagro Formación Interna',
      locationOrPlatform: 'Presencial / Aula Central Codiagro',
      isoClause: '7.2 Competencia',
      notes: '',
    });
    setAttendeeNameInput('');
    setAttendeeEmailInput('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (training: TrainingAction) => {
    setEditingTraining(training);
    const existingAttendees = training.attendees || [];
    setFormData({ 
      ...training,
      modality: training.modality || 'presencial',
      trainingCenter: training.trainingCenter || settings.trainingCenters?.[0] || 'Codiagro Formación Interna',
      isSubsidized: training.isSubsidized ?? false,
      subsidyType: training.subsidyType || 'percentage',
      subsidyPercentage: training.subsidyPercentage ?? 100,
      subsidyAmount: training.subsidyAmount ?? training.totalCost,
      netCompanyCost: training.netCompanyCost ?? training.totalCost,
      justification: training.justification || '',
      attendees: existingAttendees,
      totalParticipantsPlanned: existingAttendees.length > 0 ? existingAttendees.length : (training.totalParticipantsPlanned || 1)
    });
    setAttendeeNameInput('');
    setAttendeeEmailInput('');
    setIsModalOpen(true);
  };

  // Student name input handler with auto-complete of email
  const handleAttendeeNameChange = (nameVal: string) => {
    setAttendeeNameInput(nameVal);
    const employees = settings.employees || [];
    const matched = employees.find(
      (e) => e.name.trim().toLowerCase() === nameVal.trim().toLowerCase()
    );
    if (matched) {
      setAttendeeEmailInput(matched.email);
    }
  };

  // Student email input handler with auto-complete of name
  const handleAttendeeEmailChange = (emailVal: string) => {
    setAttendeeEmailInput(emailVal);
    const employees = settings.employees || [];
    const matched = employees.find(
      (e) => e.email.trim().toLowerCase() === emailVal.trim().toLowerCase()
    );
    if (matched) {
      setAttendeeNameInput(matched.name);
    }
  };

  // Quick select registered employee
  const handleSelectRegisteredEmployee = (empId: string) => {
    if (!empId) return;
    const employees = settings.employees || [];
    const emp = employees.find((e) => e.id === empId);
    if (emp) {
      setAttendeeNameInput(emp.name);
      setAttendeeEmailInput(emp.email);
    }
  };

  const handleAddAttendeeInForm = () => {
    if (!attendeeNameInput.trim() || !attendeeEmailInput.trim()) return;
    const newAtt: TrainingAttendee = {
      id: `att-${Date.now()}`,
      name: attendeeNameInput.trim(),
      email: attendeeEmailInput.trim().toLowerCase(),
      department: formData.department || 'General'
    };
    const updated = [...(formData.attendees || []), newAtt];
    setFormData({
      ...formData,
      attendees: updated,
      totalParticipantsPlanned: updated.length
    });
    setAttendeeNameInput('');
    setAttendeeEmailInput('');
  };

  const handleRemoveAttendeeInForm = (id: string) => {
    const updated = (formData.attendees || []).filter(a => a.id !== id);
    setFormData({
      ...formData,
      attendees: updated,
      totalParticipantsPlanned: Math.max(1, updated.length)
    });
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.code) return;

    const totalCostVal = Number(formData.totalCost) || 0;
    const isSub = Boolean(formData.isSubsidized);
    const subType = formData.subsidyType || 'percentage';
    const subPct = Number(formData.subsidyPercentage) || 0;
    const subAmt = subType === 'percentage' ? (totalCostVal * subPct) / 100 : Number(formData.subsidyAmount) || 0;
    const netCost = Math.max(0, totalCostVal - (isSub ? subAmt : 0));
    const currentAttendees = formData.attendees || [];
    const plannedCount = currentAttendees.length > 0 ? currentAttendees.length : (Number(formData.totalParticipantsPlanned) || 1);

    const actionToSave: TrainingAction = {
      id: editingTraining ? editingTraining.id : `act-${Date.now()}`,
      code: formData.code!,
      title: formData.title!,
      category: formData.category || 'Calidad e ISO',
      department: formData.department || settings.departments[0],
      targetCompetencies: formData.targetCompetencies || [],
      plannedDate: formData.plannedDate || new Date().toISOString().slice(0, 10),
      endDate: formData.endDate || formData.plannedDate,
      executedDate: formData.executedDate || undefined,
      status: formData.status || 'planned',
      modality: (formData.modality as any) || 'presencial',
      durationHours: Number(formData.durationHours) || 8,
      totalParticipantsPlanned: plannedCount,
      totalParticipantsAttended: Number(formData.totalParticipantsAttended) || 0,
      totalCost: totalCostVal,
      isSubsidized: isSub,
      subsidyType: subType,
      subsidyAmount: subAmt,
      subsidyPercentage: subPct,
      netCompanyCost: netCost,
      justification: formData.justification || '',
      attendees: currentAttendees,
      provider: formData.provider || 'Proveedor Interno',
      trainerName: formData.trainerName || 'Formador Especialista',
      trainingCenter: formData.trainingCenter || settings.trainingCenters?.[0] || 'Codiagro Formación Interna',
      locationOrPlatform: formData.locationOrPlatform || (formData.modality === 'online' ? 'Plataforma Online / Teams' : 'Aula Codiagro'),
      isoClause: formData.isoClause || '7.2 Competencia',
      averageSatisfaction: editingTraining?.averageSatisfaction,
      effectivenessScore: editingTraining?.effectivenessScore,
      isEffective: editingTraining?.isEffective,
      evaluationsCount: editingTraining?.evaluationsCount || 0,
      attendanceRate: plannedCount 
        ? Math.min(100, Math.round(((Number(formData.totalParticipantsAttended) || 0) / plannedCount) * 100))
        : 100,
      createdAt: editingTraining?.createdAt || new Date().toISOString(),
      notes: formData.notes,
    };

    await onSaveTraining(actionToSave);
    setIsModalOpen(false);
  };

  const handleUpdateAttendeesFromEmailModal = async (trainingId: string, updatedAttendees: TrainingAttendee[]) => {
    const trainingToUpdate = trainings.find(t => t.id === trainingId);
    if (trainingToUpdate) {
      const updated: TrainingAction = {
        ...trainingToUpdate,
        attendees: updatedAttendees,
        totalParticipantsPlanned: Math.max(trainingToUpdate.totalParticipantsPlanned, updatedAttendees.length)
      };
      await onSaveTraining(updated);
      setSelectedTrainingForEmails(updated);
    }
  };

  // Evaluations for the detail drawer
  const courseEvaluations = useMemo(() => {
    if (!selectedCourseForDetail) return [];
    return evaluations.filter((e) => e.trainingActionId === selectedCourseForDetail.id);
  }, [selectedCourseForDetail, evaluations]);

  return (
    <div id="trainings-list-container" className="space-y-6 pb-12">
      
      {/* Top Header Card */}
      <div className="bg-[#101C2E] rounded-2xl p-5 sm:p-6 border border-[#1A2B44] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Registro de Acciones Formativas
              </h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-[#00c282] border border-emerald-500/30">
                Base de Datos Firebase
              </span>
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-md bg-[#0A1220] text-slate-300 border border-[#1A2B44]">
                Doc. {settings.documentCode || 'RE0180104'} (Ed. {settings.documentEdition || '07'})
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Catálogo anual con bonificación FUNDAE, control de costes netos, fechas de fin, justificación ISO 7.2 y envío automatizado de cuestionarios por email.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="trainings-btn-new"
              onClick={handleOpenNewModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-[#00a86b] hover:bg-[#00925d] text-white shadow-sm transition shrink-0"
            >
              <Plus className="w-4 h-4" />
              + Alta Nueva Formación
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-[#1A2B44]">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              id="trainings-input-search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por curso, código o docente..."
              className="w-full text-xs sm:text-sm bg-[#0A1220] border border-[#1A2B44] rounded-xl pl-9 pr-3.5 py-2 text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Department Filter */}
          <select
            id="trainings-filter-department"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="text-xs sm:text-sm bg-[#0A1220] border border-[#1A2B44] rounded-xl px-3 py-2 text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          >
            <option value="all">Todos los Departamentos</option>
            {settings.departments.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            id="trainings-filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs sm:text-sm bg-[#0A1220] border border-[#1A2B44] rounded-xl px-3 py-2 text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          >
            <option value="all">Todos los Estados</option>
            <option value="completed">Realizado</option>
            <option value="in_progress">En curso</option>
            <option value="planned">Planificado</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-[#101C2E] rounded-2xl border border-[#1A2B44] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#0A1220] border-b border-[#1A2B44] text-slate-400 font-bold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Código / Curso</th>
                <th className="py-3 px-3">Modalidad & Fechas</th>
                <th className="py-3 px-3">Dpto. & Docente</th>
                <th className="py-3 px-3 text-center">Horas</th>
                <th className="py-3 px-3 text-center">Convocados</th>
                <th className="py-3 px-3 text-center">Coste Neto</th>
                <th className="py-3 px-3 text-center">Subvención</th>
                <th className="py-3 px-3 text-center">Satisfacción</th>
                <th className="py-3 px-3 text-center">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A2B44]/60">
              {filteredTrainings.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-400">
                    No se encontraron acciones formativas que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                filteredTrainings.map((training) => {
                  const netCost = training.netCompanyCost ?? training.totalCost;
                  const isSub = training.isSubsidized;

                  return (
                    <tr 
                      key={training.id} 
                      className="hover:bg-[#14233a]/60 transition group cursor-pointer"
                      onClick={() => setSelectedCourseForDetail(training)}
                    >
                      {/* Title and Code */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white group-hover:text-[#00c282] transition">
                          {training.title}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                          <span className="bg-emerald-500/15 text-[#00c282] border border-emerald-500/30 px-2 py-0.5 rounded-md font-bold">
                            {training.code}
                          </span>
                          <span className="text-slate-300 capitalize text-[10px] px-1.5 py-0.5 rounded bg-[#182840]">
                            {training.modality || 'Presencial'}
                          </span>
                        </div>
                      </td>

                      {/* Modality & Dates */}
                      <td className="py-3.5 px-3">
                        <div className="text-slate-200 font-medium text-xs">
                          {training.plannedDate}
                        </div>
                        {training.endDate && training.endDate !== training.plannedDate && (
                          <div className="text-[10px] text-slate-400">
                            Fin: {training.endDate}
                          </div>
                        )}
                      </td>

                      {/* Department & Trainer */}
                      <td className="py-3.5 px-3">
                        <div className="text-slate-200 font-semibold truncate max-w-[130px]" title={training.department}>
                          {training.department}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[130px]">
                          {training.trainerName || training.provider}
                        </div>
                      </td>

                      {/* Hours */}
                      <td className="py-3.5 px-3 text-center font-bold text-slate-200">
                        {training.durationHours}h
                      </td>

                      {/* Attendees */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="font-bold text-slate-200">
                          {training.attendees?.length || training.totalParticipantsPlanned}
                          <span className="text-slate-400 font-normal"> conv.</span>
                        </div>
                        <div className="text-[10px] text-[#00c282] font-semibold">
                          {training.evaluationsCount || 0} eval.
                        </div>
                      </td>

                      {/* Net Company Cost */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="font-bold text-white">
                          {netCost.toLocaleString()} €
                        </div>
                        {isSub && (
                          <div className="text-[10px] text-slate-400 line-through">
                            {training.totalCost.toLocaleString()} €
                          </div>
                        )}
                      </td>

                      {/* Subsidy Badge */}
                      <td className="py-3.5 px-3 text-center">
                        {isSub ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/30">
                            {training.subsidyType === 'percentage' 
                              ? `${training.subsidyPercentage || 100}% Bonificado` 
                              : `-${training.subsidyAmount || 0} €`}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">0% (Sin bonif.)</span>
                        )}
                      </td>

                      {/* Satisfaction */}
                      <td className="py-3.5 px-3 text-center">
                        {training.averageSatisfaction ? (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-300 bg-amber-500/15 px-2 py-1 rounded-md border border-amber-500/30">
                            ★ {training.averageSatisfaction}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">Sin evaluar</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          training.status === 'completed' 
                            ? 'bg-emerald-500/15 text-[#00c282] border border-emerald-500/30' 
                            : training.status === 'in_progress'
                            ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                            : 'bg-[#182840] text-slate-300 border border-[#243a5e]'
                        }`}>
                          {training.status === 'completed' ? 'Realizado' : training.status === 'in_progress' ? 'En curso' : 'Planificado'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Send Emails / Convocatoria */}
                          <button
                            onClick={() => setSelectedTrainingForEmails(training)}
                            title="Enviar correos automáticos con cuestionario online y adjuntos PDF/Word"
                            className="p-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                          
                          {/* Printable PDF */}
                          <button
                            onClick={() => generateEvaluationPdf(training, settings)}
                            title="Descargar PDF imprimible para rellenar a bolígrafo (RE0180104)"
                            className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 text-[#00c282] border border-emerald-500/30"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Eval */}
                          <button
                            onClick={() => onSelectForEvaluation(training.id)}
                            title="Evaluar este curso ahora (Online o Foto)"
                            className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30"
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEditModal(training)}
                            title="Editar datos del curso"
                            className="p-1.5 rounded-lg bg-[#182840] hover:bg-[#203656] text-slate-300 border border-[#243a5e]"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => {
                              if (window.confirm(`¿Estás seguro de eliminar el curso ${training.code} - ${training.title}?`)) {
                                onDeleteTraining(training.id);
                              }
                            }}
                            title="Eliminar acción formativa"
                            className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Course Detail Drawer / Modal */}
      {selectedCourseForDetail && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#101C2E] rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-[#1A2B44] max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-[#1A2B44] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#00c282] bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-md">
                    {selectedCourseForDetail.code}
                  </span>
                  <span className="text-xs uppercase font-semibold px-2 py-0.5 rounded bg-[#182840] text-slate-300">
                    Modalidad: {selectedCourseForDetail.modality || 'Presencial'}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mt-1.5">
                  {selectedCourseForDetail.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Proveedor: {selectedCourseForDetail.provider} · Docente: {selectedCourseForDetail.trainerName} · Fechas: {selectedCourseForDetail.plannedDate} {selectedCourseForDetail.endDate ? `a ${selectedCourseForDetail.endDate}` : ''}
                </p>
              </div>
              <button
                onClick={() => setSelectedCourseForDetail(null)}
                className="p-2 rounded-xl bg-[#182840] hover:bg-[#203656] text-slate-300 hover:text-white border border-[#243a5e]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Justification Box if present */}
            {selectedCourseForDetail.justification && (
              <div className="mt-4 p-3.5 bg-[#0A1220] rounded-2xl border border-[#1A2B44] text-xs">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00c282]" />
                  <span>Justificación y Necesidad Detectada (ISO 9001: 7.2):</span>
                </div>
                <p className="text-slate-200 leading-relaxed">
                  {selectedCourseForDetail.justification}
                </p>
              </div>
            )}

            {/* Financial and Subsidy Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
              <div className="bg-[#0A1220] p-3 rounded-xl border border-[#1A2B44] text-center">
                <div className="text-[10px] uppercase font-bold text-slate-400">Coste Total</div>
                <div className="text-base font-bold text-white mt-0.5">{selectedCourseForDetail.totalCost.toLocaleString()} €</div>
              </div>
              <div className="bg-emerald-500/15 p-3 rounded-xl border border-emerald-500/30 text-center">
                <div className="text-[10px] uppercase font-bold text-emerald-400">Subvención / FUNDAE</div>
                <div className="text-base font-bold text-[#00c282] mt-0.5">
                  {selectedCourseForDetail.isSubsidized
                    ? `${selectedCourseForDetail.subsidyAmount || 0} € (${selectedCourseForDetail.subsidyPercentage || 0}%)`
                    : '0 €'}
                </div>
              </div>
              <div className="bg-[#0A1220] p-3 rounded-xl border border-[#1A2B44] text-center">
                <div className="text-[10px] uppercase font-bold text-slate-400">Coste Neto Empresa</div>
                <div className="text-base font-bold text-white mt-0.5">
                  {(selectedCourseForDetail.netCompanyCost ?? selectedCourseForDetail.totalCost).toLocaleString()} €
                </div>
              </div>
              <div className="bg-amber-500/15 p-3 rounded-xl border border-amber-500/30 text-center">
                <div className="text-[10px] uppercase font-bold text-amber-400">Satisfacción Media</div>
                <div className="text-base font-bold text-amber-300 mt-0.5">
                  ★ {selectedCourseForDetail.averageSatisfaction || 'Sin evaluar'}
                </div>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex flex-wrap items-center gap-2 mb-5 p-3 bg-[#0A1220] rounded-2xl border border-[#1A2B44]">
              <button
                onClick={() => {
                  setSelectedTrainingForEmails(selectedCourseForDetail);
                  setSelectedCourseForDetail(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition shadow-xs"
              >
                <Mail className="w-3.5 h-3.5" />
                Enviar mail convocatoria/encuesta
              </button>

              <button
                onClick={() => generateEvaluationPdf(selectedCourseForDetail, settings)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#182840] hover:bg-[#203656] text-emerald-300 border border-emerald-500/30 transition"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar PDF (RE0180104)
              </button>

              <button
                onClick={() => generateEvaluationDocx(selectedCourseForDetail, settings)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#182840] hover:bg-[#203656] text-blue-300 border border-blue-500/30 transition"
              >
                <FileText className="w-3.5 h-3.5" />
                Descargar Word (.docx)
              </button>
            </div>

            {/* Attendees & Convocados List */}
            <div className="mb-5">
              <div className="text-xs font-bold text-white mb-2 flex items-center justify-between">
                <span>Participantes Convocados ({selectedCourseForDetail.attendees?.length || 0})</span>
              </div>
              {(!selectedCourseForDetail.attendees || selectedCourseForDetail.attendees.length === 0) ? (
                <p className="text-xs text-slate-400 italic">No se añadieron nombres de convocados en la ficha.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedCourseForDetail.attendees.map((att) => (
                    <div key={att.id} className="bg-[#0A1220] p-2.5 rounded-xl border border-[#1A2B44] text-xs flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white">{att.name}</div>
                        <div className="text-[11px] text-slate-400">{att.email}</div>
                      </div>
                      {att.hasCompletedEvaluation ? (
                        <span className="text-[10px] text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                          Completado
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 bg-[#182840] px-2 py-0.5 rounded-full">
                          Pendiente
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Evaluations Submitted for this course */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  Cuestionarios de Evaluación Recibidos ({courseEvaluations.length})
                </h4>
                <button
                  onClick={() => {
                    const id = selectedCourseForDetail.id;
                    setSelectedCourseForDetail(null);
                    onSelectForEvaluation(id);
                  }}
                  className="text-xs font-semibold text-[#00c282] bg-emerald-500/15 hover:bg-emerald-500/30 px-3 py-1.5 rounded-lg border border-emerald-500/30"
                >
                  + Rellenar Evaluación Ahora
                </button>
              </div>

              {courseEvaluations.length === 0 ? (
                <div className="bg-[#0A1220] rounded-2xl p-6 text-center text-slate-400 text-xs border border-dashed border-[#1A2B44]">
                  Todavía no hay evaluaciones registradas para este curso. Puedes enviar el email automático a los convocados o escanear una hoja de evaluación física con la cámara.
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {courseEvaluations.map((evalItem) => (
                    <div key={evalItem.id} className="bg-[#0A1220] rounded-xl p-4 border border-[#1A2B44] text-xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-white text-sm">
                          {evalItem.employeeName || 'Participante Anónimo'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md">
                            ★ {evalItem.ratings.overallSatisfaction} / 5
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {evalItem.submissionDate}
                          </span>
                          <button
                            type="button"
                            onClick={() => generateEvaluationPdf(evalItem, settings)}
                            className="p-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition cursor-pointer"
                            title="Descargar Justificante Oficial PDF (RE0180104)"
                          >
                            <Download className="w-3 h-3" />
                          </button>
                          {onDeleteEvaluation && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`¿Eliminar la evaluación de ${evalItem.employeeName || 'este alumno'}?`)) {
                                  onDeleteEvaluation(evalItem.id);
                                }
                              }}
                              className="p-1 rounded-md bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 transition cursor-pointer"
                              title="Eliminar evaluación"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-slate-400 flex items-center gap-3 text-[11px] mb-2">
                        <span>Dpto: <strong className="text-slate-200">{evalItem.department}</strong></span>
                        <span>•</span>
                        <span>Origen: <strong className="text-slate-200">{evalItem.submissionSource === 'camera_capture' ? '📷 Foto Cámara (IA)' : evalItem.submissionSource === 'scanned_paper' ? '📄 Escaneado (IA)' : '💻 Formulario Online'}</strong></span>
                      </div>

                      {evalItem.qualitative?.highlightedStrengths && (
                        <p className="text-slate-300 mt-1">
                          <strong className="text-[#00c282]">Puntos fuertes:</strong> {evalItem.qualitative.highlightedStrengths}
                        </p>
                      )}

                      {evalItem.qualitative?.actionPlanCommitment && (
                        <p className="text-slate-300 mt-1">
                          <strong className="text-cyan-400">Plan de acción:</strong> {evalItem.qualitative.actionPlanCommitment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-[#1A2B44] flex justify-end">
              <button
                onClick={() => setSelectedCourseForDetail(null)}
                className="px-5 py-2 bg-[#182840] hover:bg-[#203656] text-slate-300 font-semibold text-xs rounded-xl border border-[#243a5e]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#101C2E] rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-[#1A2B44] max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#1A2B44] pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {editingTraining ? 'Editar Acción Formativa' : 'Alta de Nueva Acción Formativa'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Registro oficial para auditorías ISO 9001 (Doc. {settings.documentCode || 'RE0180104'} - Ed. {settings.documentEdition || '07'})
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg bg-[#182840] hover:bg-[#203656] text-slate-400 hover:text-white border border-[#243a5e]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4 mt-4">
              
              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Code */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Código de Registro *
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-[#00c282] font-mono font-semibold">
                        Formato YYNNN
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const auto = generateNextTrainingCode(trainings, settings.year || 2026, settings.nextCorrelativeNumber);
                          setFormData(prev => ({ ...prev, code: auto }));
                        }}
                        title="Recalcular siguiente código correlativo automático"
                        className="text-slate-400 hover:text-emerald-400 p-0.5 rounded-sm transition"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="26001"
                    className="w-full text-xs sm:text-sm bg-[#0A1220] border border-[#1A2B44] rounded-xl px-3 py-2 font-mono text-[#00c282] font-bold placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Puedes escribir cualquier código correlativo manualmente (ej. <span className="text-emerald-300 font-mono font-semibold">26015</span>) y las próximas continuarán desde el siguiente.
                  </span>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Título del Curso *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ej. Auditoría Interna ISO 9001 / Nutrición Vegetal"
                    className="w-full text-xs sm:text-sm bg-[#0A1220] border border-[#1A2B44] rounded-xl px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                {/* Department */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Departamento Convocado *
                    </label>
                    <span className="text-[10px] text-[#00c282] font-medium">
                      (Auto-asigna alumnos)
                    </span>
                  </div>
                  <select
                    value={formData.department}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    className="w-full text-xs sm:text-sm bg-[#0A1220] border border-[#1A2B44] rounded-xl px-3 py-2 text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    {settings.departments.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Modality: Presencial vs Online vs Hibrida */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Modalidad de Impartición *
                  </label>
                  <select
                    value={formData.modality}
                    onChange={(e) => setFormData({ ...formData, modality: e.target.value as any })}
                    className="w-full text-xs sm:text-sm bg-[#0A1220] border border-[#1A2B44] rounded-xl px-3 py-2 text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-semibold"
                  >
                    <option value="presencial">Presencial (Aula o Planta)</option>
                    <option value="online">Online / Aula Virtual / Teams</option>
                    <option value="hibrida">Híbrida (Presencial + Online)</option>
                  </select>
                </div>

                {/* Planned Date (Start) */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Fecha de Inicio *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.plannedDate}
                    onChange={(e) => setFormData({ ...formData, plannedDate: e.target.value })}
                    className="w-full text-xs sm:text-sm bg-[#0A1220] border border-[#1A2B44] rounded-xl px-3 py-2 text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Fecha de Fin *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate || formData.plannedDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full text-xs sm:text-sm bg-[#0A1220] border border-[#1A2B44] rounded-xl px-3 py-2 text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                {/* Duration Hours */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Horas de Formación
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.durationHours}
                    onChange={(e) => setFormData({ ...formData, durationHours: Number(e.target.value) })}
                    className="w-full text-xs sm:text-sm bg-[#0A1220] border border-[#1A2B44] rounded-xl px-3 py-2 text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                {/* Trainer Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Docente / Formador Especialista
                  </label>
                  <input
                    type="text"
                    value={formData.trainerName}
                    onChange={(e) => setFormData({ ...formData, trainerName: e.target.value })}
                    placeholder="Ej. Elena Ramos García"
                    className="w-full text-xs sm:text-sm bg-[#0A1220] border border-[#1A2B44] rounded-xl px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                {/* Training Center / Centro de Formación */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Centro de Formación / Proveedor
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Gestionable desde Configuración ⚙️
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      list="training-centers-list"
                      value={formData.trainingCenter || formData.provider || ''}
                      onChange={(e) => setFormData({ ...formData, trainingCenter: e.target.value, provider: e.target.value })}
                      placeholder="Selecciona o escribe el centro..."
                      className="flex-1 text-xs sm:text-sm bg-[#0A1220] border border-[#1A2B44] rounded-xl px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-semibold"
                    />
                    <datalist id="training-centers-list">
                      {(settings.trainingCenters || []).map((tc) => (
                        <option key={tc} value={tc} />
                      ))}
                    </datalist>
                    {settings.trainingCenters && settings.trainingCenters.length > 0 && (
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            setFormData({ ...formData, trainingCenter: e.target.value, provider: e.target.value });
                          }
                        }}
                        className="bg-[#182840] border border-[#243a5e] text-xs text-[#00c282] font-semibold rounded-xl px-2 py-2 focus:outline-hidden"
                      >
                        <option value="">Centros registrados ▾</option>
                        {settings.trainingCenters.map((tc) => (
                          <option key={tc} value={tc}>{tc}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION: Subsidies & Cost Calculation */}
              <div className="p-4 bg-[#0A1220] rounded-2xl border border-[#1A2B44] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[#00c282]" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Costes y Bonificación / Subvención (FUNDAE)
                    </span>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.isSubsidized)}
                      onChange={(e) => setFormData({ ...formData, isSubsidized: e.target.checked })}
                      className="w-4 h-4 rounded-md accent-[#00a86b]"
                    />
                    <span className="text-xs font-bold text-emerald-300">
                      ¿Formación Subvencionada / Bonificada?
                    </span>
                  </label>
                </div>

                {formData.isSubsidized ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 items-end">
                    {/* 1. Coste Total */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1 truncate">
                        Coste Total (€) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        min={0}
                        value={formData.totalCost ?? ''}
                        onChange={(e) => {
                          const valStr = e.target.value;
                          const totalVal = valStr === '' ? 0 : parseFloat(valStr);
                          if (formData.subsidyType === 'percentage') {
                            const pct = Number(formData.subsidyPercentage) || 0;
                            const amt = parseFloat(((totalVal * pct) / 100).toFixed(2));
                            setFormData({ ...formData, totalCost: totalVal, subsidyAmount: amt });
                          } else {
                            const amt = Number(formData.subsidyAmount) || 0;
                            const pct = totalVal > 0 ? parseFloat(((amt / totalVal) * 100).toFixed(2)) : 0;
                            setFormData({ ...formData, totalCost: totalVal, subsidyPercentage: pct });
                          }
                        }}
                        className="w-full h-10 bg-[#101C2E] border border-[#1A2B44] rounded-xl px-3 text-white font-bold text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>

                    {/* 2. Tipo de Bonificación */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1 truncate">
                        Tipo
                      </label>
                      <div className="w-full h-10 p-1 bg-[#101C2E] border border-[#1A2B44] rounded-xl flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, subsidyType: 'percentage' })}
                          className={`flex-1 h-full rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                            formData.subsidyType === 'percentage'
                              ? 'bg-[#00a86b] text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Percent className="w-3 h-3" />
                          <span>%</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, subsidyType: 'amount' })}
                          className={`flex-1 h-full rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                            formData.subsidyType === 'amount'
                              ? 'bg-[#00a86b] text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Euro className="w-3 h-3" />
                          <span>Importe</span>
                        </button>
                      </div>
                    </div>

                    {/* 3. % Porcentaje */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1 truncate">
                        % Porcentaje
                      </label>
                      <div className="relative h-10">
                        <input
                          type="number"
                          step="any"
                          min={0}
                          max={100}
                          value={formData.subsidyPercentage ?? ''}
                          onChange={(e) => {
                            const valStr = e.target.value;
                            const pctVal = valStr === '' ? 0 : parseFloat(valStr);
                            const total = Number(formData.totalCost) || 0;
                            const amt = parseFloat(((total * pctVal) / 100).toFixed(2));
                            setFormData({
                              ...formData,
                              subsidyPercentage: valStr === '' ? undefined : (isNaN(pctVal) ? 0 : pctVal),
                              subsidyAmount: amt,
                              subsidyType: 'percentage'
                            });
                          }}
                          placeholder="100"
                          className="w-full h-10 bg-[#101C2E] border border-[#1A2B44] rounded-xl pl-3 pr-7 text-emerald-300 font-bold text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                        />
                        <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3.5" />
                      </div>
                    </div>

                    {/* 4. Importe (€) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1 truncate">
                        Importe (€)
                      </label>
                      <div className="relative h-10">
                        <input
                          type="number"
                          step="any"
                          min={0}
                          value={formData.subsidyAmount ?? ''}
                          onChange={(e) => {
                            const valStr = e.target.value;
                            const amtVal = valStr === '' ? 0 : parseFloat(valStr);
                            const total = Number(formData.totalCost) || 0;
                            const pct = total > 0 ? parseFloat(((amtVal / total) * 100).toFixed(2)) : 0;
                            setFormData({
                              ...formData,
                              subsidyAmount: valStr === '' ? undefined : (isNaN(amtVal) ? 0 : amtVal),
                              subsidyPercentage: pct,
                              subsidyType: 'amount'
                            });
                          }}
                          placeholder="1500"
                          className="w-full h-10 bg-[#101C2E] border border-[#1A2B44] rounded-xl pl-3 pr-7 text-emerald-300 font-bold text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                        />
                        <Euro className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3.5" />
                      </div>
                    </div>

                    {/* 5. Coste Neto Display */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1 truncate">
                        Coste Neto CODIAGRO
                      </label>
                      <div className="w-full h-10 px-3 bg-[#101C2E] rounded-xl border border-emerald-500/40 flex items-center justify-between">
                        <span className="text-sm font-extrabold text-[#00c282]">
                          {calculatedNetCost.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €
                        </span>
                        <span className="text-[10px] text-slate-400 truncate">
                          Bonif: {calculatedSubsidyValue.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}€
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    {/* Total Cost */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Coste Total Proveedor / Curso (€) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        min={0}
                        value={formData.totalCost ?? ''}
                        onChange={(e) => setFormData({ ...formData, totalCost: Number(e.target.value) })}
                        className="w-full h-10 bg-[#101C2E] border border-[#1A2B44] rounded-xl px-3 text-white font-bold text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    {/* Non-subsidized full net */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Coste Total para CODIAGRO (100% fondos propios)
                      </label>
                      <div className="w-full h-10 px-3 bg-[#101C2E] rounded-xl border border-[#1A2B44] flex items-center">
                        <span className="text-sm font-extrabold text-white">
                          {(Number(formData.totalCost) || 0).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION: Justification */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00c282]" />
                  <span>Justificación de la Formación / Necesidad Detectada (ISO 9001: 7.2) *</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={formData.justification || ''}
                  onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                  placeholder="Explica el porqué de esta formación: ej. Adaptación a nueva legislación europea, plan de carrera de mandos intermedios, reducción de no conformidades..."
                  className="w-full text-xs sm:text-sm bg-[#0A1220] border border-[#1A2B44] rounded-xl p-2.5 text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* SECTION: Convocados / Attendees List (Name + Email) */}
              <div className="p-4 bg-[#0A1220] rounded-2xl border border-[#1A2B44] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#00c282]" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Alumnos Convocados ({formData.attendees?.length || 0})
                    </span>
                  </div>
                </div>

                {/* Dropdown to pick from registered employees */}
                <div className="p-2.5 bg-[#101C2E] rounded-xl border border-[#1A2B44]/80 flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-400 shrink-0">
                    Alumnos dados de alta:
                  </span>
                  <select
                    onChange={(e) => handleSelectRegisteredEmployee(e.target.value)}
                    value=""
                    className="flex-1 bg-[#0A1220] border border-[#1A2B44] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">-- Seleccionar alumno de la plantilla registrada --</option>
                    {(settings.employees || []).map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.department || 'Sin Dpto.'}) - {emp.email}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Add Convocado Inline Inputs with Auto-Fill & Datalist */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      list="registered-employees-names"
                      placeholder="Nombre del alumno (auto-completa mail)..."
                      value={attendeeNameInput}
                      onChange={(e) => handleAttendeeNameChange(e.target.value)}
                      className="w-full bg-[#101C2E] border border-[#1A2B44] rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                    />
                    <datalist id="registered-employees-names">
                      {(settings.employees || []).map((emp) => (
                        <option key={`name-${emp.id}`} value={emp.name}>
                          {emp.department} - {emp.email}
                        </option>
                      ))}
                    </datalist>
                  </div>

                  <div className="sm:col-span-5">
                    <input
                      type="email"
                      list="registered-employees-emails"
                      placeholder="Email del alumno (auto-completa nombre)..."
                      value={attendeeEmailInput}
                      onChange={(e) => handleAttendeeEmailChange(e.target.value)}
                      className="w-full bg-[#101C2E] border border-[#1A2B44] rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-mono text-[11px]"
                    />
                    <datalist id="registered-employees-emails">
                      {(settings.employees || []).map((emp) => (
                        <option key={`email-${emp.id}`} value={emp.email}>
                          {emp.name} ({emp.department})
                        </option>
                      ))}
                    </datalist>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddAttendeeInForm}
                    className="sm:col-span-2 px-3 py-1.5 bg-[#182840] hover:bg-[#203656] text-[#00c282] border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Añadir
                  </button>
                </div>

                {/* List of Added Attendees */}
                {formData.attendees && formData.attendees.length > 0 ? (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {formData.attendees.map((att) => (
                      <div key={att.id} className="p-2 bg-[#101C2E] rounded-xl border border-[#1A2B44] flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{att.name}</span>
                          <span className="text-slate-400 font-mono text-[11px]">&lt;{att.email}&gt;</span>
                          {att.department && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#0A1220] text-slate-400 border border-[#1A2B44]">
                              {att.department}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttendeeInForm(att.id)}
                          className="p-1 text-slate-400 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-[#101C2E]/60 rounded-xl text-center text-xs text-slate-400 border border-dashed border-[#1A2B44]">
                    No hay alumnos convocados en esta acción. Puedes seleccionarlos de la plantilla o escribir su nombre/mail.
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-[#1A2B44] flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  Total Alumnos Convocados: <span className="font-bold text-[#00c282]">{formData.attendees?.length || 0}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-[#182840] hover:bg-[#203656] text-slate-300 font-semibold text-xs rounded-xl border border-[#243a5e]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#00a86b] hover:bg-[#00925d] text-white font-bold text-xs rounded-xl shadow-sm transition"
                  >
                    {editingTraining ? 'Guardar Cambios' : 'Guardar y Dar de Alta'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Email Invitations Modal */}
      {selectedTrainingForEmails && (
        <EmailInvitationsModal
          training={selectedTrainingForEmails}
          settings={settings}
          onClose={() => setSelectedTrainingForEmails(null)}
          onUpdateTrainingAttendees={handleUpdateAttendeesFromEmailModal}
        />
      )}

    </div>
  );
};
