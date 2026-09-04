import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  TrainingAction, 
  Evaluation, 
  EffectivenessFollowup, 
  CompanySettings 
} from '../types';
import { 
  INITIAL_TRAINING_ACTIONS, 
  INITIAL_EVALUATIONS, 
  INITIAL_FOLLOWUPS, 
  INITIAL_SETTINGS 
} from '../data/initialData';

const LOCAL_STORAGE_KEYS = {
  TRAININGS: 'iso_trainings_data',
  EVALUATIONS: 'iso_evaluations_data',
  FOLLOWUPS: 'iso_followups_data',
  SETTINGS: 'iso_company_settings',
  INITIALIZED: 'iso_app_initialized_v2',
};

export class AppStorage {
  // 1. Fetch Training Actions
  static async getTrainingActions(): Promise<TrainingAction[]> {
    let list: TrainingAction[] = [];
    let fetched = false;

    // A. First priority: Server DB (works on Render, local server, and everywhere)
    try {
      const res = await fetch('/api/db/trainings');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          list = data;
          fetched = true;
        }
      }
    } catch (e) {
      // Offline / client-only fallback
    }

    // B. Second priority: Firestore
    if (!fetched) {
      try {
        const snap = await getDocs(collection(db, 'training_actions'));
        if (!snap.empty) {
          list = [];
          snap.forEach((d) => {
            list.push({ ...d.data(), id: d.id } as TrainingAction);
          });
          fetched = true;
        }
      } catch (e) {
        console.warn('Firestore fetch failed:', e);
      }
    }

    // C. Third priority: LocalStorage
    if (!fetched) {
      const local = localStorage.getItem(LOCAL_STORAGE_KEYS.TRAININGS);
      if (local !== null) {
        try {
          list = JSON.parse(local);
        } catch {}
      } else {
        list = [];
      }
    }

    localStorage.setItem(LOCAL_STORAGE_KEYS.INITIALIZED, 'true');

    // Auto-migrate legacy FOR-2026-XX codes and sync attendees counts
    list = list.map((t, idx) => {
      let updatedCourse = { ...t };
      if (t.code && t.code.startsWith('FOR-2026-')) {
        const num = t.code.split('-')[2] || (idx + 1).toString();
        const codeNum = parseInt(num, 10) || (idx + 1);
        updatedCourse.code = `26${codeNum.toString().padStart(3, '0')}`;
      }
      if (updatedCourse.attendees && updatedCourse.attendees.length > 0) {
        updatedCourse.totalParticipantsPlanned = updatedCourse.attendees.length;
        if (updatedCourse.status === 'completed' && (!updatedCourse.totalParticipantsAttended || updatedCourse.totalParticipantsAttended > updatedCourse.attendees.length)) {
          updatedCourse.totalParticipantsAttended = updatedCourse.attendees.length;
        }
      }
      return updatedCourse;
    });

    localStorage.setItem(LOCAL_STORAGE_KEYS.TRAININGS, JSON.stringify(list));
    return list;
  }

  // 2. Save / Update Training Action
  static async saveTrainingAction(action: TrainingAction): Promise<TrainingAction> {
    const id = action.id || `act-${Date.now()}`;
    const toSave: TrainingAction = { ...action, id };

    // 1. Save to Server DB
    try {
      await fetch('/api/db/trainings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toSave),
      });
    } catch (e) {
      console.warn('Server save warning:', e);
    }

    // 2. Save to Firestore
    try {
      await setDoc(doc(db, 'training_actions', id), toSave);
    } catch (e) {
      console.warn('Firestore write warning:', e);
    }

    // 3. Save to LocalStorage
    let current: TrainingAction[] = [];
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.TRAININGS);
      if (raw) current = JSON.parse(raw);
    } catch {}

    const index = current.findIndex((item) => item.id === id);
    let updated: TrainingAction[];
    if (index >= 0) {
      updated = [...current];
      updated[index] = toSave;
    } else {
      updated = [toSave, ...current];
    }
    localStorage.setItem(LOCAL_STORAGE_KEYS.INITIALIZED, 'true');
    localStorage.setItem(LOCAL_STORAGE_KEYS.TRAININGS, JSON.stringify(updated));
    return toSave;
  }

  // 3. Delete Training Action
  static async deleteTrainingAction(id: string): Promise<void> {
    try {
      await fetch(`/api/db/trainings/${id}`, { method: 'DELETE' });
    } catch (e) {}

    try {
      await deleteDoc(doc(db, 'training_actions', id));
    } catch (e) {}

    let current: TrainingAction[] = [];
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.TRAININGS);
      if (raw) current = JSON.parse(raw);
    } catch {}

    const updated = current.filter((item) => item.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEYS.INITIALIZED, 'true');
    localStorage.setItem(LOCAL_STORAGE_KEYS.TRAININGS, JSON.stringify(updated));
  }

  // 4. Fetch Evaluations
  static async getEvaluations(): Promise<Evaluation[]> {
    let list: Evaluation[] = [];
    let fetched = false;

    // A. Server DB
    try {
      const res = await fetch('/api/db/evaluations');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          list = data;
          fetched = true;
        }
      }
    } catch (e) {}

    // B. Firestore
    if (!fetched) {
      try {
        const snap = await getDocs(collection(db, 'evaluations'));
        if (!snap.empty) {
          list = [];
          snap.forEach((d) => {
            list.push({ ...d.data(), id: d.id } as Evaluation);
          });
          fetched = true;
        }
      } catch (e) {}
    }

    // C. LocalStorage
    if (!fetched) {
      const local = localStorage.getItem(LOCAL_STORAGE_KEYS.EVALUATIONS);
      if (local !== null) {
        try {
          list = JSON.parse(local);
        } catch {}
      } else {
        list = [];
      }
    }

    localStorage.setItem(LOCAL_STORAGE_KEYS.EVALUATIONS, JSON.stringify(list));
    return list;
  }

  // 5. Add New Evaluation (Recalculates training average satisfaction & count)
  static async addEvaluation(evalData: Omit<Evaluation, 'id'>): Promise<Evaluation> {
    const id = `eval-${Date.now()}`;
    const allTrainings = await this.getTrainingActions();
    const courseTrain = allTrainings.find((t) => t.id === evalData.trainingActionId);
    
    const newEval: Evaluation = { 
      ...evalData, 
      id,
      trainingCode: evalData.trainingCode || courseTrain?.code || '26001'
    };

    // 1. Get current evaluations using safe merge
    const currentEvals = await this.getEvaluations();
    const updatedEvals = [newEval, ...currentEvals.filter((e) => e.id !== id)];
    localStorage.setItem(LOCAL_STORAGE_KEYS.EVALUATIONS, JSON.stringify(updatedEvals));

    // 2. Persist to Firestore
    try {
      const sanitized = JSON.parse(JSON.stringify(newEval));
      await setDoc(doc(db, 'evaluations', id), sanitized);
    } catch (e) {
      console.warn('Firestore eval write failed, stored locally:', e);
    }

    // 3. Recalculate training action satisfaction & effectiveness
    if (courseTrain) {
      const courseEvals = updatedEvals.filter((e) => e.trainingActionId === courseTrain.id);
      const totalScore = courseEvals.reduce((acc, curr) => acc + (curr.ratings?.weightedScore || curr.ratings?.overallSatisfaction || 0), 0);
      const avgScore = courseEvals.length > 0 ? Number((totalScore / courseEvals.length).toFixed(2)) : 0;
      
      const totalApp = courseEvals.reduce((acc, curr) => acc + (curr.ratings?.jobApplicability || curr.ratings?.attendeeEffectiveness?.practicalUtility || 0), 0);
      const avgApp = courseEvals.length > 0 ? (totalApp / courseEvals.length) : 0;
      const effScore = Math.min(100, Math.round((avgApp / 5) * 100));

      const updatedCourse: TrainingAction = {
        ...courseTrain,
        averageSatisfaction: avgScore,
        evaluationsCount: courseEvals.length,
        effectivenessScore: effScore,
        isEffective: effScore >= 75
      };
      await this.saveTrainingAction(updatedCourse);
    }

    return newEval;
  }

  // 5b. Update Evaluation
  static async saveEvaluation(evaluation: Evaluation): Promise<Evaluation> {
    const id = evaluation.id;
    
    // 1. Get current evaluations
    const currentEvals = await this.getEvaluations();
    const index = currentEvals.findIndex((e) => e.id === id);
    let updatedEvals: Evaluation[];
    if (index >= 0) {
      updatedEvals = [...currentEvals];
      updatedEvals[index] = evaluation;
    } else {
      updatedEvals = [evaluation, ...currentEvals];
    }
    localStorage.setItem(LOCAL_STORAGE_KEYS.EVALUATIONS, JSON.stringify(updatedEvals));

    // 2. Persist to Firestore with sanitized object
    try {
      const sanitized = JSON.parse(JSON.stringify(evaluation));
      await setDoc(doc(db, 'evaluations', id), sanitized);
    } catch (e) {
      console.warn('Firestore eval save warning:', e);
    }

    // 3. Recalculate training average satisfaction and count for the course
    if (evaluation.trainingActionId) {
      const allTrainings = await this.getTrainingActions();
      const courseTrain = allTrainings.find((t) => t.id === evaluation.trainingActionId);
      if (courseTrain) {
        const courseEvals = updatedEvals.filter((e) => e.trainingActionId === courseTrain.id);
        const totalScore = courseEvals.reduce((acc, curr) => acc + (curr.ratings?.weightedScore || curr.ratings?.overallSatisfaction || 0), 0);
        const avgScore = courseEvals.length > 0 ? Number((totalScore / courseEvals.length).toFixed(2)) : 0;
        
        const totalApp = courseEvals.reduce((acc, curr) => acc + (curr.ratings?.jobApplicability || curr.ratings?.attendeeEffectiveness?.practicalUtility || 0), 0);
        const avgApp = courseEvals.length > 0 ? (totalApp / courseEvals.length) : 0;
        const effScore = Math.min(100, Math.round((avgApp / 5) * 100));

        await this.saveTrainingAction({
          ...courseTrain,
          averageSatisfaction: avgScore,
          evaluationsCount: courseEvals.length,
          effectivenessScore: effScore,
          isEffective: effScore >= 75
        });
      }
    }

    return evaluation;
  }

  // 5c. Delete Evaluation
  static async deleteEvaluation(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'evaluations', id));
    } catch (e) {
      console.warn('Firestore eval delete failed:', e);
    }

    const allEvals = await this.getEvaluations();
    const targetEval = allEvals.find(e => e.id === id);
    const updatedEvals = allEvals.filter(e => e.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEYS.INITIALIZED, 'true');
    localStorage.setItem(LOCAL_STORAGE_KEYS.EVALUATIONS, JSON.stringify(updatedEvals));

    // Recalculate training score if necessary
    if (targetEval?.trainingActionId) {
      const allTrainings = await this.getTrainingActions();
      const courseTrain = allTrainings.find(t => t.id === targetEval.trainingActionId);
      if (courseTrain) {
        const courseEvals = updatedEvals.filter(e => e.trainingActionId === courseTrain.id);
        if (courseEvals.length > 0) {
          const totalScore = courseEvals.reduce((acc, curr) => acc + (curr.ratings?.weightedScore || curr.ratings?.overallSatisfaction || 0), 0);
          const avgScore = Number((totalScore / courseEvals.length).toFixed(2));
          const totalApp = courseEvals.reduce((acc, curr) => acc + (curr.ratings?.jobApplicability || curr.ratings?.attendeeEffectiveness?.practicalUtility || 0), 0);
          const effScore = Math.min(100, Math.round(((totalApp / courseEvals.length) / 5) * 100));
          await this.saveTrainingAction({
            ...courseTrain,
            averageSatisfaction: avgScore,
            evaluationsCount: courseEvals.length,
            effectivenessScore: effScore,
            isEffective: effScore >= 75
          });
        } else {
          await this.saveTrainingAction({
            ...courseTrain,
            averageSatisfaction: undefined,
            evaluationsCount: 0,
            effectivenessScore: undefined,
            isEffective: undefined
          });
        }
      }
    }
  }

  // 6. Fetch Followups
  static async getFollowups(): Promise<EffectivenessFollowup[]> {
    let list: EffectivenessFollowup[] = [];
    let fetched = false;

    // A. Server DB
    try {
      const res = await fetch('/api/db/followups');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          list = data;
          fetched = true;
        }
      }
    } catch (e) {}

    // B. Firestore
    if (!fetched) {
      try {
        const snap = await getDocs(collection(db, 'followups'));
        if (!snap.empty) {
          list = [];
          snap.forEach((d) => {
            list.push({ ...d.data(), id: d.id } as EffectivenessFollowup);
          });
          fetched = true;
        }
      } catch (e) {
        console.warn('Firestore followups fetch error:', e);
      }
    }

    // C. LocalStorage
    if (!fetched) {
      const local = localStorage.getItem(LOCAL_STORAGE_KEYS.FOLLOWUPS);
      if (local !== null) {
        try {
          list = JSON.parse(local);
        } catch {}
      } else {
        list = [];
      }
    }

    localStorage.setItem(LOCAL_STORAGE_KEYS.FOLLOWUPS, JSON.stringify(list));
    return list;
  }

  // 7. Save Followup
  static async saveFollowup(followup: EffectivenessFollowup): Promise<EffectivenessFollowup> {
    const id = followup.id || `fol-${Date.now()}`;
    const toSave: EffectivenessFollowup = {
      ...followup,
      id,
      comments: followup.comments || '',
      trainingCode: followup.trainingCode || '26001',
      evaluationDate: followup.evaluationDate || new Date().toISOString().slice(0, 10),
      status: followup.status || 'completed'
    };

    // 1. Server DB
    try {
      await fetch('/api/db/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toSave),
      });
    } catch (e) {}

    // 2. Firestore
    try {
      const sanitized = JSON.parse(JSON.stringify(toSave));
      await setDoc(doc(db, 'followups', id), sanitized);
    } catch (e) {
      console.warn('Firestore followup save warning:', e);
    }

    // 3. LocalStorage
    let currentLocal: EffectivenessFollowup[] = [];
    const rawLocal = localStorage.getItem(LOCAL_STORAGE_KEYS.FOLLOWUPS);
    if (rawLocal) {
      try {
        currentLocal = JSON.parse(rawLocal);
      } catch {}
    }

    const index = currentLocal.findIndex((f) => f.id === id);
    let updated: EffectivenessFollowup[];
    if (index >= 0) {
      updated = [...currentLocal];
      updated[index] = toSave;
    } else {
      updated = [toSave, ...currentLocal];
    }
    localStorage.setItem(LOCAL_STORAGE_KEYS.INITIALIZED, 'true');
    localStorage.setItem(LOCAL_STORAGE_KEYS.FOLLOWUPS, JSON.stringify(updated));

    return toSave;
  }

  // 7b. Delete Followup
  static async deleteFollowup(id: string): Promise<void> {
    try {
      await fetch(`/api/db/followups/${id}`, { method: 'DELETE' });
    } catch (e) {}

    try {
      await deleteDoc(doc(db, 'followups', id));
    } catch (e) {}

    let currentLocal: EffectivenessFollowup[] = [];
    const rawLocal = localStorage.getItem(LOCAL_STORAGE_KEYS.FOLLOWUPS);
    if (rawLocal) {
      try {
        currentLocal = JSON.parse(rawLocal);
      } catch {}
    }
    const updated = currentLocal.filter((f) => f.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEYS.INITIALIZED, 'true');
    localStorage.setItem(LOCAL_STORAGE_KEYS.FOLLOWUPS, JSON.stringify(updated));
  }

  // 8. Company Settings
  static async getSettings(): Promise<CompanySettings> {
    let settings: CompanySettings | null = null;

    // A. Server DB
    try {
      const res = await fetch('/api/db/settings');
      if (res.ok) {
        const data = await res.json();
        if (data && data.companyName) {
          settings = data;
        }
      }
    } catch (e) {}

    // B. Firestore
    if (!settings) {
      try {
        const snap = await getDocs(collection(db, 'company_settings'));
        if (!snap.empty) {
          settings = snap.docs[0].data() as CompanySettings;
        }
      } catch (e) {}
    }

    if (!settings) {
      const local = localStorage.getItem(LOCAL_STORAGE_KEYS.SETTINGS);
      if (local) {
        try {
          settings = JSON.parse(local);
        } catch {}
      }
    }

    if (!settings) {
      settings = INITIAL_SETTINGS;
    }

    // Ensure document code, edition, employees, adminEmail and SMTP defaults are cleanly set
    const mergedSettings: CompanySettings = {
      ...INITIAL_SETTINGS,
      ...settings,
      adminEmail: (settings.adminEmail === 'alma.trilles@codiagro.com' || settings.adminEmail === 'codiagrooscar@gmail.com' || !settings.adminEmail)
        ? 'formacioncodiagro@gmail.com'
        : settings.adminEmail,
      smtpUser: (settings.smtpUser === 'alma.trilles@codiagro.com' || settings.smtpUser === 'codiagrooscar@gmail.com' || !settings.smtpUser)
        ? 'formacioncodiagro@gmail.com'
        : settings.smtpUser,
      smtpHost: (settings.smtpHost === 'smtp.office365.com' || !settings.smtpHost)
        ? 'smtp.gmail.com'
        : settings.smtpHost,
      smtpPort: (settings.smtpPort === 587 || !settings.smtpPort)
        ? 465
        : settings.smtpPort,
      smtpPass: (settings.smtpPass === '1Ujhg23n' || !settings.smtpPass) ? '' : settings.smtpPass,
      documentCode: settings.documentCode || 'RE0180104',
      documentEdition: settings.documentEdition || '07',
      companyName: settings.companyName || 'CODIAGRO S.A.',
      authorizedAdminEmails: Array.from(new Set([
        'formacioncodiagro@gmail.com',
        'alma.trilles@codiagro.com',
        ...(settings.authorizedAdminEmails || []),
        'codiagrooscar@gmail.com'
      ])),
      employees: (settings.employees && settings.employees.length > 0) 
        ? settings.employees 
        : (INITIAL_SETTINGS.employees || []),
      trainingCenters: (settings.trainingCenters && settings.trainingCenters.length > 0)
        ? settings.trainingCenters
        : (INITIAL_SETTINGS.trainingCenters || [])
    };

    localStorage.setItem(LOCAL_STORAGE_KEYS.SETTINGS, JSON.stringify(mergedSettings));
    return mergedSettings;
  }

  static async saveSettings(settings: CompanySettings): Promise<void> {
    try {
      await fetch('/api/db/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
    } catch (e) {}

    try {
      await setDoc(doc(db, 'company_settings', 'main_config'), settings);
    } catch (e) {}
    localStorage.setItem(LOCAL_STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  // Reset to initial demo data
  static async resetToInitialDemo(): Promise<void> {
    localStorage.setItem(LOCAL_STORAGE_KEYS.TRAININGS, JSON.stringify(INITIAL_TRAINING_ACTIONS));
    localStorage.setItem(LOCAL_STORAGE_KEYS.EVALUATIONS, JSON.stringify(INITIAL_EVALUATIONS));
    localStorage.setItem(LOCAL_STORAGE_KEYS.FOLLOWUPS, JSON.stringify(INITIAL_FOLLOWUPS));
    localStorage.setItem(LOCAL_STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));

    // Try syncing initial to Firestore
    try {
      for (const t of INITIAL_TRAINING_ACTIONS) {
        await setDoc(doc(db, 'training_actions', t.id), t);
      }
      for (const e of INITIAL_EVALUATIONS) {
        await setDoc(doc(db, 'evaluations', e.id), e);
      }
      for (const f of INITIAL_FOLLOWUPS) {
        await setDoc(doc(db, 'followups', f.id), f);
      }
      await setDoc(doc(db, 'company_settings', 'main_config'), INITIAL_SETTINGS);
    } catch (e) {
      console.warn('Initial seed to Firestore had notices:', e);
    }
  }
}
