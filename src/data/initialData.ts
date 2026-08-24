import { TrainingAction, Evaluation, EffectivenessFollowup, CompanySettings, Employee } from '../types';

export const INITIAL_TRAINING_CENTERS: string[] = [
  'Bureau Veritas Formación',
  'AENOR Formación',
  'Cámara de Comercio de Castellón',
  'SGS Academy',
  'Instituto Tecnológico Agroalimentario (AINIA)',
  'Codiagro Formación Interna',
  'TÜV SÜD Academy',
  'Universidad Jaume I (UJI) - FUE'
];

export const INITIAL_EMPLOYEES: Employee[] = [
  // Calidad, Medio Ambiente & I+D+i (ISO)
  { id: 'emp-001', name: 'Laura Méndez', email: 'laura.mendez@codiagro.com', department: 'Calidad, Medio Ambiente & I+D+i (ISO)', jobTitle: 'Responsable de Calidad & ISO' },
  { id: 'emp-002', name: 'Antonio Gil', email: 'antonio.gil@codiagro.com', department: 'Calidad, Medio Ambiente & I+D+i (ISO)', jobTitle: 'Técnico de Calidad y Medio Ambiente' },
  { id: 'emp-003', name: 'Paula Herrero', email: 'paula.herrero@codiagro.com', department: 'Calidad, Medio Ambiente & I+D+i (ISO)', jobTitle: 'Investigadora I+D+i' },

  // Producción e Ingeniería Agronómica
  { id: 'emp-004', name: 'Roberto Soler', email: 'roberto.soler@codiagro.com', department: 'Producción e Ingeniería Agronómica', jobTitle: 'Jefe de Planta y Producción' },
  { id: 'emp-005', name: 'Vicente Vilar', email: 'vicente.vilar@codiagro.com', department: 'Producción e Ingeniería Agronómica', jobTitle: 'Ingeniero Agrónomo de Procesos' },
  { id: 'emp-006', name: 'David Nebot', email: 'david.nebot@codiagro.com', department: 'Producción e Ingeniería Agronómica', jobTitle: 'Operador Especialista de Reactores' },

  // Laboratorio y Formulación Nutricional
  { id: 'emp-007', name: 'Marta Valls', email: 'marta.valls@codiagro.com', department: 'Laboratorio y Formulación Nutricional', jobTitle: 'Directora Técnica de Laboratorio' },
  { id: 'emp-008', name: 'Sergio Doménech', email: 'sergio.domenech@codiagro.com', department: 'Laboratorio y Formulación Nutricional', jobTitle: 'Químico Analista' },

  // Recursos Humanos y PRL
  { id: 'emp-009', name: 'Alma Trilles', email: 'alma.trilles@codiagro.com', department: 'Recursos Humanos y PRL', jobTitle: 'Administradora de Formación & RR.HH.' },
  { id: 'emp-010', name: 'Carmen Nebot', email: 'carmen.nebot@codiagro.com', department: 'Recursos Humanos y PRL', jobTitle: 'Responsable de RR.HH. y Talento' },
  { id: 'emp-010b', name: 'Javier Albalat', email: 'javier.albalat@codiagro.com', department: 'Recursos Humanos y PRL', jobTitle: 'Técnico Superior PRL' },

  // Comercial y Asesoramiento Técnico
  { id: 'emp-011', name: 'Carlos Navarro', email: 'carlos.navarro@codiagro.com', department: 'Comercial y Asesoramiento Técnico', jobTitle: 'Delegado Técnico Comercial' },
  { id: 'emp-012', name: 'Sofía Peñarroja', email: 'sofia.penarroja@codiagro.com', department: 'Comercial y Asesoramiento Técnico', jobTitle: 'Asesora Nutricional de Cultivos' },
  { id: 'emp-013', name: 'Marc Segarra', email: 'marc.segarra@codiagro.com', department: 'Comercial y Asesoramiento Técnico', jobTitle: 'Export Manager' },

  // Logística, Envasado y Expediciones
  { id: 'emp-014', name: 'Jorge Beltrán', email: 'jorge.beltran@codiagro.com', department: 'Logística, Envasado y Expediciones', jobTitle: 'Responsable de Almacén y Logística' },
  { id: 'emp-015', name: 'Raúl Martí', email: 'raul.marti@codiagro.com', department: 'Logística, Envasado y Expediciones', jobTitle: 'Operador de Carretillas y Cargas' },

  // Tecnología e Informática (IT)
  { id: 'emp-016', name: 'Óscar Romero', email: 'codiagrooscar@gmail.com', department: 'Tecnología e Informática (IT)', jobTitle: 'Director de IT y Sistemas' },
  { id: 'emp-017', name: 'David Clausell', email: 'david.clausell@codiagro.com', department: 'Tecnología e Informática (IT)', jobTitle: 'Administrador de Sistemas & Seguridad' },

  // Administración y Finanzas
  { id: 'emp-018', name: 'Nuria Pascual', email: 'nuria.pascual@codiagro.com', department: 'Administración y Finanzas', jobTitle: 'Responsable de Administración' },
  { id: 'emp-019', name: 'Silvia Gómez', email: 'silvia.gomez@codiagro.com', department: 'Administración y Finanzas', jobTitle: 'Contabilidad y Compras' }
];

export const INITIAL_SETTINGS: CompanySettings = {
  documentCode: 'RE0180104',
  documentEdition: '07',
  companyName: 'CODIAGRO S.A.',
  logoUrl: '/logo.png',
  adminEmail: 'alma.trilles@codiagro.com',
  authorizedAdminEmails: ['alma.trilles@codiagro.com', 'codiagrooscar@gmail.com'],
  emailNotificationEnabled: true,
  pushNotificationEnabled: true,
  dailyPendingDigestEnabled: true,
  dailyPendingDigestHour: 8,
  lastDailyDigestSentDate: '',
  smtpHost: 'smtp.office365.com',
  smtpPort: 587,
  smtpUser: 'alma.trilles@codiagro.com',
  smtpPass: '',
  totalEmployees: 120,
  annualTrainingBudget: 48000, // 48.000 €
  targetHoursPerEmployee: 25, // 25h per year
  targetSatisfactionScore: 4.2, // 4.2 / 5
  targetEffectivenessRate: 85, // 85%
  departments: [
    'Producción e Ingeniería Agronómica',
    'Calidad, Medio Ambiente & I+D+i (ISO)',
    'Laboratorio y Formulación Nutricional',
    'Recursos Humanos y PRL',
    'Comercial y Asesoramiento Técnico',
    'Logística, Envasado y Expediciones',
    'Tecnología e Informática (IT)',
    'Administración y Finanzas'
  ],
  categories: [
    'Calidad e ISO',
    'Tecnología',
    'Prevención y Seguridad',
    'Habilidades y Liderazgo',
    'Operaciones',
    'Comercial y Marketing',
    'Idiomas'
  ],
  competencyCatalog: [
    'Auditoría Interna ISO 9001/14001',
    'Nutrición Vegetal Sostenible & Bioestimulantes',
    'Prevención de Riesgos Laborales (PRL en Planta Química/Agro)',
    'Buenas Prácticas de Fabricación y Laboratorio',
    'Ciberseguridad y Protección de Datos (RGPD)',
    'Liderazgo y Gestión de Equipos Técnicos',
    'Manejo de Carretillas y Cargas',
    'Asesoramiento Agronómico y Negociación B2B',
    'Lean Manufacturing y 5S en Planta',
    'Herramientas Digitales y ERP'
  ],
  employees: INITIAL_EMPLOYEES,
  trainingCenters: INITIAL_TRAINING_CENTERS,
  year: 2026
};

/**
 * Genera el siguiente código correlativo de acción formativa con formato YYNNN (ej: 26001, 26002, 26003...)
 */
export function generateNextTrainingCode(trainings: TrainingAction[], year: number = 2026, startNumber?: number): string {
  const yearSuffix = (year % 100).toString().padStart(2, '0'); // '26'
  
  let maxCorrelative = 0;

  // If a manual start / next correlative number is provided (e.g. 15 or 26015), take it into account
  if (typeof startNumber === 'number' && startNumber > 0) {
    if (startNumber >= 1000) {
      // e.g. 26015 -> correlative 15 (if prefix matches) or full number
      const strVal = startNumber.toString();
      if (strVal.startsWith(yearSuffix)) {
        maxCorrelative = parseInt(strVal.substring(2), 10) - 1;
      } else {
        maxCorrelative = startNumber - 1;
      }
    } else {
      maxCorrelative = startNumber - 1;
    }
  }

  trainings.forEach((t) => {
    if (t.code && typeof t.code === 'string') {
      const trimmed = t.code.trim();
      if (trimmed.startsWith(yearSuffix) && trimmed.length === 5) {
        const numPart = parseInt(trimmed.substring(2), 10);
        if (!isNaN(numPart) && numPart > maxCorrelative) {
          maxCorrelative = numPart;
        }
      } else if (trimmed.includes(`-${year}-`) || trimmed.includes(`-${yearSuffix}-`)) {
        const parts = trimmed.split('-');
        const lastPart = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastPart) && lastPart > maxCorrelative) {
          maxCorrelative = lastPart;
        }
      }
    }
  });

  const nextNumber = maxCorrelative + 1;
  return `${yearSuffix}${nextNumber.toString().padStart(3, '0')}`;
}

export const INITIAL_TRAINING_ACTIONS: TrainingAction[] = [
  {
    id: 'act-001',
    code: '26001',
    title: 'Auditoría Interna de Sistemas de Gestión ISO 9001:2015 / ISO 14001',
    category: 'Calidad e ISO',
    department: 'Calidad, Medio Ambiente & I+D+i (ISO)',
    targetCompetencies: ['Auditoría Interna ISO 9001/14001', 'Lean Manufacturing y 5S en Planta'],
    plannedDate: '2026-02-10',
    endDate: '2026-02-12',
    executedDate: '2026-02-12',
    status: 'completed',
    modality: 'presencial',
    durationHours: 16,
    totalParticipantsPlanned: 12,
    totalParticipantsAttended: 11,
    totalCost: 2400,
    isSubsidized: true,
    subsidyType: 'percentage',
    subsidyPercentage: 80,
    subsidyAmount: 1920,
    netCompanyCost: 480,
    justification: 'Obligación del Sistema de Gestión de Calidad ISO 9001:2015 (Cláusula 9.2) de contar con equipo auditor interno cualificado e independiente.',
    attendees: [
      { id: 'att-101', name: 'Laura Méndez', email: 'laura.mendez@codiagro.com', department: 'Calidad', hasCompletedEvaluation: true, completedAt: '2026-02-13' },
      { id: 'att-102', name: 'Roberto Soler', email: 'roberto.soler@codiagro.com', department: 'Producción', hasCompletedEvaluation: true, completedAt: '2026-02-13' },
      { id: 'att-103', name: 'Marta Valls', email: 'marta.valls@codiagro.com', department: 'I+D+i' },
      { id: 'att-104', name: 'Antonio Gil', email: 'antonio.gil@codiagro.com', department: 'Calidad' }
    ],
    provider: 'Bureau Veritas Formación',
    trainerName: 'Elena Ramos García (Lead Auditor)',
    locationOrPlatform: 'Aula Magna Codiagro',
    isoClause: '7.2 Competencia (Auditoría Interna)',
    averageSatisfaction: 4.65,
    effectivenessScore: 91,
    isEffective: true,
    evaluationsCount: 11,
    attendanceRate: 91.7,
    createdAt: '2026-01-15T09:00:00Z',
    notes: 'Formación clave para el programa de auditorías internas del primer semestre.'
  },
  {
    id: 'act-002',
    code: '26002',
    title: 'Ciberseguridad Práctica, Phishing y Protección de Datos (RGPD)',
    category: 'Tecnología',
    department: 'Tecnología e Informática (IT)',
    targetCompetencies: ['Ciberseguridad y Protección de Datos (RGPD)'],
    plannedDate: '2026-03-05',
    endDate: '2026-03-05',
    executedDate: '2026-03-05',
    status: 'completed',
    modality: 'online',
    durationHours: 6,
    totalParticipantsPlanned: 45,
    totalParticipantsAttended: 42,
    totalCost: 1800,
    isSubsidized: true,
    subsidyType: 'amount',
    subsidyAmount: 1800,
    netCompanyCost: 0,
    justification: 'Plan director de seguridad de la información y cumplimiento del RGPD / ENS.',
    attendees: [
      { id: 'att-201', name: 'Javier Pons', email: 'javier.pons@codiagro.com', department: 'IT' },
      { id: 'att-202', name: 'Silvia Navarro', email: 'silvia.navarro@codiagro.com', department: 'Administración' }
    ],
    provider: 'SecureIT Solutions',
    trainerName: 'Marcos Benítez',
    locationOrPlatform: 'Campus Virtual Interactivo',
    isoClause: '7.3 Toma de Conciencia / Seguridad de la Información',
    averageSatisfaction: 4.4,
    effectivenessScore: 88,
    isEffective: true,
    evaluationsCount: 38,
    attendanceRate: 93.3,
    createdAt: '2026-02-01T10:30:00Z',
    notes: '100% bonificado a través de FUNDAE. Campañas de simulación con 95% de éxito.'
  },
  {
    id: 'act-003',
    code: '26003',
    title: 'Prevención de Riesgos Laborales: Ergonomía y Manejo de Cargas en Planta',
    category: 'Prevención y Seguridad',
    department: 'Producción e Ingeniería Agronómica',
    targetCompetencies: ['Prevención de Riesgos Laborales (PRL en Planta Química/Agro)'],
    plannedDate: '2026-04-14',
    endDate: '2026-04-14',
    executedDate: '2026-04-14',
    status: 'completed',
    modality: 'presencial',
    durationHours: 8,
    totalParticipantsPlanned: 25,
    totalParticipantsAttended: 24,
    totalCost: 1500,
    isSubsidized: true,
    subsidyType: 'percentage',
    subsidyPercentage: 100,
    subsidyAmount: 1500,
    netCompanyCost: 0,
    justification: 'Evaluación anual de riesgos ergonómicos en la línea de envasado y paletizado.',
    attendees: [
      { id: 'att-301', name: 'Martín Vega', email: 'martin.vega@codiagro.com', department: 'Producción', hasCompletedEvaluation: true },
      { id: 'att-302', name: 'Diego Navarro', email: 'diego.navarro@codiagro.com', department: 'Producción' }
    ],
    provider: 'Quirónprevención',
    trainerName: 'Dra. Patricia Soria',
    locationOrPlatform: 'Planta de Producción Codiagro',
    isoClause: 'ISO 45001 / 7.2 Competencia',
    averageSatisfaction: 4.25,
    effectivenessScore: 84,
    isEffective: true,
    evaluationsCount: 22,
    attendanceRate: 96.0,
    createdAt: '2026-03-10T14:00:00Z',
    notes: 'Reducción inmediata de incidencias posturales en líneas de envasado.'
  },
  {
    id: 'act-004',
    code: '26004',
    title: 'Liderazgo Transformacional y Gestión de Conflictos para Mandos Intermedios',
    category: 'Habilidades y Liderazgo',
    department: 'Recursos Humanos y PRL',
    targetCompetencies: ['Liderazgo y Gestión de Equipos Técnicos'],
    plannedDate: '2026-05-20',
    endDate: '2026-05-22',
    executedDate: '2026-05-22',
    status: 'completed',
    modality: 'presencial',
    durationHours: 20,
    totalParticipantsPlanned: 15,
    totalParticipantsAttended: 14,
    totalCost: 3500,
    isSubsidized: true,
    subsidyType: 'amount',
    subsidyAmount: 2000,
    netCompanyCost: 1500,
    justification: 'Desarrollo de competencias de comunicación y gestión de equipos para nuevos responsables de turno.',
    attendees: [
      { id: 'att-401', name: 'Sandra Ruiz', email: 'sandra.ruiz@codiagro.com', department: 'Producción', hasCompletedEvaluation: true },
      { id: 'att-402', name: 'Víctor Gómez', email: 'victor.gomez@codiagro.com', department: 'Operaciones' }
    ],
    provider: 'Talent & Leadership Academy',
    trainerName: 'Carlos M. Varela',
    locationOrPlatform: 'Hotel Silken / Presencial',
    isoClause: '5.1 Liderazgo y Compromiso / 7.2',
    averageSatisfaction: 4.8,
    effectivenessScore: 92,
    isEffective: true,
    evaluationsCount: 14,
    attendanceRate: 93.3,
    createdAt: '2026-04-05T08:15:00Z',
    notes: 'Excelente acogida. Se han establecido compromisos de feedback 1:1 mensuales.'
  },
  {
    id: 'act-005',
    code: '26005',
    title: 'Metodología Lean 5S y Mejora Continua (Kaizen) en Planta y Envasado',
    category: 'Operaciones',
    department: 'Producción e Ingeniería Agronómica',
    targetCompetencies: ['Lean Manufacturing y 5S en Planta'],
    plannedDate: '2026-06-18',
    endDate: '2026-06-19',
    executedDate: '2026-06-19',
    status: 'completed',
    modality: 'presencial',
    durationHours: 12,
    totalParticipantsPlanned: 18,
    totalParticipantsAttended: 16,
    totalCost: 2200,
    isSubsidized: false,
    netCompanyCost: 2200,
    justification: 'Plan estratégico de eficiencia operativa y estandarización del orden en planta de formulación.',
    attendees: [
      { id: 'att-501', name: 'Diego Navarro', email: 'diego.navarro@codiagro.com', department: 'Producción' }
    ],
    provider: 'Instituto de Mejora Continua',
    trainerName: 'Javier Domínguez (Black Belt)',
    locationOrPlatform: 'Taller Gemba y Sala de Proyectos',
    isoClause: '10.3 Mejora Continua',
    averageSatisfaction: 4.5,
    effectivenessScore: 89,
    isEffective: true,
    evaluationsCount: 16,
    attendanceRate: 88.9,
    createdAt: '2026-05-15T11:00:00Z',
    notes: 'Implantado panel visual 5S en la nave central con auditorías semanales.'
  },
  {
    id: 'act-006',
    code: '26006',
    title: 'Técnicas Avanzadas de Asesoramiento Agronómico y Negociación B2B',
    category: 'Comercial y Marketing',
    department: 'Comercial y Asesoramiento Técnico',
    targetCompetencies: ['Asesoramiento Agronómico y Negociación B2B'],
    plannedDate: '2026-07-08',
    endDate: '2026-07-09',
    executedDate: '2026-07-09',
    status: 'completed',
    modality: 'hibrida',
    durationHours: 14,
    totalParticipantsPlanned: 10,
    totalParticipantsAttended: 9,
    totalCost: 2100,
    isSubsidized: true,
    subsidyType: 'percentage',
    subsidyPercentage: 70,
    subsidyAmount: 1470,
    netCompanyCost: 630,
    justification: 'Lanzamiento de la nueva línea de bioestimulantes y asesoramiento a grandes distribuidores.',
    attendees: [
      { id: 'att-601', name: 'Nuria Alarcón', email: 'nuria.alarcon@codiagro.com', department: 'Comercial' }
    ],
    provider: 'AgroSales Excellence Partners',
    trainerName: 'Nuria Alarcón',
    locationOrPlatform: 'Sala de Juntas Central / Teams',
    isoClause: '8.2 Requisitos para los Productos y Servicios',
    averageSatisfaction: 4.3,
    effectivenessScore: 82,
    isEffective: true,
    evaluationsCount: 9,
    attendanceRate: 90.0,
    createdAt: '2026-06-01T16:00:00Z',
    notes: 'Aplicado al nuevo pipeline de cuentas agrícolas estratégicas.'
  },
  {
    id: 'act-007',
    code: '26007',
    title: 'Actualización en Normativa Fiscal, Facturación Electrónica y ERP',
    category: 'Tecnología',
    department: 'Administración y Finanzas',
    targetCompetencies: ['Herramientas Digitales y ERP'],
    plannedDate: '2026-09-15',
    endDate: '2026-09-16',
    status: 'planned',
    modality: 'online',
    durationHours: 10,
    totalParticipantsPlanned: 8,
    totalParticipantsAttended: 0,
    totalCost: 1400,
    isSubsidized: true,
    subsidyType: 'amount',
    subsidyAmount: 1400,
    netCompanyCost: 0,
    justification: 'Requisito legal inminente de la Ley Crea y Crece sobre factura electrónica B2B.',
    attendees: [
      { id: 'att-701', name: 'Carmen Ortiz', email: 'carmen.ortiz@codiagro.com', department: 'Administración' }
    ],
    provider: 'Asociación Española de Asesores',
    trainerName: 'Manuel Ortiz',
    locationOrPlatform: 'Online Síncrono',
    isoClause: '7.2 Competencia',
    averageSatisfaction: undefined,
    effectivenessScore: undefined,
    evaluationsCount: 0,
    attendanceRate: 0,
    createdAt: '2026-07-10T10:00:00Z',
    notes: 'Preparación para el nuevo marco legal de factura electrónica.'
  },
  {
    id: 'act-008',
    code: '26008',
    title: 'Bioestimulantes de Última Generación y Regulación Europea de Fertilizantes',
    category: 'Calidad e ISO',
    department: 'Laboratorio y Formulación Nutricional',
    targetCompetencies: ['Nutrición Vegetal Sostenible & Bioestimulantes', 'Buenas Prácticas de Fabricación y Laboratorio'],
    plannedDate: '2026-10-01',
    endDate: '2026-10-03',
    status: 'planned',
    modality: 'presencial',
    durationHours: 20,
    totalParticipantsPlanned: 12,
    totalParticipantsAttended: 0,
    totalCost: 3200,
    isSubsidized: true,
    subsidyType: 'percentage',
    subsidyPercentage: 50,
    subsidyAmount: 1600,
    netCompanyCost: 1600,
    justification: 'Actualización técnica obligatoria según el Reglamento UE 2019/1009 de productos fertilizantes CE.',
    attendees: [
      { id: 'att-801', name: 'Dr. Alberto Sanz', email: 'alberto.sanz@codiagro.com', department: 'Laboratorio' }
    ],
    provider: 'Centro de Biotecnología Agraria',
    trainerName: 'Dr. Alberto Sanz',
    locationOrPlatform: 'Laboratorio Central Codiagro',
    isoClause: '7.2 Competencia',
    averageSatisfaction: undefined,
    effectivenessScore: undefined,
    evaluationsCount: 0,
    attendanceRate: 0,
    createdAt: '2026-08-01T12:00:00Z',
    notes: 'Actualización sobre el Reglamento UE 2019/1009 de productos fertilizantes.'
  }
];

export const INITIAL_EVALUATIONS: Evaluation[] = [
  {
    id: 'eval-001',
    trainingActionId: 'act-001',
    trainingCode: '26001',
    trainingTitle: 'Auditoría Interna de Sistemas de Gestión ISO 9001:2015 / ISO 14001',
    trainingDate: '2026-02-13',
    durationHours: 16,
    trainingNeedDescription: 'Obligación del SGC de contar con equipo auditor interno cualificado e independiente.',
    responsibleName: 'Elena Ramos García (Lead Auditor)',
    employeeName: 'Laura Méndez',
    employeeEmail: 'laura.mendez@codiagro.com',
    department: 'Calidad, Medio Ambiente & I+D+i (ISO)',
    submissionDate: '2026-02-13',
    submissionSource: 'online_form',
    ratings: {
      attendeeTraining: {
        respondedToSyllabus: 5,
        coveredInitialObjectives: 5,
        didacticResourcesAdequate: 5,
        overallSatisfaction: 5,
      },
      attendeeEffectiveness: {
        knowledgeAcquisition: 5,
        knowledgeLevelBefore: 3,
        knowledgeLevelAfter: 5,
        practicalUtility: 5,
      },
      companyEvaluation: {
        trainingValuationComment: 'Imprescindible para liderar auditorías internas de marzo en planta y almacén.',
        trainingValuationDate: '2026-02-14',
        knowledgeTransferComment: 'NO ES NECESARIO (aplicación directa por el auditor)',
        knowledgeTransferDate: '2026-02-14',
        capacityImprovement: 5,
        attitudeImprovement: 5,
        skillsAcquisition: 5,
        generalObservations: 'Excelente nivel de cualificación y autonomía demostrada en el simulacro.',
      },
      meanTraining: 5.0,
      meanEffectiveness: 4.5,
      meanCompany: 5.0,
      weightedScore: 4.83,
      gradeCategory: 'MUY SATISFACTORIO',
      contentClarity: 5,
      contentUtility: 5,
      trainerKnowledge: 5,
      trainerPedagogy: 5,
      organizationFacilities: 4,
      durationAdequacy: 4,
      jobApplicability: 5,
      overallSatisfaction: 5
    },
    qualitative: {
      highlightedStrengths: 'Casos reales de no conformidades y simulacros de entrevistas de auditoría en planta.',
      areasForImprovement: 'Tener más tiempo para profundizar en el análisis de riesgos según 6.1.',
      wouldRecommend: true,
      actionPlanCommitment: 'Preparar la lista de verificación (checklist) para la auditoría de marzo en almacén.',
      suggestedFutureTopics: 'ISO 14001 Medio Ambiente y Huella de Carbono'
    },
    effectivenessFollowupNeeded: true
  },
  {
    id: 'eval-002',
    trainingActionId: 'act-001',
    trainingCode: '26001',
    trainingTitle: 'Auditoría Interna de Sistemas de Gestión ISO 9001:2015 / ISO 14001',
    trainingDate: '2026-02-13',
    durationHours: 16,
    trainingNeedDescription: 'Obligación del SGC de contar con equipo auditor interno cualificado e independiente.',
    responsibleName: 'Elena Ramos García (Lead Auditor)',
    employeeName: 'Roberto Soler',
    employeeEmail: 'roberto.soler@codiagro.com',
    department: 'Producción e Ingeniería Agronómica',
    submissionDate: '2026-02-13',
    submissionSource: 'scanned_paper',
    ratings: {
      attendeeTraining: {
        respondedToSyllabus: 4,
        coveredInitialObjectives: 5,
        didacticResourcesAdequate: 4,
        overallSatisfaction: 4,
      },
      attendeeEffectiveness: {
        knowledgeAcquisition: 5,
        knowledgeLevelBefore: 2,
        knowledgeLevelAfter: 4,
        practicalUtility: 4,
      },
      companyEvaluation: {
        trainingValuationComment: 'Capacitación óptima para auditorías cruzadas de procesos en planta química.',
        trainingValuationDate: '2026-02-14',
        knowledgeTransferComment: 'Reunión de coordinación técnica con mandos de envasado',
        knowledgeTransferDate: '2026-02-15',
        capacityImprovement: 4,
        attitudeImprovement: 4,
        skillsAcquisition: 5,
        generalObservations: 'Cumplimiento verificado bajo documento RE0180104 Ed. 07.',
      },
      meanTraining: 4.25,
      meanEffectiveness: 3.75,
      meanCompany: 4.33,
      weightedScore: 4.11,
      gradeCategory: 'MUY SATISFACTORIO',
      contentClarity: 4,
      contentUtility: 5,
      trainerKnowledge: 5,
      trainerPedagogy: 4,
      organizationFacilities: 4,
      durationAdequacy: 4,
      jobApplicability: 4,
      overallSatisfaction: 4
    },
    qualitative: {
      highlightedStrengths: 'Muy estructurado y la formadora resolvió todas las dudas operativas.',
      areasForImprovement: 'Material impreso con letra algo pequeña.',
      wouldRecommend: true,
      actionPlanCommitment: 'Revisar las fichas de proceso e instrucciones de trabajo en planta.',
      suggestedFutureTopics: 'Gestión de No Conformidades 8D'
    },
    effectivenessFollowupNeeded: true,
    confidenceScore: 0.96,
    rawExtractedNotes: 'Evaluación escaneada con IA: Puntuación global 4.11/5. Documento RE0180104 Ed. 07 verificado.'
  },
  {
    id: 'eval-003',
    trainingActionId: 'act-004',
    trainingCode: '26004',
    trainingTitle: 'Liderazgo Transformacional y Gestión de Conflictos para Mandos Intermedios',
    trainingDate: '2026-05-23',
    durationHours: 12,
    trainingNeedDescription: 'Desarrollo de liderazgo y clima laboral en mandos intermedios.',
    responsibleName: 'Carlos Morales (Executive Coach)',
    employeeName: 'Sandra Ruiz',
    employeeEmail: 'sandra.ruiz@codiagro.com',
    department: 'Producción e Ingeniería Agronómica',
    submissionDate: '2026-05-23',
    submissionSource: 'online_form',
    ratings: {
      attendeeTraining: {
        respondedToSyllabus: 5,
        coveredInitialObjectives: 5,
        didacticResourcesAdequate: 5,
        overallSatisfaction: 5,
      },
      attendeeEffectiveness: {
        knowledgeAcquisition: 5,
        knowledgeLevelBefore: 3,
        knowledgeLevelAfter: 5,
        practicalUtility: 5,
      },
      companyEvaluation: {
        trainingValuationComment: 'Excelente feedback del equipo y mejora inmediata en la gestión de turnos.',
        trainingValuationDate: '2026-05-25',
        knowledgeTransferComment: 'Aplicación continua en reuniones semanales',
        knowledgeTransferDate: '2026-05-26',
        capacityImprovement: 5,
        attitudeImprovement: 5,
        skillsAcquisition: 5,
        generalObservations: 'Transferencia total al puesto de trabajo demostrada.',
      },
      meanTraining: 5.0,
      meanEffectiveness: 4.5,
      meanCompany: 5.0,
      weightedScore: 4.83,
      gradeCategory: 'MUY SATISFACTORIO',
      contentClarity: 5,
      contentUtility: 5,
      trainerKnowledge: 5,
      trainerPedagogy: 5,
      organizationFacilities: 5,
      durationAdequacy: 4,
      jobApplicability: 5,
      overallSatisfaction: 5
    },
    qualitative: {
      highlightedStrengths: 'El formador Carlos M. es excelente, dinámicas muy reveladoras sobre estilos de comunicación.',
      areasForImprovement: 'Hacer una sesión de refuerzo a los 6 meses.',
      wouldRecommend: true,
      actionPlanCommitment: 'Calendarizar reuniones semanales estructuradas con los responsables de línea.',
      suggestedFutureTopics: 'Gestión del tiempo y delegación efectiva'
    },
    effectivenessFollowupNeeded: true
  }
];

export const INITIAL_FOLLOWUPS: EffectivenessFollowup[] = [
  {
    id: 'fol-001',
    trainingActionId: 'act-001',
    trainingCode: '26001',
    trainingTitle: 'Auditoría Interna de Sistemas de Gestión ISO 9001:2015 / ISO 14001',
    employeeName: 'Laura Méndez',
    employeeDepartment: 'Calidad, Medio Ambiente & I+D+i (ISO)',
    managerName: 'Antonio Gil (Director de Calidad)',
    evaluationDate: '2026-04-15',
    periodDays: 60,
    performanceImprovementRating: 5,
    knowledgeApplied: true,
    goalsAchieved: true,
    comments: 'Laura realizó de forma autónoma la auditoría interna del proceso de compras detectando 2 oportunidades de mejora reales. Formación 100% eficaz.',
    status: 'completed'
  },
  {
    id: 'fol-002',
    trainingActionId: 'act-003',
    trainingCode: '26003',
    trainingTitle: 'Prevención de Riesgos Laborales: Ergonomía y Manejo de Cargas en Planta',
    employeeName: 'Martín Vega',
    employeeDepartment: 'Producción e Ingeniería Agronómica',
    managerName: 'Sandra Ruiz (Responsable de Turno)',
    evaluationDate: '2026-06-15',
    periodDays: 60,
    performanceImprovementRating: 4,
    knowledgeApplied: true,
    goalsAchieved: true,
    comments: 'Se observa una correcta aplicación de técnicas de elevación y rotación postural. Sin bajas en el trimestre.',
    status: 'completed'
  },
  {
    id: 'fol-003',
    trainingActionId: 'act-004',
    trainingCode: '26004',
    trainingTitle: 'Liderazgo Transformacional y Gestión de Conflictos para Mandos Intermedios',
    employeeName: 'Sandra Ruiz',
    employeeDepartment: 'Producción e Ingeniería Agronómica',
    managerName: 'Víctor Gómez (Director de Operaciones)',
    evaluationDate: '2026-08-20',
    periodDays: 90,
    performanceImprovementRating: 5,
    knowledgeApplied: true,
    goalsAchieved: true,
    comments: 'Notable mejora en el clima laboral del equipo de producción y gestión proactiva de desajustes de turnos.',
    status: 'completed'
  },
  {
    id: 'fol-004',
    trainingActionId: 'act-005',
    trainingCode: '26005',
    trainingTitle: 'Metodología Lean 5S y Mejora Continua (Kaizen) en Planta y Envasado',
    employeeName: 'Diego Navarro',
    employeeDepartment: 'Producción e Ingeniería Agronómica',
    managerName: 'Sandra Ruiz (Responsable de Turno)',
    evaluationDate: '2026-08-19',
    periodDays: 60,
    performanceImprovementRating: 4,
    knowledgeApplied: true,
    goalsAchieved: true,
    comments: 'Mantenimiento del estándar 5S en nave de formulación y envasado. Se evalúa eficacia positiva.',
    status: 'completed'
  }
];
