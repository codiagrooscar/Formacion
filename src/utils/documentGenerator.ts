import { jsPDF } from 'jspdf';
import { 
  Document, 
  Paragraph, 
  TextRun, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  AlignmentType, 
  ShadingType,
  Packer
} from 'docx';
import { TrainingAction, CompanySettings, Evaluation } from '../types';

/**
 * Preload and convert Codiagro logo to data URL for jsPDF
 */
async function loadLogoDataUrl(preferredUrl?: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const urlsToTry = [
    preferredUrl,
    localStorage.getItem('codiagro_logo_url'),
    '/logo.png',
    '/logoapp.png',
    '/assets/logo.png'
  ].filter(Boolean) as string[];

  for (const url of urlsToTry) {
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || 320;
            canvas.height = img.naturalHeight || 80;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject('No canvas context');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          } catch (e) {
            reject(e);
          }
        };
        img.onerror = (e) => reject(e);
        img.src = url;
      });
      if (dataUrl && dataUrl.startsWith('data:image')) {
        return dataUrl;
      }
    } catch {
      // try next
    }
  }
  return null;
}

/**
 * Fallback vector drawing of Codiagro spiral + green text if image is not loaded
 */
function drawFallbackLogo(doc: jsPDF, x: number, y: number) {
  // Orange spiral outer circles
  doc.setDrawColor(234, 88, 12);
  doc.setLineWidth(0.6);
  doc.circle(x + 5, y + 6, 4.5, 'S');
  doc.setDrawColor(249, 115, 22);
  doc.circle(x + 5, y + 6, 2.8, 'S');
  doc.setFillColor(234, 88, 12);
  doc.circle(x + 5, y + 6, 1.2, 'F');
  doc.setLineWidth(0.2); // reset

  // Dark green CODIAGRO text
  doc.setTextColor(7, 83, 28);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('CODIAGRO', x + 12, y + 8);
}

export interface FilledEvaluationPdfData {
  employeeName?: string;
  employeeEmail?: string;
  department?: string;
  trainingDate?: string;
  trainerName?: string;
  attendeeTraining?: {
    respondedToSyllabus: number;
    coveredInitialObjectives: number;
    didacticResourcesAdequate: number;
    overallSatisfaction: number;
  };
  attendeeEffectiveness?: {
    knowledgeAcquisition: number;
    knowledgeLevelBefore: number;
    knowledgeLevelAfter: number;
    practicalUtility: number;
    attendeeObservations?: string;
  };
  companyEvaluation?: {
    capacityImprovement: number;
    attitudeImprovement: number;
    skillsAcquisition: number;
    trainingValuationComment?: string;
    trainingValuationDate?: string;
    knowledgeTransferComment?: string;
    knowledgeTransferDate?: string;
    generalObservations?: string;
  };
  qualitative?: {
    highlightedStrengths?: string;
    areasForImprovement?: string;
    suggestedFutureTopics?: string;
    actionPlanCommitment?: string;
  };
  meanTraining?: number;
  meanEffectiveness?: number;
  meanCompany?: number;
  weightedScore?: number;
  gradeCategory?: string;
}

/**
 * Builds the official jsPDF instance for Codiagro RE0180104 Ed. 07
 */
export async function buildEvaluationJsPdf(
  trainingOrEval: TrainingAction | Evaluation, 
  settings: CompanySettings,
  initialFilledData?: FilledEvaluationPdfData
): Promise<jsPDF> {
  // If trainingOrEval is an Evaluation object, extract training and fill data automatically
  let training: TrainingAction;
  let effectiveFilledData = initialFilledData;

  if ('ratings' in trainingOrEval || 'employeeName' in trainingOrEval) {
    const evalObj = trainingOrEval as Evaluation;
    training = {
      id: evalObj.trainingActionId || '',
      code: evalObj.trainingCode || 'RE0180104',
      title: evalObj.trainingTitle || '',
      department: evalObj.department || '',
      category: 'Calidad e ISO',
      targetCompetencies: [],
      plannedDate: evalObj.trainingDate || '',
      modality: 'presencial',
      durationHours: evalObj.durationHours || 0,
      totalParticipantsPlanned: 1,
      totalParticipantsAttended: 1,
      totalCost: 0,
      isSubsidized: false,
      netCompanyCost: 0,
      status: 'completed',
      provider: '',
      trainerName: evalObj.responsibleName || '',
      locationOrPlatform: '',
      isoClause: '7.2 Competencia',
      justification: evalObj.trainingNeedDescription || '',
      notes: '',
      evaluationsCount: 1,
      attendanceRate: 100,
      createdAt: evalObj.submissionDate || new Date().toISOString()
    };

    if (!effectiveFilledData) {
      effectiveFilledData = {
        employeeName: evalObj.employeeName,
        employeeEmail: evalObj.employeeEmail,
        department: evalObj.department,
        trainingDate: evalObj.trainingDate,
        trainerName: evalObj.responsibleName,
        attendeeTraining: evalObj.ratings?.attendeeTraining,
        attendeeEffectiveness: evalObj.ratings?.attendeeEffectiveness,
        companyEvaluation: evalObj.ratings?.companyEvaluation,
        qualitative: evalObj.qualitative,
        meanTraining: evalObj.ratings?.meanTraining,
        meanEffectiveness: evalObj.ratings?.meanEffectiveness,
        meanCompany: evalObj.ratings?.meanCompany,
        weightedScore: evalObj.ratings?.weightedScore,
        gradeCategory: evalObj.ratings?.gradeCategory,
      };
    }
  } else {
    training = trainingOrEval as TrainingAction;
  }

  const filledData = effectiveFilledData;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const docCode = settings.documentCode || 'RE0180104';
  const docEdition = settings.documentEdition || '07';

  // Preload official logo
  const logoDataUrl = await loadLogoDataUrl(settings.logoUrl);

  // --- HEADER SECTION ---
  // White Header with Subtle Top Frame
  doc.setFillColor(255, 255, 255);
  doc.rect(10, 8, 190, 22, 'F');
  
  // Top Accent Stripe: Full width Emerald Green (100% green, without orange/red)
  doc.setFillColor(0, 140, 90); // Emerald (#008C5A)
  doc.rect(10, 8, 190, 2, 'F');

  // 1. Logo (Top Left)
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', 12, 11, 36, 13, undefined, 'FAST');
    } catch {
      // Fallback logo drawing
      drawFallbackLogo(doc, 12, 11);
    }
  } else {
    drawFallbackLogo(doc, 12, 11);
  }

  // 2. Title & ISO Subtitle (Aligned to start after logo with ample space)
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.8);
  doc.text('EVALUACIÓN DE LA FORMACIÓN Y EFICACIA', 50, 16.8);

  doc.setFontSize(6.6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Documento oficial para el registro y evaluación de la competencia · Cláusula 7.2 ISO 9001:2015', 50, 21.8);

  // 3. Document ID & Edition Box (Top Right) - Clean outline without background color fill
  doc.setDrawColor(203, 213, 225); // Slate-300
  doc.rect(156, 11, 44, 16.5, 'S');

  doc.setFontSize(8.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 140, 90);
  doc.text(docCode, 159, 16.2);

  doc.setFontSize(7.2);
  doc.setTextColor(30, 41, 59);
  doc.text(`EDICIÓN ${docEdition}`, 159, 20.8);

  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`CÓD: ${training.code || '26001'}`, 159, 25.2);

  // --- SECTION 1: DATOS DE LA ACCIÓN FORMATIVA ---
  let y = 32;

  // Header Bar: 1. DATOS DE LA ACCIÓN FORMATIVA
  doc.setFillColor(0, 140, 90);
  doc.rect(10, y, 190, 5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('1. DATOS DE LA ACCIÓN FORMATIVA', 13, y + 3.6);

  y += 5;

  // Row 1: Fecha, Duración, Modalidad, Depto (Estrechados y ajustados a la izquierda)
  doc.setFillColor(248, 250, 252);
  doc.rect(10, y, 190, 7, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(10, y, 190, 7, 'S');

  doc.line(55, y, 55, y + 7);
  doc.line(105, y, 105, y + 7);
  doc.line(150, y, 150, y + 7);

  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);

  // Fecha (izq)
  doc.setFont('helvetica', 'bold');
  doc.text('FECHA:', 12, y + 4.6);
  doc.setFont('helvetica', 'normal');
  doc.text(training.plannedDate || new Date().toISOString().split('T')[0], 25, y + 4.6);

  // Duración
  doc.setFont('helvetica', 'bold');
  doc.text('DURACIÓN:', 57, y + 4.6);
  doc.setFont('helvetica', 'normal');
  doc.text(`${training.durationHours} Horas`, 75, y + 4.6);

  // Modalidad
  doc.setFont('helvetica', 'bold');
  doc.text('MODALIDAD:', 107, y + 4.6);
  doc.setFont('helvetica', 'normal');
  doc.text(training.modality || 'Presencial', 127, y + 4.6);

  // Departamento / Categoría
  doc.setFont('helvetica', 'bold');
  doc.text('DEPTO:', 152, y + 4.6);
  doc.setFont('helvetica', 'normal');
  doc.text((training.department || 'General').substring(0, 22), 164, y + 4.6);

  y += 7;

  // Row 2: TÍTULO COMPLETO DEL CURSO (Todo el ancho para que quepa entero sin cortarse)
  const fullTitle = training.title || 'Formación de Calidad ISO 9001';
  const titleLines = doc.splitTextToSize(fullTitle, 155);
  const titleRowHeight = Math.max(7.5, titleLines.length * 4.2 + 3);

  doc.setFillColor(255, 255, 255);
  doc.rect(10, y, 190, titleRowHeight, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(10, y, 190, titleRowHeight, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  doc.text('CURSO / ACCIÓN:', 12, y + 4.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 100, 70);
  doc.text(titleLines, 38, y + 4.8);

  y += titleRowHeight;

  // Row 3: NECESIDAD FORMATIVA (Ancho completo)
  const needText = training.justification || 'Actualización y cualificación en competencias operativas y normativas requeridas.';
  const needLines = doc.splitTextToSize(needText, 148);
  const needRowHeight = Math.max(7, needLines.length * 3.8 + 2.5);

  doc.setFillColor(248, 250, 252);
  doc.rect(10, y, 190, needRowHeight, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(10, y, 190, needRowHeight, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text('NECESIDAD FORMATIVA:', 12, y + 4.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text(needLines, 45, y + 4.2);

  y += needRowHeight;

  // Row 4: FORMADOR Y ASISTENTE
  doc.setFillColor(255, 255, 255);
  doc.rect(10, y, 190, 7, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(10, y, 190, 7, 'S');
  doc.line(100, y, 100, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(51, 65, 85);
  doc.text('RESPONSABLE / FORMADOR:', 12, y + 4.6);
  doc.setFont('helvetica', 'normal');
  doc.text((training.trainerName || filledData?.trainerName || 'Responsable de Calidad / RRHH').substring(0, 35), 52, y + 4.6);

  doc.setFont('helvetica', 'bold');
  doc.text('ASISTENTE:', 103, y + 4.6);
  doc.setFont('helvetica', filledData?.employeeName ? 'bold' : 'normal');
  if (filledData?.employeeName) {
    doc.setTextColor(0, 100, 70);
    doc.text(filledData.employeeName.substring(0, 38), 121, y + 4.6);
  } else {
    doc.setTextColor(51, 65, 85);
    doc.text('____________________________________', 121, y + 4.6);
  }

  y += 7;

  // --- SCALE INDICATOR BAR ---
  y += 2;
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(10, y, 190, 4.8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('INDICADORES DE VALORACIÓN:   1.- Nada    |    2.- Regular    |    3.- Bien    |    4.- Muy bien    |    5.- Excelente', 15, y + 3.4);

  // --- SECTION A: EVALUACIÓN DEL ASISTENTE - FORMACIÓN ---
  y += 6.5;
  doc.setFillColor(7, 83, 28); // Codiagro Green
  doc.rect(10, y, 190, 5.2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text('1. EVALUACIÓN A CUMPLIMENTAR POR EL TRABAJADOR / ASISTENTE: FORMACIÓN', 13, y + 3.7);

  // Header 1-5
  doc.text('1', 140, y + 3.7);
  doc.text('2', 152, y + 3.7);
  doc.text('3', 164, y + 3.7);
  doc.text('4', 176, y + 3.7);
  doc.text('5', 188, y + 3.7);

  const trainingQuestions = [
    '1. El curso ha respondido al temario inicial',
    '2. El curso ha cubierto los objetivos iniciales',
    '3. Los recursos didácticos facilitados han sido adecuados',
    '4. El grado de satisfacción general con el curso'
  ];

  const trainingRatings = [
    filledData?.attendeeTraining?.respondedToSyllabus || 0,
    filledData?.attendeeTraining?.coveredInitialObjectives || 0,
    filledData?.attendeeTraining?.didacticResourcesAdequate || 0,
    filledData?.attendeeTraining?.overallSatisfaction || 0,
  ];

  y += 5.2;
  trainingQuestions.forEach((q, idx) => {
    const rowY = y + idx * 5.2;
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, 250, 252);
    doc.rect(10, rowY, 190, 5.2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(10, rowY, 190, 5.2, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(30, 41, 59);
    doc.text(q, 13, rowY + 3.6);

    const questionRating = trainingRatings[idx];
    const boxXCoords = [139, 151, 163, 175, 187];

    boxXCoords.forEach((bx, bIdx) => {
      const scoreVal = bIdx + 1;
      const isSelected = questionRating === scoreVal;

      if (isSelected) {
        doc.setFillColor(7, 83, 28);
        doc.rect(bx, rowY + 1, 3.2, 3.2, 'F');
        doc.setDrawColor(7, 83, 28);
        doc.rect(bx, rowY + 1, 3.2, 3.2, 'S');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.5);
        doc.text('X', bx + 0.8, rowY + 3.3);
      } else {
        doc.setDrawColor(148, 163, 184);
        doc.rect(bx, rowY + 1, 3.2, 3.2, 'S');
      }
    });
  });

  // Media Formación row
  y += trainingQuestions.length * 5.2;
  doc.setFillColor(240, 248, 244);
  doc.rect(10, y, 190, 4.4, 'F');
  doc.setDrawColor(180, 215, 195);
  doc.rect(10, y, 190, 4.4, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(20, 83, 45);
  doc.text('MEDIA FORMACIÓN (1 a 5):', 13, y + 3.2);
  if (filledData?.meanTraining && filledData.meanTraining > 0) {
    doc.text(`[  ${filledData.meanTraining.toFixed(2)}  ]`, 172, y + 3.2);
  } else {
    doc.text('[         ]', 175, y + 3.2);
  }

  // --- SECTION B: EVALUACIÓN DEL ASISTENTE - EFICACIA ---
  y += 5.5;
  doc.setFillColor(7, 83, 28); // Codiagro Green
  doc.rect(10, y, 190, 5.2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text('EVALUACIÓN DEL TRABAJADOR / ASISTENTE: EFICACIA Y APRENDIZAJE', 13, y + 3.7);

  doc.text('1', 140, y + 3.7);
  doc.text('2', 152, y + 3.7);
  doc.text('3', 164, y + 3.7);
  doc.text('4', 176, y + 3.7);
  doc.text('5', 188, y + 3.7);

  const effectivenessQuestions = [
    '1. El curso ha supuesto la adquisición de nuevos conocimientos',
    '2. Antes del curso, mi nivel de conocimientos era...',
    '3. Después del curso, mi nivel de conocimientos es...',
    '4. El curso me es útil a la práctica'
  ];

  const effectivenessRatings = [
    filledData?.attendeeEffectiveness?.knowledgeAcquisition || 0,
    filledData?.attendeeEffectiveness?.knowledgeLevelBefore || 0,
    filledData?.attendeeEffectiveness?.knowledgeLevelAfter || 0,
    filledData?.attendeeEffectiveness?.practicalUtility || 0,
  ];

  y += 5.2;
  effectivenessQuestions.forEach((q, idx) => {
    const rowY = y + idx * 5.2;
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, 250, 252);
    doc.rect(10, rowY, 190, 5.2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(10, rowY, 190, 5.2, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(30, 41, 59);
    doc.text(q, 13, rowY + 3.6);

    const questionRating = effectivenessRatings[idx];
    const boxXCoords = [139, 151, 163, 175, 187];

    boxXCoords.forEach((bx, bIdx) => {
      const scoreVal = bIdx + 1;
      const isSelected = questionRating === scoreVal;

      if (isSelected) {
        doc.setFillColor(7, 83, 28);
        doc.rect(bx, rowY + 1, 3.2, 3.2, 'F');
        doc.setDrawColor(7, 83, 28);
        doc.rect(bx, rowY + 1, 3.2, 3.2, 'S');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.5);
        doc.text('X', bx + 0.8, rowY + 3.3);
      } else {
        doc.setDrawColor(148, 163, 184);
        doc.rect(bx, rowY + 1, 3.2, 3.2, 'S');
      }
    });
  });

  // Media Eficacia row
  y += effectivenessQuestions.length * 5.2;
  doc.setFillColor(240, 248, 244);
  doc.rect(10, y, 190, 4.4, 'F');
  doc.setDrawColor(180, 215, 195);
  doc.rect(10, y, 190, 4.4, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(20, 83, 45);
  doc.text('MEDIA EFICACIA (1 a 5):', 13, y + 3.2);
  if (filledData?.meanEffectiveness && filledData.meanEffectiveness > 0) {
    doc.text(`[  ${filledData.meanEffectiveness.toFixed(2)}  ]`, 172, y + 3.2);
  } else {
    doc.text('[         ]', 175, y + 3.2);
  }

  // Observaciones / Comentarios del Trabajador (Bloque Asistente) - Amplio espacio para 4-5 líneas
  y += 4.8;
  const obsBoxHeight = 21; // 21 mm para permitir 4-5 líneas completas y cómodas de escritura
  doc.setFillColor(255, 255, 255);
  doc.rect(10, y, 190, obsBoxHeight, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(10, y, 190, obsBoxHeight, 'S');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.4);
  doc.setTextColor(7, 83, 28); // Verde Codiagro
  doc.text('OBSERVACIONES / COMENTARIOS DEL TRABAJADOR / ASISTENTE:', 13, y + 3.2);

  // 4 líneas guía horizontales para escritura a mano (espacio para 5 renglones)
  doc.setDrawColor(226, 232, 240);
  doc.line(13, y + 7.2, 197, y + 7.2);
  doc.line(13, y + 10.8, 197, y + 10.8);
  doc.line(13, y + 14.4, 197, y + 14.4);
  doc.line(13, y + 18.0, 197, y + 18.0);
  
  const attendeeObsText = filledData?.attendeeEffectiveness?.attendeeObservations || '';
  if (attendeeObsText) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(6.0);
    const obsLines = doc.splitTextToSize(attendeeObsText, 182);
    // Imprime hasta 5 líneas con buen espaciado
    doc.text(obsLines.slice(0, 5), 13, y + 6.6, { lineHeightFactor: 1.15 });
  }

  // =========================================================================
  // --- SEPARADOR VISUAL CLARO: FIN DEL TRABAJADOR / INICIO SECCIÓN RRHH ---
  // =========================================================================
  y += obsBoxHeight + 2.5;

  // Franja separadora distintiva (Dark Slate Divider Bar)
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(10, y, 190, 4.8, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('FIN DE LA EVALUACIÓN DEL TRABAJADOR  ·  SECCIÓN EXCLUSIVA PARA EL DEPARTAMENTO DE RRHH', 105, y + 3.3, { align: 'center' });

  // =========================================================================
  // --- 2. ESPACIO RESERVADO PARA EL DEPARTAMENTO DE RRHH Y MANDO DIRECTO ---
  // =========================================================================
  y += 6.5;

  // 1. Banner Superior RRHH
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(10, y, 190, 5.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text('2. ESPACIO RESERVADO PARA EL DEPARTAMENTO DE RRHH Y MANDO DIRECTO', 13, y + 3.8);

  // 2. Franja Subtítulo Aclaratorio (Alta legibilidad)
  doc.setFillColor(241, 245, 249); // Slate-100
  doc.rect(10, y + 5.5, 190, 4.5, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(10, y + 5.5, 190, 4.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(71, 85, 105);
  doc.text('(A CUMPLIMENTAR POR RRHH / MANDO DIRECTO TRAS LA IMPARTICIÓN · EVALUACIÓN DE EFICACIA ISO 9001 CLÁUSULA 7.2)', 13, y + 8.7);

  y += 11.5;

  // 1. Valoración del Curso (Por la Empresa)
  doc.setFillColor(255, 255, 255);
  doc.rect(10, y, 190, 8.5, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(10, y, 190, 8.5, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(30, 41, 59);
  doc.text('VALORACIÓN DEL CURSO (Por la Empresa / Responsable):', 13, y + 3.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`FECHA: ${filledData?.companyEvaluation?.trainingValuationDate || '____/____/2026'}`, 158, y + 3.2);
  doc.setDrawColor(226, 232, 240);
  doc.line(13, y + 4.2, 197, y + 4.2);
  if (filledData?.companyEvaluation?.trainingValuationComment) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(6.0);
    const commentLines = doc.splitTextToSize(filledData.companyEvaluation.trainingValuationComment, 182);
    doc.text(commentLines.slice(0, 2), 13, y + 6.8);
  }

  y += 9.5;

  // 2. Transmisión de Conocimientos
  doc.setFillColor(255, 255, 255);
  doc.rect(10, y, 190, 8.5, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(10, y, 190, 8.5, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(30, 41, 59);
  doc.text('TRANSMISIÓN DE CONOCIMIENTOS AL EQUIPO:', 13, y + 3.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`FECHA: ${filledData?.companyEvaluation?.knowledgeTransferDate || '____/____/2026'}`, 158, y + 3.2);
  doc.setDrawColor(226, 232, 240);
  doc.line(13, y + 4.2, 197, y + 4.2);
  if (filledData?.companyEvaluation?.knowledgeTransferComment) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(6.0);
    const commentLines = doc.splitTextToSize(filledData.companyEvaluation.knowledgeTransferComment, 182);
    doc.text(commentLines.slice(0, 2), 13, y + 6.8);
  }

  y += 9.5;

  // 3. Valoración de la Eficacia (Empresa) - 3 preguntas
  doc.setFillColor(241, 245, 249);
  doc.rect(10, y, 190, 4.5, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(10, y, 190, 4.5, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(30, 41, 59);
  doc.text('VALORACIÓN DE LA EFICACIA (POR LA EMPRESA / RRHH)', 13, y + 3.2);
  doc.text('1', 140, y + 3.2);
  doc.text('2', 152, y + 3.2);
  doc.text('3', 164, y + 3.2);
  doc.text('4', 176, y + 3.2);
  doc.text('5', 188, y + 3.2);

  const companyQuestions = [
    '1. La mejoría de su capacitación en su actividad de trabajo',
    '2. La mejoría de su actitud frente al trabajo',
    '3. La adquisición de nuevas habilidades'
  ];

  const companyRatings = [
    filledData?.companyEvaluation?.capacityImprovement || 0,
    filledData?.companyEvaluation?.attitudeImprovement || 0,
    filledData?.companyEvaluation?.skillsAcquisition || 0,
  ];

  y += 4.5;
  companyQuestions.forEach((q, idx) => {
    const rowY = y + idx * 4.6;
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(10, rowY, 190, 4.6, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(10, rowY, 190, 4.6, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(30, 41, 59);
    doc.text(q, 13, rowY + 3.2);

    const questionRating = companyRatings[idx];
    const boxXCoords = [139, 151, 163, 175, 187];

    boxXCoords.forEach((bx, bIdx) => {
      const scoreVal = bIdx + 1;
      const isSelected = questionRating === scoreVal;

      if (isSelected) {
        doc.setFillColor(30, 41, 59);
        doc.rect(bx, rowY + 0.7, 3.2, 3.2, 'F');
        doc.setDrawColor(30, 41, 59);
        doc.rect(bx, rowY + 0.7, 3.2, 3.2, 'S');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.5);
        doc.text('X', bx + 0.8, rowY + 3.0);
      } else {
        doc.setDrawColor(100, 116, 139);
        doc.rect(bx, rowY + 0.7, 3.2, 3.2, 'S');
      }
    });
  });

  // Media Empresa row
  y += companyQuestions.length * 4.6;
  doc.setFillColor(241, 245, 249);
  doc.rect(10, y, 190, 4.2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(10, y, 190, 4.2, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.6);
  doc.setTextColor(30, 41, 59);
  doc.text('MEDIA VALORACIÓN EMPRESA (1 a 5):', 13, y + 3.1);
  if (filledData?.meanCompany && filledData.meanCompany > 0) {
    doc.text(`[  ${filledData.meanCompany.toFixed(2)}  ]`, 172, y + 3.1);
  } else {
    doc.text('[         ]', 175, y + 3.1);
  }

  y += 5.5;

  // 4. Split Bottom Row: Comentarios & Tabla de Ponderación
  const splitY = y;

  // Izquierda: Comentarios y Observaciones de Cierre (10 a 112)
  doc.setFillColor(255, 255, 255);
  doc.rect(10, splitY, 102, 24, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(10, splitY, 102, 24, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(30, 41, 59);
  doc.text('COMENTARIOS Y OBSERVACIONES DE CIERRE:', 13, splitY + 4);
  doc.setDrawColor(226, 232, 240);
  doc.line(13, splitY + 10, 108, splitY + 10);
  doc.line(13, splitY + 16, 108, splitY + 16);
  doc.line(13, splitY + 21.5, 108, splitY + 21.5);

  const commentText = filledData?.qualitative?.highlightedStrengths || 
    filledData?.qualitative?.areasForImprovement || 
    filledData?.companyEvaluation?.generalObservations || '';
  if (commentText) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(51, 65, 85);
    const commentLines = doc.splitTextToSize(commentText, 94);
    doc.text(commentLines.slice(0, 3), 13, splitY + 8.5);
  }

  // Derecha: Tabla de Ponderación Oficial (115 a 200)
  doc.setFillColor(15, 23, 42);
  doc.rect(115, splitY, 85, 4.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.text('ASPECTO', 117, splitY + 3.2);
  doc.text('VALOR', 144, splitY + 3.2);
  doc.text('PESO', 160, splitY + 3.2);
  doc.text('PUNTUACIÓN', 176, splitY + 3.2);

  const mt = filledData?.meanTraining || 0;
  const me = filledData?.meanEffectiveness || 0;
  const mc = filledData?.meanCompany || 0;

  // Row 1: Eval. Formación (0.25)
  doc.setFillColor(255, 255, 255);
  doc.rect(115, splitY + 4.5, 85, 4, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(115, splitY + 4.5, 85, 4, 'S');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(30, 41, 59);
  doc.text('Eval. Formación', 117, splitY + 7.5);
  doc.text(mt > 0 ? `[ ${mt.toFixed(2)} ]` : '[     ]', 144, splitY + 7.5);
  doc.text('0,25', 162, splitY + 7.5);
  doc.text(mt > 0 ? `[ ${(mt * 0.25).toFixed(2)} ]` : '[          ]', 176, splitY + 7.5);

  // Row 2: Eval. Eficacia (0.35)
  doc.setFillColor(248, 250, 252);
  doc.rect(115, splitY + 8.5, 85, 4, 'F');
  doc.rect(115, splitY + 8.5, 85, 4, 'S');
  doc.text('Eval. Eficacia', 117, splitY + 11.5);
  doc.text(me > 0 ? `[ ${me.toFixed(2)} ]` : '[     ]', 144, splitY + 11.5);
  doc.text('0,35', 162, splitY + 11.5);
  doc.text(me > 0 ? `[ ${(me * 0.35).toFixed(2)} ]` : '[          ]', 176, splitY + 11.5);

  // Row 3: Valor. Empresa (0.40)
  doc.setFillColor(255, 255, 255);
  doc.rect(115, splitY + 12.5, 85, 4, 'F');
  doc.rect(115, splitY + 12.5, 85, 4, 'S');
  doc.text('Valor. Empresa', 117, splitY + 15.5);
  doc.text(mc > 0 ? `[ ${mc.toFixed(2)} ]` : '[ --- ]', 144, splitY + 15.5);
  doc.text('0,40', 162, splitY + 15.5);
  doc.text(mc > 0 ? `[ ${(mc * 0.40).toFixed(2)} ]` : '[ --- ]', 176, splitY + 15.5);

  // Row 4: MEDIA PONDERADA
  doc.setFillColor(241, 245, 249);
  doc.rect(115, splitY + 16.5, 85, 4.2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(115, splitY + 16.5, 85, 4.2, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('MEDIA PONDERADA:', 117, splitY + 19.6);
  
  if (mc > 0) {
    const finalScore = (mt * 0.25) + (me * 0.35) + (mc * 0.40);
    doc.text(`[  ${finalScore.toFixed(2)} / 5.0  ]`, 170, splitY + 19.6);
  } else if (mt > 0 && me > 0) {
    const workerWeighted = ((mt * 0.25) + (me * 0.35)) / 0.60;
    doc.text(`[  ${workerWeighted.toFixed(2)} (Alumno)  ]`, 164, splitY + 19.6);
  } else {
    doc.text('[                ]', 174, splitY + 19.6);
  }

  // Escala Dictamen ISO
  doc.setFillColor(248, 250, 252);
  doc.rect(115, splitY + 20.7, 85, 3.3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(115, splitY + 20.7, 85, 3.3, 'S');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.2);
  doc.setTextColor(100, 116, 139);
  doc.text('< 2.50: DEFICIENTE  |  2.50 - 3.99: NORMAL  |  >= 4.00: MUY SATISFACTORIO', 116.5, splitY + 23.1);

  y = splitY + 26;

  // 5. Firmas de Cierre y Validación RRHH
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Firma Responsable RRHH / Mando Directo:', 13, y + 3.2);
  doc.text('Conformidad Responsable de Calidad:', 115, y + 3.2);
  doc.setDrawColor(148, 163, 184);
  doc.line(65, y + 3.2, 108, y + 3.2);
  doc.line(160, y + 3.2, 198, y + 3.2);

  // --- FOOTER NOTE ---
  doc.setFontSize(6.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`CODIAGRO S.A. · Formulario Oficial ${docCode} Edición ${docEdition} · Conforme a Norma ISO 9001:2015 / ISO 14001`, 10, 291);
  doc.text(`Página 1 de 1`, 186, 291);

  return doc;
}

/**
 * Downloads the official, printable ISO 9001 PDF Questionnaire (blank or filled)
 */
export async function generateEvaluationPdf(
  trainingOrEval: TrainingAction | Evaluation, 
  settings: CompanySettings,
  filledData?: FilledEvaluationPdfData
): Promise<void> {
  const doc = await buildEvaluationJsPdf(trainingOrEval, settings, filledData);
  const code = ('code' in trainingOrEval ? trainingOrEval.code : (trainingOrEval as Evaluation).trainingCode) || 'RE0180104';
  const empName = filledData?.employeeName || ('employeeName' in trainingOrEval ? (trainingOrEval as Evaluation).employeeName : '');
  const suffix = empName ? `_${empName.replace(/\s+/g, '_')}` : '';
  const filename = `Codiagro_Evaluacion_${code}${suffix}_Ed07.pdf`;
  doc.save(filename);
}

/**
 * Returns raw base64 data string of the official PDF questionnaire (without prefix)
 */
export async function getEvaluationPdfBase64(trainingOrEval: TrainingAction | Evaluation, settings: CompanySettings): Promise<string> {
  const doc = await buildEvaluationJsPdf(trainingOrEval, settings);
  const dataUri = doc.output('datauristring');
  return dataUri.split(',')[1] || '';
}

/**
 * Generates an official Microsoft Word (.docx) document matching Codiagro RE0180104 Ed. 07
 */
export async function generateEvaluationDocx(training: TrainingAction, settings: CompanySettings): Promise<void> {
  const docCode = settings.documentCode || 'RE0180104';
  const docEdition = settings.documentEdition || '07';

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720, // 0.5 in
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children: [
          // Header Table (Logo / Title / Doc Stamp)
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: '09101C' },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'CODIAGRO', bold: true, size: 26, color: '00C282' }),
                          new TextRun({ text: ' S.A.', size: 22, color: 'FFFFFF' }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'EVALUACIÓN DE LA FORMACIÓN Y EFICACIA', bold: true, size: 20, color: 'E2E8F0' }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Sistema de Gestión de la Calidad · Cláusula 7.2 ISO 9001:2015', size: 16, color: '94A3B8' }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: '101C2E' },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: docCode, bold: true, size: 22, color: '00C282' }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: `EDICIÓN ${docEdition}`, bold: true, size: 18, color: 'FFFFFF' }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: `CÓD: ${training.code || '26001'}`, size: 16, color: 'CBD5E1' }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ text: '' }),

          // Course Details Table (Adjusted full width for title)
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 22, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'FECHA / HORAS:', bold: true, size: 17 })] })],
                  }),
                  new TableCell({
                    width: { size: 78, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: `Fecha: ${training.plannedDate || '____/____/2026'}   |   Duración: ${training.durationHours}h (${training.modality || 'Presencial'})   |   Dpto: ${training.department || 'General'}`, size: 17 }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 22, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: 'E2E8F0' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'CURSO / ACCIÓN:', bold: true, size: 17, color: '0F172A' })] })],
                  }),
                  new TableCell({
                    width: { size: 78, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: training.title || 'Formación ISO 9001', bold: true, size: 18, color: '006644' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'NECESIDAD FORMATIVA:', bold: true, size: 17 })] })],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: training.justification || 'Actualización y cualificación en competencias requeridas para el puesto de trabajo.', size: 17 }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'RESPONSABLE / FORMADOR:', bold: true, size: 17 })] })],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: training.trainerName || 'Responsable de Calidad / RRHH', size: 17 }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'ASISTENTE:', bold: true, size: 17 })] })],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: '____________________________________________________', size: 17 }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ text: '' }),

          // Scale Indicator
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: '1E293B' },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'INDICADORES DE VALORACIÓN:  1.- Nada  |  2.- Regular  |  3.- Bien  |  4.- Muy bien  |  5.- Excelente', bold: true, size: 16, color: 'FFFFFF' }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ text: '' }),

          // Formación Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: 'E2E8F0' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'EVALUACIÓN DEL ASISTENTE: FORMACIÓN', bold: true, size: 17 })] })],
                  }),
                  ...['1', '2', '3', '4', '5'].map(num => 
                    new TableCell({
                      width: { size: 6, type: WidthType.PERCENTAGE },
                      shading: { type: ShadingType.CLEAR, fill: 'E2E8F0' },
                      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: num, bold: true, size: 17 })] })],
                    })
                  ),
                ],
              }),
              ...[
                '1. El curso ha respondido al temario inicial',
                '2. El curso ha cubierto los objetivos iniciales',
                '3. Los recursos didácticos facilitados han sido adecuados',
                '4. El grado de satisfacción general con el curso',
              ].map(q => 
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: q, size: 16 })] })] }),
                    ...['', '', '', '', ''].map(() => 
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '[  ]', size: 16 })] })] })
                    ),
                  ],
                })
              ),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: 'DCFCE7' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'MEDIA FORMACIÓN (1 a 5):', bold: true, size: 16, color: '166534' })] })],
                  }),
                  new TableCell({
                    columnSpan: 5,
                    shading: { type: ShadingType.CLEAR, fill: 'DCFCE7' },
                    children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: '[           ]', bold: true, size: 16 })] })],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ text: '' }),

          // Eficacia Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: 'E2E8F0' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'EVALUACIÓN DEL ASISTENTE: EFICACIA Y APRENDIZAJE', bold: true, size: 17 })] })],
                  }),
                  ...['1', '2', '3', '4', '5'].map(num => 
                    new TableCell({
                      width: { size: 6, type: WidthType.PERCENTAGE },
                      shading: { type: ShadingType.CLEAR, fill: 'E2E8F0' },
                      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: num, bold: true, size: 17 })] })],
                    })
                  ),
                ],
              }),
              ...[
                '1. El curso ha supuesto la adquisición de nuevos conocimientos',
                '2. Antes del curso, mi nivel de conocimientos era...',
                '3. Después del curso, mi nivel de conocimientos es...',
                '4. El curso me es útil a la práctica',
              ].map(q => 
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: q, size: 16 })] })] }),
                    ...['', '', '', '', ''].map(() => 
                      new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '[  ]', size: 16 })] })] })
                    ),
                  ],
                })
              ),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: 'DCFCE7' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'MEDIA EFICACIA (1 a 5):', bold: true, size: 16, color: '166534' })] })],
                  }),
                  new TableCell({
                    columnSpan: 5,
                    shading: { type: ShadingType.CLEAR, fill: 'DCFCE7' },
                    children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: '[           ]', bold: true, size: 16 })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 6,
                    shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
                    children: [
                      new Paragraph({
                        spacing: { before: 80, after: 60 },
                        children: [
                          new TextRun({ text: 'OBSERVACIONES / COMENTARIOS DEL TRABAJADOR / ASISTENTE:', bold: true, size: 15, color: '166534' }),
                        ],
                      }),
                      new Paragraph({ spacing: { before: 40, after: 40 }, text: '1. ____________________________________________________________________________________' }),
                      new Paragraph({ spacing: { before: 40, after: 40 }, text: '2. ____________________________________________________________________________________' }),
                      new Paragraph({ spacing: { before: 40, after: 40 }, text: '3. ____________________________________________________________________________________' }),
                      new Paragraph({ spacing: { before: 40, after: 40 }, text: '4. ____________________________________________________________________________________' }),
                      new Paragraph({ spacing: { before: 40, after: 60 }, text: '5. ____________________________________________________________________________________' }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ text: '' }),
          new Paragraph({ text: '' }), // Extra space before HR Section

          // ESPACIO RESERVADO PARA EL DEPARTAMENTO DE RRHH Y MANDO DIRECTO (Orange Highlighted)
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 6,
                    shading: { type: ShadingType.CLEAR, fill: 'FED7AA' }, // Amber/Orange
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'ESPACIO RESERVADO PARA EL DEPARTAMENTO DE RRHH Y MANDO DIRECTO', bold: true, size: 18, color: '9A3412' }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: '(A cumplimentar por RRHH / Mando Directo · Cláusula 7.2 ISO 9001:2015)', size: 14, color: '7C2D12' }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 6,
                    shading: { type: ShadingType.CLEAR, fill: 'FFF7ED' },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'VALORACIÓN DEL CURSO (Por la Empresa): ', bold: true, size: 16, color: '9A3412' }),
                          new TextRun({ text: 'FECHA: ____/____/2026', size: 15, color: '64748B' }),
                        ],
                      }),
                      new Paragraph({ text: '____________________________________________________________________________________' }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 6,
                    shading: { type: ShadingType.CLEAR, fill: 'FFF7ED' },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'TRANSMISIÓN DE CONOCIMIENTOS AL EQUIPO: ', bold: true, size: 16, color: '9A3412' }),
                          new TextRun({ text: 'FECHA: ____/____/2026', size: 15, color: '64748B' }),
                        ],
                      }),
                      new Paragraph({ text: '____________________________________________________________________________________' }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: 'FFEDD5' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'VALORACIÓN DE LA EFICACIA (POR LA EMPRESA)', bold: true, size: 16, color: '9A3412' })] })],
                  }),
                  ...['1', '2', '3', '4', '5'].map(num => 
                    new TableCell({
                      width: { size: 6, type: WidthType.PERCENTAGE },
                      shading: { type: ShadingType.CLEAR, fill: 'FFEDD5' },
                      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: num, bold: true, size: 16 })] })],
                    })
                  ),
                ],
              }),
              ...[
                '1. La mejoría de su capacitación en su actividad de trabajo',
                '2. La mejoría de su actitud frente al trabajo',
                '3. La adquisición de nuevas habilidades',
              ].map(q => 
                new TableRow({
                  children: [
                    new TableCell({ shading: { type: ShadingType.CLEAR, fill: 'FFFDF7' }, children: [new Paragraph({ children: [new TextRun({ text: q, size: 15 })] })] }),
                    ...['', '', '', '', ''].map(() => 
                      new TableCell({ shading: { type: ShadingType.CLEAR, fill: 'FFFDF7' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '[  ]', size: 15 })] })] })
                    ),
                  ],
                })
              ),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: 'FEF3C7' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'MEDIA VALORACIÓN EMPRESA (1 a 5):', bold: true, size: 16, color: '92400E' })] })],
                  }),
                  new TableCell({
                    columnSpan: 5,
                    shading: { type: ShadingType.CLEAR, fill: 'FEF3C7' },
                    children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: '[           ]', bold: true, size: 16 })] })],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ text: '' }),

          // Ponderation Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: '0F172A' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'ASPECTO', bold: true, size: 16, color: 'FFFFFF' })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: '0F172A' },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'VALOR', bold: true, size: 16, color: 'FFFFFF' })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: '0F172A' },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'PESO', bold: true, size: 16, color: 'FFFFFF' })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: '0F172A' },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'PUNTUACIÓN', bold: true, size: 16, color: 'FFFFFF' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Evaluación Formación', size: 15 })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '[       ]', size: 15 })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '0,25', size: 15 })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '[           ]', size: 15 })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Evaluación Eficacia', size: 15 })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '[       ]', size: 15 })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '0,35', size: 15 })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '[           ]', size: 15 })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Valoración Empresa', size: 15 })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '[       ]', size: 15 })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '0,40', size: 15 })] })] }),
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '[           ]', size: 15 })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: 'DCFCE7' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'MEDIA PONDERADA:', bold: true, size: 16, color: '166534' })] })],
                  }),
                  new TableCell({
                    columnSpan: 3,
                    shading: { type: ShadingType.CLEAR, fill: 'DCFCE7' },
                    children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: '[                   ]', bold: true, size: 16 })] })],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ text: '' }),

          new Paragraph({
            children: [
              new TextRun({
                text: `CODIAGRO S.A. · Documento Oficial ${docCode} Edición ${docEdition} · Registrado bajo ISO 9001:2015`,
                size: 14,
                color: '94A3B8',
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Codiagro_Cuestionario_${training.code || 'RE0180104'}_Ed07.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
