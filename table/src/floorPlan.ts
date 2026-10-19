import { createTableSeats, generateLayout } from './layout';
import type { FloorPlanDraft, SeatingSeat, SeatingSettings, SeatingTable } from './types';

interface Component {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  pixels: number;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('배치도 이미지를 읽지 못했습니다.'));
    image.src = dataUrl;
  });
}

export function detectDarkComponents(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Component[] {
  const visited = new Uint8Array(width * height);
  const isDark = (index: number) => {
    const offset = index * 4;
    const alpha = data[offset + 3];
    const luminance = data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722;
    return alpha > 80 && luminance < 145;
  };
  const components: Component[] = [];
  for (let start = 0; start < width * height; start += 1) {
    if (visited[start] || !isDark(start)) continue;
    const queue = [start];
    visited[start] = 1;
    let minX = width; let minY = height; let maxX = 0; let maxY = 0; let pixels = 0;
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      const x = current % width;
      const y = Math.floor(current / width);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y); pixels += 1;
      const neighbours = [current - 1, current + 1, current - width, current + width];
      neighbours.forEach((next) => {
        const nextX = next % width;
        if (next < 0 || next >= width * height || visited[next]) return;
        if (Math.abs(nextX - x) > 1 || !isDark(next)) return;
        visited[next] = 1;
        queue.push(next);
      });
    }
    const boxWidth = maxX - minX + 1;
    const boxHeight = maxY - minY + 1;
    const boxArea = boxWidth * boxHeight;
    const pageArea = width * height;
    if (pixels >= 5 && boxArea / pageArea >= 0.00025 && boxArea / pageArea <= 0.08 && boxWidth > 2 && boxHeight > 2) {
      components.push({ minX, minY, maxX, maxY, pixels });
    }
  }
  return components;
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'));
    reader.readAsDataURL(file);
  });
}

async function resizeReferenceImage(dataUrl: string): Promise<string> {
  const image = await loadImage(dataUrl);
  const scale = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
  if (scale === 1 && dataUrl.length < 2_500_000) return dataUrl;
  const canvas = window.document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) return dataUrl;
  context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.88);
}

async function pdfToImageDataUrl(file: File): Promise<string> {
  const [{ getDocument, GlobalWorkerOptions }, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  GlobalWorkerOptions.workerSrc = worker.default;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const document = await getDocument({ data: bytes }).promise;
  const page = await document.getPage(1);
  const viewport = page.getViewport({ scale: 1.6 });
  const canvas = window.document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('PDF 미리보기를 만들지 못했습니다.');
  await page.render({ canvas, canvasContext: context, viewport }).promise;
  return canvas.toDataURL('image/jpeg', 0.9);
}

export async function readFloorPlanFile(file: File): Promise<string> {
  if (file.type === 'application/pdf' || file.name.toLocaleLowerCase().endsWith('.pdf')) {
    return resizeReferenceImage(await pdfToImageDataUrl(file));
  }
  return resizeReferenceImage(await fileToDataUrl(file));
}

export async function analyzeFloorPlan(
  file: File,
  settings: SeatingSettings,
): Promise<FloorPlanDraft> {
  const dataUrl = await readFloorPlanFile(file);
  const image = await loadImage(dataUrl);
  const scale = Math.min(1, 360 / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = window.document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('배치도 분석을 시작하지 못했습니다.');
  context.drawImage(image, 0, 0, width, height);
  const components = detectDarkComponents(context.getImageData(0, 0, width, height).data, width, height)
    .filter((component) => {
      const componentWidth = component.maxX - component.minX + 1;
      const componentHeight = component.maxY - component.minY + 1;
      const aspect = componentWidth / componentHeight;
      return aspect > 0.45 && aspect < 2.2;
    })
    .sort((a, b) => b.pixels - a.pixels);

  const fallback = generateLayout(settings);
  let tables: SeatingTable[] = fallback.tables;
  let theaterSeats: SeatingSeat[] = fallback.theaterSeats;
  let detectedCount = 0;

  if (settings.layoutType === 'theater') {
    const candidates = components
      .filter((component) => component.pixels < (width * height) * 0.012)
      .slice(0, settings.totalTheaterSeats)
      .sort((a, b) => a.minY - b.minY || a.minX - b.minX);
    if (candidates.length >= Math.min(8, settings.totalTheaterSeats / 3)) {
      detectedCount = candidates.length;
      theaterSeats = fallback.theaterSeats.map((seat, index) => {
        const candidate = candidates[index];
        return candidate ? {
          ...seat,
          x: (((candidate.minX + candidate.maxX) / 2) / width) * 100,
          y: (((candidate.minY + candidate.maxY) / 2) / height) * 100,
        } : seat;
      });
    }
  } else {
    const tableType = settings.layoutType;
    const candidates = components.slice(0, settings.tableCount).sort((a, b) => a.minY - b.minY || a.minX - b.minX);
    if (candidates.length) {
      detectedCount = candidates.length;
      tables = fallback.tables.map((table, index) => {
        const candidate = candidates[index];
        if (!candidate) return table;
        return {
          ...table,
          x: (((candidate.minX + candidate.maxX) / 2) / width) * 100,
          y: (((candidate.minY + candidate.maxY) / 2) / height) * 100,
          seats: createTableSeats(table.id, settings.seatsPerTable, tableType, settings.squareMode),
        };
      });
    }
  }

  const target = settings.layoutType === 'theater' ? settings.totalTheaterSeats : settings.tableCount;
  const ratio = target ? detectedCount / target : 0;
  return {
    source: { fileName: file.name, dataUrl, opacity: 0.28 },
    tables,
    theaterSeats,
    detectedCount,
    confidence: ratio >= 0.8 ? 'high' : ratio >= 0.4 ? 'medium' : 'low',
  };
}
