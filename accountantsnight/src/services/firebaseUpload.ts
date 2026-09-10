import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, type Auth } from 'firebase/auth';
import {
  getStorage,
  ref,
  uploadBytesResumable,
  type FirebaseStorage,
  type UploadTaskSnapshot,
} from 'firebase/storage';

export interface UploadProgress {
  fileName: string;
  fileIndex: number;
  totalFiles: number;
  fileProgress: number;
  totalProgress: number;
}

export interface UploadResult {
  path: string;
  name: string;
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let storage: FirebaseStorage | null = null;

export function isFirebaseConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_FIREBASE_API_KEY &&
      import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
      import.meta.env.VITE_FIREBASE_PROJECT_ID &&
      import.meta.env.VITE_FIREBASE_STORAGE_BUCKET &&
      import.meta.env.VITE_FIREBASE_APP_ID,
  );
}

function getFirebase() {
  if (!isFirebaseConfigured()) return null;

  if (!app) {
    app = initializeApp({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    });
    auth = getAuth(app);
    storage = getStorage(app);
  }

  return { auth: auth as Auth, storage: storage as FirebaseStorage };
}

export async function uploadPhotos(
  files: File[],
  onProgress: (progress: UploadProgress) => void,
): Promise<UploadResult[]> {
  const firebase = getFirebase();
  if (!firebase) {
    throw new Error('Firebase 설정이 필요합니다.');
  }

  const credential = await signInAnonymously(firebase.auth);
  const userId = credential.user.uid;
  const results: UploadResult[] = [];

  for (const [index, file] of files.entries()) {
    const cleanName = file.name.replace(/[^\w.-]+/g, '_');
    const path = `accounting-50th/${userId}/${Date.now()}-${index}-${cleanName}`;
    const uploadRef = ref(firebase.storage, path);

    await new Promise<void>((resolve, reject) => {
      const task = uploadBytesResumable(uploadRef, file, {
        contentType: file.type || 'application/octet-stream',
      });

      task.on(
        'state_changed',
        (snapshot: UploadTaskSnapshot) => {
          const fileProgress = snapshot.totalBytes
            ? snapshot.bytesTransferred / snapshot.totalBytes
            : 0;
          onProgress({
            fileName: file.name,
            fileIndex: index + 1,
            totalFiles: files.length,
            fileProgress,
            totalProgress: (index + fileProgress) / files.length,
          });
        },
        reject,
        () => resolve(),
      );
    });

    results.push({ path, name: file.name });
  }

  return results;
}
