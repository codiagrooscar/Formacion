import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  X, 
  Save, 
  RefreshCw, 
  Building, 
  Target, 
  DollarSign, 
  Users, 
  FileText, 
  Hash, 
  Mail, 
  Bell, 
  Layers, 
  Tag, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  SlidersHorizontal, 
  Image as ImageIcon, 
  Upload, 
  Send, 
  ShieldCheck, 
  AlertCircle, 
  Key,
  Clock,
  Check,
  CalendarCheck,
  GraduationCap,
  UserPlus,
  Edit2,
  Search,
  Filter
} from 'lucide-react';
import { CompanySettings, TrainingAction, Evaluation, Employee } from '../types';
import { INITIAL_EMPLOYEES, INITIAL_TRAINING_CENTERS } from '../data/initialData';
import { CodiagroLogo } from './CodiagroLogo';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CompanySettings;
  trainings?: TrainingAction[];
  evaluations?: Evaluation[];
  onSaveSettings: (settings: CompanySettings) => Promise<void>;
  onResetToDemo: () => Promise<void>;
  initialTab?: 'departments_categories' | 'students_employees' | 'training_centers' | 'documental' | 'email_smtp' | 'notifications';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  trainings = [],
  evaluations = [],
  onSaveSettings,
  onResetToDemo,
  initialTab = 'departments_categories',
}) => {
  const [activeTab, setActiveTab] = useState<'departments_categories' | 'students_employees' | 'training_centers' | 'documental' | 'email_smtp' | 'notifications'>(initialTab);
  
  const sanitizeSettings = (raw: CompanySettings): CompanySettings => ({
    ...raw,
    adminEmail: (raw.adminEmail === 'alma.trilles@codiagro.com' || raw.adminEmail === 'codiagrooscar@gmail.com' || !raw.adminEmail) ? 'formacioncodiagro@gmail.com' : raw.adminEmail,
    smtpUser: (raw.smtpUser === 'alma.trilles@codiagro.com' || raw.smtpUser === 'codiagrooscar@gmail.com' || !raw.smtpUser) ? 'formacioncodiagro@gmail.com' : raw.smtpUser,
    smtpHost: (raw.smtpHost === 'smtp.office365.com' || !raw.smtpHost) ? 'smtp.gmail.com' : raw.smtpHost,
    smtpPort: (raw.smtpPort === 587 || !raw.smtpPort) ? 465 : raw.smtpPort,
    smtpPass: (raw.smtpPass === '1Ujhg23n' || !raw.smtpPass) ? '' : raw.smtpPass,
    emailNotificationEnabled: raw.emailNotificationEnabled ?? true,
    pushNotificationEnabled: raw.pushNotificationEnabled ?? true,
    dailyPendingDigestEnabled: raw.dailyPendingDigestEnabled ?? true,
    dailyPendingDigestHour: raw.dailyPendingDigestHour ?? 8,
    documentCode: raw.documentCode || 'RE0180104',
    documentEdition: raw.documentEdition || '07',
    companyName: raw.companyName || 'CODIAGRO S.A.',
    categories: raw.categories && raw.categories.length > 0 ? raw.categories : [
      'Calidad e ISO',
      'Tecnología',
      'Prevención y Seguridad',
      'Habilidades y Liderazgo',
      'Operaciones',
      'Comercial y Marketing',
      'Idiomas'
    ],
    employees: raw.employees && raw.employees.length > 0 ? raw.employees : INITIAL_EMPLOYEES,
    trainingCenters: raw.trainingCenters && raw.trainingCenters.length > 0 ? raw.trainingCenters : INITIAL_TRAINING_CENTERS,
    logoUrl: raw.logoUrl || localStorage.getItem('codiagro_logo_url') || '/logo.png',
    authorizedAdminEmails: Array.from(new Set([
      'formacioncodiagro@gmail.com',
      'alma.trilles@codiagro.com',
      ...(raw.authorizedAdminEmails || []),
      'codiagrooscar@gmail.com'
    ])),
  });

  const [formData, setFormData] = useState<CompanySettings>(() => sanitizeSettings(settings));

  useEffect(() => {
    setFormData(sanitizeSettings(settings));
  }, [settings]);
  const [isSaving, setIsSaving] = useState(false);
  const [newDepartment, setNewDepartment] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newCompetency, setNewCompetency] = useState('');
  const [newAdminEmailInput, setNewAdminEmailInput] = useState('');
  const [logoUploadSuccess, setLogoUploadSuccess] = useState(false);

  // Student / Employee Management State
  const [studentSearch, setStudentSearch] = useState('');
  const [studentDeptFilter, setStudentDeptFilter] = useState('all');
  const [studentNameInput, setStudentNameInput] = useState('');
  const [studentEmailInput, setStudentEmailInput] = useState('');
  const [studentDeptInput, setStudentDeptInput] = useState(formData.departments[0] || 'Producción e Ingeniería Agronómica');
  const [studentJobTitleInput, setStudentJobTitleInput] = useState('');
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);

  // Training Center Management State
  const [newTrainingCenterInput, setNewTrainingCenterInput] = useState('');

  // Daily Digest test state
  const [isCheckingDigest, setIsCheckingDigest] = useState(false);
  const [digestResult, setDigestResult] = useState<{
    success: boolean;
    sent: boolean;
    count: number;
    message: string;
    recipient?: string;
  } | null>(null);

  // Email test state
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{
    success: boolean;
    message: string;
    needsPassword?: boolean;
    hint?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleTestEmail = async () => {
    try {
      setIsTestingEmail(true);
      setTestEmailResult(null);
      const res = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          targetEmail: formData.adminEmail || 'formacioncodiagro@gmail.com',
          smtpConfig: {
            host: formData.smtpHost || 'smtp.gmail.com',
            port: formData.smtpPort || 465,
            user: formData.smtpUser || formData.adminEmail || 'formacioncodiagro@gmail.com',
            pass: formData.smtpPass
          }
        }),
      });
      const data = await res.json();
      setTestEmailResult({
        success: Boolean(data.success),
        message: data.message || data.error || 'Resultado recibido.',
        needsPassword: Boolean(data.needsPassword),
        hint: data.hint,
      });
    } catch (err: any) {
      setTestEmailResult({
        success: false,
        message: `Error al conectar con el servidor: ${err.message}`,
      });
    } finally {
      setIsTestingEmail(false);
    }
  };

  const handleTriggerDailyDigest = async () => {
    try {
      setIsCheckingDigest(true);
      setDigestResult(null);
      const res = await fetch('/api/check-pending-evaluations-daily-digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainings: trainings || [],
          evaluations: evaluations || [],
          settings: formData,
          adminEmail: formData.adminEmail || 'codiagrooscar@gmail.com',
          smtpConfig: {
            host: formData.smtpHost || 'smtp.gmail.com',
            port: formData.smtpPort || 465,
            user: formData.smtpUser || formData.adminEmail || 'codiagrooscar@gmail.com',
            pass: formData.smtpPass || '',
          },
          forceCheck: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setDigestResult({
          success: true,
          sent: Boolean(data.sent),
          count: data.count || 0,
          recipient: data.recipient || formData.adminEmail || 'codiagrooscar@gmail.com',
          message: data.message || (data.sent 
            ? `Se ha enviado el correo con ${data.count} cuestionario(s) pendiente(s) a ${data.recipient || formData.adminEmail}.`
            : `No hay cuestionarios pendientes de rellenar (0 pendientes). Tal como está configurado, no se ha enviado ningún correo.`
          ),
        });
      } else {
        setDigestResult({
          success: false,
          sent: false,
          count: 0,
          message: data.error || 'Error al ejecutar la comprobación del resumen diario.',
        });
      }
    } catch (err: any) {
      setDigestResult({
        success: false,
        sent: false,
        count: 0,
        message: err.message || 'Error de conexión con el servidor.',
      });
    } finally {
      setIsCheckingDigest(false);
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setFormData((prev) => ({ ...prev, logoUrl: dataUrl }));
        try {
          localStorage.setItem('codiagro_logo_url', dataUrl);
          window.dispatchEvent(new Event('codiagro_logo_updated'));
        } catch {
          // ignore
        }
        setLogoUploadSuccess(true);
        setTimeout(() => setLogoUploadSuccess(false), 3000);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetLogo = () => {
    setFormData((prev) => ({ ...prev, logoUrl: '/logo.png' }));
    try {
      localStorage.removeItem('codiagro_logo_url');
      window.dispatchEvent(new Event('codiagro_logo_updated'));
    } catch {
      // ignore
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      if (formData.logoUrl) {
        localStorage.setItem('codiagro_logo_url', formData.logoUrl);
        window.dispatchEvent(new Event('codiagro_logo_updated'));
      }
      await onSaveSettings(formData);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddDept = () => {
    if (newDepartment.trim() && !formData.departments.includes(newDepartment.trim())) {
      setFormData({
        ...formData,
        departments: [...formData.departments, newDepartment.trim()]
      });
      setNewDepartment('');
    }
  };

  const handleRemoveDept = (deptToRemove: string) => {
    setFormData({
      ...formData,
      departments: formData.departments.filter(d => d !== deptToRemove)
    });
  };

  const handleAddCategory = () => {
    const currentCats = formData.categories || [];
    if (newCategory.trim() && !currentCats.includes(newCategory.trim())) {
      setFormData({
        ...formData,
        categories: [...currentCats, newCategory.trim()]
      });
      setNewCategory('');
    }
  };

  const handleRemoveCategory = (catToRemove: string) => {
    const currentCats = formData.categories || [];
    setFormData({
      ...formData,
      categories: currentCats.filter(c => c !== catToRemove)
    });
  };

  const handleAddCompetency = () => {
    if (newCompetency.trim() && !formData.competencyCatalog.includes(newCompetency.trim())) {
      setFormData({
        ...formData,
        competencyCatalog: [...formData.competencyCatalog, newCompetency.trim()]
      });
      setNewCompetency('');
    }
  };

  const handleRemoveCompetency = (compToRemove: string) => {
    setFormData({
      ...formData,
      competencyCatalog: formData.competencyCatalog.filter(c => c !== compToRemove)
    });
  };

  const handleAddAdminEmail = () => {
    const trimmed = newAdminEmailInput.trim().toLowerCase();
    if (trimmed && trimmed.includes('@')) {
      const currentList = formData.authorizedAdminEmails || ['codiagrooscar@gmail.com'];
      if (!currentList.some(e => e.toLowerCase() === trimmed)) {
        setFormData({
          ...formData,
          authorizedAdminEmails: [...currentList, trimmed]
        });
      }
      setNewAdminEmailInput('');
    }
  };

  const handleRemoveAdminEmail = (emailToRemove: string) => {
    const currentList = formData.authorizedAdminEmails || ['codiagrooscar@gmail.com'];
    if (currentList.length <= 1) {
      alert('Debe existir al menos un correo de administración autorizado.');
      return;
    }
    setFormData({
      ...formData,
      authorizedAdminEmails: currentList.filter(e => e.toLowerCase() !== emailToRemove.toLowerCase())
    });
  };

  // Student / Employee Handlers
  const handleAddOrUpdateStudent = () => {
    if (!studentNameInput.trim() || !studentEmailInput.trim()) {
      alert('Por favor indica el nombre y el correo electrónico del alumno.');
      return;
    }

    const currentEmployees = formData.employees || [];
    const department = studentDeptInput || formData.departments[0] || 'General';

    if (editingStudentId) {
      // Update existing
      const updated = currentEmployees.map(emp => {
        if (emp.id === editingStudentId) {
          return {
            ...emp,
            name: studentNameInput.trim(),
            email: studentEmailInput.trim().toLowerCase(),
            department,
            jobTitle: studentJobTitleInput.trim() || emp.jobTitle
          };
        }
        return emp;
      });
      setFormData({ ...formData, employees: updated });
      setEditingStudentId(null);
    } else {
      // Add new
      const newEmp: Employee = {
        id: `emp-${Date.now()}`,
        name: studentNameInput.trim(),
        email: studentEmailInput.trim().toLowerCase(),
        department,
        jobTitle: studentJobTitleInput.trim() || 'Empleado / Alumno'
      };
      setFormData({ ...formData, employees: [...currentEmployees, newEmp] });
    }

    // Reset inputs
    setStudentNameInput('');
    setStudentEmailInput('');
    setStudentJobTitleInput('');
  };

  const handleStartEditStudent = (student: Employee) => {
    setEditingStudentId(student.id);
    setStudentNameInput(student.name);
    setStudentEmailInput(student.email);
    setStudentDeptInput(student.department);
    setStudentJobTitleInput(student.jobTitle || '');
  };

  const handleCancelEditStudent = () => {
    setEditingStudentId(null);
    setStudentNameInput('');
    setStudentEmailInput('');
    setStudentJobTitleInput('');
  };

  const handleDeleteStudent = (studentId: string) => {
    const currentEmployees = formData.employees || [];
    setFormData({
      ...formData,
      employees: currentEmployees.filter(e => e.id !== studentId)
    });
    if (editingStudentId === studentId) {
      handleCancelEditStudent();
    }
  };

  const handleResetStudentsToDefault = () => {
    if (window.confirm('¿Deseas restablecer la plantilla de alumnos predeterminada de Codiagro?')) {
      setFormData({
        ...formData,
        employees: INITIAL_EMPLOYEES
      });
    }
  };

  // Training Center Handlers
  const handleAddTrainingCenter = () => {
    const trimmed = newTrainingCenterInput.trim();
    const currentCenters = formData.trainingCenters || [];
    if (trimmed && !currentCenters.includes(trimmed)) {
      setFormData({
        ...formData,
        trainingCenters: [...currentCenters, trimmed]
      });
      setNewTrainingCenterInput('');
    }
  };

  const handleRemoveTrainingCenter = (centerToRemove: string) => {
    const currentCenters = formData.trainingCenters || [];
    setFormData({
      ...formData,
      trainingCenters: currentCenters.filter(c => c !== centerToRemove)
    });
  };

  // Filtered students for display in UI
  const filteredStudents = (formData.employees || []).filter(student => {
    if (studentDeptFilter !== 'all' && student.department !== studentDeptFilter) {
      return false;
    }
    if (studentSearch.trim()) {
      const q = studentSearch.toLowerCase();
      const matchName = student.name.toLowerCase().includes(q);
      const matchEmail = student.email.toLowerCase().includes(q);
      const matchDept = (student.department || '').toLowerCase().includes(q);
      const matchJob = (student.jobTitle || '').toLowerCase().includes(q);
      return matchName || matchEmail || matchDept || matchJob;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-[#101C2E] rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-[#1A2B44] max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1A2B44] pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-[#00c282] border border-emerald-500/30 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white">
                Gestión y Configuración del Sistema
              </h3>
              <p className="text-xs text-slate-400">Departamentos, Categorías, Control ISO y Notificaciones</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#182840] hover:bg-[#203656] text-slate-400 hover:text-slate-200 border border-[#243a5e]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap gap-2 border-b border-[#1A2B44] pb-3 mb-5">
          <button
            type="button"
            onClick={() => setActiveTab('departments_categories')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'departments_categories'
                ? 'bg-[#00a86b] text-white shadow-sm'
                : 'bg-[#0A1220] text-slate-300 hover:bg-[#182840] border border-[#1A2B44]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Departamentos ({formData.departments.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('students_employees')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'students_employees'
                ? 'bg-[#00a86b] text-white shadow-sm'
                : 'bg-[#0A1220] text-emerald-300 hover:bg-[#182840] border border-emerald-500/30'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Alumnos / Plantilla ({formData.employees?.length || 0})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('training_centers')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'training_centers'
                ? 'bg-[#00a86b] text-white shadow-sm'
                : 'bg-[#0A1220] text-slate-300 hover:bg-[#182840] border border-[#1A2B44]'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            Centros de Formación ({formData.trainingCenters?.length || 0})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('documental')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'documental'
                ? 'bg-[#00a86b] text-white shadow-sm'
                : 'bg-[#0A1220] text-slate-300 hover:bg-[#182840] border border-[#1A2B44]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Control ISO & Metas
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('email_smtp')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'email_smtp'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm ring-2 ring-emerald-400/40'
                : 'bg-[#0A1220] text-emerald-300 hover:bg-[#182840] border border-emerald-500/30'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Servidor SMTP
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'notifications'
                ? 'bg-[#00a86b] text-white shadow-sm'
                : 'bg-[#0A1220] text-slate-300 hover:bg-[#182840] border border-[#1A2B44]'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            Avisos Admin
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6 text-xs sm:text-sm">

          {/* TAB 1: DEPARTAMENTOS, CATEGORÍAS & COMPETENCIAS */}
          {activeTab === 'departments_categories' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* 1. DEPARTAMENTOS */}
              <div className="bg-[#0A1220] p-4 sm:p-5 rounded-2xl border border-blue-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-300 font-bold text-xs">
                    <Building className="w-4 h-4 text-blue-400" />
                    <span>Departamentos de la Organización ({formData.departments.length})</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Usados en filtros, convocatorias y KPIs</span>
                </div>

                <div className="flex flex-wrap gap-2 py-1">
                  {formData.departments.map((dept) => (
                    <span 
                      key={dept} 
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs bg-[#182840] text-blue-200 border border-blue-500/30 shadow-xs"
                    >
                      <Building className="w-3 h-3 text-blue-400" />
                      {dept}
                      <button
                        type="button"
                        onClick={() => handleRemoveDept(dept)}
                        title={`Eliminar departamento ${dept}`}
                        className="text-slate-400 hover:text-rose-400 font-bold text-sm ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddDept();
                      }
                    }}
                    placeholder="Ej: Logística Internacional, I+D+i Biotecnología..."
                    className="flex-1 bg-[#101C2E] border border-[#1A2B44] rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddDept}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Añadir Departamento
                  </button>
                </div>
              </div>

              {/* 2. CATEGORÍAS DE ACCIONES FORMATIVAS */}
              <div className="bg-[#0A1220] p-4 sm:p-5 rounded-2xl border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#00c282] font-bold text-xs">
                    <Tag className="w-4 h-4 text-emerald-400" />
                    <span>Categorías de Acciones Formativas ({formData.categories?.length || 0})</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Usadas en altas de cursos y cuadro de mando</span>
                </div>

                <div className="flex flex-wrap gap-2 py-1">
                  {(formData.categories || []).map((cat) => (
                    <span 
                      key={cat} 
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-xs"
                    >
                      <Tag className="w-3 h-3 text-emerald-400" />
                      {cat}
                      <button
                        type="button"
                        onClick={() => handleRemoveCategory(cat)}
                        title={`Eliminar categoría ${cat}`}
                        className="text-emerald-400 hover:text-rose-400 font-bold text-sm ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCategory();
                      }
                    }}
                    placeholder="Ej: Sostenibilidad, Certificaciones Agrícolas, Logística..."
                    className="flex-1 bg-[#101C2E] border border-[#1A2B44] rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    className="px-4 py-2 bg-[#00a86b] hover:bg-[#00925d] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Añadir Categoría
                  </button>
                </div>
              </div>

              {/* 3. CATÁLOGO DE COMPETENCIAS */}
              <div className="bg-[#0A1220] p-4 sm:p-5 rounded-2xl border border-purple-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-purple-300 font-bold text-xs">
                    <Target className="w-4 h-4 text-purple-400" />
                    <span>Catálogo de Competencias ISO ({formData.competencyCatalog.length})</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Requerimiento Cláusula 7.2 Competencia</span>
                </div>

                <div className="flex flex-wrap gap-2 py-1 max-h-48 overflow-y-auto pr-1">
                  {formData.competencyCatalog.map((comp) => (
                    <span 
                      key={comp} 
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs bg-purple-500/15 text-purple-300 border border-purple-500/30 shadow-xs"
                    >
                      <Target className="w-3 h-3 text-purple-400" />
                      {comp}
                      <button
                        type="button"
                        onClick={() => handleRemoveCompetency(comp)}
                        title={`Eliminar competencia ${comp}`}
                        className="text-purple-400 hover:text-rose-400 font-bold text-sm ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={newCompetency}
                    onChange={(e) => setNewCompetency(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCompetency();
                      }
                    }}
                    placeholder="Ej: Manejo de Fitosanitarios, Auditoría ISO 14001..."
                    className="flex-1 bg-[#101C2E] border border-[#1A2B44] rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCompetency}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Añadir Competencia
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB: GESTIÓN DE ALUMNOS Y PLANTILLA */}
          {activeTab === 'students_employees' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Formulario de Alta / Edición de Alumno */}
              <div className="bg-[#0A1220] p-4 sm:p-5 rounded-2xl border border-emerald-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                    <UserPlus className="w-4 h-4 text-emerald-400" />
                    <span>{editingStudentId ? 'Modificar Datos de Alumno' : 'Dar de Alta Nuevo Alumno / Empleado'}</span>
                  </div>
                  {editingStudentId && (
                    <button
                      type="button"
                      onClick={handleCancelEditStudent}
                      className="text-xs text-rose-400 hover:underline"
                    >
                      Cancelar Edición
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      value={studentNameInput}
                      onChange={(e) => setStudentNameInput(e.target.value)}
                      placeholder="Ej: Carlos Gómez Ruiz"
                      className="w-full bg-[#101C2E] border border-[#1A2B44] rounded-xl px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Correo Electrónico *
                    </label>
                    <input
                      type="email"
                      value={studentEmailInput}
                      onChange={(e) => setStudentEmailInput(e.target.value)}
                      placeholder="Ej: cgomez@codiagro.com"
                      className="w-full bg-[#101C2E] border border-[#1A2B44] rounded-xl px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Departamento Asignado *
                    </label>
                    <select
                      value={studentDeptInput}
                      onChange={(e) => setStudentDeptInput(e.target.value)}
                      className="w-full bg-[#101C2E] border border-[#1A2B44] rounded-xl px-3 py-2 text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-xs"
                    >
                      {formData.departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Puesto / Cargo (Opcional)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={studentJobTitleInput}
                        onChange={(e) => setStudentJobTitleInput(e.target.value)}
                        placeholder="Ej: Técnico de Calidad"
                        className="w-full bg-[#101C2E] border border-[#1A2B44] rounded-xl px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleAddOrUpdateStudent}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                  >
                    {editingStudentId ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Guardar Cambios
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        Añadir Alumno a Plantilla
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Lista y Búsqueda de Alumnos */}
              <div className="bg-[#0A1220] p-4 sm:p-5 rounded-2xl border border-[#1A2B44] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-slate-200 font-bold text-xs">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Listado de Alumnos y Asignación de Departamentos ({filteredStudents.length} de {formData.employees?.length || 0})</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetStudentsToDefault}
                    className="text-xs text-slate-400 hover:text-emerald-300 transition underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Restablecer a plantilla base
                  </button>
                </div>

                {/* Filtros de búsqueda */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2 border-b border-[#1A2B44]">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Buscar por nombre, email o cargo..."
                      className="w-full bg-[#101C2E] border border-[#1A2B44] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-slate-500" />
                    <select
                      value={studentDeptFilter}
                      onChange={(e) => setStudentDeptFilter(e.target.value)}
                      className="w-full bg-[#101C2E] border border-[#1A2B44] rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="all">Todos los Departamentos</option>
                      {formData.departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Tabla / Lista de alumnos */}
                <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1">
                  {filteredStudents.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      No se encontraron alumnos con los criterios seleccionados.
                    </div>
                  ) : (
                    filteredStudents.map(student => {
                      const isEditingThis = editingStudentId === student.id;

                      if (isEditingThis) {
                        return (
                          <div 
                            key={student.id}
                            className="p-3.5 rounded-xl bg-[#14233a] border-2 border-emerald-500 shadow-lg space-y-3 transition animate-fadeIn"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                                <Edit2 className="w-3.5 h-3.5 text-emerald-400" />
                                Modificando alumno: <span className="text-white font-extrabold">{student.name}</span>
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Edita los campos y pulsa Guardar
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">
                                  Nombre Completo *
                                </label>
                                <input
                                  type="text"
                                  value={studentNameInput}
                                  onChange={(e) => setStudentNameInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddOrUpdateStudent();
                                    if (e.key === 'Escape') handleCancelEditStudent();
                                  }}
                                  placeholder="Nombre..."
                                  className="w-full bg-[#0A1220] border border-[#243a5e] rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-semibold"
                                  autoFocus
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">
                                  Correo Electrónico *
                                </label>
                                <input
                                  type="email"
                                  value={studentEmailInput}
                                  onChange={(e) => setStudentEmailInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddOrUpdateStudent();
                                    if (e.key === 'Escape') handleCancelEditStudent();
                                  }}
                                  placeholder="email@codiagro.com"
                                  className="w-full bg-[#0A1220] border border-[#243a5e] rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono text-[11px]"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">
                                  Departamento *
                                </label>
                                <select
                                  value={studentDeptInput}
                                  onChange={(e) => setStudentDeptInput(e.target.value)}
                                  className="w-full bg-[#0A1220] border border-[#243a5e] rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium"
                                >
                                  {formData.departments.map((dept) => (
                                    <option key={dept} value={dept}>{dept}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">
                                  Puesto / Cargo
                                </label>
                                <input
                                  type="text"
                                  value={studentJobTitleInput}
                                  onChange={(e) => setStudentJobTitleInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddOrUpdateStudent();
                                    if (e.key === 'Escape') handleCancelEditStudent();
                                  }}
                                  placeholder="Cargo o puesto..."
                                  className="w-full bg-[#0A1220] border border-[#243a5e] rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#243a5e]/50">
                              <button
                                type="button"
                                onClick={handleCancelEditStudent}
                                className="px-3 py-1.5 bg-[#101C2E] hover:bg-[#182840] text-slate-300 rounded-lg text-xs font-semibold border border-[#243a5e] transition flex items-center gap-1"
                              >
                                <X className="w-3.5 h-3.5" />
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={handleAddOrUpdateStudent}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Guardar Alumno
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div 
                          key={student.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-[#101C2E] hover:bg-[#152338] border border-[#1A2B44] transition text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-xs">{student.name}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20 font-medium">
                                {student.department}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                              <span className="flex items-center gap-1 font-mono">
                                <Mail className="w-3 h-3 text-slate-500" />
                                {student.email}
                              </span>
                              {student.jobTitle && (
                                <span className="text-slate-400">· {student.jobTitle}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStartEditStudent(student)}
                              className="p-2 rounded-lg bg-[#182840] hover:bg-emerald-600/30 text-slate-200 hover:text-emerald-300 border border-[#243a5e] transition flex items-center gap-1 text-[11px] font-semibold"
                              title={`Editar a ${student.name}`}
                            >
                              <Edit2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="hidden sm:inline">Editar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStudent(student.id)}
                              className="p-2 rounded-lg bg-[#182840] hover:bg-rose-600/30 text-slate-300 hover:text-rose-400 border border-[#243a5e] transition"
                              title={`Eliminar a ${student.name} de plantilla`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: CENTROS DE FORMACIÓN */}
          {activeTab === 'training_centers' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="bg-[#0A1220] p-4 sm:p-5 rounded-2xl border border-emerald-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                    <GraduationCap className="w-4 h-4 text-emerald-400" />
                    <span>Catálogo de Centros y Proveedores de Formación ({formData.trainingCenters?.length || 0})</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Centros disponibles para seleccionar en las acciones y evaluaciones</span>
                </div>

                <div className="flex flex-wrap gap-2 py-1">
                  {(formData.trainingCenters || []).map((center) => (
                    <span 
                      key={center} 
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs bg-[#182840] text-emerald-200 border border-emerald-500/30 shadow-xs"
                    >
                      <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                      {center}
                      <button
                        type="button"
                        onClick={() => handleRemoveTrainingCenter(center)}
                        title={`Eliminar centro ${center}`}
                        className="text-slate-400 hover:text-rose-400 font-bold text-sm ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={newTrainingCenterInput}
                    onChange={(e) => setNewTrainingCenterInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTrainingCenter();
                      }
                    }}
                    placeholder="Ej: SGS Academy, Bureau Veritas Formación, CODIAGRO Formación Interna..."
                    className="flex-1 bg-[#101C2E] border border-[#1A2B44] rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddTrainingCenter}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Añadir Centro
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONTROL DOCUMENTAL & METAS ISO */}
          {activeTab === 'documental' && (
            <div className="space-y-5 animate-fadeIn">
              
              {/* Document Control Box */}
              <div className="bg-[#0A1220] p-4 sm:p-5 rounded-2xl border border-emerald-500/30 space-y-3">
                <div className="flex items-center gap-2 text-[#00c282] font-bold text-xs">
                  <FileText className="w-4 h-4" />
                  <span>Control de Documentos del Sistema de Calidad (ISO 9001:2015)</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Empresa / Razón Social
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.companyName || 'CODIAGRO S.A.'}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="w-full bg-[#101C2E] border border-[#1A2B44] rounded-xl px-3 py-2 text-slate-100 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Nº Documento Oficial
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.documentCode || 'RE0180104'}
                      onChange={(e) => setFormData({ ...formData, documentCode: e.target.value })}
                      className="w-full bg-[#101C2E] border border-[#1A2B44] rounded-xl px-3 py-2 text-emerald-300 font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Edición Vigente
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.documentEdition || '07'}
                      onChange={(e) => setFormData({ ...formData, documentEdition: e.target.value })}
                      className="w-full bg-[#101C2E] border border-[#1A2B44] rounded-xl px-3 py-2 text-emerald-300 font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-xs"
                    />
                  </div>
                </div>

                <div className="bg-[#101C2E] p-3.5 rounded-xl border border-[#1A2B44] space-y-2 text-[11px] text-slate-300">
                  <div className="flex items-start gap-2.5">
                    <Hash className="w-4 h-4 text-[#00c282] shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-bold text-emerald-300">Numeración Correlativa Oficial: </span>
                      Cada formación recibe automáticamente un código correlativo con formato <span className="font-mono text-[#00c282] font-bold">YYNNN</span> (ej: <span className="font-mono text-[#00c282] font-bold">26001</span>, <span className="font-mono text-[#00c282] font-bold">26002</span>, etc.).
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#1A2B44]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-slate-200 block">Número correlativo inicial / siguiente:</span>
                      <span className="text-[10px] text-slate-400">Puedes introducir manualmente un número (ej. <span className="font-mono text-emerald-300 font-bold">26015</span> o <span className="font-mono text-emerald-300 font-bold">15</span>) para que la numeración correlativa continúe desde ahí.</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        min={1}
                        value={formData.nextCorrelativeNumber ?? ''}
                        onChange={(e) => {
                          const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                          setFormData({ ...formData, nextCorrelativeNumber: val });
                        }}
                        placeholder="Ej. 26001 o 1"
                        className="w-36 bg-[#0B1528] border border-[#243a5e] rounded-xl px-3 py-1.5 text-emerald-300 font-mono font-bold text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                      {formData.nextCorrelativeNumber && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, nextCorrelativeNumber: undefined })}
                          title="Restablecer correlativo automático"
                          className="px-2 py-1.5 text-[10px] text-slate-400 hover:text-rose-300 bg-[#182840] rounded-lg border border-[#243a5e] font-semibold"
                        >
                          Auto
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Logotipo Corporativo Oficial Codiagro */}
              <div className="bg-[#0A1220] p-4 sm:p-5 rounded-2xl border border-amber-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                    <ImageIcon className="w-4 h-4 text-amber-400" />
                    <span>Logotipo Corporativo Oficial CODIAGRO</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Sin modificaciones · Utilizado en toda la app</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#101C2E] p-4 rounded-xl border border-[#1A2B44]">
                  {/* Visual Preview */}
                  <div className="bg-white p-3 rounded-xl shadow-md flex items-center justify-center shrink-0 min-w-[160px] min-h-[56px]">
                    <CodiagroLogo size="md" src={formData.logoUrl} />
                  </div>

                  {/* Upload and Options */}
                  <div className="flex-1 space-y-2.5 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="cursor-pointer px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition">
                        <Upload className="w-4 h-4" />
                        <span>Subir archivo logo.png</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/svg+xml,image/webp"
                          onChange={handleLogoFileChange}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={handleResetLogo}
                        className="px-3 py-2 bg-[#182840] hover:bg-[#203656] text-slate-300 hover:text-white rounded-xl text-xs font-medium border border-[#243a5e] transition"
                      >
                        Restablecer ruta /logo.png
                      </button>
                    </div>

                    {logoUploadSuccess && (
                      <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 animate-fadeIn">
                        <CheckCircle2 className="w-4 h-4 text-[#00c282]" />
                        ¡Logotipo cargado y aplicado correctamente a toda la plataforma!
                      </p>
                    )}

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Se utiliza el archivo exacto <code className="bg-[#0A1220] text-emerald-300 px-1 py-0.5 rounded font-mono">logo.png</code> sin filtros ni textos sobreañadidos. Puedes subirlo directamente aquí o guardarlo en la carpeta <code className="bg-[#0A1220] text-amber-300 px-1 py-0.5 rounded font-mono">public/logo.png</code>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Numerical Parameters */}
              <div className="bg-[#0A1220] p-4 sm:p-5 rounded-2xl border border-[#1A2B44] space-y-4">
                <div className="flex items-center gap-2 text-slate-200 font-bold text-xs">
                  <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                  <span>Parámetros de Cálculo y Metas Anuales ({formData.year || 2026})</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Total Empleados en Plantilla *
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={formData.totalEmployees}
                      onChange={(e) => setFormData({ ...formData, totalEmployees: Number(e.target.value) })}
                      className="w-full bg-[#101C2E] border border-[#1A2B44] rounded-xl px-3 py-2 text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Usado para calcular Horas y Coste / Empleado</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Presupuesto Anual de Formación (€) *
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={formData.annualTrainingBudget}
                      onChange={(e) => setFormData({ ...formData, annualTrainingBudget: Number(e.target.value) })}
                      className="w-full bg-[#101C2E] border border-[#1A2B44] rounded-xl px-3 py-2 text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Límite anual para el plan formativo</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Meta de Horas por Empleado / Año (h)
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={formData.targetHoursPerEmployee}
                      onChange={(e) => setFormData({ ...formData, targetHoursPerEmployee: Number(e.target.value) })}
                      className="w-full bg-[#101C2E] border border-[#1A2B44] rounded-xl px-3 py-2 text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Meta Mínima de Satisfacción (1 a 5)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min={1}
                      max={5}
                      required
                      value={formData.targetSatisfactionScore}
                      onChange={(e) => setFormData({ ...formData, targetSatisfactionScore: Number(e.target.value) })}
                      className="w-full bg-[#101C2E] border border-[#1A2B44] rounded-xl px-3 py-2 text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: SERVIDOR SMTP & ENVÍO DE CORREOS */}
          {activeTab === 'email_smtp' && (
            <div className="space-y-5 animate-fadeIn">
              {/* SMTP Email Dispatch Server Configuration */}
              <div className="bg-[#0A1220] p-4 sm:p-5 rounded-2xl border border-emerald-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Servidor de Envío de Correos (Outlook / Office 365 / Gmail / SMTP)</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">Remitente: {formData.smtpUser || formData.adminEmail || 'formacioncodiagro@gmail.com'}</span>
                </div>

                <p className="text-xs text-slate-300">
                  Configuración para el envío automático de convocatorias oficiales a los trabajadores y avisos de nuevas evaluaciones completadas.
                </p>

                {/* Direct SMTP Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#101C2E] p-4 rounded-xl border border-[#1A2B44]">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Servidor SMTP
                    </label>
                    <input
                      type="text"
                      value={formData.smtpHost || 'smtp.gmail.com'}
                      onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                      placeholder="smtp.gmail.com"
                      className="w-full bg-[#0A1220] border border-[#1A2B44] rounded-xl px-3 py-2 text-slate-200 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Puerto SMTP
                    </label>
                    <input
                      type="number"
                      value={formData.smtpPort || 465}
                      onChange={(e) => setFormData({ ...formData, smtpPort: Number(e.target.value) })}
                      placeholder="465"
                      className="w-full bg-[#0A1220] border border-[#1A2B44] rounded-xl px-3 py-2 text-slate-200 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Usuario Remitente (Gmail / Outlook / SMTP)
                    </label>
                    <input
                      type="email"
                      value={formData.smtpUser || formData.adminEmail || 'formacioncodiagro@gmail.com'}
                      onChange={(e) => setFormData({ ...formData, smtpUser: e.target.value })}
                      placeholder="formacioncodiagro@gmail.com"
                      className="w-full bg-[#0A1220] border border-[#1A2B44] rounded-xl px-3 py-2 text-slate-200 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-amber-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Key className="w-3 h-3 text-amber-400" />
                      Contraseña de Buzón / Aplicación *
                    </label>
                    <input
                      type="password"
                      value={formData.smtpPass || ''}
                      onChange={(e) => setFormData({ ...formData, smtpPass: e.target.value })}
                      placeholder="Introduce la contraseña de correo o clave de app"
                      className="w-full bg-[#0A1220] border border-amber-500/40 rounded-xl px-3 py-2 text-emerald-300 text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="bg-[#101C2E] p-3.5 rounded-xl border border-[#1A2B44] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-200 font-semibold">Prueba de Envío en Tiempo Real</p>
                      <p className="text-[11px] text-slate-400">
                        Envía un correo de comprobación a <span className="font-mono text-emerald-300">{formData.adminEmail || 'formacioncodiagro@gmail.com'}</span> para verificar la conexión.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleTestEmail}
                      disabled={isTestingEmail}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {isTestingEmail ? 'Comprobando...' : 'Enviar Correo de Prueba'}
                    </button>
                  </div>

                  {testEmailResult && (
                    <div className={`p-3 rounded-xl border text-xs animate-fadeIn ${
                      testEmailResult.success 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                    }`}>
                      <div className="flex items-start gap-2">
                        {testEmailResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        )}
                        <div className="space-y-1">
                          <p className="font-semibold">{testEmailResult.message}</p>
                          {testEmailResult.needsPassword && (
                            <div className="text-[11px] text-slate-300 bg-[#0A1220] p-2.5 rounded-lg border border-amber-500/20 mt-2 space-y-1">
                              <p className="font-bold text-amber-300 flex items-center gap-1.5">
                                <Key className="w-3.5 h-3.5 text-amber-400" />
                                Para activar el envío real de correos:
                              </p>
                              <p className="text-slate-300 text-[11px]">
                                Puedes pegar directamente la contraseña en la casilla de arriba <strong>"Contraseña de Buzón / Aplicación"</strong> y pulsar <em>Enviar Correo de Prueba</em>.
                              </p>
                            </div>
                          )}
                          {testEmailResult.hint && (
                            <p className="text-[11px] text-slate-400 mt-1">{testEmailResult.hint}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: NOTIFICACIONES & ADMIN */}
          {activeTab === 'notifications' && (
            <div className="space-y-5 animate-fadeIn">
              {/* Authorized Administrators Section */}
              <div className="bg-[#0A1220] p-4 sm:p-5 rounded-2xl border border-emerald-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Correos Autorizados como Administradores (Acceso Completo)</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Control de Acceso y Seguridad</span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Solo los usuarios que inicien sesión con estos correos tendrán acceso al <strong>Cuadro de Mando</strong>, <strong>Plan de Formación</strong>, <strong>Seguimiento de Eficacia ISO 7.2</strong> y <strong>Ajustes</strong>.
                  Los alumnos que accedan mediante el enlace de encuesta entrarán en modo restringido y <strong>solo podrán rellenar su cuestionario</strong>.
                </p>

                {/* Add Admin Email */}
                <div className="flex items-center gap-2 bg-[#101C2E] p-2.5 rounded-xl border border-[#1A2B44]">
                  <input
                    type="email"
                    placeholder="Añadir nuevo correo de administrador (ej: formacioncodiagro@gmail.com)..."
                    value={newAdminEmailInput}
                    onChange={(e) => setNewAdminEmailInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddAdminEmail();
                      }
                    }}
                    className="flex-1 bg-[#0A1220] border border-[#1A2B44] rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddAdminEmail}
                    className="px-3.5 py-1.5 bg-[#182840] hover:bg-[#203656] text-[#00c282] border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Añadir Admin
                  </button>
                </div>

                {/* List of Authorized Admin Emails */}
                <div className="space-y-1.5">
                  {(formData.authorizedAdminEmails || ['formacioncodiagro@gmail.com', 'alma.trilles@codiagro.com', 'codiagrooscar@gmail.com']).map((email, idx) => (
                    <div
                      key={email}
                      className="p-2.5 bg-[#101C2E] rounded-xl border border-[#1A2B44] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-[10px]">
                          {idx + 1}
                        </div>
                        <span className="font-mono font-bold text-white">{email}</span>
                        {email.toLowerCase() === 'formacioncodiagro@gmail.com' && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                            Admin Principal & Emisor
                          </span>
                        )}
                        {email.toLowerCase() === 'alma.trilles@codiagro.com' && (
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/20">
                            Admin RRHH
                          </span>
                        )}
                        {email.toLowerCase() === 'codiagrooscar@gmail.com' && (
                          <span className="text-[10px] bg-slate-800 text-slate-400 font-semibold px-2 py-0.5 rounded-full border border-slate-700">
                            Admin Técnico
                          </span>
                        )}
                      </div>

                      {email.toLowerCase() !== 'formacioncodiagro@gmail.com' && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAdminEmail(email)}
                          className="p-1 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                          title="Eliminar permiso de administrador"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Automatic Notifications Section */}
              <div className="bg-[#0A1220] p-4 sm:p-5 rounded-2xl border border-blue-500/30 space-y-4">
                <div className="flex items-center gap-2 text-blue-300 font-bold text-xs">
                  <Bell className="w-4 h-4 text-blue-400" />
                  <span>Notificaciones Automáticas para Administrador (Push + Email)</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Correo Electrónico del Administrador Receptor de Avisos *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={formData.adminEmail || 'formacioncodiagro@gmail.com'}
                      onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                      placeholder="formacioncodiagro@gmail.com"
                      className="w-full bg-[#101C2E] border border-[#1A2B44] rounded-xl pl-9 pr-3 py-2 text-white font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-xs"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Recibirá un correo instantáneo y notificación cada vez que un participante envíe un formulario completado.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer bg-[#101C2E] p-3 rounded-xl border border-[#1A2B44]">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.emailNotificationEnabled)}
                      onChange={(e) => setFormData({ ...formData, emailNotificationEnabled: e.target.checked })}
                      className="w-4 h-4 accent-[#00a86b] rounded"
                    />
                    <div>
                      <div className="text-xs text-slate-200 font-semibold">Notificación por Email</div>
                      <div className="text-[11px] text-slate-400">Envía un email al admin con el resumen</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer bg-[#101C2E] p-3 rounded-xl border border-[#1A2B44]">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.pushNotificationEnabled)}
                      onChange={(e) => setFormData({ ...formData, pushNotificationEnabled: e.target.checked })}
                      className="w-4 h-4 accent-[#00a86b] rounded"
                    />
                    <div>
                      <div className="text-xs text-slate-200 font-semibold">Notificación Push Web</div>
                      <div className="text-[11px] text-slate-400">Aviso emergente en la aplicación</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* NEW: Automatic Daily Email Digest of Pending Questionnaires */}
              <div className="bg-[#0A1220] p-4 sm:p-5 rounded-2xl border border-amber-500/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                    <CalendarCheck className="w-4 h-4 text-amber-400" />
                    <span>Envío Diario Automático de Cuestionarios Pendientes al Admin</span>
                  </div>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30">
                    ISO 9001 · Cláusula 7.2
                  </span>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    El sistema comprueba diariamente los cursos ejecutados. Si existen participantes que aún no han rellenado su cuestionario oficial (<strong>RE0180104 Ed. 07</strong>), envía un único correo consolidado al administrador (<code className="text-amber-300 font-mono text-[11px]">{formData.adminEmail || 'codiagrooscar@gmail.com'}</code>) con la lista y enlaces directos de evaluación.
                  </p>
                  
                  {/* Strict Condition Highlight */}
                  <div className="bg-[#101C2E] p-3 rounded-xl border border-amber-500/20 flex items-start gap-2.5 text-[11px] text-amber-200/90">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-amber-300">Regla estricta de envío:</strong> Este correo <strong>solo se envía si hay algún cuestionario pendiente de rellenar</strong> por parte de los trabajadores. Si todos están cumplimentados, <strong>no se envía nada</strong> para no saturar la bandeja de entrada.
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer bg-[#101C2E] p-3 rounded-xl border border-[#1A2B44] flex-1 w-full">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.dailyPendingDigestEnabled ?? true)}
                      onChange={(e) => setFormData({ ...formData, dailyPendingDigestEnabled: e.target.checked })}
                      className="w-4 h-4 accent-[#d97706] rounded"
                    />
                    <div>
                      <div className="text-xs text-slate-100 font-bold">Activar Envío Diario Automático</div>
                      <div className="text-[11px] text-slate-400">Comprobación matinal diaria (solo si hay pendientes)</div>
                    </div>
                  </label>

                  <button
                    type="button"
                    onClick={handleTriggerDailyDigest}
                    disabled={isCheckingDigest}
                    className="w-full sm:w-auto px-4 py-3 bg-[#182840] hover:bg-[#203656] text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 shrink-0 shadow-xs"
                  >
                    {isCheckingDigest ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                        <span>Comprobando pendientes...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 text-amber-400" />
                        <span>Comprobar y Enviar Resumen Ahora</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Digest test result alert */}
                {digestResult && (
                  <div
                    className={`p-3.5 rounded-xl text-xs border animate-fadeIn flex items-start gap-2.5 ${
                      digestResult.sent
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                        : digestResult.success
                        ? 'bg-blue-950/40 border-blue-500/40 text-blue-200'
                        : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                    }`}
                  >
                    {digestResult.sent ? (
                      <CheckCircle2 className="w-4 h-4 text-[#00c282] shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <p className="font-bold">
                        {digestResult.sent
                          ? `✔ Resumen diario enviado con éxito (${digestResult.count} cuestionario(s) pendiente(s))`
                          : `ℹ ${digestResult.message}`}
                      </p>
                      {digestResult.sent && (
                        <p className="text-[11px] text-slate-300">
                          Se ha enviado el desglose detallado a <strong className="text-white">{digestResult.recipient}</strong>.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-4 border-t border-[#1A2B44] flex items-center justify-between">
            <button
              type="button"
              onClick={async () => {
                if (window.confirm('¿Deseas restablecer todos los datos de demostración predeterminados con la codificación RE0180104 Ed. 07 y números correlativos?')) {
                  await onResetToDemo();
                  onClose();
                }
              }}
              className="text-xs text-rose-400 hover:text-rose-300 font-medium inline-flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Restablecer datos iniciales
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[#182840] hover:bg-[#203656] text-slate-300 font-semibold rounded-xl text-xs border border-[#243a5e]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-[#00a86b] hover:bg-[#00925d] text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5 transition"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
