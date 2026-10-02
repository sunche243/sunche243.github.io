import type {
  SlideshowProject,
  StorageInfo,
  StoredAudioTrack,
  StoredSlide,
} from '../types';

const DATABASE_NAME = 'frameflow-slides';
const DATABASE_VERSION = 3;
const SLIDE_STORE_NAME = 'slides';
const AUDIO_STORE_NAME = 'audio';
const PROJECT_STORE_NAME = 'projects';

export const DEFAULT_PROJECT_ID = 'default-project';

function makeDefaultProject(): SlideshowProject {
  const now = Date.now();
  return {
    id: DEFAULT_PROJECT_ID,
    name: '내 슬라이드쇼',
    createdAt: now,
    updatedAt: now,
  };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = (event) => {
      const database = request.result;
      const transaction = request.transaction;

      if (!database.objectStoreNames.contains(SLIDE_STORE_NAME)) {
        database.createObjectStore(SLIDE_STORE_NAME, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(AUDIO_STORE_NAME)) {
        database.createObjectStore(AUDIO_STORE_NAME, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(PROJECT_STORE_NAME)) {
        database.createObjectStore(PROJECT_STORE_NAME, { keyPath: 'id' });
      }

      if (!transaction || (event as IDBVersionChangeEvent).oldVersion >= 3) return;

      transaction.objectStore(PROJECT_STORE_NAME).put(makeDefaultProject());

      const slideCursor = transaction.objectStore(SLIDE_STORE_NAME).openCursor();
      slideCursor.onsuccess = () => {
        const cursor = slideCursor.result;
        if (!cursor) return;
        cursor.update({
          ...cursor.value,
          projectId: cursor.value.projectId ?? DEFAULT_PROJECT_ID,
          transition: cursor.value.transition ?? null,
          transitionDuration: cursor.value.transitionDuration ?? null,
        });
        cursor.continue();
      };

      const audioCursor = transaction.objectStore(AUDIO_STORE_NAME).openCursor();
      let audioPosition = 0;
      audioCursor.onsuccess = () => {
        const cursor = audioCursor.result;
        if (!cursor) return;
        cursor.update({
          ...cursor.value,
          projectId: cursor.value.projectId ?? DEFAULT_PROJECT_ID,
          position: cursor.value.position ?? audioPosition,
        });
        audioPosition += 1;
        cursor.continue();
      };
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function waitForTransaction(
  database: IDBDatabase,
  transaction: IDBTransaction,
): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error('저장 작업이 중단되었습니다.'));
    };
  });
}

export async function loadProjects(): Promise<SlideshowProject[]> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PROJECT_STORE_NAME, 'readonly');
    const request = transaction.objectStore(PROJECT_STORE_NAME).getAll();

    request.onsuccess = () => {
      resolve(
        (request.result as SlideshowProject[]).sort(
          (first, second) => second.updatedAt - first.updatedAt,
        ),
      );
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

export async function createProject(name: string): Promise<SlideshowProject> {
  const database = await openDatabase();
  const now = Date.now();
  const project: SlideshowProject = {
    id: crypto.randomUUID(),
    name,
    createdAt: now,
    updatedAt: now,
  };
  const transaction = database.transaction(PROJECT_STORE_NAME, 'readwrite');
  transaction.objectStore(PROJECT_STORE_NAME).put(project);
  await waitForTransaction(database, transaction);
  return project;
}

export async function renameProject(
  project: SlideshowProject,
  name: string,
): Promise<SlideshowProject> {
  const database = await openDatabase();
  const renamed = { ...project, name, updatedAt: Date.now() };
  const transaction = database.transaction(PROJECT_STORE_NAME, 'readwrite');
  transaction.objectStore(PROJECT_STORE_NAME).put(renamed);
  await waitForTransaction(database, transaction);
  return renamed;
}

function deleteProjectRecords(store: IDBObjectStore, projectId: string): void {
  const request = store.openCursor();
  request.onsuccess = () => {
    const cursor = request.result;
    if (!cursor) return;
    if (cursor.value.projectId === projectId) cursor.delete();
    cursor.continue();
  };
}

export async function deleteProject(projectId: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(
    [PROJECT_STORE_NAME, SLIDE_STORE_NAME, AUDIO_STORE_NAME],
    'readwrite',
  );
  transaction.objectStore(PROJECT_STORE_NAME).delete(projectId);
  deleteProjectRecords(transaction.objectStore(SLIDE_STORE_NAME), projectId);
  deleteProjectRecords(transaction.objectStore(AUDIO_STORE_NAME), projectId);
  await waitForTransaction(database, transaction);
}

function touchProject(store: IDBObjectStore, projectId: string): void {
  const request = store.get(projectId);
  request.onsuccess = () => {
    const project = request.result as SlideshowProject | undefined;
    if (project) store.put({ ...project, updatedAt: Date.now() });
  };
}

export async function loadSlides(projectId: string): Promise<StoredSlide[]> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(SLIDE_STORE_NAME, 'readonly');
    const request = transaction.objectStore(SLIDE_STORE_NAME).getAll();

    request.onsuccess = () => {
      resolve(
        (request.result as StoredSlide[])
          .filter((slide) => (slide.projectId ?? DEFAULT_PROJECT_ID) === projectId)
          .map((slide) => ({
            ...slide,
            projectId,
            transition: slide.transition ?? null,
            transitionDuration: slide.transitionDuration ?? null,
          }))
          .sort((first, second) => first.position - second.position),
      );
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

export async function replaceSlides(
  projectId: string,
  slides: readonly StoredSlide[],
): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(
    [SLIDE_STORE_NAME, PROJECT_STORE_NAME],
    'readwrite',
  );
  const store = transaction.objectStore(SLIDE_STORE_NAME);
  const request = store.openCursor();

  request.onsuccess = () => {
    const cursor = request.result;
    if (cursor) {
      if ((cursor.value.projectId ?? DEFAULT_PROJECT_ID) === projectId) {
        cursor.delete();
      }
      cursor.continue();
      return;
    }

    slides.forEach((slide, position) =>
      store.put({ ...slide, projectId, position }),
    );
    touchProject(transaction.objectStore(PROJECT_STORE_NAME), projectId);
  };

  await waitForTransaction(database, transaction);
}

export async function loadAudioTracks(
  projectId: string,
): Promise<StoredAudioTrack[]> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(AUDIO_STORE_NAME, 'readonly');
    const request = transaction.objectStore(AUDIO_STORE_NAME).getAll();

    request.onsuccess = () => {
      resolve(
        (request.result as StoredAudioTrack[])
          .filter((track) => (track.projectId ?? DEFAULT_PROJECT_ID) === projectId)
          .map((track, position) => ({
            ...track,
            projectId,
            position: track.position ?? position,
          }))
          .sort((first, second) => first.position - second.position),
      );
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

export async function replaceAudioTracks(
  projectId: string,
  tracks: readonly StoredAudioTrack[],
): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(
    [AUDIO_STORE_NAME, PROJECT_STORE_NAME],
    'readwrite',
  );
  const store = transaction.objectStore(AUDIO_STORE_NAME);
  const request = store.openCursor();

  request.onsuccess = () => {
    const cursor = request.result;
    if (cursor) {
      if ((cursor.value.projectId ?? DEFAULT_PROJECT_ID) === projectId) {
        cursor.delete();
      }
      cursor.continue();
      return;
    }

    tracks.forEach((track, position) =>
      store.put({ ...track, projectId, position }),
    );
    touchProject(transaction.objectStore(PROJECT_STORE_NAME), projectId);
  };

  await waitForTransaction(database, transaction);
}

export async function estimateStorage(): Promise<StorageInfo> {
  if (!navigator.storage?.estimate) {
    return { usage: null, quota: null, persistent: null };
  }

  const estimate = await navigator.storage.estimate();
  const persistent = navigator.storage.persisted
    ? await navigator.storage.persisted()
    : null;

  return {
    usage: estimate.usage ?? null,
    quota: estimate.quota ?? null,
    persistent,
  };
}
