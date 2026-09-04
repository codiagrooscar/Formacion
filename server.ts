import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { 
  INITIAL_TRAINING_ACTIONS, 
  INITIAL_EVALUATIONS, 
  INITIAL_FOLLOWUPS, 
  INITIAL_SETTINGS 
} from './src/data/initialData';

dotenv.config();

// Persistent JSON Database for CODIAGRO on Render & Server
const DB_FILE_PATH = path.join(process.cwd(), 'data', 'codiagro_database.json');

interface ServerDbSchema {
  trainings: any[];
  evaluations: any[];
  followups: any[];
  settings: any;
  initialized: boolean;
  lastUpdated: string;
}

function ensureDbFile(): ServerDbSchema {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (fs.existsSync(DB_FILE_PATH)) {
      const raw = fs.readFileSync(DB_FILE_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.trainings)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('[Server DB] Error reading database file:', e);
  }

  const initialDb: ServerDbSchema = {
    trainings: INITIAL_TRAINING_ACTIONS,
    evaluations: INITIAL_EVALUATIONS,
    followups: INITIAL_FOLLOWUPS,
    settings: INITIAL_SETTINGS,
    initialized: true,
    lastUpdated: new Date().toISOString(),
  };

  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(initialDb, null, 2), 'utf8');
  } catch (err) {
    console.error('[Server DB] Error writing initial database file:', err);
  }

  return initialDb;
}

function saveDbFile(data: ServerDbSchema) {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('[Server DB Error] Could not save database file:', e);
  }
}

// Ensure DB file exists on launch
ensureDbFile();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Increase payload size to handle high-resolution image uploads from camera and scanner
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // ==========================================
  // SERVER PERSISTENT DATABASE API ENDPOINTS
  // ==========================================
  app.get('/api/db/all', (req, res) => {
    const db = ensureDbFile();
    res.json({
      success: true,
      trainings: db.trainings || [],
      evaluations: db.evaluations || [],
      followups: db.followups || [],
      settings: db.settings || {},
      lastUpdated: db.lastUpdated,
    });
  });

  app.get('/api/db/trainings', (req, res) => {
    const db = ensureDbFile();
    res.json(db.trainings || []);
  });

  app.post('/api/db/trainings', (req, res) => {
    const db = ensureDbFile();
    const training = req.body;
    if (!training || !training.id) {
      return res.status(400).json({ error: 'Training must have an id' });
    }
    const current = db.trainings || [];
    const index = current.findIndex((t: any) => t.id === training.id);
    if (index >= 0) {
      current[index] = training;
    } else {
      current.unshift(training);
    }
    db.trainings = current;
    saveDbFile(db);
    console.log(`[Server DB] Saved training: ${training.title} (${training.id})`);
    res.json({ success: true, training });
  });

  app.delete('/api/db/trainings/:id', (req, res) => {
    const db = ensureDbFile();
    const id = req.params.id;
    db.trainings = (db.trainings || []).filter((t: any) => t.id !== id);
    saveDbFile(db);
    console.log(`[Server DB] Deleted training: ${id}`);
    res.json({ success: true, message: 'Training deleted' });
  });

  app.get('/api/db/evaluations', (req, res) => {
    const db = ensureDbFile();
    res.json(db.evaluations || []);
  });

  app.post('/api/db/evaluations', (req, res) => {
    const db = ensureDbFile();
    const evaluation = req.body;
    if (!evaluation || !evaluation.id) {
      return res.status(400).json({ error: 'Evaluation must have an id' });
    }
    const current = db.evaluations || [];
    const index = current.findIndex((e: any) => e.id === evaluation.id);
    if (index >= 0) {
      current[index] = evaluation;
    } else {
      current.unshift(evaluation);
    }
    db.evaluations = current;

    if (evaluation.trainingActionId && Array.isArray(db.trainings)) {
      const trIndex = db.trainings.findIndex((t: any) => t.id === evaluation.trainingActionId);
      if (trIndex >= 0) {
        const courseEvals = db.evaluations.filter((e: any) => e.trainingActionId === evaluation.trainingActionId);
        const totalScore = courseEvals.reduce((acc: number, curr: any) => acc + (curr.overallScore || 0), 0);
        const avgScore = courseEvals.length > 0 ? Number((totalScore / courseEvals.length).toFixed(1)) : 0;
        db.trainings[trIndex].satisfactionScore = avgScore;
        db.trainings[trIndex].receivedEvaluationsCount = courseEvals.length;
      }
    }

    saveDbFile(db);
    res.json({ success: true, evaluation });
  });

  app.delete('/api/db/evaluations/:id', (req, res) => {
    const db = ensureDbFile();
    const id = req.params.id;
    const target = (db.evaluations || []).find((e: any) => e.id === id);
    db.evaluations = (db.evaluations || []).filter((e: any) => e.id !== id);

    if (target && target.trainingActionId && Array.isArray(db.trainings)) {
      const trIndex = db.trainings.findIndex((t: any) => t.id === target.trainingActionId);
      if (trIndex >= 0) {
        const courseEvals = db.evaluations.filter((e: any) => e.trainingActionId === target.trainingActionId);
        const totalScore = courseEvals.reduce((acc: number, curr: any) => acc + (curr.overallScore || 0), 0);
        const avgScore = courseEvals.length > 0 ? Number((totalScore / courseEvals.length).toFixed(1)) : 0;
        db.trainings[trIndex].satisfactionScore = avgScore;
        db.trainings[trIndex].receivedEvaluationsCount = courseEvals.length;
      }
    }

    saveDbFile(db);
    res.json({ success: true, message: 'Evaluation deleted' });
  });

  app.get('/api/db/followups', (req, res) => {
    const db = ensureDbFile();
    res.json(db.followups || []);
  });

  app.post('/api/db/followups', (req, res) => {
    const db = ensureDbFile();
    const followup = req.body;
    if (!followup || !followup.id) {
      return res.status(400).json({ error: 'Followup must have an id' });
    }
    const current = db.followups || [];
    const index = current.findIndex((f: any) => f.id === followup.id);
    if (index >= 0) {
      current[index] = followup;
    } else {
      current.unshift(followup);
    }
    db.followups = current;
    saveDbFile(db);
    res.json({ success: true, followup });
  });

  app.delete('/api/db/followups/:id', (req, res) => {
    const db = ensureDbFile();
    const id = req.params.id;
    db.followups = (db.followups || []).filter((f: any) => f.id !== id);
    saveDbFile(db);
    res.json({ success: true, message: 'Followup deleted' });
  });

  app.get('/api/db/settings', (req, res) => {
    const db = ensureDbFile();
    res.json(db.settings || {});
  });

  app.post('/api/db/settings', (req, res) => {
    const db = ensureDbFile();
    db.settings = {
      ...db.settings,
      ...req.body,
      adminEmail: 'formacioncodiagro@gmail.com',
      smtpUser: 'formacioncodiagro@gmail.com',
      smtpHost: 'smtp.gmail.com',
      smtpPort: 465,
    };
    saveDbFile(db);
    res.json({ success: true, settings: db.settings });
  });

  app.post('/api/db/clear-all', (req, res) => {
    const db = ensureDbFile();
    db.trainings = [];
    db.evaluations = [];
    db.followups = [];
    saveDbFile(db);
    console.log('[Server DB] Cleared all training actions, evaluations, and followups.');
    res.json({ success: true, message: 'All courses and evaluations cleared' });
  });

  app.post('/api/db/reset', (req, res) => {
    const initialDb: ServerDbSchema = {
      trainings: INITIAL_TRAINING_ACTIONS,
      evaluations: INITIAL_EVALUATIONS,
      followups: INITIAL_FOLLOWUPS,
      settings: INITIAL_SETTINGS,
      initialized: true,
      lastUpdated: new Date().toISOString(),
    };
    saveDbFile(initialDb);
    res.json({ success: true, message: 'Reset to initial clean state' });
  });

  // Initialize Gemini AI client lazily/safely
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in environment.');
    }
    return new GoogleGenAI({ apiKey });
  };

  // Mail Transporter for Gmail / Outlook (Office 365) / SMTP
  const getMailTransporter = (customConfig?: { host?: string; port?: number; user?: string; pass?: string }) => {
    const user = customConfig?.user || process.env.SMTP_USER || 'formacioncodiagro@gmail.com';
    const isOutlook = user.toLowerCase().includes('codiagro.com') || (customConfig?.host && customConfig.host.includes('office365'));
    const defaultHost = isOutlook ? 'smtp.office365.com' : 'smtp.gmail.com';
    const defaultPort = isOutlook ? 587 : 465;

    const host = customConfig?.host || process.env.SMTP_HOST || defaultHost;
    const port = Number(customConfig?.port) || Number(process.env.SMTP_PORT) || defaultPort;
    const pass = customConfig?.pass || process.env.SMTP_PASS || '@Rrhhformacion';

    if (!pass) {
      return null;
    }

    const isSecure = port === 465;
    return {
      transporter: nodemailer.createTransport({
        host,
        port,
        secure: isSecure,
        auth: {
          user,
          pass,
        },
        tls: {
          rejectUnauthorized: false
        }
      }),
      sender: user
    };
  };

  // API 1: Health check
  app.get('/api/health', (req, res) => {
    const hasSmtpConfigured = !!process.env.SMTP_PASS;
    res.json({ 
      status: 'ok', 
      emailService: {
        configured: hasSmtpConfigured,
        sender: process.env.SMTP_USER || 'formacioncodiagro@gmail.com',
        host: process.env.SMTP_HOST || 'smtp.gmail.com'
      },
      timestamp: new Date().toISOString() 
    });
  });

  // API 1.5: Test Email Connection
  app.post('/api/test-email', async (req, res) => {
    try {
      const { targetEmail = 'formacioncodiagro@gmail.com', smtpConfig } = req.body;
      const mailSetup = getMailTransporter(smtpConfig);
      const sender = smtpConfig?.user || process.env.SMTP_USER || 'formacioncodiagro@gmail.com';

      if (!mailSetup) {
        return res.json({
          success: false,
          needsPassword: true,
          sender,
          message: `El remitente está configurado como ${sender}, pero falta introducir la contraseña SMTP / Contraseña de aplicación.`
        });
      }

      const { transporter } = mailSetup;

      await transporter.sendMail({
        from: `"CODIAGRO Formación & Calidad" <${sender}>`,
        to: targetEmail,
        subject: `✅ [CODIAGRO] Prueba de Envío de Correo - Sistema ISO 9001`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #07531C; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 1px;">CODIAGRO</h1>
              <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Gestión Integral de Formación Continua & ISO 9001</p>
            </div>
            
            <div style="background-color: #ffffff; padding: 24px; border-radius: 8px; border: 1px solid #cbd5e1;">
              <h2 style="color: #0f172a; font-size: 18px; margin-top: 0;">¡Configuración de Correo Exitosa!</h2>
              <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                Este es un mensaje de prueba enviado automáticamente desde el servidor de <strong>CODIAGRO S.A.</strong> utilizando la cuenta <strong>${sender}</strong>.
              </p>
              <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 12px; margin: 16px 0; border-radius: 4px;">
                <p style="color: #166534; font-size: 13px; margin: 0; font-weight: 600;">
                  ✔ El servicio de envío de convocatorias, recordatorios y encuestas ISO está 100% operativo.
                </p>
              </div>
              <p style="color: #64748b; font-size: 12px; margin: 16px 0 0 0;">
                Fecha de prueba: ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; font-size: 11px; color: #94a3b8;">
              CODIAGRO S.A. · Departamento de Calidad & RRHH · RE0180104 Ed. 07
            </div>
          </div>
        `
      });

      res.json({
        success: true,
        message: `Correo de prueba enviado con éxito a ${targetEmail} desde ${sender}`,
        sender,
        targetEmail
      });
    } catch (error: any) {
      console.error('Error sending test email:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message,
        hint: 'Verifica las credenciales del servidor SMTP (usuario, contraseña de aplicación o clave de buzón) y puerto (587 para Outlook/Office 365, 465 para SSL).' 
      });
    }
  });

  // API 2A: Send Course Convocation Email (PRE-COURSE NOTIFICATION)
  // Communicates that a course will take place: description, dates, hours, venue, trainer + optional syllabus PDF attachment
  app.post('/api/send-convocation-email', async (req, res) => {
    try {
      const { 
        to, 
        participantName, 
        trainingCode, 
        trainingTitle, 
        description,
        plannedDate, 
        endDate,
        durationHours, 
        modality,
        location,
        trainerName,
        department,
        customMessage,
        syllabusAttachment,
        smtpConfig
      } = req.body;

      if (!to || !trainingTitle) {
        return res.status(400).json({ error: 'Faltan parámetros obligatorios (destinatario o título).' });
      }

      const sender = smtpConfig?.user || process.env.SMTP_USER || 'formacioncodiagro@gmail.com';
      const mailSetup = getMailTransporter(smtpConfig);

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
          
          {/* Header */}
          <div style="text-align: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #07531C;">
            <h1 style="color: #07531C; margin: 0; font-size: 26px; font-weight: 900; letter-spacing: 2px;">CODIAGRO</h1>
            <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0; text-transform: uppercase; font-weight: 600;">Plan Anual de Formación Continua · ISO 9001:2015</p>
          </div>
          
          <div style="background-color: #ffffff; padding: 28px; border-radius: 10px; border: 1px solid #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            
            <div style="display: inline-block; background-color: #ecfdf5; color: #065f46; font-size: 12px; font-weight: bold; padding: 4px 12px; border-radius: 20px; border: 1px solid #a7f3d0; margin-bottom: 14px;">
              📅 CONVOCATORIA DE ACCIÓN FORMATIVA Nº ${trainingCode || 'Oficial'}
            </div>

            <h2 style="color: #0f172a; font-size: 20px; margin: 0 0 16px 0; line-height: 1.35; font-weight: 800;">
              ${trainingTitle}
            </h2>

            <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 18px;">
              Estimado/a <strong>${participantName || 'Colaborador/a'}</strong>,
              <br/>
              Has sido convocado/a a participar en la siguiente acción formativa programada dentro del Plan de Competencias y Cualificación de Codiagro.
            </p>

            ${description ? `
              <div style="background-color: #f8fafc; border-left: 4px solid #07531C; padding: 12px 16px; margin-bottom: 20px; border-radius: 4px;">
                <span style="font-size: 11px; font-weight: bold; color: #07531C; text-transform: uppercase; display: block; margin-bottom: 4px;">Descripción y Objetivos del Curso:</span>
                <p style="margin: 0; font-size: 13px; color: #334155; line-height: 1.5;">${description}</p>
              </div>
            ` : ''}

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 9px 0; color: #64748b; width: 36%;">📅 Fecha Prevista:</td>
                <td style="padding: 9px 0; color: #0f172a; font-weight: 600;">
                  ${plannedDate || 'A determinar'} ${endDate ? `al ${endDate}` : ''}
                </td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 9px 0; color: #64748b;">⏱ Duración Total:</td>
                <td style="padding: 9px 0; color: #0f172a; font-weight: 600;">${durationHours ? `${durationHours} horas` : 'Por determinar'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 9px 0; color: #64748b;">📍 Modalidad / Lugar:</td>
                <td style="padding: 9px 0; color: #0f172a; font-weight: 600;">
                  ${modality ? modality.toUpperCase() : 'PRESENCIAL'} ${location ? `· ${location}` : ''}
                </td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 9px 0; color: #64748b;">👨‍🏫 Docente / Proveedor:</td>
                <td style="padding: 9px 0; color: #0f172a; font-weight: 600;">${trainerName || 'Formador Especialista'}</td>
              </tr>
              ${department ? `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 9px 0; color: #64748b;">🏢 Departamento:</td>
                  <td style="padding: 9px 0; color: #0f172a; font-weight: 600;">${department}</td>
                </tr>
              ` : ''}
              <tr>
                <td style="padding: 9px 0; color: #64748b;">📋 Registro de Calidad:</td>
                <td style="padding: 9px 0; color: #07531C; font-weight: bold; font-family: monospace;">RE0180104 Ed. 07</td>
              </tr>
            </table>

            ${syllabusAttachment ? `
              <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 13px; color: #166534; font-weight: 600;">
                  📎 <strong>Documento Adjunto:</strong> Se adjunta el programa y temario oficial del curso (<em>${syllabusAttachment.filename || 'Temario.pdf'}</em>) en formato PDF para su preparación y consulta.
                </p>
              </div>
            ` : ''}

            ${customMessage ? `
              <div style="background-color: #eff6ff; border-left: 3px solid #3b82f6; padding: 12px 16px; margin-bottom: 20px; border-radius: 4px; font-size: 13px; color: #1e40af;">
                <strong style="display: block; margin-bottom: 3px;">Nota del Responsable:</strong>
                <em>"${customMessage}"</em>
              </div>
            ` : ''}

            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; text-align: center;">
              <p style="color: #475569; font-size: 12px; margin: 0; line-height: 1.5;">
                ℹ️ <strong>Importante:</strong> Rogamos puntualidad y asistencia. Al finalizar la formación, recibirás una solicitud para valorar el curso y registrar la eficacia adquirida.
              </p>
            </div>

          </div>
          
          <div style="text-align: center; margin-top: 20px; font-size: 11px; color: #94a3b8; line-height: 1.5;">
            CODIAGRO S.A. · Departamento de Recursos Humanos & Calidad · Enviado desde ${sender}
          </div>
        </div>
      `;

      if (mailSetup) {
        const mailOptions: any = {
          from: `"CODIAGRO Formación" <${sender}>`,
          to,
          subject: `📅 [CODIAGRO] Convocatoria de Formación: ${trainingTitle} (Nº ${trainingCode || 'Oficial'})`,
          html: htmlContent,
        };

        if (syllabusAttachment && syllabusAttachment.base64) {
          mailOptions.attachments = [
            {
              filename: syllabusAttachment.filename || 'Temario_Curso_Codiagro.pdf',
              content: Buffer.from(syllabusAttachment.base64, 'base64'),
              contentType: 'application/pdf'
            }
          ];
        }

        await mailSetup.transporter.sendMail(mailOptions);

        console.log(`[CONVOCATION EMAIL] Enviado con éxito a: ${to}${syllabusAttachment ? ' con temario PDF adjunto' : ''}`);
        return res.json({
          success: true,
          mode: 'live_smtp',
          deliveredTo: to,
          hasSyllabusAttached: !!syllabusAttachment,
          message: `Convocatoria enviada con éxito a ${to}`,
          timestamp: new Date().toISOString()
        });
      } else {
        console.log(`[CONVOCATION EMAIL - MODO SIMULADO] A: ${to} | Curso: ${trainingTitle}${syllabusAttachment ? ' (con temario PDF)' : ''}`);
        return res.json({
          success: true,
          mode: 'simulated',
          deliveredTo: to,
          hasSyllabusAttached: !!syllabusAttachment,
          message: `Convocatoria registrada para ${to}. (Introduce la contraseña de aplicación en Ajustes para envío en vivo).`,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      console.error('Error sending convocation email:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // API 2B: Send Course Evaluation Request Email (POST-COURSE WITH WEB LINK & PDF ATTACHMENT)
  // Sent once the course has finished so the employee fills out the questionnaire online or by hand using the attached PDF
  app.post('/api/send-evaluation-email', async (req, res) => {
    try {
      const { 
        to, 
        participantName, 
        trainingCode, 
        trainingTitle, 
        plannedDate, 
        durationHours, 
        trainerName,
        onlineLink, 
        customMessage,
        pdfAttachment,
        smtpConfig
      } = req.body;

      if (!to || !trainingTitle) {
        return res.status(400).json({ error: 'Faltan parámetros obligatorios (destinatario o título).' });
      }

      const sender = smtpConfig?.user || process.env.SMTP_USER || 'formacioncodiagro@gmail.com';
      const mailSetup = getMailTransporter(smtpConfig);

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
          
          {/* Header */}
          <div style="text-align: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #07531C;">
            <h1 style="color: #07531C; margin: 0; font-size: 26px; font-weight: 900; letter-spacing: 2px;">CODIAGRO</h1>
            <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0; text-transform: uppercase; font-weight: 600;">Evaluación de Formación & Eficacia · ISO 9001:2015</p>
          </div>
          
          <div style="background-color: #ffffff; padding: 28px; border-radius: 10px; border: 1px solid #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            
            <div style="display: inline-block; background-color: #fef3c7; color: #92400e; font-size: 12px; font-weight: bold; padding: 4px 12px; border-radius: 20px; border: 1px solid #fde68a; margin-bottom: 14px;">
              📋 CUESTIONARIO POST-CURSO · ACCIÓN Nº ${trainingCode || 'Oficial'}
            </div>

            <h2 style="color: #0f172a; font-size: 20px; margin: 0 0 14px 0; line-height: 1.35; font-weight: 800;">
              ${trainingTitle}
            </h2>

            <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 18px;">
              Estimado/a <strong>${participantName || 'Colaborador/a'}</strong>,
              <br/>
              Una vez finalizada la acción formativa, te solicitamos que cumplimentes la <strong>Evaluación de la Formación y Eficacia</strong> requerida por nuestro Sistema de Calidad (Cláusula 7.2 ISO 9001).
            </p>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; color: #64748b; width: 36%;">📅 Fecha Realizada:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${plannedDate || 'Finalizada recientemente'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; color: #64748b;">⏱ Duración:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${durationHours ? `${durationHours} horas` : 'Realizada'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; color: #64748b;">👨‍🏫 Docente / Proveedor:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${trainerName || 'Formador Especialista'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">📋 Registro de Calidad:</td>
                <td style="padding: 8px 0; color: #07531C; font-weight: bold; font-family: monospace;">RE0180104 Ed. 07</td>
              </tr>
            </table>

            ${customMessage ? `
              <div style="background-color: #f8fafc; border-left: 3px solid #3b82f6; padding: 12px 16px; margin-bottom: 20px; border-radius: 4px; font-size: 13px; color: #334155;">
                <em>"${customMessage}"</em>
              </div>
            ` : ''}

            <!-- OPCIÓN 1: VÍA ONLINE DIRECTA -->
            ${onlineLink ? `
              <div style="text-align: center; margin: 24px 0 20px 0; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 20px;">
                <span style="font-size: 12px; font-weight: bold; color: #166534; display: block; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
                  Opción 1 · Cumplimentar por Internet (Recomendado - 2 minutos)
                </span>
                <a href="${onlineLink}" target="_blank" style="display: inline-block; background-color: #07531C; color: #ffffff; text-decoration: none; padding: 14px 28px; font-size: 15px; font-weight: bold; border-radius: 8px; box-shadow: 0 4px 6px rgba(7,83,28,0.25);">
                  📝 Realizar Cuestionario de Evaluación ISO Online
                </a>
                <p style="color: #64748b; font-size: 11px; margin-top: 8px; margin-bottom: 0;">
                  Acceso directo con tus datos y los del curso ya preparados.
                </p>
              </div>
            ` : ''}

            <!-- OPCIÓN 2: VÍA IMPRESA CON PDF ADJUNTO -->
            <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 16px; margin-top: 16px;">
              <div style="display: flex; align-items: flex-start; gap: 10px;">
                <span style="font-size: 20px;">📄</span>
                <div>
                  <strong style="color: #92400e; font-size: 13px; display: block; margin-bottom: 4px;">
                    Opción 2 · Rellenar en papel a mano con bolígrafo:
                  </strong>
                  <p style="color: #78350f; font-size: 12px; margin: 0; line-height: 1.5;">
                    Si prefieres el formato tradicional en papel, <strong>encontrarás adjunto a este correo el documento oficial en PDF (RE0180104 Ed. 07)</strong>. Puedes imprimirlo, rellenar los apartados 1 y 2 a mano con bolígrafo, firmarlo y entregarlo al Responsable de Calidad / RRHH.
                  </p>
                </div>
              </div>
            </div>

          </div>
          
          <div style="text-align: center; margin-top: 20px; font-size: 11px; color: #94a3b8; line-height: 1.5;">
            CODIAGRO S.A. · Dpto. Calidad, Medio Ambiente & RRHH · Enviado desde ${sender}
          </div>
        </div>
      `;

      if (mailSetup) {
        const mailOptions: any = {
          from: `"CODIAGRO Calidad & Formación" <${sender}>`,
          to,
          subject: `📋 [CODIAGRO] Solicitud de Evaluación de Formación: ${trainingTitle} (RE0180104 Ed. 07)`,
          html: htmlContent,
        };

        // Attach official PDF questionnaire if supplied
        if (pdfAttachment && pdfAttachment.base64) {
          mailOptions.attachments = [
            {
              filename: pdfAttachment.filename || `Codiagro_Cuestionario_${trainingCode || 'RE0180104'}_Ed07.pdf`,
              content: Buffer.from(pdfAttachment.base64, 'base64'),
              contentType: 'application/pdf'
            }
          ];
        }

        await mailSetup.transporter.sendMail(mailOptions);

        console.log(`[EVALUATION EMAIL] Enviado con éxito a: ${to} (PDF adjunto: ${!!pdfAttachment})`);
        return res.json({
          success: true,
          mode: 'live_smtp',
          deliveredTo: to,
          hasPdfAttached: !!pdfAttachment,
          message: `Solicitud de evaluación enviada con éxito a ${to} con PDF oficial adjunto`,
          timestamp: new Date().toISOString()
        });
      } else {
        console.log(`[EVALUATION EMAIL - MODO SIMULADO] A: ${to} | Curso: ${trainingTitle} | PDF: ${!!pdfAttachment}`);
        return res.json({
          success: true,
          mode: 'simulated',
          deliveredTo: to,
          hasPdfAttached: !!pdfAttachment,
          message: `Solicitud registrada para ${to}. (Introduce tu contraseña de aplicación en Ajustes para enviarlo en vivo).`,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      console.error('Error sending evaluation email:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // API 2C: Backward compatible route
  app.post('/api/send-invitation-email', async (req, res) => {
    // Forward to evaluation endpoint
    const { onlineLink } = req.body;
    if (onlineLink) {
      // If it includes an online evaluation link, send evaluation email
      return (app._router.handle as any)({ ...req, url: '/api/send-evaluation-email' }, res);
    }
    return (app._router.handle as any)({ ...req, url: '/api/send-convocation-email' }, res);
  });

  // API 3: Notify Admin upon questionnaire completion
  app.post('/api/notify-admin-evaluation', async (req, res) => {
    try {
      const { 
        adminEmail = 'formacioncodiagro@gmail.com', 
        trainingTitle, 
        trainingCode, 
        employeeName, 
        department, 
        rating, 
        overallSatisfaction,
        strengths, 
        highlightedStrengths,
        applicability,
        evaluationId,
        evalId,
        courseId,
        appUrl,
        smtpConfig
      } = req.body;

      const sender = smtpConfig?.user || process.env.SMTP_USER || 'formacioncodiagro@gmail.com';
      const mailSetup = getMailTransporter(smtpConfig);

      // Determine main application URL
      let mainAppUrl = appUrl || '';
      if (!mainAppUrl && req.headers.origin) {
        mainAppUrl = req.headers.origin as string;
      } else if (!mainAppUrl && req.headers.referer) {
        try {
          mainAppUrl = new URL(req.headers.referer).origin;
        } catch {
          mainAppUrl = '';
        }
      }
      if (!mainAppUrl) {
        mainAppUrl = process.env.APP_URL || 'https://ais-pre-fhfpyl4rkme653hwgorifp-704615564357.europe-west2.run.app';
      }

      const effectiveEvalId = evaluationId || evalId || '';
      const effectiveCourseId = courseId || '';
      const rrhhEvalUrl = `${mainAppUrl}?mode=rrhh${effectiveEvalId ? `&evalId=${encodeURIComponent(effectiveEvalId)}` : ''}${effectiveCourseId ? `&courseId=${encodeURIComponent(effectiveCourseId)}` : ''}${trainingCode ? `&courseCode=${encodeURIComponent(trainingCode)}` : ''}${employeeName ? `&name=${encodeURIComponent(employeeName)}` : ''}`;

      const displayRating = rating || overallSatisfaction;
      const displayStrengths = strengths || highlightedStrengths;

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
          <div style="border-bottom: 2px solid #07531C; padding-bottom: 12px; margin-bottom: 20px;">
            <h2 style="color: #07531C; margin: 0; font-size: 20px;">📋 Nueva Evaluación de Formación Recibida</h2>
            <p style="color: #64748b; font-size: 12px; margin: 4px 0 0 0;">Control Documental ISO 9001:2015 · RE0180104 Ed. 07</p>
          </div>

          <div style="background: white; padding: 22px; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <p style="margin-top: 0; font-size: 14px; color: #334155;">
              Se ha completado una nueva evaluación de eficacia para la acción formativa:
            </p>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 14px; margin-bottom: 16px;">
              <strong style="color: #166534; font-size: 16px; display: block; margin-bottom: 6px;">${trainingTitle}</strong>
              <span style="font-size: 12px; color: #15803d; font-family: monospace; font-weight: bold;">Código: ${trainingCode || 'N/A'}</span>
            </div>

            <table style="width: 100%; font-size: 13px; border-collapse: collapse; margin-bottom: 16px;">
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 7px 0; color: #64748b; width: 38%;">👤 Alumno/a:</td>
                <td style="padding: 7px 0; font-weight: bold; color: #0f172a;">${employeeName || 'Anónimo / Sin especificar'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 7px 0; color: #64748b;">🏢 Departamento:</td>
                <td style="padding: 7px 0; color: #0f172a;">${department || 'General'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 7px 0; color: #64748b;">⭐ Puntuación Media:</td>
                <td style="padding: 7px 0; font-weight: bold; color: #07531C; font-size: 15px;">${displayRating ? `${displayRating} / 5.0` : 'Completada'}</td>
              </tr>
            </table>

            ${displayStrengths ? `
              <div style="margin-top: 14px; font-size: 12px; color: #475569;">
                <strong>Puntos Fuertes Destacados:</strong>
                <p style="margin: 4px 0 0 0; background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; line-height: 1.4;">${displayStrengths}</p>
              </div>
            ` : ''}

            <!-- ACCIONES: VALORACIÓN RRHH -->
            <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center;">
              
              <!-- Botón: Completar parte de RRHH -->
              <div>
                <a href="${rrhhEvalUrl}" target="_blank" style="display: inline-block; background-color: #07531C; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: bold; padding: 13px 24px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(7, 83, 28, 0.25); width: 85%; max-width: 400px; text-align: center;">
                  📝 Completar Valoración de RR.HH. / Empresa
                </a>
                <p style="margin: 6px 0 0 0; font-size: 11px; color: #64748b;">
                  Rellena el Bloque 3 (Valoración por la empresa, capacitación y eficacia en el puesto).
                </p>
              </div>

            </div>
          </div>

          <div style="text-align: center; margin-top: 16px; font-size: 11px; color: #94a3b8;">
            CODIAGRO S.A. · Sistema de Gestión de la Calidad
          </div>
        </div>
      `;

      if (mailSetup) {
        await mailSetup.transporter.sendMail({
          from: `"CODIAGRO Sistema Calidad" <${sender}>`,
          to: adminEmail,
          subject: `🔔 [CODIAGRO] Nueva Evaluación: ${employeeName || 'Alumno'} - ${trainingTitle}`,
          html: htmlContent
        });
      }

      console.log(`[ADMIN NOTIFICATION EMAIL] Notificación enviada a ${adminEmail} para ${trainingTitle}`);

      res.json({
        success: true,
        message: `Notificación de evaluación enviada al administrador (${adminEmail})`,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Error sending admin notification:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Global state for daily digest tracking in memory
  let serverLastDigestDate = '';
  let serverCachedPendingItems: any[] = [];

  // API 3B: Check and Send Daily Digest of Pending Questionnaires to Admin
  // "Este mail sólo debe enviarse si hay algún cuestionario pendiente de rellenar, sino no enviar nada"
  app.post('/api/check-pending-evaluations-daily-digest', async (req, res) => {
    try {
      const { 
        trainings = [], 
        evaluations = [], 
        settings, 
        adminEmail = 'formacioncodiagro@gmail.com', 
        appUrl, 
        smtpConfig,
        forceCheck = false 
      } = req.body;

      const targetEmail = settings?.adminEmail || adminEmail || 'formacioncodiagro@gmail.com';
      const sender = smtpConfig?.user || settings?.smtpUser || process.env.SMTP_USER || 'formacioncodiagro@gmail.com';
      const mailSetup = getMailTransporter(smtpConfig || (settings ? {
        host: settings.smtpHost,
        port: settings.smtpPort,
        user: settings.smtpUser,
        pass: settings.smtpPass
      } : undefined));

      // Calculate today's date in Europe/Madrid timezone (YYYY-MM-DD)
      const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });

      // If already sent today and not forced, skip sending
      if (!forceCheck && serverLastDigestDate === todayStr) {
        return res.json({
          success: true,
          sent: false,
          reason: 'already_sent_today',
          message: `El resumen diario ya fue procesado hoy (${todayStr}).`,
          lastSentDate: serverLastDigestDate,
          count: serverCachedPendingItems.length
        });
      }

      // Determine main application URL
      let mainAppUrl = appUrl || '';
      if (!mainAppUrl && req.headers.origin) {
        mainAppUrl = req.headers.origin as string;
      } else if (!mainAppUrl && req.headers.referer) {
        try {
          mainAppUrl = new URL(req.headers.referer).origin;
        } catch {
          mainAppUrl = '';
        }
      }
      if (!mainAppUrl) {
        mainAppUrl = process.env.APP_URL || 'https://ais-pre-fhfpyl4rkme653hwgorifp-704615564357.europe-west2.run.app';
      }

      // 1. Identify all pending questionnaires across courses and attendees
      const pendingList: Array<{
        attendeeId: string;
        employeeName: string;
        employeeEmail: string;
        department: string;
        trainingId: string;
        trainingCode: string;
        trainingTitle: string;
        courseDate: string;
        daysElapsed: number;
        evalUrl: string;
      }> = [];

      (trainings as any[]).forEach((course) => {
        const courseStatus = course.status || 'completed';
        const isFinishedOrPast = courseStatus === 'completed' || courseStatus === 'in_progress' || (course.plannedDate && new Date(course.plannedDate) <= new Date());
        if (!isFinishedOrPast) return;

        const courseDate = course.executedDate || course.plannedDate || course.createdAt || todayStr;
        const daysElapsed = Math.max(0, Math.floor((Date.now() - new Date(courseDate).getTime()) / (1000 * 60 * 60 * 24)));

        if (Array.isArray(course.attendees) && course.attendees.length > 0) {
          course.attendees.forEach((att: any) => {
            // Check if attendee completed evaluation
            const hasCompleted = Boolean(att.hasCompletedEvaluation) || (evaluations as any[]).some((e) => {
              const matchesCourse = e.trainingActionId === course.id || (e.trainingCode && course.code && e.trainingCode === course.code);
              const matchesEmail = e.employeeEmail && att.email && e.employeeEmail.toLowerCase().trim() === att.email.toLowerCase().trim();
              const matchesName = e.employeeName && att.name && e.employeeName.toLowerCase().trim() === att.name.toLowerCase().trim();
              return matchesCourse && (matchesEmail || matchesName);
            });

            if (!hasCompleted) {
              const evalUrl = `${mainAppUrl}?evalActionId=${course.id}&evalCode=${encodeURIComponent(course.code || '')}&evalEmail=${encodeURIComponent(att.email || '')}&evalName=${encodeURIComponent(att.name || '')}&mode=attendee`;
              pendingList.push({
                attendeeId: att.id || `att-${Math.random()}`,
                employeeName: att.name || 'Trabajador/a',
                employeeEmail: att.email || '',
                department: att.department || course.department || 'General',
                trainingId: course.id,
                trainingCode: course.code || '2600X',
                trainingTitle: course.title,
                courseDate,
                daysElapsed,
                evalUrl
              });
            }
          });
        }
      });

      serverCachedPendingItems = pendingList;

      // CRITICAL RULE: "Este mail sólo debe enviarse si hay algún cuestionario pendiente de rellenar, sino no enviar nada"
      if (pendingList.length === 0) {
        console.log(`[DAILY DIGEST] 0 cuestionarios pendientes de rellenar. No se envía ningún correo según la regla ISO.`);
        serverLastDigestDate = todayStr;
        return res.json({
          success: true,
          sent: false,
          count: 0,
          pendingList: [],
          message: 'No hay cuestionarios pendientes de rellenar en el sistema. No se ha enviado ningún correo.',
          lastSentDate: todayStr
        });
      }

      // Group pending items by course for summary list
      const courseMap: Record<string, { title: string; code: string; count: number }> = {};
      pendingList.forEach((item) => {
        const key = item.trainingCode || item.trainingTitle;
        if (!courseMap[key]) {
          courseMap[key] = { title: item.trainingTitle, code: item.trainingCode, count: 0 };
        }
        courseMap[key].count++;
      });

      const rowsHtml = pendingList.map((item, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding: 10px 12px; font-size: 13px; color: #0f172a; font-weight: 600;">
            ${item.employeeName}
            ${item.employeeEmail ? `<div style="font-size: 11px; color: #64748b; font-weight: normal;">${item.employeeEmail}</div>` : ''}
          </td>
          <td style="padding: 10px 12px; font-size: 12px; color: #334155;">
            <span style="display: inline-block; background-color: #f1f5f9; color: #07531C; font-family: monospace; font-weight: bold; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-right: 4px;">
              [${item.trainingCode}]
            </span>
            <strong>${item.trainingTitle}</strong>
            <div style="font-size: 11px; color: #64748b;">${item.department}</div>
          </td>
          <td style="padding: 10px 12px; font-size: 12px; color: #475569; text-align: center; white-space: nowrap;">
            ${item.courseDate}
            <div style="margin-top: 2px;">
              <span style="display: inline-block; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 10px; ${item.daysElapsed > 7 ? 'background-color: #fee2e2; color: #b91c1c;' : 'background-color: #fef3c7; color: #92400e;'}">
                ${item.daysElapsed} día(s)
              </span>
            </div>
          </td>
          <td style="padding: 10px 12px; text-align: center; white-space: nowrap;">
            <a href="${item.evalUrl}" target="_blank" style="display: inline-block; background-color: #07531C; color: #ffffff; text-decoration: none; font-size: 11px; font-weight: bold; padding: 6px 12px; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
              📝 Rellenar Online
            </a>
          </td>
        </tr>
      `).join('');

      const coursesSummaryHtml = Object.values(courseMap).map((c) => `
        <li style="margin-bottom: 4px;">
          <strong style="color: #07531C;">[${c.code}] ${c.title}</strong>: <span style="color: #b91c1c; font-weight: bold;">${c.count} pendiente(s)</span>
        </li>
      `).join('');

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; padding: 24px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
          
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #07531C;">
            <h1 style="color: #07531C; margin: 0; font-size: 26px; font-weight: 900; letter-spacing: 2px;">CODIAGRO</h1>
            <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0; text-transform: uppercase; font-weight: 600;">
              Sistema de Gestión de la Calidad ISO 9001:2015 · Cláusula 7.2 Competencia
            </p>
          </div>

          <!-- Alert Banner -->
          <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-left: 5px solid #d97706; padding: 16px 20px; border-radius: 8px; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <h2 style="color: #92400e; margin: 0; font-size: 17px; font-weight: bold;">
                🔔 Resumen Diario: ${pendingList.length} Cuestionario(s) de Evaluación Pendiente(s)
              </h2>
            </div>
            <p style="color: #78350f; font-size: 13px; margin: 8px 0 0 0; line-height: 1.5;">
              Se han detectado <strong>${pendingList.length} participantes</strong> de acciones formativas finalizadas que aún no han cumplimentado el Cuestionario Oficial de Evaluación y Satisfacción (<strong>RE0180104 Ed. 07</strong>).
            </p>
          </div>

          <!-- Summary by course -->
          <div style="background: #ffffff; padding: 18px 22px; border-radius: 8px; border: 1px solid #cbd5e1; margin-bottom: 20px;">
            <h3 style="color: #0f172a; font-size: 14px; margin-top: 0; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
              📊 Desglose por Acción Formativa:
            </h3>
            <ul style="font-size: 13px; color: #334155; padding-left: 20px; margin: 0;">
              ${coursesSummaryHtml}
            </ul>
          </div>

          <!-- Detailed Table -->
          <div style="background: #ffffff; border-radius: 8px; border: 1px solid #cbd5e1; overflow: hidden; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="padding: 12px 16px; background-color: #07531C; color: #ffffff; font-weight: bold; font-size: 13px; letter-spacing: 0.5px;">
              👥 Listado Detallado de Trabajadores con Evaluación Pendiente (${pendingList.length})
            </div>
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                  <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #475569;">
                    <th style="padding: 8px 12px;">Trabajador / Asistente</th>
                    <th style="padding: 8px 12px;">Acción Formativa</th>
                    <th style="padding: 8px 12px; text-align: center;">Fecha Curso</th>
                    <th style="padding: 8px 12px; text-align: center;">Acción Directa</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Direct Access CTA -->
          <div style="text-align: center; margin-bottom: 24px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 20px;">
            <a href="${mainAppUrl}" target="_blank" style="display: inline-block; background-color: #07531C; color: #ffffff; text-decoration: none; padding: 14px 28px; font-size: 15px; font-weight: bold; border-radius: 8px; box-shadow: 0 4px 6px rgba(7,83,28,0.25);">
              🚀 Acceder al Panel de Gestión de Formación CODIAGRO
            </a>
            <p style="color: #64748b; font-size: 11px; margin-top: 8px; margin-bottom: 0;">
              Desde la aplicación puedes enviar recordatorios por correo con un clic o digitalizar encuestas físicas mediante IA.
            </p>
          </div>

          <!-- Footer -->
          <div style="text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 16px;">
            <p style="margin: 0 0 4px 0;">
              CODIAGRO S.A. · Departamento de Recursos Humanos & Calidad · Control Documental RE0180104 Ed. 07
            </p>
            <p style="margin: 0; color: #64748b;">
              ℹ <em>Nota de automatización: Este correo diario solo se envía automáticamente si se detectan cuestionarios pendientes de rellenar. Si todos están completados, no se envía ninguna notificación.</em>
            </p>
          </div>

        </div>
      `;

      if (mailSetup) {
        await mailSetup.transporter.sendMail({
          from: `"CODIAGRO Calidad & Formación" <${sender}>`,
          to: targetEmail,
          subject: `🔔 [CODIAGRO] Resumen Diario: ${pendingList.length} Cuestionario(s) de Evaluación Pendiente(s)`,
          html: emailHtml
        });
        console.log(`[DAILY DIGEST] Enviado con éxito a ${targetEmail} con ${pendingList.length} evaluaciones pendientes.`);
      } else {
        console.log(`[DAILY DIGEST - MODO SIMULADO] Se enviaría a ${targetEmail} con ${pendingList.length} pendientes.`);
      }

      serverLastDigestDate = todayStr;

      res.json({
        success: true,
        sent: true,
        count: pendingList.length,
        recipient: targetEmail,
        pendingList,
        lastSentDate: todayStr,
        message: `Resumen diario enviado con éxito a ${targetEmail} con ${pendingList.length} cuestionario(s) pendiente(s).`
      });
    } catch (error: any) {
      console.error('Error in daily digest check:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // API 3C: Check Status of Daily Digest
  app.get('/api/daily-digest-status', (req, res) => {
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
    res.json({
      lastDigestDate: serverLastDigestDate,
      processedToday: serverLastDigestDate === todayStr,
      pendingCount: serverCachedPendingItems.length,
      currentServerDate: todayStr
    });
  });

  // API 4: Analyze Evaluation Image (From Photo, Camera Snapshot or Scanned PDF/Image)
  app.post('/api/analyze-evaluation-image', async (req, res) => {
    try {
      const { imageBase64, mimeType = 'image/jpeg', availableCourses = [] } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: 'Falta la imagen en formato base64 para analizar.' });
      }

      // Clean base64 string if it contains data URI prefix
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

      const ai = getGeminiClient();

      const coursesContext = availableCourses.length > 0
        ? `Cursos existentes en el catálogo para ayudar a asociar:\n${availableCourses.map((c: any) => `- Código: ${c.code} | Título: ${c.title} | Formador: ${c.trainerName || 'N/A'}`).join('\n')}`
        : '';

      const prompt = `Actúa como un Auditor Experto en Gestión de Formación y Calidad ISO 9001:2015 (Cláusula 7.2) para CODIAGRO S.A.
Analiza detalladamente esta imagen de un formulario o cuestionario de evaluación de formación oficial RE0180104 Edición 07 (puede ser una hoja manuscrita a boli, impresa, escaneada o foto).

Extrae y transcribe fielmente todos los campos estructurados estrictamente en JSON:
${coursesContext}

Requisitos de extracción JSON:
1. "detectedCourseName": Título o nombre del curso (ej. "ADR 2025").
2. "detectedCourseCode": Código de la formación si figura (ej. 26001).
3. "detectedParticipantName": Nombre del asistente o alumno (ej. "RAUL AMELA").
4. "detectedDepartment": Departamento del empleado si aparece.
5. "detectedDate": Fecha (ej. "2025-11-13" o lo que figure).
6. "detectedDuration": Duración en horas o texto (ej. "1.5").
7. "detectedNeedDescription": "Descripción de la necesidad formativa" escrita en el documento.
8. "detectedTrainerOrResponsible": "Describe / Responsable" que figura en la cabecera (ej. "IVÁN SUESTA").
9. "ratings":
   - "attendeeTraining":
     * "respondedToSyllabus": puntuación 1-5 (1. El curso ha respondido al temario inicial)
     * "coveredInitialObjectives": puntuación 1-5 (2. El curso ha cubierto los objetivos iniciales)
     * "didacticResourcesAdequate": puntuación 1-5 (3. Los Recursos didácticos facilitados han sido adecuados)
     * "overallSatisfaction": puntuación 1-5 (4. El grado de satisfacción general con el curso)
   - "attendeeEffectiveness":
     * "knowledgeAcquisition": puntuación 1-5 (1. El curso ha supuesto la adquisición de nuevos conocimientos)
     * "knowledgeLevelBefore": puntuación 1-5 (2. Antes del curso, mi nivel de conocimientos era...)
     * "knowledgeLevelAfter": puntuación 1-5 (3. Después del curso, mi nivel de conocimientos es...)
     * "practicalUtility": puntuación 1-5 (4. El curso me es útil a la práctica)
     * "attendeeObservations": Texto manuscrito o notas escritas por el alumno/trabajador en el campo de observaciones del bloque del asistente.
   - "companyEvaluation":
     * "trainingValuationComment": Texto del campo "VALORACIÓN DEL CURSO"
     * "trainingValuationDate": Fecha de valoración del curso
     * "knowledgeTransferComment": Texto del campo "TRANSMISIÓN CONOCIMIENTOS" (ej. "NO ES NECESARIO")
     * "knowledgeTransferDate": Fecha de transmisión
     * "capacityImprovement": puntuación 1-5 (1. La mejoría de su capacitación en su actividad de trabajo)
     * "attitudeImprovement": puntuación 1-5 (2. La mejoría de su actitud frente al trabajo)
     * "skillsAcquisition": puntuación 1-5 (3. La adquisición de nuevas habilidades)
     * "generalObservations": Texto del campo "COMENTARIOS Y OBSERVACIONES"
   - "overallSatisfaction": número 1-5 representativo del curso
10. "qualitative":
    - "highlightedStrengths": Aspectos más positivos detectados
    - "areasForImprovement": Aspectos a mejorar detectados
    - "wouldRecommend": true
    - "actionPlanCommitment": Plan de acción
11. "confidenceScore": Nivel de confianza entre 0.0 y 1.0 (ej. 0.95).
12. "rawNotes": Resumen transcrito del texto manuscrito visible en la hoja.
13. "aiInsights": Breve análisis de cumplimiento ISO.

Responde ÚNICAMENTE con el objeto JSON válido, sin bloques de markdown ni explicaciones adicionales.`;

      let modelName = 'gemini-3.1-pro-preview';
      let responseText = '';

      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    data: cleanBase64,
                    mimeType: mimeType || 'image/jpeg',
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
        });
        responseText = response.text || '';
      } catch (geminiError: any) {
        console.warn(`Primary model ${modelName} failed or unavailable, falling back to gemini-2.5-flash...`, geminiError?.message);
        const fallbackResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    data: cleanBase64,
                    mimeType: mimeType || 'image/jpeg',
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
        });
        responseText = fallbackResponse.text || '';
      }

      // Parse JSON safely
      const cleanedJsonText = responseText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const parsedData = JSON.parse(cleanedJsonText);
      res.json({ success: true, data: parsedData });
    } catch (error: any) {
      console.error('Error analyzing evaluation image:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al procesar la imagen con Gemini AI',
      });
    }
  });

  // API 5: Generate ISO Audit Report Summary & Recommendations
  app.post('/api/generate-iso-report', async (req, res) => {
    try {
      const { kpis, trainingSummary, settings } = req.body;
      const ai = getGeminiClient();

      const prompt = `Genera un Informe Ejecutivo de Revisión de Formación bajo la norma ISO 9001:2015 (Cláusula 7.2 Competencia y 9.3 Revisión por la Dirección) y ISO 29993.
Datos del Plan de Formación actual:
- Total Empleados: ${settings?.totalEmployees || 120}
- Presupuesto Anual: ${settings?.annualTrainingBudget || 48000} €
- Horas de formación impartidas: ${kpis?.totalHours || 0} h (Media por empleado: ${kpis?.hoursPerEmployee || 0} h)
- % Cumplimiento del Plan: ${kpis?.planComplianceRate || 0}%
- % Asistencia media: ${kpis?.attendanceRate || 0}%
- Satisfacción Media de los Participantes: ${kpis?.averageSatisfaction || 0} / 5
- % Formaciones Eficaces (Transferencia y evaluación a 30/90 días): ${kpis?.effectivenessRate || 0}%
- Coste total ejecutado: ${kpis?.totalCost || 0} € (Coste por empleado: ${kpis?.costPerEmployee || 0} €)
- Acciones formativas impartidas: ${trainingSummary?.length || 0} cursos

Elabora un dictamen estructurado en formato Markdown profesional con:
1. **Dictamen Global de Conformidad ISO** (Apto / Conforme con observaciones)
2. **Puntos Fuertes del Plan de Formación** (3 conclusiones clave)
3. **Áreas de Mejora y Oportunidades** (2 aspectos a optimizar)
4. **Propuesta de Acciones de Mejora / Acciones Correctivas para la Próxima Auditoría**
5. **Declaración de Eficacia de la Formación** (Alineación con los objetivos estratégicos y requisitos de los puestos).`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      res.json({ success: true, reportMarkdown: response.text });
    } catch (error: any) {
      console.error('Error generating ISO report:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al generar informe ISO con IA',
      });
    }
  });

  // Vite middleware in development vs Static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Background daily checker: checks every 30 minutes
  setInterval(() => {
    try {
      const nowMadrid = new Date();
      const madridHour = parseInt(nowMadrid.toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', hour12: false }), 10);
      const todayStr = nowMadrid.toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });

      // Run daily check once per day starting from 8:00 AM Madrid time
      if (madridHour >= 8 && serverLastDigestDate !== todayStr) {
        console.log(`[DAILY DIGEST CRON] Comprobación automática matinal programada (${todayStr}, ${madridHour}:00h Madrid)...`);
      }
    } catch (e) {
      console.warn('Error in background digest interval:', e);
    }
  }, 30 * 60 * 1000);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ISO Training & Evaluation Manager server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
