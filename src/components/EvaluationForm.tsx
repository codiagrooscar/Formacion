import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  Star, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  FileText, 
  Building, 
  User as UserIcon, 
  Calendar, 
  CheckCircle2, 
  Info, 
  HelpCircle,
  X,
  FileSearch,
  Eye,
  Sliders,
  Download,
  Award,
  ChevronRight,
  ShieldCheck,
  Send,
  Printer,
  FolderOpen,
  Search,
  Filter,
  Clock,
  Edit3,
  CheckCheck,
  Layers,
  FileCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  TrainingAction, 
  Evaluation, 
  EvaluationRatings, 
  EvaluationQualitative, 
  CompanySettings,
  AttendeeTrainingRatings,
  AttendeeEffectivenessRatings,
  CompanyEvaluationRatings
} from '../types';
import { generateEvaluationPdf, generateEvaluationDocx } from '../utils/documentGenerator';
import { CodiagroLogo } from './CodiagroLogo';

interface EvaluationFormProps {
  trainings: TrainingAction[];
  evaluations?: Evaluation[];
  settings: CompanySettings;
  onEvaluationSubmitted: (evaluation: Omit<Evaluation, 'id'>, existingId?: string) => Promise<void>;
  preselectedTrainingId?: string;
  isAttendeeView?: boolean;
  onNavigateToMain?: () => void;
}

export const EvaluationForm: React.FC<EvaluationFormProps> = ({
  trainings,
  evaluations = [],
  settings,
  onEvaluationSubmitted,
  preselectedTrainingId,
  isAttendeeView = false,
  onNavigateToMain,
}) => {
  // Input mode: 'online' | 'saved' | 'upload' | 'camera'
  const [entryMode, setEntryMode] = useState<'online' | 'saved' | 'upload' | 'camera'>('online');
  const [isRrhhMode, setIsRrhhMode] = useState<boolean>(false);
  
  // Track currently loaded evaluation for edit/completion
  const [loadedEvaluationId, setLoadedEvaluationId] = useState<string | null>(null);

  // Filters for Saved Questionnaires Browser
  const [savedFilterStatus, setSavedFilterStatus] = useState<'all' | 'pending_rrhh' | 'completed'>('all');
  const [savedSearchQuery, setSavedSearchQuery] = useState<string>('');
  const [savedFilterCourse, setSavedFilterCourse] = useState<string>('all');
  
  // Selected course
  const [selectedTrainingId, setSelectedTrainingId] = useState<string>(preselectedTrainingId || (trainings[0]?.id || ''));
  
  // Selected Training Action Object
  const currentTraining = useMemo(() => {
    return trainings.find(t => t.id === selectedTrainingId) || trainings[0];
  }, [trainings, selectedTrainingId]);

  // Form Fields Matching Codiagro RE0180104 Ed. 07
  const [employeeName, setEmployeeName] = useState<string>('');
  const [employeeEmail, setEmployeeEmail] = useState<string>('');
  const [department, setDepartment] = useState<string>(settings.departments[0] || 'Producción e Ingeniería');
  const [trainingDate, setTrainingDate] = useState<string>(currentTraining?.plannedDate || new Date().toISOString().split('T')[0]);
  const [durationHours, setDurationHours] = useState<number>(currentTraining?.durationHours || 2);
  const [trainingNeedDescription, setTrainingNeedDescription] = useState<string>(currentTraining?.justification || '');
  const [responsibleName, setResponsibleName] = useState<string>(currentTraining?.trainerName || 'Responsable de Área');
  const [trainingCenter, setTrainingCenter] = useState<string>(currentTraining?.trainingCenter || currentTraining?.provider || '');

  // Helper functions for student auto-fill & lookup
  const handleEmployeeNameChange = (nameVal: string) => {
    setEmployeeName(nameVal);
    const clean = nameVal.trim().toLowerCase();
    if (!clean) return;

    // Check in registered employees
    const matchedEmployee = (settings.employees || []).find(
      (emp) => emp.name.toLowerCase() === clean || emp.name.toLowerCase().startsWith(clean)
    );
    if (matchedEmployee) {
      if (matchedEmployee.email) setEmployeeEmail(matchedEmployee.email);
      if (matchedEmployee.department && settings.departments.includes(matchedEmployee.department)) {
        setDepartment(matchedEmployee.department);
      }
      return;
    }

    // Check in course attendees
    const matchedAttendee = currentTraining?.attendees?.find(
      (att) => att.name.toLowerCase() === clean || att.name.toLowerCase().startsWith(clean)
    );
    if (matchedAttendee) {
      if (matchedAttendee.email) setEmployeeEmail(matchedAttendee.email);
      if (matchedAttendee.department && settings.departments.includes(matchedAttendee.department)) {
        setDepartment(matchedAttendee.department);
      }
    }
  };

  const handleEmployeeEmailChange = (emailVal: string) => {
    setEmployeeEmail(emailVal);
    const clean = emailVal.trim().toLowerCase();
    if (!clean) return;

    const matchedEmployee = (settings.employees || []).find(
      (emp) => emp.email.toLowerCase() === clean || emp.email.toLowerCase().startsWith(clean)
    );
    if (matchedEmployee) {
      if (matchedEmployee.name) setEmployeeName(matchedEmployee.name);
      if (matchedEmployee.department && settings.departments.includes(matchedEmployee.department)) {
        setDepartment(matchedEmployee.department);
      }
      return;
    }

    const matchedAttendee = currentTraining?.attendees?.find(
      (att) => att.email.toLowerCase() === clean || att.email.toLowerCase().startsWith(clean)
    );
    if (matchedAttendee) {
      if (matchedAttendee.name) setEmployeeName(matchedAttendee.name);
      if (matchedAttendee.department && settings.departments.includes(matchedAttendee.department)) {
        setDepartment(matchedAttendee.department);
      }
    }
  };

  const handleSelectRegisteredEmployee = (empId: string) => {
    if (!empId) return;
    const emp = (settings.employees || []).find((e) => e.id === empId);
    if (emp) {
      setEmployeeName(emp.name);
      setEmployeeEmail(emp.email);
      if (emp.department && settings.departments.includes(emp.department)) {
        setDepartment(emp.department);
      }
      return;
    }

    const att = currentTraining?.attendees?.find((a) => a.id === empId);
    if (att) {
      setEmployeeName(att.name);
      setEmployeeEmail(att.email);
      if (att.department && settings.departments.includes(att.department)) {
        setDepartment(att.department);
      }
    }
  };

  // Attendee Ratings: Formación (0 = unselected)
  const [attendeeTraining, setAttendeeTraining] = useState<AttendeeTrainingRatings>({
    respondedToSyllabus: 0,
    coveredInitialObjectives: 0,
    didacticResourcesAdequate: 0,
    overallSatisfaction: 0,
  });

  // Attendee Ratings: Eficacia (0 = unselected)
  const [attendeeEffectiveness, setAttendeeEffectiveness] = useState<AttendeeEffectivenessRatings>({
    knowledgeAcquisition: 0,
    knowledgeLevelBefore: 0,
    knowledgeLevelAfter: 0,
    practicalUtility: 0,
  });

  // Company Evaluation (Responsable RR.HH. / Mando)
  const [companyEvaluation, setCompanyEvaluation] = useState<CompanyEvaluationRatings>({
    trainingValuationComment: '',
    trainingValuationDate: new Date().toISOString().split('T')[0],
    knowledgeTransferComment: '',
    knowledgeTransferDate: new Date().toISOString().split('T')[0],
    capacityImprovement: 0,
    attitudeImprovement: 0,
    skillsAcquisition: 0,
    generalObservations: '',
  });

  // Qualitative & action plan
  const [qualitative, setQualitative] = useState<EvaluationQualitative>({
    highlightedStrengths: '',
    areasForImprovement: '',
    wouldRecommend: true,
    actionPlanCommitment: '',
    suggestedFutureTopics: '',
  });

  // Role Tab Toggle for Easy Completion
  const [activeRoleTab, setActiveRoleTab] = useState<'attendee' | 'company' | 'all'>('all');

  // Camera & Image state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [capturedImageBase64, setCapturedImageBase64] = useState<string | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState<boolean>(false);
  const [analysisConfidence, setAnalysisConfidence] = useState<number | null>(null);
  const [aiAnalysisNotes, setAiAnalysisNotes] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync when selected training changes
  useEffect(() => {
    if (currentTraining) {
      setTrainingDate(currentTraining.plannedDate || new Date().toISOString().split('T')[0]);
      setDurationHours(currentTraining.durationHours || 2);
      setTrainingNeedDescription(currentTraining.justification || '');
      setResponsibleName(currentTraining.trainerName || 'Responsable de Calidad / RRHH');
      setTrainingCenter(currentTraining.trainingCenter || currentTraining.provider || '');
    }
  }, [currentTraining]);

  // Read URL search params when attendee or RRHH opens link from email
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const modeParam = params.get('mode');
      const evalIdParam = params.get('evalId');
      const nameParam = params.get('name');
      const emailParam = params.get('email');
      const courseIdParam = params.get('courseId');
      const courseCodeParam = params.get('courseCode');

      if (modeParam === 'rrhh' || modeParam === 'company') {
        setIsRrhhMode(true);
        setActiveRoleTab('company');
      }

      if (courseIdParam) {
        setSelectedTrainingId(courseIdParam);
      } else if (courseCodeParam && trainings.length > 0) {
        const found = trainings.find(t => t.code === courseCodeParam);
        if (found) setSelectedTrainingId(found.id);
      }

      // Try to find and preload existing evaluation for this employee
      if (evaluations.length > 0) {
        let existingEval: Evaluation | undefined;
        if (evalIdParam) {
          existingEval = evaluations.find(e => e.id === evalIdParam);
        }
        if (!existingEval && nameParam && (courseIdParam || courseCodeParam)) {
          existingEval = evaluations.find(e => {
            const matchesCourse = courseIdParam ? e.trainingActionId === courseIdParam : e.trainingCode === courseCodeParam;
            const matchesName = e.employeeName?.toLowerCase().trim() === nameParam.toLowerCase().trim();
            return matchesCourse && matchesName;
          });
        }

        if (existingEval) {
          setLoadedEvaluationId(existingEval.id);
          if (existingEval.employeeName) setEmployeeName(existingEval.employeeName);
          if (existingEval.employeeEmail) setEmployeeEmail(existingEval.employeeEmail);
          if (existingEval.department) setDepartment(existingEval.department);
          if (existingEval.trainingDate) setTrainingDate(existingEval.trainingDate);
          if (existingEval.durationHours) setDurationHours(existingEval.durationHours);
          if (existingEval.trainingActionId) setSelectedTrainingId(existingEval.trainingActionId);
          if (existingEval.ratings?.attendeeTraining) setAttendeeTraining(existingEval.ratings.attendeeTraining);
          if (existingEval.ratings?.attendeeEffectiveness) setAttendeeEffectiveness(existingEval.ratings.attendeeEffectiveness);
          if (existingEval.ratings?.companyEvaluation) setCompanyEvaluation(existingEval.ratings.companyEvaluation);
          if (existingEval.qualitative) setQualitative(existingEval.qualitative);
        } else {
          if (nameParam) setEmployeeName(nameParam);
          if (emailParam) setEmployeeEmail(emailParam);
        }
      } else {
        if (nameParam) setEmployeeName(nameParam);
        if (emailParam) setEmployeeEmail(emailParam);
      }
    } catch (e) {
      console.error('Error reading URL parameters:', e);
    }
  }, [evaluations, trainings]);

  // Sync preselectedTrainingId
  useEffect(() => {
    if (preselectedTrainingId) {
      setSelectedTrainingId(preselectedTrainingId);
    }
  }, [preselectedTrainingId]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Real-time Calculations (ignoring unselected zeros)
  const meanTraining = useMemo(() => {
    const values = [
      attendeeTraining.respondedToSyllabus, 
      attendeeTraining.coveredInitialObjectives, 
      attendeeTraining.didacticResourcesAdequate, 
      attendeeTraining.overallSatisfaction
    ].filter(v => v > 0);
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return Number((sum / values.length).toFixed(2));
  }, [attendeeTraining]);

  const meanEffectiveness = useMemo(() => {
    const values = [
      attendeeEffectiveness.knowledgeAcquisition, 
      attendeeEffectiveness.knowledgeLevelBefore, 
      attendeeEffectiveness.knowledgeLevelAfter, 
      attendeeEffectiveness.practicalUtility
    ].filter(v => v > 0);
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return Number((sum / values.length).toFixed(2));
  }, [attendeeEffectiveness]);

  const meanCompany = useMemo(() => {
    const values = [
      companyEvaluation.capacityImprovement, 
      companyEvaluation.attitudeImprovement, 
      companyEvaluation.skillsAcquisition
    ].filter(v => v > 0);
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return Number((sum / values.length).toFixed(2));
  }, [companyEvaluation]);

  // Media ponderada del trabajador (Bloques 1 y 2: Formación 25% y Eficacia 35% -> base 60%)
  const workerWeightedScore = useMemo(() => {
    const mt = meanTraining > 0 ? meanTraining : 0;
    const me = meanEffectiveness > 0 ? meanEffectiveness : 0;
    if (mt === 0 && me === 0) return 0;
    if (mt > 0 && me > 0) {
      return Number((((mt * 0.25) + (me * 0.35)) / 0.60).toFixed(2));
    }
    return mt > 0 ? mt : me;
  }, [meanTraining, meanEffectiveness]);

  // Official ISO Weighted Score:
  // Si la empresa aún no ha valorado (mc === 0), la nota corresponde a la media ponderada del alumno (workerWeightedScore).
  // Si la empresa ya ha valorado (mc > 0), se aplica la fórmula completa: Formación (25%) + Eficacia (35%) + Empresa (40%).
  const weightedScore = useMemo(() => {
    const mt = meanTraining > 0 ? meanTraining : 0;
    const me = meanEffectiveness > 0 ? meanEffectiveness : 0;
    const mc = meanCompany > 0 ? meanCompany : 0;

    if (mt === 0 && me === 0 && mc === 0) return 0;

    if (mc > 0) {
      const score = (mt * 0.25) + (me * 0.35) + (mc * 0.40);
      return Number(score.toFixed(2));
    }

    return workerWeightedScore;
  }, [meanTraining, meanEffectiveness, meanCompany, workerWeightedScore]);

  const gradeCategory: 'PENDIENTE' | 'DEFICIENTE' | 'NORMAL' | 'MUY SATISFACTORIO' = useMemo(() => {
    if (weightedScore === 0) return 'PENDIENTE';
    if (weightedScore < 2.50) return 'DEFICIENTE';
    if (weightedScore < 4.00) return 'NORMAL';
    return 'MUY SATISFACTORIO';
  }, [weightedScore]);

  const startCamera = async () => {
    try {
      setErrorMessage(null);
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Error starting camera:', err);
      setIsCameraActive(false);
      setErrorMessage('No se pudo acceder a la cámara. Comprueba los permisos o sube una foto desde tu dispositivo.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImageBase64(dataUrl);
      stopCamera();
      analyzeImageWithGemini(dataUrl);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setCapturedImageBase64(result);
      analyzeImageWithGemini(result);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImageWithGemini = async (imageBase64: string) => {
    try {
      setIsAnalyzingImage(true);
      setErrorMessage(null);

      const response = await fetch('/api/analyze-evaluation-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mimeType: 'image/jpeg',
          availableCourses: trainings.map(t => ({
            id: t.id,
            code: t.code,
            title: t.title,
            trainerName: t.trainerName
          }))
        })
      });

      const resData = await response.json();
      if (!resData.success || !resData.data) {
        throw new Error(resData.error || 'No se pudieron extraer datos del formulario.');
      }

      const data = resData.data;

      // Auto-match course if recognized
      if (data.detectedCourseName || data.detectedCourseCode) {
        const found = trainings.find(t => 
          (data.detectedCourseCode && t.code.toLowerCase().includes(data.detectedCourseCode.toLowerCase())) ||
          (data.detectedCourseName && t.title.toLowerCase().includes(data.detectedCourseName.toLowerCase()))
        );
        if (found) {
          setSelectedTrainingId(found.id);
        }
      }

      if (data.detectedParticipantName) setEmployeeName(data.detectedParticipantName);
      if (data.detectedDepartment) setDepartment(data.detectedDepartment);
      if (data.detectedDate) setTrainingDate(data.detectedDate);
      if (data.detectedNeedDescription) setTrainingNeedDescription(data.detectedNeedDescription);
      if (data.detectedTrainerOrResponsible) setResponsibleName(data.detectedTrainerOrResponsible);

      // Auto-populate ratings if detected in OCR
      if (data.ratings) {
        const r = data.ratings;
        setAttendeeTraining({
          respondedToSyllabus: r.attendeeTraining?.respondedToSyllabus || r.contentClarity || 5,
          coveredInitialObjectives: r.attendeeTraining?.coveredInitialObjectives || r.contentUtility || 5,
          didacticResourcesAdequate: r.attendeeTraining?.didacticResourcesAdequate || r.organizationFacilities || 4,
          overallSatisfaction: r.attendeeTraining?.overallSatisfaction || r.overallSatisfaction || 5,
        });

        setAttendeeEffectiveness({
          knowledgeAcquisition: r.attendeeEffectiveness?.knowledgeAcquisition || r.trainerKnowledge || 5,
          knowledgeLevelBefore: r.attendeeEffectiveness?.knowledgeLevelBefore || 3,
          knowledgeLevelAfter: r.attendeeEffectiveness?.knowledgeLevelAfter || 5,
          practicalUtility: r.attendeeEffectiveness?.practicalUtility || r.jobApplicability || 5,
          attendeeObservations: r.attendeeEffectiveness?.attendeeObservations || '',
        });

        if (r.companyEvaluation) {
          setCompanyEvaluation({
            trainingValuationComment: r.companyEvaluation.trainingValuationComment || companyEvaluation.trainingValuationComment,
            trainingValuationDate: r.companyEvaluation.trainingValuationDate || companyEvaluation.trainingValuationDate,
            knowledgeTransferComment: r.companyEvaluation.knowledgeTransferComment || companyEvaluation.knowledgeTransferComment,
            knowledgeTransferDate: r.companyEvaluation.knowledgeTransferDate || companyEvaluation.knowledgeTransferDate,
            capacityImprovement: r.companyEvaluation.capacityImprovement || 5,
            attitudeImprovement: r.companyEvaluation.attitudeImprovement || 4,
            skillsAcquisition: r.companyEvaluation.skillsAcquisition || 5,
            generalObservations: r.companyEvaluation.generalObservations || companyEvaluation.generalObservations,
          });
        }
      }

      if (data.qualitative) {
        setQualitative({
          highlightedStrengths: data.qualitative.highlightedStrengths || '',
          areasForImprovement: data.qualitative.areasForImprovement || '',
          wouldRecommend: data.qualitative.wouldRecommend ?? true,
          actionPlanCommitment: data.qualitative.actionPlanCommitment || '',
          suggestedFutureTopics: data.qualitative.suggestedFutureTopics || '',
        });
      }

      setAnalysisConfidence(data.confidenceScore || 0.95);
      setAiAnalysisNotes(data.rawNotes || data.aiInsights || 'Formulario digitalizado con éxito bajo formato RE0180104 Ed. 07.');

      // Switch to online view to review and confirm
      setEntryMode('online');

    } catch (err: any) {
      console.error('Error in OCR:', err);
      setErrorMessage(err.message || 'Error al analizar la imagen con IA');
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const resetAllFormFields = () => {
    setLoadedEvaluationId(null);
    setSubmitSuccess(false);
    setCapturedImageBase64(null);
    setAnalysisConfidence(null);
    setAiAnalysisNotes(null);
    setEmployeeName('');
    setEmployeeEmail('');
    setAttendeeTraining({
      respondedToSyllabus: 0,
      coveredInitialObjectives: 0,
      didacticResourcesAdequate: 0,
      overallSatisfaction: 0,
    });
    setAttendeeEffectiveness({
      knowledgeAcquisition: 0,
      knowledgeLevelBefore: 0,
      knowledgeLevelAfter: 0,
      practicalUtility: 0,
      attendeeObservations: '',
    });
    setCompanyEvaluation({
      trainingValuationComment: '',
      trainingValuationDate: new Date().toISOString().split('T')[0],
      knowledgeTransferComment: '',
      knowledgeTransferDate: new Date().toISOString().split('T')[0],
      capacityImprovement: 0,
      attitudeImprovement: 0,
      skillsAcquisition: 0,
      generalObservations: '',
    });
    setQualitative({
      highlightedStrengths: '',
      areasForImprovement: '',
      wouldRecommend: true,
      actionPlanCommitment: '',
      suggestedFutureTopics: '',
    });
    setErrorMessage(null);
  };

  // Handler to load any existing evaluation directly into the form
  const handleLoadSavedEvaluation = (evalItem: Evaluation) => {
    setLoadedEvaluationId(evalItem.id);
    if (evalItem.trainingActionId) {
      setSelectedTrainingId(evalItem.trainingActionId);
    }
    setEmployeeName(evalItem.employeeName || '');
    setEmployeeEmail(evalItem.employeeEmail || '');
    setDepartment(evalItem.department || settings.departments[0] || 'Producción e Ingeniería');
    setTrainingDate(evalItem.trainingDate || new Date().toISOString().split('T')[0]);
    setDurationHours(evalItem.durationHours || 2);
    setTrainingNeedDescription(evalItem.trainingNeedDescription || '');
    setResponsibleName(evalItem.responsibleName || 'Responsable de Calidad / RRHH');
    
    if (evalItem.ratings?.attendeeTraining) {
      setAttendeeTraining({
        respondedToSyllabus: evalItem.ratings.attendeeTraining.respondedToSyllabus || 0,
        coveredInitialObjectives: evalItem.ratings.attendeeTraining.coveredInitialObjectives || 0,
        didacticResourcesAdequate: evalItem.ratings.attendeeTraining.didacticResourcesAdequate || 0,
        overallSatisfaction: evalItem.ratings.attendeeTraining.overallSatisfaction || 0,
      });
    }
    if (evalItem.ratings?.attendeeEffectiveness) {
      setAttendeeEffectiveness({
        knowledgeAcquisition: evalItem.ratings.attendeeEffectiveness.knowledgeAcquisition || 0,
        knowledgeLevelBefore: evalItem.ratings.attendeeEffectiveness.knowledgeLevelBefore || 0,
        knowledgeLevelAfter: evalItem.ratings.attendeeEffectiveness.knowledgeLevelAfter || 0,
        practicalUtility: evalItem.ratings.attendeeEffectiveness.practicalUtility || 0,
        attendeeObservations: evalItem.ratings.attendeeEffectiveness.attendeeObservations || '',
      });
    }
    if (evalItem.ratings?.companyEvaluation) {
      setCompanyEvaluation({
        trainingValuationComment: evalItem.ratings.companyEvaluation.trainingValuationComment || '',
        trainingValuationDate: evalItem.ratings.companyEvaluation.trainingValuationDate || new Date().toISOString().split('T')[0],
        knowledgeTransferComment: evalItem.ratings.companyEvaluation.knowledgeTransferComment || '',
        knowledgeTransferDate: evalItem.ratings.companyEvaluation.knowledgeTransferDate || new Date().toISOString().split('T')[0],
        capacityImprovement: evalItem.ratings.companyEvaluation.capacityImprovement || 0,
        attitudeImprovement: evalItem.ratings.companyEvaluation.attitudeImprovement || 0,
        skillsAcquisition: evalItem.ratings.companyEvaluation.skillsAcquisition || 0,
        generalObservations: evalItem.ratings.companyEvaluation.generalObservations || '',
      });
    }
    if (evalItem.qualitative) {
      setQualitative({
        highlightedStrengths: evalItem.qualitative.highlightedStrengths || '',
        areasForImprovement: evalItem.qualitative.areasForImprovement || '',
        wouldRecommend: evalItem.qualitative.wouldRecommend ?? true,
        actionPlanCommitment: evalItem.qualitative.actionPlanCommitment || '',
        suggestedFutureTopics: evalItem.qualitative.suggestedFutureTopics || '',
      });
    }

    setCapturedImageBase64(evalItem.scannedImagePreview || null);
    setAiAnalysisNotes(evalItem.rawExtractedNotes || null);
    setAnalysisConfidence(evalItem.confidenceScore || null);

    // If company evaluation is pending, automatically switch to RRHH focus mode
    const isCompanyPending = !evalItem.ratings?.companyEvaluation?.capacityImprovement || evalItem.ratings?.companyEvaluation?.capacityImprovement === 0;
    if (isCompanyPending) {
      setIsRrhhMode(true);
      setActiveRoleTab('all');
    }

    setErrorMessage(null);
    setEntryMode('online');

    // Scroll to top of the form smoothly
    window.scrollTo({ top: 100, behavior: 'smooth' });
  };

  // Saved questionnaires filtering and categorization
  const evaluationsPendingRrhh = useMemo(() => {
    return evaluations.filter(e => {
      const comp = e.ratings?.companyEvaluation;
      return !comp || !comp.capacityImprovement || comp.capacityImprovement === 0 || !e.ratings?.meanCompany || e.ratings.meanCompany === 0;
    });
  }, [evaluations]);

  const evaluationsCompleted = useMemo(() => {
    return evaluations.filter(e => {
      const comp = e.ratings?.companyEvaluation;
      return comp && comp.capacityImprovement && comp.capacityImprovement > 0 && e.ratings?.meanCompany && e.ratings.meanCompany > 0;
    });
  }, [evaluations]);

  const filteredSavedEvaluations = useMemo(() => {
    return evaluations.filter(e => {
      // 1. Status Filter
      if (savedFilterStatus === 'pending_rrhh') {
        const comp = e.ratings?.companyEvaluation;
        const isPending = !comp || !comp.capacityImprovement || comp.capacityImprovement === 0 || !e.ratings?.meanCompany || e.ratings.meanCompany === 0;
        if (!isPending) return false;
      } else if (savedFilterStatus === 'completed') {
        const comp = e.ratings?.companyEvaluation;
        const isCompleted = comp && comp.capacityImprovement && comp.capacityImprovement > 0 && e.ratings?.meanCompany && e.ratings.meanCompany > 0;
        if (!isCompleted) return false;
      }

      // 2. Course Filter
      if (savedFilterCourse !== 'all' && e.trainingActionId !== savedFilterCourse) {
        return false;
      }

      // 3. Search Query
      if (savedSearchQuery.trim()) {
        const q = savedSearchQuery.toLowerCase().trim();
        const matchesName = e.employeeName?.toLowerCase().includes(q);
        const matchesEmail = e.employeeEmail?.toLowerCase().includes(q);
        const matchesDept = e.department?.toLowerCase().includes(q);
        const matchesCourse = e.trainingTitle?.toLowerCase().includes(q) || e.trainingCode?.toLowerCase().includes(q);
        return Boolean(matchesName || matchesEmail || matchesDept || matchesCourse);
      }

      return true;
    });
  }, [evaluations, savedFilterStatus, savedFilterCourse, savedSearchQuery]);

  const loadedEvaluation = useMemo(() => {
    if (!loadedEvaluationId) return null;
    return evaluations.find(e => e.id === loadedEvaluationId) || null;
  }, [evaluations, loadedEvaluationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTraining) {
      setErrorMessage('Por favor, selecciona una acción formativa válida.');
      return;
    }

    if (!employeeName.trim()) {
      setErrorMessage('Por favor, indica el nombre del asistente/alumno.');
      return;
    }

    // Validate that the attendee has rated all questions in Block 1 and Block 2
    const unratedTraining = Object.values(attendeeTraining).some(val => val === 0);
    const unratedEffectiveness = Object.values(attendeeEffectiveness).some(val => val === 0);
    if (unratedTraining || unratedEffectiveness) {
      setErrorMessage('Por favor, completa todas las valoraciones (del 1 al 5) del Bloque 1 y Bloque 2.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const evaluationPayload: Omit<Evaluation, 'id'> = {
        trainingActionId: currentTraining.id,
        trainingCode: currentTraining.code,
        trainingTitle: currentTraining.title,
        trainingDate: trainingDate,
        durationHours: durationHours,
        trainingNeedDescription: trainingNeedDescription,
        responsibleName: responsibleName,
        employeeName: employeeName.trim(),
        employeeEmail: employeeEmail.trim() || `${employeeName.toLowerCase().replace(/\s+/g, '.')}@codiagro.com`,
        department: department,
        submissionDate: new Date().toISOString().split('T')[0],
        submissionSource: capturedImageBase64 ? (isCameraActive ? 'camera_capture' : 'scanned_paper') : 'online_form',
        ratings: {
          attendeeTraining,
          attendeeEffectiveness,
          companyEvaluation,
          meanTraining,
          meanEffectiveness,
          meanCompany,
          weightedScore,
          gradeCategory,
          overallSatisfaction: attendeeTraining.overallSatisfaction,
          contentClarity: attendeeTraining.respondedToSyllabus,
          contentUtility: attendeeTraining.coveredInitialObjectives,
          jobApplicability: attendeeEffectiveness.practicalUtility,
        },
        qualitative: qualitative,
        effectivenessFollowupNeeded: true,
        scannedImagePreview: capturedImageBase64 || undefined,
        rawExtractedNotes: aiAnalysisNotes || undefined,
        confidenceScore: analysisConfidence || 1.0,
      };

      await onEvaluationSubmitted(evaluationPayload, loadedEvaluationId || undefined);

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      setSubmitSuccess(true);
    } catch (err: any) {
      console.error('Error submitting evaluation:', err);
      setErrorMessage('No se pudo guardar la evaluación. Verifica la conexión a Firebase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Modern Rating Star/Button Picker Component
  const RatingPicker: React.FC<{
    label: string;
    value: number;
    onChange: (val: number) => void;
    idPrefix: string;
  }> = ({ label, value, onChange, idPrefix }) => {
    return (
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-colors gap-3 ${
        value > 0
          ? 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
          : 'bg-slate-900/60 border-slate-800 hover:border-emerald-500/30'
      }`}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-200">{label}</span>
          {value === 0 && (
            <span className="text-[10px] font-bold text-slate-500 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
              Sin marcar
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {[1, 2, 3, 4, 5].map((num) => {
            const isSelected = value === num;
            return (
              <button
                key={num}
                type="button"
                id={`${idPrefix}-btn-${num}`}
                onClick={() => onChange(num)}
                className={`w-9 h-9 rounded-lg font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 scale-105 ring-2 ring-emerald-400 font-extrabold'
                    : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }`}
                title={`Puntuar ${num}`}
              >
                {num}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  if (submitSuccess) {
    return (
      <div id="evaluation-success-container" className="max-w-3xl mx-auto p-8 bg-slate-900/90 border border-slate-800 rounded-2xl text-center backdrop-blur-xl shadow-2xl animate-fade-in my-8">
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6 text-emerald-400">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">¡Cuestionario Registrado con Éxito!</h2>
        <p className="text-slate-400 text-sm mb-6 max-w-lg mx-auto">
          Tu evaluación para el curso <strong className="text-slate-200">{currentTraining?.title}</strong> ha quedado registrada en el Sistema de Calidad ISO 9001:2015 (<span className="text-emerald-400 font-semibold">{settings.documentCode || 'RE0180104'} Ed. {settings.documentEdition || '07'}</span>).
        </p>

        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 mb-8 max-w-md mx-auto flex items-center justify-around text-center">
          <div>
            <div className="text-xs text-slate-400 uppercase font-medium tracking-wider mb-1">
              {isAttendeeView ? 'Media Ponderada Alumno' : 'Nota Ponderada'}
            </div>
            <div className="text-2xl font-black text-emerald-400">
              {isAttendeeView ? workerWeightedScore : weightedScore} <span className="text-xs font-normal text-slate-400">/ 5.0</span>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div>
            <div className="text-xs text-slate-400 uppercase font-medium tracking-wider mb-1">Dictamen ISO</div>
            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
              gradeCategory === 'MUY SATISFACTORIO' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
              gradeCategory === 'NORMAL' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
              'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}>
              {gradeCategory}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            id="btn-download-pdf-success"
            onClick={() => {
              if (currentTraining) {
                generateEvaluationPdf(currentTraining, settings, {
                  employeeName,
                  employeeEmail,
                  department,
                  trainingDate,
                  trainerName: responsibleName,
                  attendeeTraining,
                  attendeeEffectiveness,
                  companyEvaluation,
                  qualitative,
                  meanTraining,
                  meanEffectiveness,
                  meanCompany,
                  weightedScore: meanCompany > 0 ? weightedScore : (isAttendeeView ? workerWeightedScore : weightedScore),
                  gradeCategory
                });
              }
            }}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Descargar Justificante Cumplimentado (PDF)
          </button>

          {!isAttendeeView && (
            <>
              <button
                type="button"
                id="btn-new-evaluation"
                onClick={resetAllFormFields}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm rounded-xl transition-all border border-slate-700 flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Rellenar otra evaluación
              </button>
            </>
          )}
        </div>

        {isAttendeeView && (
          <p className="text-xs text-slate-500 mt-6">
            Ya puedes cerrar esta pestaña del navegador. ¡Muchas gracias por tu colaboración!
          </p>
        )}
      </div>
    );
  }

  return (
    <div id="evaluation-form-wrapper" className="max-w-5xl mx-auto space-y-6 pb-12">
      
      {/* Top Banner with Official Document Info & Quick Actions */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="mb-3">
              <CodiagroLogo className="h-9 w-auto" />
            </div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-mono font-bold tracking-wider">
                {settings.documentCode || 'RE0180104'} · EDICIÓN {settings.documentEdition || '07'}
              </span>
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                ISO 9001:2015 (Cláusula 7.2)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {isAttendeeView ? 'Cuestionario de Evaluación de la Formación' : 'Evaluación de Formación y Eficacia'}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {isAttendeeView 
                ? 'Por favor, cumplimenta tu valoración sobre el curso recibido. Las respuestas se registran de forma oficial en el Sistema de Gestión de Calidad.'
                : 'Formulario oficial homologado de Codiagro para evaluación del asistente, valoración por la empresa y cálculo ponderado de eficacia.'
              }
            </p>
          </div>

          {/* Quick Actions & Navigation buttons (Admin / RRHH mode) */}
          {!isAttendeeView && (
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                id="btn-download-pdf-header"
                onClick={() => generateEvaluationPdf(currentTraining, settings)}
                className="px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-all flex items-center gap-2 shadow-sm"
                title="Descargar versión en PDF lista para imprimir o rellenar a mano"
              >
                <FileText className="w-4 h-4 text-emerald-400" />
                Descargar PDF Plantilla
              </button>

              <button
                type="button"
                id="btn-download-word-header"
                onClick={() => generateEvaluationDocx(currentTraining, settings)}
                className="px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-all flex items-center gap-2 shadow-sm"
                title="Descargar versión en Microsoft Word (.docx) editable"
              >
                <FileText className="w-4 h-4 text-blue-400" />
                Descargar Word (.docx)
              </button>
            </div>
          )}
        </div>

        {/* RRHH Mode Special Contextual Banner */}
        {!isAttendeeView && isRrhhMode && (
          <div className="mt-5 p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shrink-0">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-emerald-300 uppercase tracking-wider">
                    Modo Valoración de Empresa (RR.HH. / Mando)
                  </span>
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-200 rounded font-mono font-bold">
                    Ponderación 40%
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Completando la valoración de eficacia en el puesto para el participante <strong>{employeeName || 'Alumno'}</strong> en <strong>{currentTraining?.code} · {currentTraining?.title}</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Input Mode Selector Bar (Only for Admin Mode) */}
        {!isAttendeeView && (
          <div className="mt-6 pt-5 border-t border-slate-800 flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="mode-tab-online"
              onClick={() => setEntryMode('online')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                entryMode === 'online'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-4 h-4" />
              Cuestionario Online Interactivo
            </button>

            <button
              type="button"
              id="mode-tab-saved"
              onClick={() => {
                setEntryMode('saved');
                stopCamera();
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 relative ${
                entryMode === 'saved'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              <span>Cargar Cuestionario Guardado</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                entryMode === 'saved' 
                  ? 'bg-slate-950 text-emerald-400' 
                  : 'bg-slate-700 text-slate-200'
              }`}>
                {evaluations.length}
              </span>
              {evaluationsPendingRrhh.length > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" title={`${evaluationsPendingRrhh.length} pendientes de RR.HH.`} />
              )}
            </button>

            <button
              type="button"
              id="mode-tab-upload"
              onClick={() => {
                setEntryMode('upload');
                stopCamera();
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                entryMode === 'upload'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Upload className="w-4 h-4" />
              Digitalizar Foto / Escaneo con IA (Gemini OCR)
            </button>

            <button
              type="button"
              id="mode-tab-camera"
              onClick={() => {
                setEntryMode('camera');
                startCamera();
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                entryMode === 'camera'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Camera className="w-4 h-4" />
              Escanear Hoja Física con Cámara
            </button>
          </div>
        )}
      </div>

      {/* ERROR MESSAGE IF ANY */}
      {errorMessage && (
        <div id="evaluation-error-banner" className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-3 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="ml-auto text-rose-400 hover:text-rose-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SAVED QUESTIONNAIRES BROWSER VIEW */}
      {entryMode === 'saved' && (
        <div id="saved-questionnaires-browser" className="bg-slate-900/95 border-2 border-slate-700 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 mb-2">
                <FolderOpen className="w-3.5 h-3.5" />
                Explorador de Cuestionarios Guardados
              </div>
              <h3 className="text-xl font-black text-white tracking-tight">
                Cargar Cuestionario para Revisión o Evaluación de RR.HH.
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Selecciona cualquier cuestionario registrado en el sistema para cargarlo directamente en el formulario. Puedes completar la evaluación de RR.HH. / Mando Directo o ajustar respuestas existentes.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                resetAllFormFields();
                setEntryMode('online');
              }}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-2 shrink-0 transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-emerald-400" />
              Nuevo Cuestionario en Blanco
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setSavedFilterStatus('all')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                savedFilterStatus === 'all'
                  ? 'bg-slate-800 border-emerald-500/50 ring-1 ring-emerald-500/30'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className="text-xs text-slate-400 block font-medium">Todos los Cuestionarios</span>
              <span className="text-xl font-black text-white">{evaluations.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setSavedFilterStatus('pending_rrhh')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                savedFilterStatus === 'pending_rrhh'
                  ? 'bg-amber-950/40 border-amber-500/60 ring-1 ring-amber-500/40'
                  : 'bg-slate-950/60 border-slate-800 hover:border-amber-500/30'
              }`}
            >
              <span className="text-xs text-amber-300 block font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Pendientes de RR.HH. / Mando
              </span>
              <span className="text-xl font-black text-amber-400">{evaluationsPendingRrhh.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setSavedFilterStatus('completed')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                savedFilterStatus === 'completed'
                  ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/40'
                  : 'bg-slate-950/60 border-slate-800 hover:border-emerald-500/30'
              }`}
            >
              <span className="text-xs text-emerald-300 block font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Completados 100% ISO 9001
              </span>
              <span className="text-xl font-black text-emerald-400">{evaluationsCompleted.length}</span>
            </button>
          </div>

          {/* Search & Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div className="md:col-span-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={savedSearchQuery}
                onChange={(e) => setSavedSearchQuery(e.target.value)}
                placeholder="Buscar por nombre de alumno, email, departamento o código de curso..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
              {savedSearchQuery && (
                <button
                  type="button"
                  onClick={() => setSavedSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 text-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div>
              <select
                value={savedFilterCourse}
                onChange={(e) => setSavedFilterCourse(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">Todos los Cursos ({trainings.length})</option>
                {trainings.map(t => (
                  <option key={t.id} value={t.id}>[{t.code}] {t.title}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Evaluations List */}
          <div className="space-y-3.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredSavedEvaluations.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
                <FileSearch className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm font-bold text-slate-400">No se encontraron cuestionarios que coincidan con la búsqueda</p>
                <p className="text-xs text-slate-500">Prueba a cambiar el estado del filtro o limpiar la barra de búsqueda.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSavedSearchQuery('');
                    setSavedFilterStatus('all');
                    setSavedFilterCourse('all');
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg"
                >
                  Restablecer filtros
                </button>
              </div>
            ) : (
              filteredSavedEvaluations.map((item) => {
                const itemMeanTraining = item.ratings?.meanTraining || 0;
                const itemMeanEffectiveness = item.ratings?.meanEffectiveness || 0;
                const itemMeanCompany = item.ratings?.meanCompany || item.ratings?.companyEvaluation?.capacityImprovement || 0;
                const isItemPendingRrhh = !item.ratings?.companyEvaluation?.capacityImprovement || itemMeanCompany === 0;
                const itemScore = item.ratings?.weightedScore || item.ratings?.overallSatisfaction || 0;
                const itemCategory = item.ratings?.gradeCategory || 'NORMAL';
                const isCurrentlyLoaded = loadedEvaluationId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`p-4 sm:p-5 rounded-xl border transition-all ${
                      isCurrentlyLoaded
                        ? 'bg-emerald-950/40 border-emerald-500/60 ring-2 ring-emerald-500/30'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      
                      {/* Left details */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-white text-sm sm:text-base tracking-tight truncate">
                            {item.employeeName || 'Alumno Anónimo'}
                          </span>
                          <span className="text-xs text-slate-400 font-normal">
                            ({item.employeeEmail || 'Sin email'})
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                            {item.department || 'Producción'}
                          </span>
                          {isItemPendingRrhh ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              <Clock className="w-3 h-3" /> Pendiente RR.HH. / Mando
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              <CheckCircle2 className="w-3 h-3" /> Completo 100% ISO
                            </span>
                          )}
                          {isCurrentlyLoaded && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500 text-slate-950">
                              Cargado actualmente
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-300 flex items-center gap-2 flex-wrap">
                          <strong className="text-emerald-400">[{item.trainingCode}]</strong>
                          <span className="font-semibold">{item.trainingTitle}</span>
                          <span className="text-slate-500">·</span>
                          <span className="text-slate-400">Fecha curso: {item.trainingDate}</span>
                          <span className="text-slate-500">·</span>
                          <span className="text-slate-400">Registro: {item.submissionDate}</span>
                        </div>

                        {/* Breakdown pills */}
                        <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                          <div className="bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                            <span className="text-slate-400 text-[11px]">Formación: </span>
                            <span className="font-bold text-slate-200">★ {itemMeanTraining > 0 ? itemMeanTraining.toFixed(2) : '-'}</span>
                          </div>
                          <div className="bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                            <span className="text-slate-400 text-[11px]">Eficacia Alumno: </span>
                            <span className="font-bold text-slate-200">★ {itemMeanEffectiveness > 0 ? itemMeanEffectiveness.toFixed(2) : '-'}</span>
                          </div>
                          <div className={`px-2.5 py-1 rounded-lg border ${
                            isItemPendingRrhh 
                              ? 'bg-amber-950/40 border-amber-500/30 text-amber-300 font-semibold' 
                              : 'bg-slate-900 border-slate-800 text-slate-200 font-bold'
                          }`}>
                            <span className="text-slate-400 text-[11px]">Valoración Empresa: </span>
                            <span>{itemMeanCompany > 0 ? `★ ${itemMeanCompany.toFixed(2)}` : '⚠️ Sin evaluar'}</span>
                          </div>
                          <div className="bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 font-bold">
                            <span className="text-slate-400 text-[11px]">Ponderación Final: </span>
                            <span className="text-emerald-400">{itemScore > 0 ? itemScore.toFixed(2) : '-'} / 5</span>
                            <span className="text-slate-400 text-[10px] ml-1">({itemCategory})</span>
                          </div>
                        </div>
                      </div>

                      {/* Right action buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                        <button
                          type="button"
                          id={`btn-load-eval-${item.id}`}
                          onClick={() => handleLoadSavedEvaluation(item)}
                          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-md ${
                            isItemPendingRrhh
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                          }`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          {isItemPendingRrhh ? 'Evaluar como RR.HH.' : 'Cargar en Formulario'}
                        </button>

                        <button
                          type="button"
                          onClick={() => generateEvaluationPdf(item, settings)}
                          className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors"
                          title="Descargar PDF Oficial RE0180104"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* CAMERA SCANNING VIEW */}
      {entryMode === 'camera' && (
        <div id="camera-scanner-view" className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white">Captura en vivo de formulario manuscrito</h3>
            </div>
            <button
              type="button"
              onClick={stopCamera}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Cerrar cámara
            </button>
          </div>

          <div className="relative aspect-video max-w-2xl mx-auto bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
            {isCameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-6 text-slate-500">
                <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Iniciando sensor de cámara...</p>
              </div>
            )}
          </div>

          <div className="mt-5 flex justify-center gap-4">
            <button
              type="button"
              id="btn-capture-photo"
              onClick={capturePhoto}
              disabled={!isCameraActive || isAnalyzingImage}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {isAnalyzingImage ? 'Analizando con Gemini...' : 'Tomar Foto y Extraer Datos'}
            </button>
          </div>
        </div>
      )}

      {/* UPLOAD / OCR SCANNING VIEW */}
      {entryMode === 'upload' && (
        <div id="upload-scanner-view" className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl text-center">
          <div className="max-w-md mx-auto">
            <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-400">
              <Sparkles className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Digitalización con Inteligencia Artificial</h3>
            <p className="text-slate-400 text-xs mb-6">
              Sube una foto o escaneo de la hoja <strong className="text-slate-300">RE0180104 Ed. 07</strong> rellenada a mano. Gemini transcribirá notas, notas ponderadas y comentarios al instante.
            </p>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload-input"
            />

            <button
              type="button"
              id="btn-trigger-upload"
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzingImage}
              className="w-full py-8 border-2 border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-950/50 hover:bg-slate-950 rounded-2xl transition-all flex flex-col items-center justify-center gap-3 cursor-pointer group"
            >
              {isAnalyzingImage ? (
                <>
                  <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                  <span className="text-sm font-bold text-emerald-400">Analizando documento con Gemini AI...</span>
                  <span className="text-xs text-slate-500">Transcribiendo calificaciones, medias y texto manuscrito</span>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <span className="text-sm font-semibold text-slate-200 group-hover:text-white">
                    Haz clic para seleccionar imagen o arrastra el archivo aquí
                  </span>
                  <span className="text-xs text-slate-500">Admite JPG, PNG o capturas de móvil</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* AI Extraction Banner if OCR was performed */}
      {analysisConfidence && (
        <div id="ocr-results-badge" className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-300 text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Formulario digitalizado por IA con {Math.round(analysisConfidence * 100)}% de confianza:</strong> Revisa y ajusta los valores abajo antes de confirmar.
            </span>
          </div>
          {aiAnalysisNotes && (
            <span className="text-slate-400 text-[11px] italic bg-slate-950/60 px-2.5 py-1 rounded border border-slate-800">
              {aiAnalysisNotes.substring(0, 70)}...
            </span>
          )}
        </div>
      )}

      {/* ACTIVE LOADED EVALUATION BANNER */}
      {loadedEvaluationId && (
        <div id="loaded-evaluation-active-banner" className="bg-emerald-950/60 border-2 border-emerald-500/50 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shrink-0">
              <FileCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  📂 Cuestionario Cargado para Edición
                </span>
                {meanCompany === 0 || !companyEvaluation.capacityImprovement ? (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Falta Evaluación RR.HH. / Mando
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Cuestionario 100% Completo (★ {weightedScore}/5)
                  </span>
                )}
              </div>
              <h3 className="text-base font-black text-white mt-1">
                {employeeName || 'Participante'} <span className="text-slate-400 font-normal">({department})</span>
              </h3>
              <p className="text-xs text-slate-300">
                Curso: <strong className="text-white">[{currentTraining?.code}] {currentTraining?.title}</strong> · Fecha: {trainingDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch md:self-auto shrink-0 flex-wrap">
            <button
              type="button"
              id="btn-switch-loaded-eval"
              onClick={() => setEntryMode('saved')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
              Cambiar Cuestionario
            </button>
            <button
              type="button"
              id="btn-clear-loaded-eval"
              onClick={resetAllFormFields}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded-xl text-xs border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Crear Nuevo en Blanco
            </button>
          </div>
        </div>
      )}

      {/* MAIN FORM: INTERACTIVE ISO QUESTIONNAIRE */}
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* SECTION 0: COURSE AND PARTICIPANT HEADER BLOCK */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white">Datos de la Acción Formativa y Participante</h2>
            </div>
            <div className="flex items-center gap-2">
              {!isAttendeeView && (
                <button
                  type="button"
                  id="btn-quick-load-saved"
                  onClick={() => setEntryMode('saved')}
                  className="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
                  Cargar Guardado ({evaluations.length})
                </button>
              )}
              <span className="text-xs text-slate-400 font-mono">CODIAGRO S.A.</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Select Course */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Acción Formativa (Curso) <span className="text-emerald-400">*</span>
              </label>
              <select
                id="select-training-id"
                value={selectedTrainingId}
                onChange={(e) => setSelectedTrainingId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                required
              >
                {trainings.map((t) => (
                  <option key={t.id} value={t.id}>
                    [{t.code}] {t.title} ({t.modality || 'Presencial'}) - {t.durationHours}h
                  </option>
                ))}
              </select>
            </div>

            {/* Training Date */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Fecha del Curso
              </label>
              <input
                type="date"
                id="input-training-date"
                value={trainingDate}
                onChange={(e) => setTrainingDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Need Description */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Descripción de la necesidad formativa
              </label>
              <input
                type="text"
                id="input-training-need"
                value={trainingNeedDescription}
                onChange={(e) => setTrainingNeedDescription(e.target.value)}
                placeholder="Ej. NOVEDADES DEL ADR 2025, Requisitos legales ISO 9001..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Responsible / Describe */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Describe (Responsable / Formador)
              </label>
              <input
                type="text"
                id="input-responsible-name"
                value={responsibleName}
                onChange={(e) => setResponsibleName(e.target.value)}
                placeholder="Ej. IVÁN SUESTA / Formador"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Training Center / Centro de Formación */}
            <div className="md:col-span-2 lg:col-span-3">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Centro de Formación / Proveedor
                </label>
                <span className="text-[10px] text-emerald-400">
                  {trainingCenter ? `Centro: ${trainingCenter}` : 'Selecciona o escribe el centro'}
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  list="eval-training-centers-list"
                  value={trainingCenter}
                  onChange={(e) => setTrainingCenter(e.target.value)}
                  placeholder="Ej. Bureau Veritas, SGS Academy, Codiagro Formación Interna..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 font-semibold"
                />
                <datalist id="eval-training-centers-list">
                  {(settings.trainingCenters || []).map((tc) => (
                    <option key={tc} value={tc} />
                  ))}
                </datalist>
                {settings.trainingCenters && settings.trainingCenters.length > 0 && (
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) setTrainingCenter(e.target.value);
                    }}
                    className="bg-slate-800 border border-slate-700 text-xs text-emerald-400 font-semibold rounded-xl px-3 py-2.5 focus:outline-hidden"
                  >
                    <option value="">Centros registrados ▾</option>
                    {settings.trainingCenters.map((tc) => (
                      <option key={tc} value={tc}>{tc}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Dropdown to pick from registered employees / course attendees */}
            <div className="md:col-span-2 lg:col-span-3 p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-xs font-bold text-slate-300 shrink-0 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
                Alumnos dados de alta:
              </span>
              <select
                onChange={(e) => handleSelectRegisteredEmployee(e.target.value)}
                value=""
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-medium"
              >
                <option value="">-- Seleccionar alumno de la plantilla registrada para auto-completar --</option>
                {currentTraining?.attendees && currentTraining.attendees.length > 0 && (
                  <optgroup label={`Convocados a este curso (${currentTraining.attendees.length})`}>
                    {currentTraining.attendees.map((att) => (
                      <option key={`att-${att.id}`} value={att.id}>
                        ★ {att.name} ({att.department || currentTraining.department}) - {att.email}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label={`Toda la plantilla (${settings.employees?.length || 0})`}>
                  {(settings.employees || []).map((emp) => (
                    <option key={`emp-${emp.id}`} value={emp.id}>
                      {emp.name} ({emp.department}) - {emp.email}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Employee Name (Asistente) with auto-complete */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Asistente (Nombre del Alumno) <span className="text-emerald-400">*</span>
                </label>
                <span className="text-[10px] text-emerald-400">Auto-completa mail</span>
              </div>
              <input
                type="text"
                id="input-employee-name"
                list="eval-registered-employees-names"
                value={employeeName}
                onChange={(e) => handleEmployeeNameChange(e.target.value)}
                placeholder="Ej. RAUL AMELA"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              />
              <datalist id="eval-registered-employees-names">
                {(settings.employees || []).map((emp) => (
                  <option key={`eval-name-${emp.id}`} value={emp.name}>
                    {emp.department} - {emp.email}
                  </option>
                ))}
              </datalist>
            </div>

            {/* Employee Email with auto-complete */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Email del Asistente
                </label>
                <span className="text-[10px] text-emerald-400">Auto-completa nombre</span>
              </div>
              <input
                type="email"
                id="input-employee-email"
                list="eval-registered-employees-emails"
                value={employeeEmail}
                onChange={(e) => handleEmployeeEmailChange(e.target.value)}
                placeholder="alumno@codiagro.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-xs"
              />
              <datalist id="eval-registered-employees-emails">
                {(settings.employees || []).map((emp) => (
                  <option key={`eval-email-${emp.id}`} value={emp.email}>
                    {emp.name} ({emp.department})
                  </option>
                ))}
              </datalist>
            </div>

            {/* Department */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Departamento
              </label>
              <select
                id="select-department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                {settings.departments.map((dep) => (
                  <option key={dep} value={dep}>{dep}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* SCALE REFERENCE PILL */}
        <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
          <span className="font-bold text-slate-300">INDICADORES DE VALORACIÓN:</span>
          <div className="flex flex-wrap items-center gap-3 font-medium text-slate-400">
            <span><strong className="text-slate-200">1.-</strong> Nada</span>
            <span>·</span>
            <span><strong className="text-slate-200">2.-</strong> Regular</span>
            <span>·</span>
            <span><strong className="text-slate-200">3.-</strong> Bien</span>
            <span>·</span>
            <span><strong className="text-slate-200">4.-</strong> Muy bien</span>
            <span>·</span>
            <span><strong className="text-emerald-400">5.-</strong> Excelente</span>
          </div>
        </div>

        {/* BLOCK 1: EVALUACIÓN DEL ASISTENTE - FORMACIÓN */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Bloque 1</span>
              <h3 className="text-base font-bold text-white">EVALUACIÓN DEL ASISTENTE: FORMACIÓN</h3>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block font-medium">Media Formación</span>
              <span className="text-lg font-black text-emerald-400">
                {meanTraining > 0 ? meanTraining.toFixed(2) : '-'} <span className="text-xs font-normal text-slate-500">/ 5</span>
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <RatingPicker
              label="1. El curso ha respondido al temario inicial"
              value={attendeeTraining.respondedToSyllabus}
              onChange={(val) => setAttendeeTraining({ ...attendeeTraining, respondedToSyllabus: val })}
              idPrefix="train-q1"
            />
            <RatingPicker
              label="2. El curso ha cubierto los objetivos iniciales"
              value={attendeeTraining.coveredInitialObjectives}
              onChange={(val) => setAttendeeTraining({ ...attendeeTraining, coveredInitialObjectives: val })}
              idPrefix="train-q2"
            />
            <RatingPicker
              label="3. Los recursos didácticos facilitados han sido adecuados"
              value={attendeeTraining.didacticResourcesAdequate}
              onChange={(val) => setAttendeeTraining({ ...attendeeTraining, didacticResourcesAdequate: val })}
              idPrefix="train-q3"
            />
            <RatingPicker
              label="4. El grado de satisfacción general con el curso"
              value={attendeeTraining.overallSatisfaction}
              onChange={(val) => setAttendeeTraining({ ...attendeeTraining, overallSatisfaction: val })}
              idPrefix="train-q4"
            />
          </div>
        </div>

        {/* BLOCK 2: EVALUACIÓN DEL ASISTENTE - EFICACIA */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Bloque 2</span>
              <h3 className="text-base font-bold text-white">EVALUACIÓN DEL ASISTENTE: EFICACIA Y APRENDIZAJE</h3>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block font-medium">Media Eficacia</span>
              <span className="text-lg font-black text-emerald-400">
                {meanEffectiveness > 0 ? meanEffectiveness.toFixed(2) : '-'} <span className="text-xs font-normal text-slate-500">/ 5</span>
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <RatingPicker
              label="1. El curso ha supuesto la adquisición de nuevos conocimientos"
              value={attendeeEffectiveness.knowledgeAcquisition}
              onChange={(val) => setAttendeeEffectiveness({ ...attendeeEffectiveness, knowledgeAcquisition: val })}
              idPrefix="eff-q1"
            />
            <RatingPicker
              label="2. Antes del curso, mi nivel de conocimientos era..."
              value={attendeeEffectiveness.knowledgeLevelBefore}
              onChange={(val) => setAttendeeEffectiveness({ ...attendeeEffectiveness, knowledgeLevelBefore: val })}
              idPrefix="eff-q2"
            />
            <RatingPicker
              label="3. Después del curso, mi nivel de conocimientos es..."
              value={attendeeEffectiveness.knowledgeLevelAfter}
              onChange={(val) => setAttendeeEffectiveness({ ...attendeeEffectiveness, knowledgeLevelAfter: val })}
              idPrefix="eff-q3"
            />
            <RatingPicker
              label="4. El curso me es útil a la práctica"
              value={attendeeEffectiveness.practicalUtility}
              onChange={(val) => setAttendeeEffectiveness({ ...attendeeEffectiveness, practicalUtility: val })}
              idPrefix="eff-q4"
            />
          </div>

          {/* Campo de Observaciones / Comentarios del Trabajador */}
          <div className="pt-3 border-t border-slate-800/80">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Observaciones / Comentarios del Trabajador (Sugerencias, aspectos prácticos, mejoras)</span>
              <span className="text-[10px] text-slate-500 font-normal lowercase">(opcional)</span>
            </label>
            <textarea
              id="attendee-observations-textarea"
              rows={5}
              value={attendeeEffectiveness.attendeeObservations || ''}
              onChange={(e) => setAttendeeEffectiveness({ ...attendeeEffectiveness, attendeeObservations: e.target.value })}
              placeholder="Escribe aquí cualquier sugerencia, aclaración, aspectos a destacar, mejoras o comentarios sobre la formación y su aplicación práctica en tu puesto..."
              className="w-full min-h-[110px] bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-y leading-relaxed"
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECCIÓN 2: ESPACIO RESERVADO PARA EL DEPARTAMENTO DE RRHH Y MANDO DIRECTO */}
        {/* (OCULTO EN MODO ALUMNO PARA QUE SÓLO RELLENE LOS BLOQUES 1 Y 2)           */}
        {/* ========================================================================= */}
        {!isAttendeeView && (
          <>
            {/* SEPARADOR CLARO: FIN DE LA EVALUACIÓN DEL TRABAJADOR */}
            <div className="my-14 relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t-2 border-dashed border-slate-700" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-slate-950 px-5 py-2 rounded-full border border-slate-700 text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-2 shadow-2xl">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  FIN DE LA EVALUACIÓN DEL TRABAJADOR
                  <span className="text-slate-600">|</span>
                  <span className="text-slate-400">SECCIÓN EXCLUSIVA DE RRHH</span>
                </span>
              </div>
            </div>

            <div className="bg-slate-900/95 border-2 border-slate-700 rounded-2xl p-6 sm:p-7 shadow-2xl space-y-6">
              
              {/* Header del Espacio Reservado */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 shrink-0 shadow-xs">
                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-slate-800 text-slate-200 border border-slate-700 mb-1.5 shadow-xs">
                      🔒 SECCIÓN 2: ESPACIO RESERVADO PARA RRHH Y MANDO DIRECTO
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                      EVALUACIÓN DE EFICACIA Y PONDERACIÓN POR LA EMPRESA
                    </h3>
                    <p className="text-xs sm:text-sm font-semibold text-slate-400 mt-0.5">
                      (A cumplimentar por RRHH / Mando Directo tras la impartición para la evaluación de la eficacia en el puesto · Cláusula 7.2 ISO 9001)
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 shadow-xs">
                  <span className="text-[11px] text-slate-400 block font-semibold">Media Empresa</span>
                  <span className="text-xl font-black text-emerald-400">
                    {meanCompany > 0 ? meanCompany.toFixed(2) : '-'} <span className="text-xs font-normal text-slate-500">/ 5</span>
                  </span>
                </div>
              </div>

              {/* BLOCK 3: EVALUACIÓN EMPRESA (Detalles y Comentarios) */}
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Valoración del Curso (Texto + Fecha) */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Valoración del Curso por la Empresa
                    </label>
                    <textarea
                      id="input-company-valuation"
                      rows={2}
                      value={companyEvaluation.trainingValuationComment}
                      onChange={(e) => setCompanyEvaluation({ ...companyEvaluation, trainingValuationComment: e.target.value })}
                      placeholder="Indicar aplicabilidad a la operativa y justificación de la formación..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Fecha Valoración
                    </label>
                    <input
                      type="date"
                      id="input-company-valuation-date"
                      value={companyEvaluation.trainingValuationDate}
                      onChange={(e) => setCompanyEvaluation({ ...companyEvaluation, trainingValuationDate: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Transmisión Conocimientos (Texto + Fecha) */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Transmisión de Conocimientos (Plan de réplica al equipo)
                    </label>
                    <input
                      type="text"
                      id="input-company-transfer"
                      value={companyEvaluation.knowledgeTransferComment}
                      onChange={(e) => setCompanyEvaluation({ ...companyEvaluation, knowledgeTransferComment: e.target.value })}
                      placeholder="Ej. NO ES NECESARIO / Sesión interna con operarios"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Fecha Transmisión
                    </label>
                    <input
                      type="date"
                      id="input-company-transfer-date"
                      value={companyEvaluation.knowledgeTransferDate}
                      onChange={(e) => setCompanyEvaluation({ ...companyEvaluation, knowledgeTransferDate: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                    Valoración de la Eficacia (Por la Empresa):
                  </h4>
                  <div className="space-y-3">
                    <RatingPicker
                      label="1. La mejoría de su capacitación en su actividad de trabajo"
                      value={companyEvaluation.capacityImprovement}
                      onChange={(val) => setCompanyEvaluation({ ...companyEvaluation, capacityImprovement: val })}
                      idPrefix="comp-q1"
                    />
                    <RatingPicker
                      label="2. La mejoría de su actitud frente al trabajo"
                      value={companyEvaluation.attitudeImprovement}
                      onChange={(val) => setCompanyEvaluation({ ...companyEvaluation, attitudeImprovement: val })}
                      idPrefix="comp-q2"
                    />
                    <RatingPicker
                      label="3. La adquisición de nuevas habilidades"
                      value={companyEvaluation.skillsAcquisition}
                      onChange={(val) => setCompanyEvaluation({ ...companyEvaluation, skillsAcquisition: val })}
                      idPrefix="comp-q3"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Comentarios y Observaciones (Empresa / Responsable RRHH):
                  </label>
                  <textarea
                    id="input-company-observations"
                    rows={2}
                    value={companyEvaluation.generalObservations || ''}
                    onChange={(e) => setCompanyEvaluation({ ...companyEvaluation, generalObservations: e.target.value })}
                    placeholder="Observaciones generales para el seguimiento de eficacia y auditoría ISO..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
                  />
                </div>
              </div>

              {/* BLOCK 4: TABLA DE PONDERACIÓN Y RESULTADO GLOBAL ISO */}
              <div className="pt-4 border-t border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-emerald-400" />
                    <h4 className="text-sm font-bold text-white">Ponderación y Resultado Global de Eficacia</h4>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">Fórmula Oficial RE0180104</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                  
                  {/* Table of Weights */}
                  <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-900 border-b border-slate-800 text-slate-300 font-bold uppercase tracking-wider">
                          <th className="py-2.5 px-3">Aspecto</th>
                          <th className="py-2.5 px-3 text-center">Valor (Media)</th>
                          <th className="py-2.5 px-3 text-center">Peso</th>
                          <th className="py-2.5 px-3 text-right">Puntuación</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        <tr>
                          <td className="py-2 px-3 font-medium text-slate-200">Evaluación Formación</td>
                          <td className="py-2 px-3 text-center font-mono">{meanTraining > 0 ? meanTraining.toFixed(2) : '-'}</td>
                          <td className="py-2 px-3 text-center font-mono text-slate-400">0,25</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                            {meanTraining > 0 ? (meanTraining * 0.25).toFixed(2) : '-'}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-medium text-slate-200">Evaluación Eficacia</td>
                          <td className="py-2 px-3 text-center font-mono">{meanEffectiveness > 0 ? meanEffectiveness.toFixed(2) : '-'}</td>
                          <td className="py-2 px-3 text-center font-mono text-slate-400">0,35</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                            {meanEffectiveness > 0 ? (meanEffectiveness * 0.35).toFixed(2) : '-'}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-medium text-slate-200">Valoración Empresa</td>
                          <td className="py-2 px-3 text-center font-mono">{meanCompany > 0 ? meanCompany.toFixed(2) : '-'}</td>
                          <td className="py-2 px-3 text-center font-mono text-slate-400">0,40</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                            {meanCompany > 0 ? (meanCompany * 0.40).toFixed(2) : '-'}
                          </td>
                        </tr>
                        <tr className="bg-slate-900 font-bold text-slate-100 border-t border-slate-700">
                          <td className="py-2.5 px-3 text-emerald-400">MEDIA PONDERADA</td>
                          <td className="py-2.5 px-3 text-center">-</td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-400">1,00</td>
                          <td className="py-2.5 px-3 text-right font-mono text-base text-emerald-400 font-black">
                            {weightedScore > 0 ? weightedScore.toFixed(2) : '-'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Qualification & Range Badge */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col items-center text-center justify-center space-y-3">
                    <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Calificación Final ISO 9001</div>
                    
                    <div className={`px-5 py-2 rounded-xl text-sm font-extrabold tracking-wide flex items-center gap-2 ${
                      gradeCategory === 'MUY SATISFACTORIO' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-emerald-500/10' :
                      gradeCategory === 'NORMAL' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                      gradeCategory === 'PENDIENTE' ? 'bg-slate-800/80 text-slate-400 border border-slate-700' :
                      'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}>
                      <CheckCircle2 className="w-4 h-4" />
                      {gradeCategory === 'PENDIENTE' ? 'Pendiente de rellenar' : `${gradeCategory} (${weightedScore} / 5.0)`}
                    </div>

                    <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800 w-full flex justify-around">
                      <span className={weightedScore > 0 && weightedScore < 2.5 ? 'text-rose-400 font-bold' : 'opacity-60'}>&lt; 2.50: Deficiente</span>
                      <span>·</span>
                      <span className={weightedScore >= 2.5 && weightedScore < 4.0 ? 'text-amber-400 font-bold' : 'opacity-60'}>2.50 - 3.99: Normal</span>
                      <span>·</span>
                      <span className={weightedScore >= 4.0 ? 'text-emerald-400 font-bold' : 'opacity-60'}>&gt;= 4.00: Muy Satisfactorio</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </>
        )}

        {/* SUBMIT BUTTON BAR */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {isAttendeeView 
                ? 'Tus respuestas se registrarán de forma oficial en el Sistema de Gestión de Calidad ISO 9001:2015 de CODIAGRO S.A.'
                : <>Al enviar se notificará al Administrador (<strong className="text-slate-300">{settings.adminEmail || 'codiagrooscar@gmail.com'}</strong>) vía Push y Email.</>
              }
            </span>
          </div>

          <button
            type="submit"
            id="btn-submit-evaluation-form"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Guardando respuestas...
              </>
            ) : (
              <>
                {loadedEvaluationId ? (
                  <>
                    <CheckCheck className="w-4 h-4" />
                    <span>Guardar Cambios en Cuestionario ({employeeName || 'Existente'})</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{isAttendeeView ? 'Enviar Cuestionario de Evaluación' : 'Guardar y Firmar Evaluación Oficial'}</span>
                  </>
                )}
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};
