import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc,
  getDocFromServer,
  setDoc, 
  getDocs, 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { TrainingAction, Evaluation, EffectivenessFollowup, CompanySettings, AppNotification } from '../types';

// Initialize Firebase App instance
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Error in loginWithGoogle:', error);
    throw error;
  }
}

export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error in logoutUser:', error);
    throw error;
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Connection on Initial Boot
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase Firestore connection verified.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase offline or initializing.');
    }
    return false;
  }
}

// Database helper functions
export const firestoreService = {
  // Trainings
  async getTrainings(): Promise<TrainingAction[]> {
    try {
      const snap = await getDocs(collection(db, 'trainings'));
      return snap.docs.map(d => d.data() as TrainingAction);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'trainings');
      return [];
    }
  },

  async saveTraining(training: TrainingAction): Promise<void> {
    try {
      await setDoc(doc(db, 'trainings', training.id), training);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `trainings/${training.id}`);
    }
  },

  async deleteTraining(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'trainings', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `trainings/${id}`);
    }
  },

  // Evaluations
  async getEvaluations(): Promise<Evaluation[]> {
    try {
      const snap = await getDocs(collection(db, 'evaluations'));
      return snap.docs.map(d => d.data() as Evaluation);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'evaluations');
      return [];
    }
  },

  async saveEvaluation(evaluation: Evaluation): Promise<void> {
    try {
      await setDoc(doc(db, 'evaluations', evaluation.id), evaluation);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `evaluations/${evaluation.id}`);
    }
  },

  // Follow-ups
  async getFollowups(): Promise<EffectivenessFollowup[]> {
    try {
      const snap = await getDocs(collection(db, 'followups'));
      return snap.docs.map(d => d.data() as EffectivenessFollowup);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'followups');
      return [];
    }
  },

  async saveFollowup(followup: EffectivenessFollowup): Promise<void> {
    try {
      await setDoc(doc(db, 'followups', followup.id), followup);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `followups/${followup.id}`);
    }
  },

  // Notifications
  async getNotifications(): Promise<AppNotification[]> {
    try {
      const snap = await getDocs(collection(db, 'notifications'));
      return snap.docs.map(d => d.data() as AppNotification);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'notifications');
      return [];
    }
  },

  async saveNotification(notification: AppNotification): Promise<void> {
    try {
      await setDoc(doc(db, 'notifications', notification.id), notification);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `notifications/${notification.id}`);
    }
  },

  async markNotificationAsRead(id: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `notifications/${id}`);
    }
  },

  // Settings
  async getSettings(): Promise<CompanySettings | null> {
    try {
      const snap = await getDoc(doc(db, 'settings', 'config'));
      if (snap.exists()) {
        return snap.data() as CompanySettings;
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'settings/config');
      return null;
    }
  },

  async saveSettings(settings: CompanySettings): Promise<void> {
    try {
      await setDoc(doc(db, 'settings', 'config'), settings);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/config');
    }
  }
};
