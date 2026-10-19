import type { SeatingProjectPayload, SeatingSeat } from './types';

const WIDTH = 1800;
const HEIGHT = 1240;

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
}

function downloadDataUrl(dataUrl: string, fileName: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  link.click();
}

function personName(project: SeatingProjectPayload, seat: SeatingSeat): string {
  return project.people.find((person) => person.id === seat.personId)?.name ?? '';
}

export async function exportProjectPng(project: SeatingProjectPayload): Promise<void> {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('PNG를 만들 수 없습니다.');
  context.fillStyle = '#f6f2e9';
  context.fillRect(0, 0, WIDTH, HEIGHT);

  if (project.floorPlan) {
    const image = await loadImage(project.floorPlan.dataUrl);
    const scale = Math.min(WIDTH / image.naturalWidth, HEIGHT / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    context.globalAlpha = project.floorPlan.opacity;
    context.drawImage(image, (WIDTH - drawWidth) / 2, (HEIGHT - drawHeight) / 2, drawWidth, drawHeight);
    context.globalAlpha = 1;
  }

  context.textAlign = 'center';
  context.textBaseline = 'middle';
  if (project.settings.layoutType === 'theater') {
    project.theaterSeats.forEach((seat) => {
      const x = (seat.x / 100) * WIDTH;
      const y = (seat.y / 100) * HEIGHT;
      context.fillStyle = '#efe3c9';
      context.strokeStyle = '#5f4a29';
      context.lineWidth = 2;
      context.beginPath();
      context.roundRect(x - 24, y - 18, 48, 36, 7);
      context.fill(); context.stroke();
      const name = personName(project, seat);
      context.fillStyle = '#17130d'; context.font = '600 18px sans-serif';
      context.fillText(name || seat.label, x, y, 120);
    });
  } else {
    project.tables.forEach((table) => {
      const centerX = (table.x / 100) * WIDTH;
      const centerY = (table.y / 100) * HEIGHT;
      const frontFacing = project.settings.layoutType === 'square' && project.settings.squareMode === 'front';
      const sizeX = frontFacing ? Math.min(980, project.settings.seatsPerTable * 90 + 100) : 210;
      const sizeY = 210;
      context.save();
      context.translate(centerX, centerY);
      context.rotate((table.rotation * Math.PI) / 180);
      context.fillStyle = '#1d1a15';
      if (project.settings.layoutType === 'round') {
        context.beginPath(); context.arc(0, 0, 66, 0, Math.PI * 2); context.fill();
      } else if (frontFacing) {
        context.fillRect(-sizeX * 0.45, -54, sizeX * 0.9, 78);
      } else {
        context.fillRect(-72, -50, 144, 100);
      }
      context.fillStyle = '#f7f0df'; context.font = '700 22px sans-serif';
      context.fillText(table.name, 0, 0, 135);
      table.seats.forEach((seat) => {
        const x = ((seat.x - 50) / 100) * sizeX;
        const y = ((seat.y - 50) / 100) * sizeY;
        context.fillStyle = '#fffdf8'; context.strokeStyle = '#9a753f'; context.lineWidth = 2;
        context.beginPath(); context.roundRect(x - 38, y - 22, 76, 44, 9); context.fill(); context.stroke();
        context.fillStyle = '#17130d'; context.font = '600 16px sans-serif';
        context.fillText(personName(project, seat) || seat.label, x, y, 72);
      });
      context.restore();
    });
  }

  context.textAlign = 'left';
  context.fillStyle = '#17130d';
  context.font = '700 34px sans-serif';
  context.fillText(project.name, 40, 42);
  const date = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }).replaceAll('-', '');
  downloadDataUrl(canvas.toDataURL('image/png'), `${project.name.replaceAll(/[\\/:*?"<>|]/g, '_')}_${date}.png`);
}
