import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { StoredSlide } from '../types';

GlobalWorkerOptions.workerSrc = pdfWorker;

export interface ImportProgress {
  fileName: string;
  current: number;
  total: number;
}

export interface ImportResult {
  slides: StoredSlide[];
  errors: string[];
}

type ProgressCallback = (progress: ImportProgress) => void;

function isVideoFile(file: File): boolean {
  return (
    file.type.startsWith('video/') ||
    /\.(mp4|mov|m4v|webm|ogv)$/i.test(file.name)
  );
}

function makeSlide(
  projectId: string,
  name: string,
  blob: Blob,
  position: number,
  details?: {
    pageNumber?: number;
    pageCount?: number;
    mediaDuration?: number;
    sourceType?: StoredSlide['sourceType'];
  },
): StoredSlide {
  return {
    id: crypto.randomUUID(),
    projectId,
    name,
    blob,
    sourceType: details?.sourceType ?? (details?.pageNumber ? 'pdf-page' : 'image'),
    pageNumber: details?.pageNumber,
    pageCount: details?.pageCount,
    mediaDuration: details?.mediaDuration,
    duration: null,
    transition: null,
    transitionDuration: null,
    position,
    createdAt: Date.now(),
  };
}

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);

    const cleanup = () => {
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
    };

    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      cleanup();
      resolve(duration);
    };
    video.onerror = () => {
      cleanup();
      reject(new Error('영상 정보를 읽을 수 없습니다.'));
    };
    video.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('페이지 이미지를 만들 수 없습니다.'));
      },
      'image/webp',
      0.92,
    );
  });
}

async function convertPdf(
  projectId: string,
  file: File,
  startPosition: number,
  onProgress: ProgressCallback,
): Promise<StoredSlide[]> {
  const document = await getDocument({ data: await file.arrayBuffer() }).promise;
  const slides: StoredSlide[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    onProgress({ fileName: file.name, current: pageNumber, total: document.numPages });
    const page = await document.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.8 });
    const canvas = window.document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: false });

    if (!context) throw new Error('PDF 렌더링을 시작할 수 없습니다.');

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: context, viewport }).promise;

    const blob = await canvasToBlob(canvas);
    slides.push(
      makeSlide(projectId, file.name, blob, startPosition + slides.length, {
        pageNumber,
        pageCount: document.numPages,
        sourceType: 'pdf-page',
      }),
    );
  }

  await document.cleanup();
  return slides;
}

export async function importFiles(
  projectId: string,
  files: readonly File[],
  startPosition: number,
  onProgress: ProgressCallback,
): Promise<ImportResult> {
  const slides: StoredSlide[] = [];
  const errors: string[] = [];

  for (const file of files) {
    try {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const pages = await convertPdf(
          projectId,
          file,
          startPosition + slides.length,
          onProgress,
        );
        slides.push(...pages);
      } else if (file.type.startsWith('image/')) {
        onProgress({ fileName: file.name, current: 1, total: 1 });
        slides.push(
          makeSlide(projectId, file.name, file, startPosition + slides.length),
        );
      } else if (isVideoFile(file)) {
        onProgress({ fileName: file.name, current: 1, total: 1 });
        const mediaDuration = await readVideoDuration(file);
        slides.push(
          makeSlide(projectId, file.name, file, startPosition + slides.length, {
            mediaDuration,
            sourceType: 'video',
          }),
        );
      } else {
        errors.push(`${file.name}: 지원하지 않는 파일 형식입니다.`);
      }
    } catch {
      errors.push(`${file.name}: 파일을 불러오지 못했습니다.`);
    }
  }

  return { slides, errors };
}
