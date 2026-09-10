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
  adminEmail: 'formacioncodiagro@gmail.com',
  authorizedAdminEmails: ['formacioncodiagro@gmail.com', 'alma.trilles@codiagro.com', 'codiagrooscar@gmail.com'],
  emailNotificationEnabled: true,
  pushNotificationEnabled: true,
  dailyPendingDigestEnabled: true,
  dailyPendingDigestHour: 8,
  lastDailyDigestSentDate: '',
  smtpHost: 'smtp.gmail.com',
  smtpPort: 465,
  smtpUser: 'formacioncodiagro@gmail.com',
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

export const INITIAL_TRAINING_ACTIONS: TrainingAction[] = [];

export const INITIAL_EVALUATIONS: Evaluation[] = [];

export const INITIAL_FOLLOWUPS: EffectivenessFollowup[] = [];

