import React from 'react';
import { 
  X, 
  Sparkles, 
  Award, 
  Calendar, 
  BarChart3, 
  Send, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  FileCheck,
  Users
} from 'lucide-react';
import { CodiagroLogo } from './CodiagroLogo';

interface StrategicProposalsModalProps {
  onClose: () => void;
}

export default function StrategicProposalsModal({ onClose }: StrategicProposalsModalProps) {
  const proposals = [
    {
      id: 'prop-1',
      title: '1. Gestor Automatizado de Bonificaciones FUNDAE & Crédito Formativo',
      category: 'Optimización de Costes',
      badgeColor: 'bg-emerald-500/15 text-[#00c282] border-emerald-500/30',
      icon: TrendingUp,
      description: 'Cálculo dinámico del crédito de formación bonificada disponible para CODIAGRO según cotizaciones a la Seguridad Social.',
      benefits: [
        'Aprovechamiento al 100% de los fondos estatales para que las formaciones salgan a coste cero.',
        'Comprobación automática de requisitos (horas mínimas, cofinanciación empresarial y plazos de comunicación).',
        'Generación de informe justificativo listo para el asesor laboral y la auditoría FUNDAE.'
      ]
    },
    {
      id: 'prop-2',
      title: '2. Disparo Automatizado de Eficacia a 60/90 Días al Responsable Directo',
      category: 'Cumplimiento ISO 9001: 7.2',
      badgeColor: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
      icon: Send,
      description: 'Envío programado de un email con enlace express al responsable de departamento tras 60 o 90 días de la finalización del curso.',
      benefits: [
        'Cierre automático del ciclo de evaluación de la eficacia sin esfuerzo administrativo.',
        'El manager evalúa en 30 segundos si el empleado ha transferido los conocimientos al puesto diario.',
        'Generación automática de evidencias para el auditor de AENOR / SGS.'
      ]
    },
    {
      id: 'prop-3',
      title: '3. Matriz de Polivalencia y Mapa de Competencias por Puesto (Skill Matrix)',
      category: 'Desarrollo de Talento',
      badgeColor: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
      icon: Users,
      description: 'Matriz visual e interactiva que cruza los puestos de CODIAGRO (Laboratorio, Planta, Calidad, Agronomía, Comercial) con las competencias exigidas.',
      benefits: [
        'Identifica al instante puestos críticos sin backup o empleados con necesidades de reciclaje.',
        'Sugiere automáticamente acciones formativas para el siguiente Plan Anual de Formación (PAF).',
        'Evidencia impecable de planificación de competencias ante la Dirección.'
      ]
    },
    {
      id: 'prop-4',
      title: '4. Emisión y Envío Automático de Diplomas / Certificados Digitales',
      category: 'Satisfacción del Empleado',
      badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      icon: Award,
      description: 'Generación instantánea en PDF del certificado de asistencia y aprovechamiento con sello CODIAGRO y código QR de verificación.',
      benefits: [
        'Incentiva a los alumnos a completar la encuesta de satisfacción (el diploma se desbloquea al enviar el cuestionario).',
        'Almacenamiento automático en el expediente formativo digital del trabajador.',
        'Acreditación formal para certificaciones de calidad y prevención de riesgos laborales.'
      ]
    },
    {
      id: 'prop-5',
      title: '5. Sincronización con Calendarios Corporativos (Google Calendar & Outlook)',
      category: 'Productividad & Convocatoria',
      badgeColor: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
      icon: Calendar,
      description: 'Al dar de alta la formación, se envía una invitación de calendario (.ics / Google Calendar) a todos los convocados.',
      benefits: [
        'Reducción drástica del absentismo en las formaciones.',
        'Recordatorio automático 24h antes del inicio del curso con ubicación/enlace a Teams/Zoom.',
        'Sincronización con la sala de formación y recursos audiovisuales de la empresa.'
      ]
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-[#101C2E] rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-[#1A2B44] max-h-[90vh] overflow-y-auto flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1A2B44] pb-4">
          <div className="flex items-center gap-3.5">
            <div className="bg-white rounded-xl px-2.5 py-1 shadow-xs inline-flex items-center shrink-0">
              <CodiagroLogo size="sm" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-[#00c282] border border-emerald-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Roadmap Estratégico
                </span>
                <h3 className="text-base font-bold text-white">
                  5 Mejoras de Alto Valor para CODIAGRO
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Propuestas de automatización para elevar la excelencia formativa y la conformidad ISO 9001
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#182840] hover:bg-[#203656] text-slate-400 hover:text-slate-200 border border-[#243a5e]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of Proposals */}
        <div className="my-4 space-y-4 flex-1 overflow-y-auto pr-1">
          {proposals.map((prop) => {
            const Icon = prop.icon;
            return (
              <div
                key={prop.id}
                className="bg-[#0A1220] p-4 sm:p-5 rounded-2xl border border-[#1A2B44] hover:border-emerald-500/40 transition"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#182840] text-[#00c282] border border-[#243a5e] flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{prop.title}</h4>
                      <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md border mt-0.5 ${prop.badgeColor}`}>
                        {prop.category}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                  {prop.description}
                </p>

                <div className="bg-[#101C2E] p-3 rounded-xl border border-[#1A2B44] space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Impacto y Beneficios Clave:
                  </div>
                  {prop.benefits.map((b, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#00c282] shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[#1A2B44] flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#00c282]" />
            <span>Alineado con ISO 9001:2015 & Bonificaciones FUNDAE</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#00a86b] hover:bg-[#00925d] text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
}
