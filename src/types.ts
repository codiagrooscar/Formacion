export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  active?: boolean;
  jobTitle?: string;
}

export interface TrainingAttendee {
  id: string;
  name: string;
  email: string;
  department?: string;
  invitedAt?: string; // Legacy / generic invitation
  convokedAt?: string; // Pre-course notification date
  evaluationRequestedAt?: string; // Post-course questionnaire request date
  hasCompletedEvaluation?: boolean;
  completedAt?: string;
  evaluationId?: string;
}

export interface TrainingAction {
  id: string;
  code: string;
  title: string;
  category: 'Tecnología' | 'Calidad e ISO' | 'Prevención y Seguridad' | 'Habilidades y Liderazgo' | 'Operaciones' | 'Idiomas' | 'Comercial y Marketing';
  department: string;
  targetCompetencies: string[];
  plannedDate: string;
  endDate?: string;
  executedDate?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  modality: 'presencial' | 'online' | 'hibrida';
  durationHours: number;
  totalParticipantsPlanned: number;
  totalParticipantsAttended: number;
  totalCost: number;
  isSubsidized: boolean;
  subsidyType?: 'amount' | 'percentage';
  subsidyAmount?: number;
  subsidyPercentage?: number;
  netCompanyCost: number;
  justification?: string;
  attendees?: TrainingAttendee[];
  provider: string;
  trainingCenter?: string; // Centro de formación / entidad impartidora
  trainerName: string;
  locationOrPlatform: string;
  isoClause: string;
  averageSatisfaction?: number; // 1 to 5 scale
  effectivenessScore?: number; // % (0 - 100)
  isEffective?: boolean;
  evaluationsCount: number;
  attendanceRate: number; // % (0 - 100)
  createdAt: string;
  notes?: string;
}

// Codiagro Official ISO 9001 RE0180104 Ed. 07 Rating Structure
export interface AttendeeTrainingRatings {
  respondedToSyllabus: number; // 1. El curso ha respondido al temario inicial (1-5)
  coveredInitialObjectives: number; // 2. El curso ha cubierto los objetivos iniciales (1-5)
  didacticResourcesAdequate: number; // 3. Los Recursos didácticos facilitados han sido adecuados (1-5)
  overallSatisfaction: number; // 4. El grado de satisfacción general con el curso (1-5)
}

export interface AttendeeEffectivenessRatings {
  knowledgeAcquisition: number; // 1. El curso ha supuesto la adquisición de nuevos conocimientos (1-5)
  knowledgeLevelBefore: number; // 2. Antes del curso, mi nivel de conocimientos era... (1-5)
  knowledgeLevelAfter: number; // 3. Después del curso, mi nivel de conocimientos es... (1-5)
  practicalUtility: number; // 4. El curso me es útil a la práctica (1-5)
  attendeeObservations?: string; // Observaciones / Comentarios del Trabajador (Bloque Asistente)
}

export interface CompanyEvaluationRatings {
  trainingValuationComment: string; // VALORACIÓN DEL CURSO (Texto explicativo)
  trainingValuationDate: string;
  knowledgeTransferComment: string; // TRANSMISIÓN CONOCIMIENTOS (ej. "NO ES NECESARIO" o detalle)
  knowledgeTransferDate: string;
  capacityImprovement: number; // 1. La mejoría de su capacitación en su actividad de trabajo (1-5)
  attitudeImprovement: number; // 2. La mejoría de su actitud frente al trabajo (1-5)
  skillsAcquisition: number; // 3. La adquisición de nuevas habilidades (1-5)
  generalObservations?: string; // COMENTARIOS Y OBSERVACIONES
}

export interface EvaluationRatings {
  // ISO Form direct sections
  attendeeTraining: AttendeeTrainingRatings;
  attendeeEffectiveness: AttendeeEffectivenessRatings;
  companyEvaluation: CompanyEvaluationRatings;
  
  // Calculated means
  meanTraining: number; // Media Formación
  meanEffectiveness: number; // Media Eficacia
  meanCompany: number; // Media Valoración Empresa
  weightedScore: number; // Media Ponderada = (meanTraining*0.25) + (meanEffectiveness*0.35) + (meanCompany*0.40)
  gradeCategory: 'PENDIENTE' | 'DEFICIENTE' | 'NORMAL' | 'MUY SATISFACTORIO';

  // Compatibility fields
  contentClarity?: number;
  contentUtility?: number;
  trainerKnowledge?: number;
  trainerPedagogy?: number;
  organizationFacilities?: number;
  durationAdequacy?: number;
  jobApplicability?: number;
  overallSatisfaction: number;
}

export interface EvaluationQualitative {
  highlightedStrengths: string;
  areasForImprovement: string;
  wouldRecommend: boolean;
  actionPlanCommitment: string; // Plan de acción / aplicación inmediata
  suggestedFutureTopics?: string;
}

export interface Evaluation {
  id: string;
  trainingActionId: string;
  trainingCode?: string;
  trainingTitle: string;
  trainingDate?: string;
  durationHours?: number;
  trainingNeedDescription?: string;
  responsibleName?: string;
  trainerName?: string;
  trainingCenter?: string; // Centro de formación / entidad impartidora
  employeeName?: string;
  employeeEmail?: string;
  department: string;
  submissionDate: string;
  submissionSource: 'online_form' | 'scanned_paper' | 'camera_capture' | 'bulk_upload';
  ratings: EvaluationRatings;
  qualitative?: EvaluationQualitative;
  effectivenessFollowupNeeded?: boolean;
  scannedImagePreview?: string;
  rawExtractedNotes?: string;
  confidenceScore?: number;
}

export interface EffectivenessFollowup {
  id: string;
  trainingActionId: string;
  trainingCode?: string;
  trainingTitle: string;
  employeeName: string;
  employeeDepartment: string;
  managerName: string;
  evaluationDate: string;
  periodDays: 30 | 60 | 90;
  performanceImprovementRating: number; // 1-5
  knowledgeApplied: boolean;
  goalsAchieved: boolean;
  comments: string;
  status: 'pending' | 'completed';
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'evaluation_received' | 'training_scheduled' | 'followup_due' | 'system';
  trainingId?: string;
  evaluationId?: string;
  employeeName?: string;
  courseTitle?: string;
  rating?: number;
  read: boolean;
  createdAt: string;
}

export interface CompanySettings {
  documentCode: string; // e.g. 'RE0180104'
  documentEdition: string; // e.g. '07'
  companyName?: string; // e.g. 'CODIAGRO S.A.'
  logoUrl?: string; // Custom uploaded or default logo (/logo.png)
  adminEmail: string; // e.g. 'codiagrooscar@gmail.com'
  authorizedAdminEmails?: string[]; // List of authorized administrator emails
  emailNotificationEnabled?: boolean;
  pushNotificationEnabled?: boolean;
  dailyPendingDigestEnabled?: boolean; // Send daily summary to admin if there are pending questionnaires
  dailyPendingDigestHour?: number; // e.g. 8 (8:00 AM)
  lastDailyDigestSentDate?: string; // e.g. '2026-08-19'
  smtpHost?: string; // e.g. 'smtp.gmail.com'
  smtpPort?: number; // e.g. 465
  smtpUser?: string; // e.g. 'codiagrooscar@gmail.com'
  smtpPass?: string; // App Password / SMTP Password
  totalEmployees: number;
  annualTrainingBudget: number;
  targetHoursPerEmployee: number;
  targetSatisfactionScore: number; // e.g. 4.0 out of 5
  targetEffectivenessRate: number; // e.g. 80%
  departments: string[];
  categories?: string[];
  competencyCatalog: string[];
  employees?: Employee[];
  trainingCenters?: string[];
  year: number;
  nextCorrelativeNumber?: number; // Manual start / override for correlative numbering (e.g., 1, 26001, 15...)
}

export interface AIExtractionResult {
  detectedCourseName?: string;
  detectedCourseCode?: string;
  detectedDate?: string;
  detectedDuration?: string;
  detectedNeedDescription?: string;
  detectedTrainerOrResponsible?: string;
  detectedParticipantName?: string;
  detectedDepartment?: string;
  ratings: EvaluationRatings;
  qualitative?: EvaluationQualitative;
  confidenceScore: number;
  rawNotes: string;
  aiInsights?: string;
}
