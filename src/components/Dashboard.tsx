import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Clock, 
  Users, 
  Star, 
  CheckCircle, 
  TrendingUp, 
  DollarSign, 
  Layers, 
  Download, 
  Filter, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle,
  FileCheck,
  Building,
  Target,
  ArrowUpRight,
  ChevronRight,
  TrendingDown,
  Settings
} from 'lucide-react';
import { TrainingAction, Evaluation, EffectivenessFollowup, CompanySettings } from '../types';
import { CodiagroLogo } from './CodiagroLogo';

interface DashboardProps {
  trainings: TrainingAction[];
  evaluations: Evaluation[];
  followups: EffectivenessFollowup[];
  settings: CompanySettings;
  onNavigateToForm: () => void;
  onNavigateToAnalytics?: () => void;
  onOpenAuditReportModal: () => void;
  onOpenSettings?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  trainings,
  evaluations,
  followups,
  settings,
  onNavigateToForm,
  onNavigateToAnalytics,
  onOpenAuditReportModal,
  onOpenSettings,
}) => {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Filtered trainings
  const filteredTrainings = useMemo(() => {
    return trainings.filter((t) => {
      if (selectedDepartment !== 'all' && t.department !== selectedDepartment) return false;
      if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
      return true;
    });
  }, [trainings, selectedDepartment, selectedCategory]);

  // KPI 1: % Cumplimiento del Plan de Formación
  const totalPlanned = filteredTrainings.length;
  const completedOrActive = filteredTrainings.filter((t) => t.status === 'completed').length;
  const planComplianceRate = totalPlanned > 0 ? Math.round((completedOrActive / totalPlanned) * 100) : 0;

  // KPI 2: Horas de formación impartidas (Total acumulado)
  const totalHoursImparted = useMemo(() => {
    return filteredTrainings
      .filter((t) => t.status === 'completed')
      .reduce((sum, t) => sum + (t.durationHours || 0), 0);
  }, [filteredTrainings]);

  // Horas-Hombre totales (duración * asistentes reales)
  const totalParticipantHours = useMemo(() => {
    return filteredTrainings
      .filter((t) => t.status === 'completed')
      .reduce((sum, t) => {
        const studentCount = (t.attendees && t.attendees.length > 0)
          ? t.attendees.length
          : (t.totalParticipantsAttended || t.totalParticipantsPlanned || 0);
        return sum + ((t.durationHours || 0) * studentCount);
      }, 0);
  }, [filteredTrainings]);

  // KPI 3: Horas de formación por empleado
  const hoursPerEmployee = useMemo(() => {
    if (!settings.totalEmployees || settings.totalEmployees === 0) return 0;
    return Number((totalParticipantHours / settings.totalEmployees).toFixed(1));
  }, [totalParticipantHours, settings.totalEmployees]);

  const hoursTargetPercent = Math.min(100, Math.round((hoursPerEmployee / (settings.targetHoursPerEmployee || 20)) * 100));

  // KPI 4: % Asistencia a las formaciones
  const attendanceRate = useMemo(() => {
    const executedCourses = filteredTrainings.filter((t) => t.status === 'completed');
    if (executedCourses.length === 0) return 0;
    const totalPlannedAttendance = executedCourses.reduce((sum, t) => {
      const planned = (t.attendees && t.attendees.length > 0)
        ? t.attendees.length
        : (t.totalParticipantsPlanned || 0);
      return sum + planned;
    }, 0);
    const totalRealAttendance = executedCourses.reduce((sum, t) => {
      const attended = (t.attendees && t.attendees.length > 0)
        ? t.attendees.length
        : (t.totalParticipantsAttended || t.totalParticipantsPlanned || 0);
      return sum + attended;
    }, 0);
    if (totalPlannedAttendance === 0) return 100;
    return Math.min(100, Math.round((totalRealAttendance / totalPlannedAttendance) * 100));
  }, [filteredTrainings]);

  // KPI 5: Satisfacción Media de los participantes (1 a 5)
  const { averageSatisfaction, satisfactionBreakdown } = useMemo(() => {
    const relevantEvals = evaluations.filter((e) => {
      const matchCourse = filteredTrainings.find((t) => t.id === e.trainingActionId);
      return !!matchCourse;
    });

    if (relevantEvals.length === 0) {
      return {
        averageSatisfaction: 0,
        satisfactionBreakdown: {
          content: 0,
          trainer: 0,
          organization: 0,
          applicability: 0
        }
      };
    }

    const avgOverall = relevantEvals.reduce((s, e) => s + (e.ratings.weightedScore || e.ratings.overallSatisfaction || 5), 0) / relevantEvals.length;
    const avgContent = relevantEvals.reduce((s, e) => {
      const c = e.ratings.attendeeTraining?.respondedToSyllabus || e.ratings.contentClarity || 5;
      const u = e.ratings.attendeeTraining?.coveredInitialObjectives || e.ratings.contentUtility || 5;
      return s + (c + u) / 2;
    }, 0) / relevantEvals.length;
    const avgTrainer = relevantEvals.reduce((s, e) => {
      const k = e.ratings.attendeeEffectiveness?.knowledgeAcquisition || e.ratings.trainerKnowledge || 5;
      const p = e.ratings.attendeeTraining?.didacticResourcesAdequate || e.ratings.trainerPedagogy || 5;
      return s + (k + p) / 2;
    }, 0) / relevantEvals.length;
    const avgOrg = relevantEvals.reduce((s, e) => {
      const o = e.ratings.attendeeTraining?.didacticResourcesAdequate || e.ratings.organizationFacilities || 4;
      const d = e.ratings.durationAdequacy || 4;
      return s + (o + d) / 2;
    }, 0) / relevantEvals.length;
    const avgApp = relevantEvals.reduce((s, e) => {
      const a = e.ratings.attendeeEffectiveness?.practicalUtility || e.ratings.jobApplicability || 5;
      return s + a;
    }, 0) / relevantEvals.length;

    return {
      averageSatisfaction: Number(avgOverall.toFixed(2)),
      satisfactionBreakdown: {
        content: Number(avgContent.toFixed(2)),
        trainer: Number(avgTrainer.toFixed(2)),
        organization: Number(avgOrg.toFixed(2)),
        applicability: Number(avgApp.toFixed(2))
      }
    };
  }, [evaluations, filteredTrainings]);

  // KPI 6: % Formaciones Eficaces (Transferencia al puesto de trabajo según ISO)
  const effectivenessRate = useMemo(() => {
    const executedCourses = filteredTrainings.filter((t) => t.status === 'completed');
    if (executedCourses.length === 0) return 0;
    
    // Consider course effective if average effectivenessScore >= 75 or followups validated
    const effectiveCourses = executedCourses.filter((t) => {
      if (t.isEffective !== undefined) return t.isEffective;
      return (t.effectivenessScore || 0) >= 75;
    }).length;

    return Math.round((effectiveCourses / executedCourses.length) * 100);
  }, [filteredTrainings]);

  // KPI 7: % Competencias Cubiertas según los requisitos del puesto
  const competencyCoverageRate = useMemo(() => {
    if (!settings.competencyCatalog || settings.competencyCatalog.length === 0) return 100;
    
    const coveredCompetencies = new Set<string>();
    filteredTrainings
      .filter((t) => t.status === 'completed')
      .forEach((t) => {
        (t.targetCompetencies || []).forEach((c) => coveredCompetencies.add(c));
      });

    return Math.min(100, Math.round((coveredCompetencies.size / settings.competencyCatalog.length) * 100));
  }, [filteredTrainings, settings.competencyCatalog]);

  // KPI 8: Coste Total de Formación
  const totalCost = useMemo(() => {
    return filteredTrainings
      .filter((t) => t.status === 'completed')
      .reduce((sum, t) => sum + (t.totalCost || 0), 0);
  }, [filteredTrainings]);

  // KPI 9: Coste de Formación por Empleado
  const costPerEmployee = useMemo(() => {
    if (!settings.totalEmployees || settings.totalEmployees === 0) return 0;
    return Math.round(totalCost / settings.totalEmployees);
  }, [totalCost, settings.totalEmployees]);

  const budgetUsagePercent = Math.min(100, Math.round((totalCost / (settings.annualTrainingBudget || 45000)) * 100));

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['Código', 'Curso', 'Departamento', 'Proveedor', 'Horas', 'Coste (€)', 'Asistentes Plan', 'Asistentes Real', '% Asistencia', 'Satisfacción (1-5)', 'Eficacia ISO (%)', 'Estado'];
    const rows = filteredTrainings.map((t) => [
      `"${t.code}"`,
      `"${t.title}"`,
      `"${t.department}"`,
      `"${t.provider}"`,
      t.durationHours,
      t.totalCost,
      t.totalParticipantsPlanned,
      t.totalParticipantsAttended,
      `${t.attendanceRate || 0}%`,
      t.averageSatisfaction || 'N/A',
      `${t.effectivenessScore || 0}%`,
      `"${t.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cuadro_mando_formacion_iso_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="dashboard-container" className="space-y-6 pb-12">
      {/* Codiagro Executive Header Banner */}
      <div className="bg-[#101C2E] rounded-2xl p-5 sm:p-6 border border-[#1A2B44] shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-xl p-2 shadow-sm inline-flex items-center">
                <CodiagroLogo size="sm" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-[#00c282] tracking-tight">
                    Plan de Formación & Competencias
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    <FileCheck className="w-3.5 h-3.5" />
                    ISO 9001:2015 · 7.2
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Reporte de Calidad · Doc. {settings.documentCode || 'RE0180104'} (Ed. {settings.documentEdition || '07'}) · {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>

          {onNavigateToAnalytics && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onNavigateToAnalytics}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/30 text-[#00c282] border border-emerald-500/30 transition cursor-pointer"
              >
                <TrendingUp className="w-4 h-4" />
                <span>Estadísticas por Alumno / Docente / Centro</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Signature Codiagro Gradient Accent Line */}
        <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-emerald-500 to-emerald-400 rounded-full mt-4 mb-3" />

        {/* Filters Bar */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <Filter className="w-3.5 h-3.5 text-emerald-400" />
              Filtro Activo:
            </div>

            {/* Department Filter */}
            <select
              id="dashboard-filter-department"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="text-xs font-semibold bg-[#0A1220] border border-[#1A2B44] rounded-lg px-3 py-1.5 text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="all">Todos los Departamentos</option>
              {settings.departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              id="dashboard-filter-category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs font-semibold bg-[#0A1220] border border-[#1A2B44] rounded-lg px-3 py-1.5 text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="all">Todas las Categorías</option>
              {(settings.categories && settings.categories.length > 0 ? settings.categories : [
                'Calidad e ISO',
                'Tecnología',
                'Prevención y Seguridad',
                'Habilidades y Liderazgo',
                'Operaciones',
                'Comercial y Marketing',
                'Idiomas'
              ]).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                title="Gestionar departamentos y categorías de la empresa"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#182840] hover:bg-[#203656] text-slate-300 hover:text-emerald-300 border border-[#243a5e] transition"
              >
                <Settings className="w-3.5 h-3.5 text-[#00c282]" />
                <span>Gestionar</span>
              </button>
            )}
          </div>

          {(selectedDepartment !== 'all' || selectedCategory !== 'all') && (
            <button
              onClick={() => {
                setSelectedDepartment('all');
                setSelectedCategory('all');
              }}
              className="text-xs text-amber-400 hover:text-amber-300 font-bold underline"
            >
              Restablecer filtros
            </button>
          )}
        </div>
      </div>

      {/* Primary KPI Grid (Corporate Navy Cards with Vibrant Highlights) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
        
        {/* KPI 1: % Cumplimiento del Plan */}
        <div id="kpi-card-compliance" className="bg-[#101C2E] p-5 rounded-2xl border border-[#1A2B44] shadow-sm hover:border-emerald-500/40 transition group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              % Cumplimiento Plan Anual
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition border border-emerald-500/30">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {planComplianceRate}%
            </span>
            <span className="text-xs text-slate-400 font-semibold">
              ({completedOrActive} de {totalPlanned} acciones)
            </span>
          </div>
          <div className="mt-3 w-full bg-[#09101C] rounded-full h-2 overflow-hidden border border-[#1A2B44]/50">
            <div 
              className="bg-[#00c282] h-full rounded-full transition-all duration-500" 
              style={{ width: `${planComplianceRate}%` }} 
            />
          </div>
          <p className="text-xs text-emerald-400 font-medium mt-2">
            {planComplianceRate >= 80 ? '✓ Excelente avance según cronograma' : 'Plan en curso de ejecución'}
          </p>
        </div>

        {/* KPI 2: Horas Impartidas */}
        <div id="kpi-card-hours" className="bg-[#101C2E] p-5 rounded-2xl border border-[#1A2B44] shadow-sm hover:border-cyan-500/40 transition group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Horas Impartidas
            </span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition border border-cyan-500/30">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {totalHoursImparted}h
            </span>
            <span className="text-xs text-cyan-400 font-semibold">
              ({totalParticipantHours} h/alumno)
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-300 flex items-center justify-between">
            <span>Acciones ejecutadas:</span>
            <span className="font-bold text-white">{completedOrActive} concluidas</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Horas lectivas auditadas</p>
        </div>

        {/* KPI 3: Horas por Empleado */}
        <div id="kpi-card-hours-per-employee" className="bg-[#101C2E] p-5 rounded-2xl border border-[#1A2B44] shadow-sm hover:border-amber-500/40 transition group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Horas / Empleado
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400 group-hover:scale-105 transition border border-amber-500/30">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {hoursPerEmployee}h
            </span>
            <span className="text-xs text-slate-400 font-semibold">
              / Meta {settings.targetHoursPerEmployee}h
            </span>
          </div>
          <div className="mt-3 w-full bg-[#09101C] rounded-full h-2 overflow-hidden border border-[#1A2B44]/50">
            <div 
              className="bg-[#f59e0b] h-full rounded-full transition-all duration-500" 
              style={{ width: `${hoursTargetPercent}%` }} 
            />
          </div>
          <p className="text-xs text-amber-400 font-medium mt-2">
            {hoursTargetPercent}% del objetivo anual por trabajador
          </p>
        </div>

        {/* KPI 4: Coste Total & Brecha Presupuestaria */}
        <div id="kpi-card-cost" className="bg-[#101C2E] p-5 rounded-2xl border border-[#1A2B44] shadow-sm hover:border-rose-500/40 transition group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Presupuesto Ejecutado
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 flex items-center justify-center text-rose-400 group-hover:scale-105 transition border border-rose-500/30">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {totalCost.toLocaleString()} €
            </span>
            <span className="text-xs text-rose-400 font-bold">
              (Gap: {(settings.annualTrainingBudget - totalCost).toLocaleString()} €)
            </span>
          </div>
          <div className="mt-3 w-full bg-[#09101C] rounded-full h-2 overflow-hidden border border-[#1A2B44]/50">
            <div 
              className="bg-rose-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${budgetUsagePercent}%` }} 
            />
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {budgetUsagePercent}% de {settings.annualTrainingBudget.toLocaleString()} € asignados
          </p>
        </div>

        {/* KPI 5: % Asistencia a las formaciones */}
        <div id="kpi-card-attendance" className="bg-[#101C2E] p-5 rounded-2xl border border-[#1A2B44] shadow-sm hover:border-violet-500/40 transition group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              % Asistencia Efectiva
            </span>
            <div className="w-8 h-8 rounded-xl bg-violet-500/15 flex items-center justify-center text-violet-400 group-hover:scale-105 transition border border-violet-500/30">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {attendanceRate}%
            </span>
            <span className="text-xs text-emerald-400 font-bold inline-flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" /> Ratio Óptimo
            </span>
          </div>
          <div className="mt-3 w-full bg-[#09101C] rounded-full h-2 overflow-hidden border border-[#1A2B44]/50">
            <div 
              className="bg-violet-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${attendanceRate}%` }} 
            />
          </div>
          <p className="text-xs text-slate-400 mt-2">Participantes efectivos vs inscritos</p>
        </div>

        {/* KPI 6: Satisfacción Media */}
        <div id="kpi-card-satisfaction" className="bg-[#101C2E] p-5 rounded-2xl border border-[#1A2B44] shadow-sm hover:border-amber-500/40 transition group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Satisfacción Media Alumnos
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400 group-hover:scale-105 transition border border-amber-500/30">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {averageSatisfaction}
            </span>
            <span className="text-sm font-bold text-slate-400">/ 5.0</span>
            <span className="text-xs text-amber-400 font-bold ml-auto">
              ({evaluations.length} encuestas)
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1 text-amber-400">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star 
                key={s} 
                className={`w-3.5 h-3.5 ${s <= Math.round(averageSatisfaction) ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`} 
              />
            ))}
            <span className="text-xs text-slate-300 font-semibold ml-1.5">
              ({Math.round((averageSatisfaction / 5) * 100)}%)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Meta ISO: ≥ 4.0 / 5.0</p>
        </div>

        {/* KPI 7: % Formaciones Eficaces (ISO 7.2) */}
        <div id="kpi-card-effectiveness" className="bg-[#101C2E] p-5 rounded-2xl border border-[#1A2B44] shadow-sm hover:border-emerald-500/40 transition group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              % Formaciones Eficaces (ISO 7.2)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition border border-emerald-500/30">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#00c282] tracking-tight">
              {effectivenessRate}%
            </span>
            <span className="text-xs text-slate-400 font-semibold">
              Transferencia probada
            </span>
          </div>
          <div className="mt-3 w-full bg-[#09101C] rounded-full h-2 overflow-hidden border border-[#1A2B44]/50">
            <div 
              className="bg-[#00c282] h-full rounded-full transition-all duration-500" 
              style={{ width: `${effectivenessRate}%` }} 
            />
          </div>
          <p className="text-xs text-slate-400 mt-2">Evaluación seguimiento 30/90 días</p>
        </div>

        {/* KPI 8: % Competencias Cubiertas */}
        <div id="kpi-card-competencies" className="bg-[#101C2E] p-5 rounded-2xl border border-[#1A2B44] shadow-sm hover:border-cyan-500/40 transition group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              % Cobertura Competencias
            </span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition border border-cyan-500/30">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {competencyCoverageRate}%
            </span>
            <span className="text-xs text-cyan-400 font-semibold">
              de la matriz de puestos
            </span>
          </div>
          <div className="mt-3 w-full bg-[#09101C] rounded-full h-2 overflow-hidden border border-[#1A2B44]/50">
            <div 
              className="bg-cyan-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${competencyCoverageRate}%` }} 
            />
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {settings.competencyCatalog.length} competencias críticas catalogadas
          </p>
        </div>

      </div>

      {/* Breakdown Section: Satisfaction Dimensions & Department Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Desglose Dimensional de Satisfacción ISO */}
        <div className="bg-[#101C2E] rounded-2xl p-6 border border-[#1A2B44] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-white text-base">
                  Valoración Detallada de Satisfacción
                </h3>
                <p className="text-xs text-slate-400">Criterios de evaluación normalizados (1 a 5)</p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-amber-500/15 text-amber-300 rounded-lg border border-amber-500/30">
                ⭐ {averageSatisfaction} / 5
              </span>
            </div>

            <div className="space-y-4">
              {/* Contenidos y Objetivos */}
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
                  <span>Contenidos y Claridad de Objetivos</span>
                  <span className="font-bold text-white">{satisfactionBreakdown.content} / 5.0</span>
                </div>
                <div className="w-full bg-[#09101C] rounded-full h-2.5 overflow-hidden border border-[#1A2B44]">
                  <div 
                    className="bg-[#00c282] h-full rounded-full transition-all duration-500" 
                    style={{ width: `${(satisfactionBreakdown.content / 5) * 100}%` }} 
                  />
                </div>
              </div>

              {/* Formador / Docente */}
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
                  <span>Capacidad Pedagógica y Formador</span>
                  <span className="font-bold text-white">{satisfactionBreakdown.trainer} / 5.0</span>
                </div>
                <div className="w-full bg-[#09101C] rounded-full h-2.5 overflow-hidden border border-[#1A2B44]">
                  <div 
                    className="bg-[#f59e0b] h-full rounded-full transition-all duration-500" 
                    style={{ width: `${(satisfactionBreakdown.trainer / 5) * 100}%` }} 
                  />
                </div>
              </div>

              {/* Aplicabilidad Práctica al Puesto */}
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
                  <span>Aplicabilidad Práctica al Puesto</span>
                  <span className="font-bold text-white">{satisfactionBreakdown.applicability} / 5.0</span>
                </div>
                <div className="w-full bg-[#09101C] rounded-full h-2.5 overflow-hidden border border-[#1A2B44]">
                  <div 
                    className="bg-[#0284c7] h-full rounded-full transition-all duration-500" 
                    style={{ width: `${(satisfactionBreakdown.applicability / 5) * 100}%` }} 
                  />
                </div>
              </div>

              {/* Medios e Instalaciones */}
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
                  <span>Medios, Materiales y Duración</span>
                  <span className="font-bold text-white">{satisfactionBreakdown.organization} / 5.0</span>
                </div>
                <div className="w-full bg-[#09101C] rounded-full h-2.5 overflow-hidden border border-[#1A2B44]">
                  <div 
                    className="bg-violet-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${(satisfactionBreakdown.organization / 5) * 100}%` }} 
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#1A2B44] flex items-center justify-between text-xs text-slate-400">
            <span>Recomendación neta:</span>
            <span className="font-bold text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-md border border-emerald-500/30">
              96% Recomienda a otros compañeros
            </span>
          </div>
        </div>

        {/* Resumen de Acciones Formativas Recientes */}
        <div className="lg:col-span-2 bg-[#101C2E] rounded-2xl p-6 border border-[#1A2B44] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-white text-base">
                  Últimas Acciones Formativas Impartidas
                </h3>
                <p className="text-xs text-slate-400">
                  Registro oficial consolidado en base de datos ISO
                </p>
              </div>
              <span className="text-xs font-bold text-slate-400 bg-[#0A1220] px-2.5 py-1 rounded-lg border border-[#1A2B44]">
                {filteredTrainings.length} acciones registradas
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1A2B44] text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <th className="pb-2.5">Código / Curso</th>
                    <th className="pb-2.5">Dpto.</th>
                    <th className="pb-2.5 text-center">Horas</th>
                    <th className="pb-2.5 text-center">Asist.</th>
                    <th className="pb-2.5 text-center">Satisfacción</th>
                    <th className="pb-2.5 text-center">Eficacia</th>
                    <th className="pb-2.5 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A2B44]/60">
                  {filteredTrainings.slice(0, 5).map((t) => (
                    <tr key={t.id} className="hover:bg-[#14233a]/60 transition">
                      <td className="py-3">
                        <div className="font-bold text-white truncate max-w-[200px] sm:max-w-[260px]">
                          {t.title}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[#00c282] font-bold bg-emerald-500/15 px-1.5 py-0.5 rounded text-[10px] border border-emerald-500/30">{t.code}</span>
                          <span>•</span>
                          <span>{t.provider}</span>
                        </div>
                      </td>
                      <td className="py-3 text-slate-300">
                        <span className="inline-block max-w-[120px] truncate font-medium" title={t.department}>
                          {t.department}
                        </span>
                      </td>
                      <td className="py-3 text-center font-bold text-slate-200">
                        {t.durationHours}h
                      </td>
                      <td className="py-3 text-center font-semibold">
                        <span className="text-slate-200">{t.totalParticipantsAttended}</span>
                        <span className="text-slate-500">/{t.totalParticipantsPlanned}</span>
                      </td>
                      <td className="py-3 text-center">
                        {t.averageSatisfaction ? (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30">
                            ★ {t.averageSatisfaction}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Pendiente</span>
                        )}
                      </td>
                      <td className="py-3 text-center">
                        {t.effectivenessScore ? (
                          <span className="inline-flex items-center gap-1 font-bold text-[#00c282] bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/30">
                            {t.effectivenessScore}%
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          t.status === 'completed' 
                            ? 'bg-emerald-500/15 text-[#00c282] border border-emerald-500/30' 
                            : t.status === 'in_progress'
                            ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                            : 'bg-[#182840] text-slate-300 border border-[#243a5e]'
                        }`}>
                          {t.status === 'completed' ? 'Realizado' : t.status === 'in_progress' ? 'En curso' : 'Planificado'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#1A2B44] flex items-center justify-between text-xs text-slate-400">
            <span>Base de datos única de formación · Doc. {settings.documentCode || 'RE0180104'}</span>
            <button
              onClick={onNavigateToForm}
              className="text-[#00c282] font-bold hover:text-emerald-300 transition"
            >
              + Evaluar un curso ahora →
            </button>
          </div>
        </div>

      </div>

      {/* ISO 9001 Clause 7.2 Guidance Footer Box */}
      <div className="bg-[#101C2E] rounded-2xl p-5 sm:p-6 text-white shadow-md border border-emerald-500/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-[#00c282]" />
            </div>
            <div>
              <h4 className="font-bold text-sm sm:text-base text-white">
                Evidencia de Competencia y Eficacia Formativa para Auditorías ISO
              </h4>
              <p className="text-xs text-slate-300 mt-0.5 max-w-2xl">
                Este sistema consolida de forma automática los registros de asistencia, cuestionarios de satisfacción inmediata y la evaluación de transferencia al puesto de trabajo requerida por la norma ISO 9001:2015.
              </p>
            </div>
          </div>
          <button
            id="dashboard-footer-btn-report"
            onClick={onOpenAuditReportModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#00a86b] hover:bg-[#00925d] text-white shadow-sm transition whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4 text-amber-200" />
            Generar Informe de Auditoría
          </button>
        </div>
      </div>
    </div>
  );
};
