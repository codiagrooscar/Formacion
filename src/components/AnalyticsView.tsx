import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Users, 
  User, 
  GraduationCap, 
  Building, 
  Building2, 
  Award, 
  Star, 
  Clock, 
  TrendingUp, 
  CheckCircle2, 
  ShieldCheck, 
  Search, 
  Filter, 
  Download, 
  ChevronRight, 
  X, 
  FileText, 
  Sparkles, 
  Euro, 
  ArrowUpRight, 
  Check, 
  Layers, 
  Briefcase, 
  Calendar, 
  Percent, 
  Eye, 
  BookOpen,
  PieChart,
  HelpCircle,
  FileCheck,
  RotateCcw
} from 'lucide-react';
import { TrainingAction, Evaluation, EffectivenessFollowup, CompanySettings, TrainingAttendee } from '../types';

interface AnalyticsViewProps {
  trainings: TrainingAction[];
  evaluations: Evaluation[];
  followups: EffectivenessFollowup[];
  settings: CompanySettings;
  onSelectCourse?: (trainingId: string) => void;
}

type DimensionTab = 'students' | 'trainers' | 'providers' | 'departments' | 'categories' | 'competencies';

interface StudentAnalytics {
  id: string;
  name: string;
  email: string;
  department: string;
  coursesEnrolled: TrainingAction[];
  coursesCompleted: TrainingAction[];
  totalHours: number;
  hoursGoalPercent: number;
  evaluationsCount: number;
  avgSatisfactionGiven: number;
  followupsCount: number;
  avgEffectivenessRating: number;
  competencies: string[];
}

interface TrainerAnalytics {
  name: string;
  providers: string[];
  courses: TrainingAction[];
  totalHours: number;
  totalStudentsTrained: number;
  avgRating: number;
  evaluationsReceived: number;
  pedagogyScore: number;
  knowledgeScore: number;
  recommendationRate: number;
  topCourse: string;
}

interface ProviderAnalytics {
  name: string;
  courses: TrainingAction[];
  trainers: string[];
  totalHours: number;
  totalStudentsTrained: number;
  totalInvestment: number;
  subsidizedAmount: number;
  netCompanyCost: number;
  subsidyPercentage: number;
  costPerHourStudent: number;
  avgSatisfaction: number;
  effectivenessRate: number;
  evaluationsCount: number;
}

interface DepartmentAnalytics {
  name: string;
  coursesCount: number;
  courses: TrainingAction[];
  totalParticipantHours: number;
  estimatedEmployees: number;
  hoursPerEmployee: number;
  hoursGoalPercent: number;
  totalCost: number;
  avgSatisfaction: number;
  effectivenessRate: number;
  activeStudents: number;
}

interface CategoryAnalytics {
  name: string;
  coursesCount: number;
  completedCount: number;
  totalHours: number;
  totalParticipants: number;
  totalCost: number;
  avgSatisfaction: number;
  effectivenessRate: number;
}

interface ModalityAnalytics {
  name: string;
  label: string;
  coursesCount: number;
  totalHours: number;
  totalParticipants: number;
  avgAttendanceRate: number;
  avgSatisfaction: number;
  totalCost: number;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  trainings,
  evaluations,
  followups,
  settings,
  onSelectCourse,
}) => {
  const [activeTab, setActiveTab] = useState<DimensionTab>('students');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('hours_desc');

  // Drawer / Details state
  const [selectedStudent, setSelectedStudent] = useState<StudentAnalytics | null>(null);
  const [selectedTrainer, setSelectedTrainer] = useState<TrainerAnalytics | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ProviderAnalytics | null>(null);
  const [selectedDepartmentDetail, setSelectedDepartmentDetail] = useState<DepartmentAnalytics | null>(null);

  // -------------------------------------------------------------
  // 0. BASE FILTERED DATA SET (Reactive to Department & Status Filters)
  // -------------------------------------------------------------
  const filteredBaseTrainings = useMemo(() => {
    return trainings.filter((t) => {
      if (departmentFilter !== 'all' && t.department !== departmentFilter) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      return true;
    });
  }, [trainings, departmentFilter, statusFilter]);

  const filteredBaseEvaluations = useMemo(() => {
    return evaluations.filter((e) => {
      const matchCourse = trainings.find((t) => t.id === e.trainingActionId);
      if (departmentFilter !== 'all') {
        const matchDept = e.department === departmentFilter || (matchCourse && matchCourse.department === departmentFilter);
        if (!matchDept) return false;
      }
      if (statusFilter !== 'all' && matchCourse && matchCourse.status !== statusFilter) return false;
      return true;
    });
  }, [evaluations, trainings, departmentFilter, statusFilter]);

  const filteredBaseFollowups = useMemo(() => {
    return followups.filter((f) => {
      const matchCourse = trainings.find((t) => t.id === f.trainingActionId);
      if (departmentFilter !== 'all') {
        const matchDept = f.employeeDepartment === departmentFilter || (matchCourse && matchCourse.department === departmentFilter);
        if (!matchDept) return false;
      }
      if (statusFilter !== 'all' && matchCourse && matchCourse.status !== statusFilter) return false;
      return true;
    });
  }, [followups, trainings, departmentFilter, statusFilter]);

  // Helper to reliably count real enrolled / attended students for any course
  const getTrainingStudentCount = (c: TrainingAction): number => {
    if (c.attendees && c.attendees.length > 0) {
      return c.attendees.length;
    }
    if (c.totalParticipantsAttended && c.totalParticipantsAttended > 0) {
      return c.totalParticipantsAttended;
    }
    if (c.totalParticipantsPlanned && c.totalParticipantsPlanned > 0) {
      return c.totalParticipantsPlanned;
    }
    return 0;
  };

  // -------------------------------------------------------------
  // 1. DATA AGGREGATION: STUDENTS (ALUMNOS / PARTICIPANTES)
  // -------------------------------------------------------------
  const studentsAnalytics = useMemo<StudentAnalytics[]>(() => {
    const studentMap = new Map<string, {
      name: string;
      email: string;
      department: string;
      enrolledIds: Set<string>;
      completedIds: Set<string>;
      evaluations: Evaluation[];
      followups: EffectivenessFollowup[];
      competencies: Set<string>;
    }>();

    // Helper to register student
    const getOrCreate = (name: string, email: string = '', dept: string = '') => {
      const cleanName = (name || '').trim();
      if (!cleanName) return null;
      const key = cleanName.toLowerCase();

      if (!studentMap.has(key)) {
        studentMap.set(key, {
          name: cleanName,
          email: email || `${cleanName.toLowerCase().replace(/\s+/g, '.')}@codiagro.com`,
          department: dept || 'Producción e Ingeniería Agronómica',
          enrolledIds: new Set<string>(),
          completedIds: new Set<string>(),
          evaluations: [],
          followups: [],
          competencies: new Set<string>(),
        });
      }
      const item = studentMap.get(key)!;
      if (email && (!item.email || item.email.includes('@codiagro.com'))) item.email = email;
      if (dept && (!item.department || item.department === 'General')) item.department = dept;
      return item;
    };

    // Extract from filtered training attendees
    filteredBaseTrainings.forEach((t) => {
      if (t.attendees && t.attendees.length > 0) {
        t.attendees.forEach((att) => {
          const s = getOrCreate(att.name, att.email, att.department || t.department);
          if (s) {
            s.enrolledIds.add(t.id);
            if (t.status === 'completed') {
              s.completedIds.add(t.id);
              (t.targetCompetencies || []).forEach((c) => s.competencies.add(c));
            }
          }
        });
      }
    });

    // Extract from filtered evaluations submitted
    filteredBaseEvaluations.forEach((e) => {
      if (e.employeeName) {
        const s = getOrCreate(e.employeeName, e.employeeEmail, e.department);
        if (s) {
          s.enrolledIds.add(e.trainingActionId);
          s.completedIds.add(e.trainingActionId);
          s.evaluations.push(e);
          const t = trainings.find((tr) => tr.id === e.trainingActionId);
          if (t) {
            (t.targetCompetencies || []).forEach((c) => s.competencies.add(c));
          }
        }
      }
    });

    // Extract from filtered effectiveness follow-ups
    filteredBaseFollowups.forEach((f) => {
      if (f.employeeName) {
        const s = getOrCreate(f.employeeName, '', f.employeeDepartment);
        if (s) {
          s.enrolledIds.add(f.trainingActionId);
          s.completedIds.add(f.trainingActionId);
          s.followups.push(f);
        }
      }
    });

    // Compute metrics for each student
    const result: StudentAnalytics[] = [];
    studentMap.forEach((val, key) => {
      // Filter out students not in selected department if filter active
      if (departmentFilter !== 'all' && val.department !== departmentFilter) {
        return;
      }

      const coursesEnrolled = Array.from(val.enrolledIds)
        .map((id) => trainings.find((t) => t.id === id))
        .filter(Boolean) as TrainingAction[];

      const coursesCompleted = Array.from(val.completedIds)
        .map((id) => trainings.find((t) => t.id === id))
        .filter(Boolean) as TrainingAction[];

      const totalHours = coursesCompleted.reduce((sum, c) => sum + (c.durationHours || 0), 0);
      const targetHours = settings.targetHoursPerEmployee || 20;
      const hoursGoalPercent = Math.min(100, Math.round((totalHours / targetHours) * 100));

      let avgSatisfactionGiven = 0;
      if (val.evaluations.length > 0) {
        const sumScores = val.evaluations.reduce((sum, e) => sum + (e.ratings?.weightedScore || e.ratings?.overallSatisfaction || 0), 0);
        avgSatisfactionGiven = Number((sumScores / val.evaluations.length).toFixed(2));
      }

      let avgEffectivenessRating = 0;
      if (val.followups.length > 0) {
        const sumEff = val.followups.reduce((sum, f) => sum + (f.performanceImprovementRating || 0), 0);
        avgEffectivenessRating = Number((sumEff / val.followups.length).toFixed(2));
      } else if (coursesCompleted.length > 0) {
        const coursesWithEff = coursesCompleted.filter((c) => c.effectivenessScore !== undefined && c.effectivenessScore !== null);
        if (coursesWithEff.length > 0) {
          const avgCourseEff = coursesWithEff.reduce((sum, c) => sum + (c.effectivenessScore || 0), 0) / coursesWithEff.length;
          avgEffectivenessRating = Number(((avgCourseEff / 100) * 5).toFixed(2));
        }
      }

      result.push({
        id: key,
        name: val.name,
        email: val.email,
        department: val.department,
        coursesEnrolled,
        coursesCompleted,
        totalHours,
        hoursGoalPercent,
        evaluationsCount: val.evaluations.length,
        avgSatisfactionGiven,
        followupsCount: val.followups.length,
        avgEffectivenessRating,
        competencies: Array.from(val.competencies),
      });
    });

    return result;
  }, [filteredBaseTrainings, filteredBaseEvaluations, filteredBaseFollowups, trainings, settings, departmentFilter]);

  // -------------------------------------------------------------
  // 2. DATA AGGREGATION: TRAINERS (PROFESORES / DOCENTES)
  // -------------------------------------------------------------
  const trainersAnalytics = useMemo<TrainerAnalytics[]>(() => {
    const trainerMap = new Map<string, {
      name: string;
      providers: Set<string>;
      courses: TrainingAction[];
      evaluations: Evaluation[];
    }>();

    filteredBaseTrainings.forEach((t) => {
      const cleanName = (t.trainerName || 'Formador Interno / No Especificado').trim();
      if (!cleanName) return;
      const key = cleanName.toLowerCase();

      if (!trainerMap.has(key)) {
        trainerMap.set(key, {
          name: cleanName,
          providers: new Set<string>(),
          courses: [],
          evaluations: [],
        });
      }

      const item = trainerMap.get(key)!;
      item.courses.push(t);
      if (t.provider) item.providers.add(t.provider);

      // Find evaluations for this course
      const courseEvals = filteredBaseEvaluations.filter((e) => e.trainingActionId === t.id);
      item.evaluations.push(...courseEvals);
    });

    const result: TrainerAnalytics[] = [];
    trainerMap.forEach((val) => {
      const totalHours = val.courses.reduce((sum, c) => sum + (c.durationHours || 0), 0);
      const totalStudentsTrained = val.courses.reduce((sum, c) => sum + getTrainingStudentCount(c), 0);

      let avgRating = 0;
      let pedagogyScore = 0;
      let knowledgeScore = 0;
      let recommendationCount = 0;

      if (val.evaluations.length > 0) {
        const sumScores = val.evaluations.reduce((sum, e) => sum + (e.ratings?.weightedScore || e.ratings?.overallSatisfaction || 0), 0);
        avgRating = Number((sumScores / val.evaluations.length).toFixed(2));

        const sumPedagogy = val.evaluations.reduce((sum, e) => sum + (e.ratings?.attendeeTraining?.didacticResourcesAdequate || e.ratings?.trainerPedagogy || 0), 0);
        pedagogyScore = Number((sumPedagogy / val.evaluations.length).toFixed(2));

        const sumKnow = val.evaluations.reduce((sum, e) => sum + (e.ratings?.attendeeEffectiveness?.knowledgeAcquisition || e.ratings?.trainerKnowledge || 0), 0);
        knowledgeScore = Number((sumKnow / val.evaluations.length).toFixed(2));

        recommendationCount = val.evaluations.filter((e) => e.qualitative?.wouldRecommend !== false).length;
      } else if (val.courses.length > 0) {
        const ratedCourses = val.courses.filter((c) => c.averageSatisfaction && c.averageSatisfaction > 0);
        if (ratedCourses.length > 0) {
          const sumScores = ratedCourses.reduce((sum, c) => sum + (c.averageSatisfaction || 0), 0);
          avgRating = Number((sumScores / ratedCourses.length).toFixed(2));
          recommendationCount = ratedCourses.length;
        }
      }

      const recommendationRate = val.evaluations.length > 0 
        ? Math.round((recommendationCount / val.evaluations.length) * 100)
        : (val.courses.length > 0 && avgRating > 0 ? 100 : 0);

      // Find top rated course
      const sortedCourses = [...val.courses].sort((a, b) => (b.averageSatisfaction || 0) - (a.averageSatisfaction || 0));
      const topCourse = sortedCourses[0]?.title || 'Acción formativa';

      result.push({
        name: val.name,
        providers: Array.from(val.providers),
        courses: val.courses,
        totalHours,
        totalStudentsTrained,
        avgRating,
        evaluationsReceived: val.evaluations.length,
        pedagogyScore,
        knowledgeScore,
        recommendationRate,
        topCourse,
      });
    });

    return result;
  }, [filteredBaseTrainings, filteredBaseEvaluations]);

  // -------------------------------------------------------------
  // 3. DATA AGGREGATION: PROVIDERS (CENTROS / ENTIDADES)
  // -------------------------------------------------------------
  const providersAnalytics = useMemo<ProviderAnalytics[]>(() => {
    const providerMap = new Map<string, {
      name: string;
      courses: TrainingAction[];
      trainers: Set<string>;
      evaluations: Evaluation[];
    }>();

    filteredBaseTrainings.forEach((t) => {
      const cleanName = (t.provider || 'Centro / Proveedor Interno').trim();
      if (!cleanName) return;
      const key = cleanName.toLowerCase();

      if (!providerMap.has(key)) {
        providerMap.set(key, {
          name: cleanName,
          courses: [],
          trainers: new Set<string>(),
          evaluations: [],
        });
      }

      const item = providerMap.get(key)!;
      item.courses.push(t);
      if (t.trainerName) item.trainers.add(t.trainerName);

      const courseEvals = filteredBaseEvaluations.filter((e) => e.trainingActionId === t.id);
      item.evaluations.push(...courseEvals);
    });

    const result: ProviderAnalytics[] = [];
    providerMap.forEach((val) => {
      const totalHours = val.courses.reduce((sum, c) => sum + (c.durationHours || 0), 0);
      const totalStudentsTrained = val.courses.reduce((sum, c) => sum + getTrainingStudentCount(c), 0);
      const totalInvestment = val.courses.reduce((sum, c) => sum + (c.totalCost || 0), 0);
      const subsidizedAmount = val.courses.reduce((sum, c) => sum + (c.subsidyAmount || (c.isSubsidized ? c.totalCost * 0.8 : 0)), 0);
      const netCompanyCost = Math.max(0, totalInvestment - subsidizedAmount);
      const subsidyPercentage = totalInvestment > 0 ? Math.round((subsidizedAmount / totalInvestment) * 100) : 0;

      const totalStudentHours = val.courses.reduce((sum, c) => sum + ((c.durationHours || 0) * Math.max(1, getTrainingStudentCount(c))), 0);
      const costPerHourStudent = totalStudentHours > 0 ? Number((totalInvestment / totalStudentHours).toFixed(1)) : 0;

      let avgSatisfaction = 0;
      if (val.evaluations.length > 0) {
        const sumScores = val.evaluations.reduce((sum, e) => sum + (e.ratings?.weightedScore || e.ratings?.overallSatisfaction || 0), 0);
        avgSatisfaction = Number((sumScores / val.evaluations.length).toFixed(2));
      } else if (val.courses.length > 0) {
        const ratedCourses = val.courses.filter((c) => c.averageSatisfaction && c.averageSatisfaction > 0);
        if (ratedCourses.length > 0) {
          const sumScores = ratedCourses.reduce((sum, c) => sum + (c.averageSatisfaction || 0), 0);
          avgSatisfaction = Number((sumScores / ratedCourses.length).toFixed(2));
        }
      }

      const completedCourses = val.courses.filter((c) => c.status === 'completed');
      const coursesWithEff = completedCourses.filter((c) => c.effectivenessScore !== undefined || c.isEffective !== undefined);
      const effectiveCourses = completedCourses.filter((c) => (c.effectivenessScore || 0) >= 75 || c.isEffective).length;
      const effectivenessRate = completedCourses.length > 0 && coursesWithEff.length > 0 ? Math.round((effectiveCourses / completedCourses.length) * 100) : 0;

      result.push({
        name: val.name,
        courses: val.courses,
        trainers: Array.from(val.trainers),
        totalHours,
        totalStudentsTrained,
        totalInvestment,
        subsidizedAmount,
        netCompanyCost,
        subsidyPercentage,
        costPerHourStudent,
        avgSatisfaction,
        effectivenessRate,
        evaluationsCount: val.evaluations.length,
      });
    });

    return result;
  }, [filteredBaseTrainings, filteredBaseEvaluations]);

  // -------------------------------------------------------------
  // 4. DATA AGGREGATION: DEPARTMENTS (DEPARTAMENTOS / ÁREAS)
  // -------------------------------------------------------------
  const departmentsAnalytics = useMemo<DepartmentAnalytics[]>(() => {
    const defaultDepts = settings.departments || [
      'Producción e Ingeniería Agronómica',
      'Calidad, Medio Ambiente & I+D+i (ISO)',
      'Laboratorio y Formulación Nutricional',
      'Recursos Humanos y PRL',
      'Comercial y Asesoramiento Técnico',
      'Logística, Envasado y Expediciones',
      'Tecnología e Informática (IT)',
      'Administración y Finanzas'
    ];

    const totalCompanyEmployees = settings.totalEmployees || 120;
    const estimatedPerDept = Math.max(8, Math.round(totalCompanyEmployees / defaultDepts.length));

    return defaultDepts.map((deptName) => {
      // Strict exact department match
      const deptCourses = trainings.filter((t) => t.department === deptName);
      
      const totalParticipantHours = deptCourses
        .filter((c) => c.status === 'completed')
        .reduce((sum, c) => sum + ((c.durationHours || 0) * Math.max(1, getTrainingStudentCount(c))), 0);

      const hoursPerEmployee = deptCourses.length > 0 ? Number((totalParticipantHours / estimatedPerDept).toFixed(1)) : 0;
      const targetHours = settings.targetHoursPerEmployee || 20;
      const hoursGoalPercent = deptCourses.length > 0 ? Math.min(100, Math.round((hoursPerEmployee / targetHours) * 100)) : 0;

      const totalCost = deptCourses.reduce((sum, c) => sum + (c.totalCost || 0), 0);

      // Average satisfaction (Real calculation, strictly 0 if no evaluations)
      const deptEvals = evaluations.filter((e) => e.department === deptName || deptCourses.some((c) => c.id === e.trainingActionId));
      let avgSatisfaction = 0;
      if (deptEvals.length > 0) {
        avgSatisfaction = Number((deptEvals.reduce((s, e) => s + (e.ratings?.weightedScore || e.ratings?.overallSatisfaction || 0), 0) / deptEvals.length).toFixed(2));
      } else if (deptCourses.length > 0) {
        const ratedCourses = deptCourses.filter((c) => c.averageSatisfaction && c.averageSatisfaction > 0);
        if (ratedCourses.length > 0) {
          avgSatisfaction = Number((ratedCourses.reduce((s, c) => s + (c.averageSatisfaction || 0), 0) / ratedCourses.length).toFixed(2));
        }
      }

      // Real effectiveness percentage (0 if no completed courses or no evaluations)
      const completed = deptCourses.filter((c) => c.status === 'completed');
      const coursesWithEff = completed.filter((c) => c.effectivenessScore !== undefined || c.isEffective !== undefined);
      const effectiveCount = completed.filter((c) => (c.effectivenessScore || 0) >= 75 || c.isEffective).length;
      const effectivenessRate = completed.length > 0 && coursesWithEff.length > 0 ? Math.round((effectiveCount / completed.length) * 100) : 0;

      // Active distinct students in this department
      const deptStudents = studentsAnalytics.filter((s) => s.department === deptName);

      return {
        name: deptName,
        coursesCount: deptCourses.length,
        courses: deptCourses,
        totalParticipantHours,
        estimatedEmployees: estimatedPerDept,
        hoursPerEmployee,
        hoursGoalPercent,
        totalCost,
        avgSatisfaction,
        effectivenessRate,
        activeStudents: Math.max(deptStudents.length, deptCourses.reduce((s, c) => s + getTrainingStudentCount(c), 0)),
      };
    });
  }, [trainings, evaluations, settings, studentsAnalytics]);

  // -------------------------------------------------------------
  // 5. DATA AGGREGATION: CATEGORIES & MODALITIES
  // -------------------------------------------------------------
  const categoriesAnalytics = useMemo<CategoryAnalytics[]>(() => {
    const cats = settings.categories || [
      'Calidad e ISO',
      'Tecnología',
      'Prevención y Seguridad',
      'Habilidades y Liderazgo',
      'Operaciones',
      'Comercial y Marketing',
      'Idiomas'
    ];

    return cats.map((catName) => {
      const catCourses = filteredBaseTrainings.filter((t) => t.category === catName);
      const completed = catCourses.filter((t) => t.status === 'completed');
      const totalHours = catCourses.reduce((sum, c) => sum + (c.durationHours || 0), 0);
      const totalParticipants = catCourses.reduce((sum, c) => sum + getTrainingStudentCount(c), 0);
      const totalCost = catCourses.reduce((sum, c) => sum + (c.totalCost || 0), 0);

      const catEvals = filteredBaseEvaluations.filter((e) => catCourses.some((c) => c.id === e.trainingActionId));
      let avgSatisfaction = 0;
      if (catEvals.length > 0) {
        avgSatisfaction = Number((catEvals.reduce((s, e) => s + (e.ratings?.weightedScore || e.ratings?.overallSatisfaction || 0), 0) / catEvals.length).toFixed(2));
      } else if (catCourses.length > 0) {
        const ratedCourses = catCourses.filter((c) => c.averageSatisfaction && c.averageSatisfaction > 0);
        if (ratedCourses.length > 0) {
          avgSatisfaction = Number((ratedCourses.reduce((s, c) => s + (c.averageSatisfaction || 0), 0) / ratedCourses.length).toFixed(2));
        }
      }

      const coursesWithEff = completed.filter((c) => c.effectivenessScore !== undefined || c.isEffective !== undefined);
      const effectiveCount = completed.filter((c) => (c.effectivenessScore || 0) >= 75 || c.isEffective).length;
      const effectivenessRate = completed.length > 0 && coursesWithEff.length > 0 ? Math.round((effectiveCount / completed.length) * 100) : 0;

      return {
        name: catName,
        coursesCount: catCourses.length,
        completedCount: completed.length,
        totalHours,
        totalParticipants,
        totalCost,
        avgSatisfaction,
        effectivenessRate,
      };
    });
  }, [filteredBaseTrainings, filteredBaseEvaluations, settings]);

  const modalitiesAnalytics = useMemo<ModalityAnalytics[]>(() => {
    const mods = [
      { key: 'presencial', label: 'Presencial / Aula' },
      { key: 'online', label: 'Online / Campus Virtual' },
      { key: 'hibrida', label: 'Híbrida / Mixta' }
    ];

    return mods.map((m) => {
      const modCourses = filteredBaseTrainings.filter((t) => t.modality === m.key);
      const totalHours = modCourses.reduce((sum, c) => sum + (c.durationHours || 0), 0);
      const totalParticipants = modCourses.reduce((sum, c) => sum + getTrainingStudentCount(c), 0);
      const totalCost = modCourses.reduce((sum, c) => sum + (c.totalCost || 0), 0);

      const avgAttendance = modCourses.length > 0
        ? Math.round(modCourses.reduce((sum, c) => sum + (c.attendanceRate || 100), 0) / modCourses.length)
        : 0;

      const modEvals = filteredBaseEvaluations.filter((e) => modCourses.some((c) => c.id === e.trainingActionId));
      let avgSatisfaction = 0;
      if (modEvals.length > 0) {
        avgSatisfaction = Number((modEvals.reduce((s, e) => s + (e.ratings?.weightedScore || e.ratings?.overallSatisfaction || 0), 0) / modEvals.length).toFixed(2));
      } else if (modCourses.length > 0) {
        const ratedCourses = modCourses.filter((c) => c.averageSatisfaction && c.averageSatisfaction > 0);
        if (ratedCourses.length > 0) {
          avgSatisfaction = Number((ratedCourses.reduce((s, c) => s + (c.averageSatisfaction || 0), 0) / ratedCourses.length).toFixed(2));
        }
      }

      return {
        name: m.key,
        label: m.label,
        coursesCount: modCourses.length,
        totalHours,
        totalParticipants,
        avgAttendanceRate: avgAttendance,
        avgSatisfaction,
        totalCost,
      };
    });
  }, [filteredBaseTrainings, filteredBaseEvaluations]);

  // -------------------------------------------------------------
  // 6. GLOBAL SUMMARY KPIS (Dynamically Recalculated from Active Filters)
  // -------------------------------------------------------------
  const globalKpis = useMemo(() => {
    const completedCourses = filteredBaseTrainings.filter((t) => t.status === 'completed');
    const totalTrainingHours = completedCourses.reduce((s, t) => s + (t.durationHours || 0), 0);
    const totalParticipantHours = completedCourses.reduce((s, t) => s + ((t.durationHours || 0) * (getTrainingStudentCount(t) || 1)), 0);
    const totalInvestment = filteredBaseTrainings.reduce((s, t) => s + (t.totalCost || 0), 0);
    const totalSubsidized = filteredBaseTrainings.reduce((s, t) => s + (t.subsidyAmount || (t.isSubsidized ? t.totalCost * 0.8 : 0)), 0);
    
    let avgSatisfaction = 0;
    if (filteredBaseEvaluations.length > 0) {
      const sum = filteredBaseEvaluations.reduce((s, e) => s + (e.ratings?.weightedScore || e.ratings?.overallSatisfaction || 0), 0);
      avgSatisfaction = Number((sum / filteredBaseEvaluations.length).toFixed(2));
    } else if (filteredBaseTrainings.length > 0) {
      const ratedCourses = filteredBaseTrainings.filter((c) => c.averageSatisfaction && c.averageSatisfaction > 0);
      if (ratedCourses.length > 0) {
        avgSatisfaction = Number((ratedCourses.reduce((s, c) => s + (c.averageSatisfaction || 0), 0) / ratedCourses.length).toFixed(2));
      }
    }

    const coursesWithEff = completedCourses.filter((t) => t.effectivenessScore !== undefined || t.isEffective !== undefined);
    const effectiveCourses = completedCourses.filter((t) => (t.effectivenessScore || 0) >= 75 || t.isEffective).length;
    const effectivenessRate = completedCourses.length > 0 && coursesWithEff.length > 0 ? Math.round((effectiveCourses / completedCourses.length) * 100) : 0;

    return {
      totalStudents: studentsAnalytics.length,
      totalTrainers: trainersAnalytics.length,
      totalProviders: providersAnalytics.length,
      totalCourses: filteredBaseTrainings.length,
      completedCourses: completedCourses.length,
      totalTrainingHours,
      totalParticipantHours,
      totalInvestment,
      totalSubsidized,
      subsidyPercent: totalInvestment > 0 ? Math.round((totalSubsidized / totalInvestment) * 100) : 0,
      avgSatisfaction,
      effectivenessRate,
    };
  }, [filteredBaseTrainings, filteredBaseEvaluations, studentsAnalytics, trainersAnalytics, providersAnalytics]);

  // -------------------------------------------------------------
  // 7. FILTERING & SORTING ACTIVE LISTS
  // -------------------------------------------------------------
  const filteredStudents = useMemo(() => {
    return studentsAnalytics
      .filter((s) => {
        if (departmentFilter !== 'all' && s.department !== departmentFilter) return false;
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          const matchName = s.name.toLowerCase().includes(term);
          const matchEmail = s.email.toLowerCase().includes(term);
          const matchDept = s.department.toLowerCase().includes(term);
          const matchCourse = s.coursesEnrolled.some((c) => c.title.toLowerCase().includes(term));
          if (!matchName && !matchEmail && !matchDept && !matchCourse) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'hours_desc') return b.totalHours - a.totalHours;
        if (sortBy === 'hours_asc') return a.totalHours - b.totalHours;
        if (sortBy === 'courses_desc') return b.coursesCompleted.length - a.coursesCompleted.length;
        if (sortBy === 'satisfaction_desc') return b.avgSatisfactionGiven - a.avgSatisfactionGiven;
        if (sortBy === 'effectiveness_desc') return b.avgEffectivenessRating - a.avgEffectivenessRating;
        if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
        return 0;
      });
  }, [studentsAnalytics, departmentFilter, searchTerm, sortBy]);

  const filteredTrainers = useMemo(() => {
    return trainersAnalytics
      .filter((t) => {
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          const matchName = t.name.toLowerCase().includes(term);
          const matchCourse = t.courses.some((c) => c.title.toLowerCase().includes(term));
          const matchProvider = t.providers.some((p) => p.toLowerCase().includes(term));
          if (!matchName && !matchCourse && !matchProvider) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'rating_desc') return b.avgRating - a.avgRating;
        if (sortBy === 'students_desc') return b.totalStudentsTrained - a.totalStudentsTrained;
        if (sortBy === 'hours_desc') return b.totalHours - a.totalHours;
        if (sortBy === 'courses_desc') return b.courses.length - a.courses.length;
        if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
        return b.avgRating - a.avgRating;
      });
  }, [trainersAnalytics, searchTerm, sortBy]);

  const filteredProviders = useMemo(() => {
    return providersAnalytics
      .filter((p) => {
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          const matchName = p.name.toLowerCase().includes(term);
          const matchCourse = p.courses.some((c) => c.title.toLowerCase().includes(term));
          if (!matchName && !matchCourse) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'investment_desc') return b.totalInvestment - a.totalInvestment;
        if (sortBy === 'satisfaction_desc') return b.avgSatisfaction - a.avgSatisfaction;
        if (sortBy === 'courses_desc') return b.courses.length - a.courses.length;
        if (sortBy === 'effectiveness_desc') return b.effectivenessRate - a.effectivenessRate;
        if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
        return b.totalInvestment - a.totalInvestment;
      });
  }, [providersAnalytics, searchTerm, sortBy]);

  // Export CSV Handler
  const handleExportCsv = () => {
    let filename = `estadisticas_formacion_codiagro_${activeTab}.csv`;
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    if (activeTab === 'students') {
      headers = ['Nombre Alumno', 'Email', 'Departamento', 'Cursos Realizados', 'Horas Totales', '% Objetivo 20h', 'Satisfacción Media', 'Eficacia ISO (1-5)', 'Competencias'];
      rows = filteredStudents.map((s) => [
        `"${s.name}"`,
        `"${s.email}"`,
        `"${s.department}"`,
        s.coursesCompleted.length,
        s.totalHours,
        `${s.hoursGoalPercent}%`,
        s.avgSatisfactionGiven || 'N/A',
        s.avgEffectivenessRating || 'N/A',
        `"${s.competencies.join(', ')}"`
      ]);
    } else if (activeTab === 'trainers') {
      headers = ['Docente', 'Entidades Vinculadas', 'Cursos Impartidos', 'Alumnos Formados', 'Horas Docencia', 'Valoración Media (1-5)', 'Pedagogía', 'Dominio Materia', '% Recomendación'];
      rows = filteredTrainers.map((t) => [
        `"${t.name}"`,
        `"${t.providers.join(', ')}"`,
        t.courses.length,
        t.totalStudentsTrained,
        t.totalHours,
        t.avgRating,
        t.pedagogyScore,
        t.knowledgeScore,
        `${t.recommendationRate}%`
      ]);
    } else if (activeTab === 'providers') {
      headers = ['Centro / Proveedor', 'Cursos Contratados', 'Alumnos Totales', 'Horas', 'Inversión (€)', 'Bonificado FUNDAE (€)', 'Coste Neto (€)', 'Satisfacción Media', '% Eficacia ISO'];
      rows = filteredProviders.map((p) => [
        `"${p.name}"`,
        p.courses.length,
        p.totalStudentsTrained,
        p.totalHours,
        p.totalInvestment,
        p.subsidizedAmount,
        p.netCompanyCost,
        p.avgSatisfaction,
        `${p.effectivenessRate}%`
      ]);
    } else {
      headers = ['Departamento', 'Cursos', 'Horas Totales', 'Horas/Empleado', 'Objetivo Cumplido (%)', 'Inversión (€)', 'Satisfacción Media', 'Eficacia ISO (%)'];
      rows = departmentsAnalytics.map((d) => [
        `"${d.name}"`,
        d.coursesCount,
        d.totalParticipantHours,
        d.hoursPerEmployee,
        `${d.hoursGoalPercent}%`,
        d.totalCost,
        d.avgSatisfaction,
        `${d.effectivenessRate}%`
      ]);
    }

    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="analytics-view-container" className="space-y-6 pb-12">
      
      {/* 1. Header & Summary Banner */}
      <div className="bg-[#101C2E] rounded-2xl p-5 sm:p-6 border border-[#1A2B44] shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                <BarChart3 className="w-6 h-6 text-[#00c282]" />
                Estadísticas & Análisis de Formación
              </h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-[#00c282] border border-emerald-500/30">
                KPIs Multidimensionales
              </span>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-[#0A1220] text-slate-300 border border-[#1A2B44]">
                Doc: {settings.documentCode || 'RE0180104'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
              Análisis pormenorizado del rendimiento formativo desglosado por alumno, profesor/docente, centro formador, departamento, temática y modalidad según requisitos ISO 9001:2015 (Cláusula 7.2).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#182840] hover:bg-[#203656] text-slate-200 border border-[#243a5e] transition cursor-pointer"
              title="Exportar datos analíticos de la pestaña actual a formato CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              Exportar CSV ({activeTab})
            </button>
          </div>
        </div>

        {/* Top KPI Ribbon (6 Metrics) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 pt-5 border-t border-[#1A2B44]">
          <div className="bg-[#0A1220] rounded-xl p-3 border border-[#1A2B44]">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>Alumnos Formados</span>
            </div>
            <div className="text-lg font-black text-white mt-1">{globalKpis.totalStudents}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">participantes únicos</div>
          </div>

          <div className="bg-[#0A1220] rounded-xl p-3 border border-[#1A2B44]">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Docentes / Tutores</span>
            </div>
            <div className="text-lg font-black text-white mt-1">{globalKpis.totalTrainers}</div>
            <div className="text-[10px] text-[#00c282] mt-0.5">formadores activos</div>
          </div>

          <div className="bg-[#0A1220] rounded-xl p-3 border border-[#1A2B44]">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <Building2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Centros / Entidades</span>
            </div>
            <div className="text-lg font-black text-white mt-1">{globalKpis.totalProviders}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">proveedores activos</div>
          </div>

          <div className="bg-[#0A1220] rounded-xl p-3 border border-[#1A2B44]">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Horas Recibidas</span>
            </div>
            <div className="text-lg font-black text-amber-300 mt-1">{globalKpis.totalParticipantHours} h</div>
            <div className="text-[10px] text-slate-400 mt-0.5">horas-hombre totales</div>
          </div>

          <div className="bg-[#0A1220] rounded-xl p-3 border border-[#1A2B44]">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <Star className="w-3.5 h-3.5 text-amber-400" />
              <span>Satisfacción Media</span>
            </div>
            <div className="text-lg font-black text-white mt-1 flex items-center gap-1">
              {globalKpis.avgSatisfaction > 0 ? (
                <>
                  <span className="text-amber-300">★ {globalKpis.avgSatisfaction}</span>
                  <span className="text-xs font-normal text-slate-400">/ 5</span>
                </>
              ) : (
                <span className="text-sm text-slate-500 font-normal">Sin evaluar</span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">cuestionarios recibidos</div>
          </div>

          <div className="bg-[#0A1220] rounded-xl p-3 border border-[#1A2B44]">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00c282]" />
              <span>Eficacia ISO 7.2</span>
            </div>
            <div className="text-lg font-black text-[#00c282] mt-1">
              {globalKpis.completedCourses > 0 ? `${globalKpis.effectivenessRate}%` : '0%'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {globalKpis.completedCourses > 0 ? 'transferencia al puesto' : 'sin cursos finalizados'}
            </div>
          </div>
        </div>
      </div>

      {/* 1.5. Global Multi-Filter Bar */}
      <div className="bg-[#101C2E] p-3 sm:p-4 rounded-2xl border border-[#1A2B44] flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-emerald-400" />
            <span>Filtrar Dashboard:</span>
          </div>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className={`rounded-xl px-3 py-2 text-xs font-semibold border transition focus:outline-hidden cursor-pointer ${
              departmentFilter !== 'all'
                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 font-bold'
                : 'bg-[#0A1220] border-[#1A2B44] text-slate-200 hover:border-slate-500'
            }`}
          >
            <option value="all">🏢 Todos los Departamentos</option>
            {settings.departments?.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`rounded-xl px-3 py-2 text-xs font-semibold border transition focus:outline-hidden cursor-pointer ${
              statusFilter !== 'all'
                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 font-bold'
                : 'bg-[#0A1220] border-[#1A2B44] text-slate-200 hover:border-slate-500'
            }`}
          >
            <option value="all">📋 Todos los Estados</option>
            <option value="completed">Finalizados / Realizados</option>
            <option value="in_progress">En curso</option>
            <option value="planned">Planificados</option>
            <option value="cancelled">Cancelados</option>
          </select>

          {/* Reset Filters */}
          {(departmentFilter !== 'all' || statusFilter !== 'all' || searchTerm) && (
            <button
              onClick={() => {
                setDepartmentFilter('all');
                setStatusFilter('all');
                setSearchTerm('');
              }}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition cursor-pointer"
              title="Restablecer todos los filtros"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Limpiar Filtros
            </button>
          )}
        </div>

        {/* Global Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={`Buscar por nombre, curso, entidad...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0A1220] border border-[#1A2B44] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Indicator Badge */}
      {departmentFilter !== 'all' && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-emerald-300">
            <Building className="w-4 h-4" />
            <span>
              Mostrando estadísticas filtradas para: <strong>{departmentFilter}</strong> ({filteredBaseTrainings.length} cursos encontrados)
            </span>
          </div>
          <button
            onClick={() => setDepartmentFilter('all')}
            className="text-xs text-emerald-400 hover:underline font-bold cursor-pointer"
          >
            Quitar filtro
          </button>
        </div>
      )}

      {/* 2. Interactive Navigation Tabs for Dimensions */}
      <div className="bg-[#101C2E] p-2 rounded-2xl border border-[#1A2B44] flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            setActiveTab('students');
            setSortBy('hours_desc');
          }}
          className={`flex-1 min-w-[140px] px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'students'
              ? 'bg-[#00a86b] text-white shadow-md'
              : 'bg-[#0A1220] text-slate-300 hover:bg-[#182840] hover:text-white border border-[#1A2B44]'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Por Alumno ({studentsAnalytics.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('trainers');
            setSortBy('rating_desc');
          }}
          className={`flex-1 min-w-[140px] px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'trainers'
              ? 'bg-[#00a86b] text-white shadow-md'
              : 'bg-[#0A1220] text-slate-300 hover:bg-[#182840] hover:text-white border border-[#1A2B44]'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Por Profesor ({trainersAnalytics.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('providers');
            setSortBy('investment_desc');
          }}
          className={`flex-1 min-w-[140px] px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'providers'
              ? 'bg-[#00a86b] text-white shadow-md'
              : 'bg-[#0A1220] text-slate-300 hover:bg-[#182840] hover:text-white border border-[#1A2B44]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Por Centro / Proveedor ({providersAnalytics.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('departments')}
          className={`flex-1 min-w-[140px] px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'departments'
              ? 'bg-[#00a86b] text-white shadow-md'
              : 'bg-[#0A1220] text-slate-300 hover:bg-[#182840] hover:text-white border border-[#1A2B44]'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Por Departamento ({departmentsAnalytics.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`flex-1 min-w-[140px] px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'categories'
              ? 'bg-[#00a86b] text-white shadow-md'
              : 'bg-[#0A1220] text-slate-300 hover:bg-[#182840] hover:text-white border border-[#1A2B44]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Temáticas & Modalidades</span>
        </button>
      </div>

      {/* Sort controls for lists */}
      {(activeTab === 'students' || activeTab === 'trainers' || activeTab === 'providers') && (
        <div className="flex justify-end items-center gap-2 px-1">
          <span className="text-xs text-slate-400">Ordenar lista:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-[#0A1220] border border-[#1A2B44] rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium"
          >
            {activeTab === 'students' && (
              <>
                <option value="hours_desc">Mayor Horas de Formación</option>
                <option value="hours_asc">Menor Horas de Formación</option>
                <option value="courses_desc">Más Cursos Realizados</option>
                <option value="satisfaction_desc">Mayor Satisfacción Dada</option>
                <option value="effectiveness_desc">Mayor Eficacia en el Puesto</option>
                <option value="name_asc">Nombre Alumno (A-Z)</option>
              </>
            )}
            {activeTab === 'trainers' && (
              <>
                <option value="rating_desc">Mayor Valoración Media (★)</option>
                <option value="students_desc">Más Alumnos Formados</option>
                <option value="hours_desc">Más Horas Impartidas</option>
                <option value="courses_desc">Más Cursos Impartidos</option>
                <option value="name_asc">Nombre Docente (A-Z)</option>
              </>
            )}
            {activeTab === 'providers' && (
              <>
                <option value="investment_desc">Mayor Inversión Contratada (€)</option>
                <option value="satisfaction_desc">Mayor Satisfacción Media (★)</option>
                <option value="courses_desc">Más Cursos Contratados</option>
                <option value="effectiveness_desc">Mayor Ratio de Eficacia ISO</option>
                <option value="name_asc">Nombre Proveedor (A-Z)</option>
              </>
            )}
          </select>
        </div>
      )}

      {/* 4. MAIN TAB CONTENT */}

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: POR ALUMNO / PARTICIPANTE (ESTADÍSTICAS INDIVIDUALES) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'students' && (
        <div className="bg-[#101C2E] rounded-2xl border border-[#1A2B44] shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#1A2B44] flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                Expedientes y Métricas por Alumno ({filteredStudents.length})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Seguimiento de horas acumuladas vs objetivo anual de 20 horas por empleado, satisfacción y competencias adquiridas.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#0A1220] border-b border-[#1A2B44] text-slate-400 font-bold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Alumno / Empleado</th>
                  <th className="py-3 px-3">Departamento</th>
                  <th className="py-3 px-3 text-center">Cursos</th>
                  <th className="py-3 px-3 text-center">Horas Recibidas</th>
                  <th className="py-3 px-4 text-center">Progreso Objetivo (20h)</th>
                  <th className="py-3 px-3 text-center">Satisfacción Dada</th>
                  <th className="py-3 px-3 text-center">Eficacia Puesto</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A2B44]/60">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                      No se encontraron alumnos con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-[#14233a]/60 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                            {s.name.charAt(0)}
                          </div>
                          <div>
                            <div>{s.name}</div>
                            <div className="text-[11px] text-slate-400 font-normal">{s.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#0A1220] text-slate-200 border border-[#1A2B44] text-xs font-medium">
                          {s.department}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center font-bold text-slate-200">
                        {s.coursesCompleted.length} <span className="text-[10px] text-slate-400 font-normal">/ {s.coursesEnrolled.length}</span>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 font-bold text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-md border border-amber-500/30">
                          <Clock className="w-3 h-3" />
                          {s.totalHours} h
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-[#0A1220] h-2 rounded-full overflow-hidden border border-[#1A2B44]">
                            <div 
                              className={`h-full transition-all duration-500 ${
                                s.hoursGoalPercent >= 100 ? 'bg-[#00c282]' : s.hoursGoalPercent >= 50 ? 'bg-amber-400' : 'bg-blue-400'
                              }`}
                              style={{ width: `${s.hoursGoalPercent}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold min-w-[36px] ${
                            s.hoursGoalPercent >= 100 ? 'text-[#00c282]' : 'text-slate-300'
                          }`}>
                            {s.hoursGoalPercent}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        {s.avgSatisfactionGiven ? (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30">
                            ★ {s.avgSatisfactionGiven}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#00c282] bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          ★ {s.avgEffectivenessRating} / 5
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => setSelectedStudent(s)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 text-[#00c282] border border-emerald-500/30 transition text-xs font-bold flex items-center gap-1.5 cursor-pointer mx-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver Expediente</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: POR PROFESOR / DOCENTE (ESTADÍSTICAS DOCENTES) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'trainers' && (
        <div className="space-y-6">
          <div className="bg-[#101C2E] rounded-2xl border border-[#1A2B44] shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#1A2B44] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-emerald-400" />
                  Evaluación y Ranking de Profesores / Docentes ({filteredTrainers.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Valoración pedagógica, dominio de la materia y grado de satisfacción otorgado por los alumnos.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#0A1220] border-b border-[#1A2B44] text-slate-400 font-bold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Docente / Formador</th>
                    <th className="py-3 px-3">Centro / Entidad</th>
                    <th className="py-3 px-3 text-center">Cursos Impartidos</th>
                    <th className="py-3 px-3 text-center">Alumnos Formados</th>
                    <th className="py-3 px-3 text-center">Horas Docencia</th>
                    <th className="py-3 px-3 text-center">Valoración Media</th>
                    <th className="py-3 px-3 text-center">% Recomendación</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A2B44]/60">
                  {filteredTrainers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                        No se encontraron formadores con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredTrainers.map((t) => (
                      <tr key={t.name} className="hover:bg-[#14233a]/60 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-[#00c282] font-bold text-xs flex items-center justify-center shrink-0">
                              {t.name.charAt(0)}
                            </div>
                            <div>
                              <div>{t.name}</div>
                              <div className="text-[11px] text-slate-400 font-normal truncate max-w-xs">{t.topCourse}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="text-slate-300 text-xs font-medium">
                            {t.providers.join(', ') || 'Formador Interno'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center font-bold text-slate-200">
                          {t.courses.length}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 font-bold text-blue-300 bg-blue-500/15 px-2.5 py-0.5 rounded-md border border-blue-500/30">
                            <Users className="w-3 h-3" />
                            {t.totalStudentsTrained}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center font-bold text-amber-300">
                          {t.totalHours} h
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 font-bold text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-md border border-amber-500/30">
                            ★ {t.avgRating} / 5
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#00c282] bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                            ✓ {t.recommendationRate}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => setSelectedTrainer(t)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 text-[#00c282] border border-emerald-500/30 transition text-xs font-bold flex items-center gap-1.5 cursor-pointer mx-auto"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver Detalle</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: POR CENTRO / PROVEEDOR (ENTIDADES FORMADORAS) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'providers' && (
        <div className="bg-[#101C2E] rounded-2xl border border-[#1A2B44] shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#1A2B44] flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-400" />
                Centros y Entidades de Formación ({filteredProviders.length})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Costes, bonificaciones FUNDAE gestionadas, satisfacción y ratio de eficacia por entidad formadora.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#0A1220] border-b border-[#1A2B44] text-slate-400 font-bold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Centro / Entidad</th>
                  <th className="py-3 px-3 text-center">Cursos</th>
                  <th className="py-3 px-3 text-center">Alumnos</th>
                  <th className="py-3 px-3 text-right">Inversión (€)</th>
                  <th className="py-3 px-3 text-right">Bonif. FUNDAE</th>
                  <th className="py-3 px-3 text-right">Coste Neto</th>
                  <th className="py-3 px-3 text-center">Coste/h/alumno</th>
                  <th className="py-3 px-3 text-center">Satisfacción</th>
                  <th className="py-3 px-3 text-center">Eficacia ISO</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A2B44]/60">
                {filteredProviders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400 text-xs">
                      No se encontraron centros formadores con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredProviders.map((p) => (
                    <tr key={p.name} className="hover:bg-[#14233a]/60 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 font-bold text-xs flex items-center justify-center shrink-0">
                            {p.name.charAt(0)}
                          </div>
                          <div>
                            <div>{p.name}</div>
                            <div className="text-[11px] text-slate-400 font-normal">
                              {p.trainers.length} formador{p.trainers.length !== 1 ? 'es' : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-center font-bold text-slate-200">
                        {p.courses.length}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 font-bold text-blue-300 bg-blue-500/15 px-2 py-0.5 rounded-md border border-blue-500/30">
                          {p.totalStudentsTrained}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-white">
                        {p.totalInvestment.toLocaleString()} €
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-[#00c282]">
                        {p.subsidizedAmount.toLocaleString()} €
                        <span className="text-[10px] block text-slate-400 font-normal">({p.subsidyPercentage}%)</span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-amber-300">
                        {p.netCompanyCost.toLocaleString()} €
                      </td>
                      <td className="py-3.5 px-3 text-center text-xs font-mono text-slate-300">
                        {p.costPerHourStudent} €/h
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30">
                          ★ {p.avgSatisfaction}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#00c282] bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          {p.effectivenessRate}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => setSelectedProvider(p)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 text-[#00c282] border border-emerald-500/30 transition text-xs font-bold flex items-center gap-1.5 cursor-pointer mx-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver Cursos</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: POR DEPARTAMENTO / ÁREA DE LA EMPRESA */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'departments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {departmentsAnalytics.map((dept) => (
              <div 
                key={dept.name} 
                className="bg-[#101C2E] rounded-2xl p-5 border border-[#1A2B44] shadow-sm hover:border-emerald-500/30 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#0A1220] text-emerald-400 border border-[#1A2B44]">
                      {dept.coursesCount} Cursos
                    </span>
                    {dept.avgSatisfaction > 0 ? (
                      <span className="text-xs font-bold text-amber-300">
                        ★ {dept.avgSatisfaction} / 5
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-500">
                        Sin evaluar
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-white tracking-tight leading-snug line-clamp-2 min-h-[40px]">
                    {dept.name}
                  </h4>

                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Horas totales:</span>
                      <strong className="text-white">{dept.totalParticipantHours} h</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Media por empleado:</span>
                      <strong className="text-amber-300">{dept.hoursPerEmployee} h / año</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Inversión ejecutada:</span>
                      <strong className="text-slate-200">{dept.totalCost.toLocaleString()} €</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Eficacia ISO 7.2:</span>
                      <strong className={dept.coursesCount > 0 ? 'text-[#00c282]' : 'text-slate-500'}>
                        {dept.coursesCount > 0 ? `${dept.effectivenessRate}%` : '0%'}
                      </strong>
                    </div>
                  </div>

                  {/* Progress bar vs 20h target */}
                  <div className="mt-4 pt-3 border-t border-[#1A2B44]">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Objetivo 20h/emp:</span>
                      <span className={`font-bold ${dept.hoursGoalPercent >= 100 ? 'text-[#00c282]' : 'text-slate-300'}`}>
                        {dept.hoursGoalPercent}%
                      </span>
                    </div>
                    <div className="bg-[#0A1220] h-2 rounded-full overflow-hidden border border-[#1A2B44]">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          dept.hoursGoalPercent >= 100 ? 'bg-[#00c282]' : dept.hoursGoalPercent >= 50 ? 'bg-amber-400' : 'bg-blue-400'
                        }`}
                        style={{ width: `${dept.hoursGoalPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#1A2B44]/60">
                  <button
                    onClick={() => setSelectedDepartmentDetail(dept)}
                    className="w-full py-1.5 rounded-lg bg-[#182840] hover:bg-[#203656] text-slate-200 hover:text-white text-xs font-semibold border border-[#243a5e] transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Ver Cursos del Área</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: TEMÁTICAS Y MODALIDADES */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          {/* Modalidades Presencial vs Online vs Hibrida */}
          <div className="bg-[#101C2E] rounded-2xl p-5 sm:p-6 border border-[#1A2B44] shadow-sm">
            <h3 className="text-sm sm:text-base font-bold text-white mb-1 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-400" />
              Comparativa por Modalidad de Impartición
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Rendimiento, asistencia y satisfacción según el formato de aprendizaje.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {modalitiesAnalytics.map((mod) => (
                <div key={mod.name} className="bg-[#0A1220] rounded-xl p-4 border border-[#1A2B44]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white text-sm">{mod.label}</span>
                    <span className="text-xs font-bold text-amber-300">★ {mod.avgSatisfaction} / 5</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Cursos realizados:</span>
                      <strong>{mod.coursesCount}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Horas acumuladas:</span>
                      <strong className="text-amber-300">{mod.totalHours} h</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Asistencia media:</span>
                      <strong className="text-[#00c282]">{mod.avgAttendanceRate}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Inversión total:</span>
                      <strong>{mod.totalCost.toLocaleString()} €</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Temáticas / Categorías */}
          <div className="bg-[#101C2E] rounded-2xl border border-[#1A2B44] shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#1A2B44]">
              <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                Desglose por Categoría / Temática Formativa
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#0A1220] border-b border-[#1A2B44] text-slate-400 font-bold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Categoría / Temática</th>
                    <th className="py-3 px-3 text-center">Cursos</th>
                    <th className="py-3 px-3 text-center">Horas</th>
                    <th className="py-3 px-3 text-center">Alumnos</th>
                    <th className="py-3 px-3 text-right">Inversión (€)</th>
                    <th className="py-3 px-3 text-center">Satisfacción</th>
                    <th className="py-3 px-3 text-center">Eficacia ISO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A2B44]/60">
                  {categoriesAnalytics.map((cat) => (
                    <tr key={cat.name} className="hover:bg-[#14233a]/60 transition">
                      <td className="py-3.5 px-4 font-bold text-white">
                        {cat.name}
                      </td>
                      <td className="py-3.5 px-3 text-center font-bold text-slate-200">
                        {cat.coursesCount}
                      </td>
                      <td className="py-3.5 px-3 text-center font-bold text-amber-300">
                        {cat.totalHours} h
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 font-bold text-blue-300 bg-blue-500/15 px-2 py-0.5 rounded-md border border-blue-500/30">
                          {cat.totalParticipants}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-slate-200">
                        {cat.totalCost.toLocaleString()} €
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30">
                          ★ {cat.avgSatisfaction}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#00c282] bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          {cat.effectivenessRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL / DRAWER: EXPEDIENTE FORMATIVO INDIVIDUAL DEL ALUMNO */}
      {/* ------------------------------------------------------------- */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-[#101C2E] rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-[#1A2B44] max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#1A2B44] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-300 font-black text-lg flex items-center justify-center">
                  {selectedStudent.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">{selectedStudent.name}</h3>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-[#0A1220] text-slate-300 border border-[#1A2B44]">
                      {selectedStudent.department}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{selectedStudent.email}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedStudent(null)}
                className="p-2 rounded-xl bg-[#182840] hover:bg-[#203656] text-slate-400 hover:text-white border border-[#243a5e] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
              <div className="bg-[#0A1220] p-3 rounded-xl border border-[#1A2B44]">
                <span className="text-[11px] text-slate-400">Horas Totales</span>
                <div className="text-base font-black text-amber-300 mt-0.5">{selectedStudent.totalHours} h</div>
                <span className="text-[10px] text-slate-400">{selectedStudent.hoursGoalPercent}% de 20h</span>
              </div>
              <div className="bg-[#0A1220] p-3 rounded-xl border border-[#1A2B44]">
                <span className="text-[11px] text-slate-400">Cursos Realizados</span>
                <div className="text-base font-black text-white mt-0.5">{selectedStudent.coursesCompleted.length}</div>
                <span className="text-[10px] text-slate-400">{selectedStudent.coursesEnrolled.length} convocados</span>
              </div>
              <div className="bg-[#0A1220] p-3 rounded-xl border border-[#1A2B44]">
                <span className="text-[11px] text-slate-400">Satisfacción Media</span>
                <div className="text-base font-black text-white mt-0.5">
                  ★ {selectedStudent.avgSatisfactionGiven || '—'}
                </div>
                <span className="text-[10px] text-slate-400">{selectedStudent.evaluationsCount} cuestionarios</span>
              </div>
              <div className="bg-[#0A1220] p-3 rounded-xl border border-[#1A2B44]">
                <span className="text-[11px] text-slate-400">Eficacia ISO 7.2</span>
                <div className="text-base font-black text-[#00c282] mt-0.5">
                  ★ {selectedStudent.avgEffectivenessRating} / 5
                </div>
                <span className="text-[10px] text-slate-400">{selectedStudent.followupsCount} seguimientos</span>
              </div>
            </div>

            {/* Competencies Acquired */}
            {selectedStudent.competencies.length > 0 && (
              <div className="mb-5">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  Competencias Certificadas ISO 9001
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedStudent.competencies.map((comp) => (
                    <span 
                      key={comp} 
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-medium flex items-center gap-1"
                    >
                      <Check className="w-3 h-3 text-[#00c282]" />
                      {comp}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Courses History */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                Historial de Acciones Formativas ({selectedStudent.coursesEnrolled.length})
              </h4>
              
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {selectedStudent.coursesEnrolled.map((course) => (
                  <div key={course.id} className="bg-[#0A1220] p-3 rounded-xl border border-[#1A2B44] text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-emerald-400">[{course.code}]</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#182840] text-slate-300 border border-[#243a5e]">
                        {course.durationHours} horas · {course.modality}
                      </span>
                    </div>
                    <div className="font-bold text-white text-sm">{course.title}</div>
                    <div className="text-slate-400 mt-1 flex flex-wrap items-center gap-3 text-[11px]">
                      <span>Docente: <strong className="text-slate-200">{course.trainerName}</strong></span>
                      <span>Proveedor: <strong className="text-slate-200">{course.provider}</strong></span>
                      <span>Fecha: <strong className="text-slate-200">{course.plannedDate}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#1A2B44] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="px-5 py-2 bg-[#182840] hover:bg-[#203656] text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Cerrar Expediente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL / DRAWER: DETALLE DEL FORMADOR / DOCENTE */}
      {/* ------------------------------------------------------------- */}
      {selectedTrainer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-[#101C2E] rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-[#1A2B44]">
            <div className="flex items-center justify-between border-b border-[#1A2B44] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-[#00c282] font-black text-lg flex items-center justify-center">
                  {selectedTrainer.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedTrainer.name}</h3>
                  <p className="text-xs text-slate-400">{selectedTrainer.providers.join(', ') || 'Formador Profesional'}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedTrainer(null)}
                className="p-2 rounded-xl bg-[#182840] hover:bg-[#203656] text-slate-400 hover:text-white border border-[#243a5e] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-3 my-5">
              <div className="bg-[#0A1220] p-3 rounded-xl border border-[#1A2B44] text-center">
                <span className="text-[11px] text-slate-400">Valoración Media</span>
                <div className="text-lg font-black text-amber-300 mt-0.5">★ {selectedTrainer.avgRating} / 5</div>
              </div>
              <div className="bg-[#0A1220] p-3 rounded-xl border border-[#1A2B44] text-center">
                <span className="text-[11px] text-slate-400">Alumnos Formados</span>
                <div className="text-lg font-black text-white mt-0.5">{selectedTrainer.totalStudentsTrained}</div>
              </div>
              <div className="bg-[#0A1220] p-3 rounded-xl border border-[#1A2B44] text-center">
                <span className="text-[11px] text-slate-400">Horas Impartidas</span>
                <div className="text-lg font-black text-emerald-400 mt-0.5">{selectedTrainer.totalHours} h</div>
              </div>
            </div>

            {/* Courses List */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Cursos Impartidos en Codiagro
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {selectedTrainer.courses.map((c) => (
                  <div key={c.id} className="bg-[#0A1220] p-3 rounded-xl border border-[#1A2B44] text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{c.title}</span>
                      <span className="text-amber-300 font-bold">★ {c.averageSatisfaction || '5.0'}</span>
                    </div>
                    <div className="text-slate-400 text-[11px] mt-1">
                      Código: {c.code} · {c.durationHours}h · {c.department}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#1A2B44] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTrainer(null)}
                className="px-5 py-2 bg-[#182840] hover:bg-[#203656] text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL / DRAWER: DETALLE DEL CENTRO / PROVEEDOR */}
      {/* ------------------------------------------------------------- */}
      {selectedProvider && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-[#101C2E] rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-[#1A2B44]">
            <div className="flex items-center justify-between border-b border-[#1A2B44] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-300 font-black text-lg flex items-center justify-center">
                  {selectedProvider.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedProvider.name}</h3>
                  <p className="text-xs text-slate-400">Entidad de Formación Homologada</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedProvider(null)}
                className="p-2 rounded-xl bg-[#182840] hover:bg-[#203656] text-slate-400 hover:text-white border border-[#243a5e] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-3 my-5">
              <div className="bg-[#0A1220] p-3 rounded-xl border border-[#1A2B44] text-center">
                <span className="text-[11px] text-slate-400">Inversión Total</span>
                <div className="text-base font-black text-white mt-0.5">{selectedProvider.totalInvestment.toLocaleString()} €</div>
                <span className="text-[10px] text-[#00c282]">{selectedProvider.subsidizedAmount.toLocaleString()} € bonif.</span>
              </div>
              <div className="bg-[#0A1220] p-3 rounded-xl border border-[#1A2B44] text-center">
                <span className="text-[11px] text-slate-400">Satisfacción</span>
                <div className="text-base font-black text-amber-300 mt-0.5">★ {selectedProvider.avgSatisfaction} / 5</div>
                <span className="text-[10px] text-slate-400">{selectedProvider.evaluationsCount} valoraciones</span>
              </div>
              <div className="bg-[#0A1220] p-3 rounded-xl border border-[#1A2B44] text-center">
                <span className="text-[11px] text-slate-400">Eficacia ISO 7.2</span>
                <div className="text-base font-black text-[#00c282] mt-0.5">{selectedProvider.effectivenessRate}%</div>
                <span className="text-[10px] text-slate-400">transferencia</span>
              </div>
            </div>

            {/* Courses List */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Acciones Formativas Contratadas ({selectedProvider.courses.length})
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {selectedProvider.courses.map((c) => (
                  <div key={c.id} className="bg-[#0A1220] p-3 rounded-xl border border-[#1A2B44] text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">[{c.code}] {c.title}</span>
                      <span className="text-slate-300 font-bold">{c.totalCost} €</span>
                    </div>
                    <div className="text-slate-400 text-[11px] mt-1 flex justify-between">
                      <span>Docente: {c.trainerName}</span>
                      <span>{c.durationHours}h · {c.plannedDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#1A2B44] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedProvider(null)}
                className="px-5 py-2 bg-[#182840] hover:bg-[#203656] text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL / DRAWER: DETALLE DEL DEPARTAMENTO */}
      {/* ------------------------------------------------------------- */}
      {selectedDepartmentDetail && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-[#101C2E] rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-[#1A2B44]">
            <div className="flex items-center justify-between border-b border-[#1A2B44] pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Detalle de Área</span>
                <h3 className="text-lg font-bold text-white">{selectedDepartmentDetail.name}</h3>
              </div>

              <button
                onClick={() => setSelectedDepartmentDetail(null)}
                className="p-2 rounded-xl bg-[#182840] hover:bg-[#203656] text-slate-400 hover:text-white border border-[#243a5e] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 my-5">
              <div className="bg-[#0A1220] p-3 rounded-xl border border-[#1A2B44] text-center">
                <span className="text-[11px] text-slate-400">Horas Totales</span>
                <div className="text-base font-black text-amber-300 mt-0.5">{selectedDepartmentDetail.totalParticipantHours} h</div>
                <span className="text-[10px] text-slate-400">{selectedDepartmentDetail.hoursPerEmployee}h/empleado</span>
              </div>
              <div className="bg-[#0A1220] p-3 rounded-xl border border-[#1A2B44] text-center">
                <span className="text-[11px] text-slate-400">Satisfacción</span>
                <div className="text-base font-black text-white mt-0.5">
                  {selectedDepartmentDetail.avgSatisfaction > 0 ? (
                    <span className="text-amber-300">★ {selectedDepartmentDetail.avgSatisfaction} / 5</span>
                  ) : (
                    <span className="text-xs text-slate-500 font-normal">Sin evaluar</span>
                  )}
                </div>
              </div>
              <div className="bg-[#0A1220] p-3 rounded-xl border border-[#1A2B44] text-center">
                <span className="text-[11px] text-slate-400">Eficacia ISO</span>
                <div className={`text-base font-black mt-0.5 ${selectedDepartmentDetail.courses.length > 0 ? 'text-[#00c282]' : 'text-slate-500'}`}>
                  {selectedDepartmentDetail.courses.length > 0 ? `${selectedDepartmentDetail.effectivenessRate}%` : '0%'}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Cursos Realizados por el Departamento ({selectedDepartmentDetail.courses.length})
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {selectedDepartmentDetail.courses.length === 0 ? (
                  <div className="text-slate-500 text-xs py-4 text-center">
                    No hay cursos registrados específicamente para este departamento.
                  </div>
                ) : (
                  selectedDepartmentDetail.courses.map((c) => (
                    <div key={c.id} className="bg-[#0A1220] p-3 rounded-xl border border-[#1A2B44] text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">[{c.code}] {c.title}</span>
                        <span className="text-amber-300 font-bold">{c.durationHours}h</span>
                      </div>
                      <div className="text-slate-400 text-[11px] mt-1 flex justify-between">
                        <span>Docente: {c.trainerName}</span>
                        <span>{c.totalCost} € · {c.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#1A2B44] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDepartmentDetail(null)}
                className="px-5 py-2 bg-[#182840] hover:bg-[#203656] text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
