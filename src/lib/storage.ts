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
};

export class AppStorage {
  // 1. Fetch Training Actions
  static async getTrainingActions(): Promise<TrainingAction[]> {
    let list: TrainingAction[] = [];
    try {
      const snap = await getDocs(collection(db, 'training_actions'));
      if (!snap.empty) {
        snap.forEach((d) => {
          list.push({ ...d.data(), id: d.id } as TrainingAction);
        });
      }
    } catch (e) {
      console.warn('Firestore fetch failed or empty, using cached/initial data:', e);
    }

    if (list.length === 0) {
      const local = localStorage.getItem(LOCAL_STORAGE_KEYS.TRAININGS);
      if (local) {
        try {
          list = JSON.parse(local);
        } catch {}
      }
    }

    if (list.length === 0) {
      list = INITIAL_TRAINING_ACTIONS;
    }

    // Auto-migrate legacy FOR-2026-XX codes and sync attendees counts
    list = list.map((t, idx) => {
      let updatedCourse = { ...t };
      if (t.code && t.code.startsWith('FOR-2026-')) {
        const num = t.code.split('-')[2] || (idx + 1).toString();
        const codeNum = parseInt(num, 10) || (idx + 1);
        updatedCourse.code = `26${codeNum.toString().padStart(3, '0')}`;
      }
      // If course has attendees defined, guarantee totalParticipantsPlanned reflects attendees.length
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

    try {
      await setDoc(doc(db, 'training_actions', id), toSave);
    } catch (e) {
      console.warn('Firestore write failed, saving locally:', e);
    }

    // Update local
    const current = await this.getTrainingActions();
    const index = current.findIndex((item) => item.id === id);
    let updated: TrainingAction[];
    if (index >= 0) {
      updated = [...current];
      updated[index] = toSave;
    } else {
      updated = [toSave, ...current];
    }
    localStorage.setItem(LOCAL_STORAGE_KEYS.TRAININGS, JSON.stringify(updated));
    return toSave;
  }

  // 3. Delete Training Action
  static async deleteTrainingAction(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'training_actions', id));
    } catch (e) {
      console.warn('Firestore delete failed:', e);
    }
    const current = await this.getTrainingActions();
    const updated = current.filter((item) => item.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEYS.TRAININGS, JSON.stringify(updated));
  }

  // 4. Fetch Evaluations
  static async getEvaluations(): Promise<Evaluation[]> {
    let firestoreList: Evaluation[] = [];
    try {
      const snap = await getDocs(collection(db, 'evaluations'));
      if (!snap.empty) {
        snap.forEach((d) => {
          firestoreList.push({ ...d.data(), id: d.id } as Evaluation);
        });
      }
    } catch (e) {
      console.warn('Firestore evaluations fetch error:', e);
    }

    let localList: Evaluation[] = [];
    const local = localStorage.getItem(LOCAL_STORAGE_KEYS.EVALUATIONS);
    if (local) {
      try {
        localList = JSON.parse(local);
      } catch {}
    }

    // Merge map by ID so that no evaluations from different courses are lost
    const evalMap = new Map<string, Evaluation>();
    INITIAL_EVALUATIONS.forEach((e) => evalMap.set(e.id, e));
    localList.forEach((e) => evalMap.set(e.id, e));
    firestoreList.forEach((e) => evalMap.set(e.id, e));

    const merged = Array.from(evalMap.values());
    localStorage.setItem(LOCAL_STORAGE_KEYS.EVALUATIONS, JSON.stringify(merged));
    return merged;
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
    try {
      const snap = await getDocs(collection(db, 'followups'));
      if (!snap.empty) {
        const list: EffectivenessFollowup[] = [];
        snap.forEach((d) => {
          list.push({ ...d.data(), id: d.id } as EffectivenessFollowup);
        });
        localStorage.setItem(LOCAL_STORAGE_KEYS.FOLLOWUPS, JSON.stringify(list));
        return list;
      }
    } catch (e) {}

    const local = localStorage.getItem(LOCAL_STORAGE_KEYS.FOLLOWUPS);
    if (local) {
      try {
        return JSON.parse(local);
      } catch {}
    }

    localStorage.setItem(LOCAL_STORAGE_KEYS.FOLLOWUPS, JSON.stringify(INITIAL_FOLLOWUPS));
    return INITIAL_FOLLOWUPS;
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

    // 1. Immediately update LocalStorage
    let currentLocal: EffectivenessFollowup[] = [];
    const rawLocal = localStorage.getItem(LOCAL_STORAGE_KEYS.FOLLOWUPS);
    if (rawLocal) {
      try {
        currentLocal = JSON.parse(rawLocal);
      } catch {}
    }
    if (currentLocal.length === 0) {
      currentLocal = INITIAL_FOLLOWUPS;
    }

    const index = currentLocal.findIndex((f) => f.id === id);
    let updated: EffectivenessFollowup[];
    if (index >= 0) {
      updated = [...currentLocal];
      updated[index] = toSave;
    } else {
      updated = [toSave, ...currentLocal];
    }
    localStorage.setItem(LOCAL_STORAGE_KEYS.FOLLOWUPS, JSON.stringify(updated));

    // 2. Persist to Firestore with sanitized object
    try {
      const sanitized = JSON.parse(JSON.stringify(toSave));
      await setDoc(doc(db, 'followups', id), sanitized);
    } catch (e) {
      console.warn('Firestore followup save warning:', e);
    }

    return toSave;
  }

  // 7b. Delete Followup
  static async deleteFollowup(id: string): Promise<void> {
    // 1. Update LocalStorage immediately
    let currentLocal: EffectivenessFollowup[] = [];
    const rawLocal = localStorage.getItem(LOCAL_STORAGE_KEYS.FOLLOWUPS);
    if (rawLocal) {
      try {
        currentLocal = JSON.parse(rawLocal);
      } catch {}
    }
    const updated = currentLocal.filter((f) => f.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEYS.FOLLOWUPS, JSON.stringify(updated));

    // 2. Delete from Firestore
    try {
      await deleteDoc(doc(db, 'followups', id));
    } catch (e) {
      console.warn('Firestore followup delete warning:', e);
    }
  }

  // 8. Company Settings
  static async getSettings(): Promise<CompanySettings> {
    let settings: CompanySettings | null = null;
    try {
      const snap = await getDocs(collection(db, 'company_settings'));
      if (!snap.empty) {
        settings = snap.docs[0].data() as CompanySettings;
      }
    } catch (e) {}

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
      adminEmail: (!settings.adminEmail || settings.adminEmail.toLowerCase() === 'codiagrooscar@gmail.com')
        ? 'alma.trilles@codiagro.com'
        : settings.adminEmail,
      smtpUser: (!settings.smtpUser || settings.smtpUser.toLowerCase() === 'codiagrooscar@gmail.com')
        ? 'alma.trilles@codiagro.com'
        : settings.smtpUser,
      smtpHost: (!settings.smtpHost || settings.smtpHost === 'smtp.gmail.com')
        ? 'smtp.office365.com'
        : settings.smtpHost,
      smtpPort: (!settings.smtpPort || settings.smtpPort === 465)
        ? 587
        : settings.smtpPort,
      documentCode: settings.documentCode || 'RE0180104',
      documentEdition: settings.documentEdition || '07',
      companyName: settings.companyName || 'CODIAGRO S.A.',
      authorizedAdminEmails: Array.from(new Set([
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
