import type {
  SeatingPerson,
  SeatingProjectPayload,
  SeatingSeat,
  SeatingSettings,
  SeatingTable,
} from './types';

export const DEFAULT_SEATING_SETTINGS: SeatingSettings = {
  layoutType: 'round',
  tableCount: 8,
  seatsPerTable: 10,
  squareMode: 'surround',
  totalTheaterSeats: 120,
  seatsPerRow: 12,
  aisleCount: 2,
  assignmentMode: 'group',
};

export function createEmptyProject(name = '새 좌석 배치'): SeatingProjectPayload {
  const settings = { ...DEFAULT_SEATING_SETTINGS };
  const generated = generateLayout(settings);
  return {
    schemaVersion: 1,
    name,
    settings,
    people: [],
    ...generated,
    floorPlan: null,
  };
}

function normalizedGridPosition(index: number, count: number, settings?: SeatingSettings): { x: number; y: number } {
  if (settings?.layoutType === 'square' && settings.squareMode === 'front') {
    return { x: 50, y: ((index + 1) / (count + 1)) * 100 };
  }
  const columns = Math.max(1, Math.ceil(Math.sqrt(count * 1.45)));
  const rows = Math.max(1, Math.ceil(count / columns));
  const column = index % columns;
  const row = Math.floor(index / columns);
  return {
    x: ((column + 1) / (columns + 1)) * 100,
    y: ((row + 1) / (rows + 1)) * 100,
  };
}

export function createTableSeats(
  tableId: string,
  count: number,
  type: 'round' | 'square',
  squareMode: SeatingSettings['squareMode'],
): SeatingSeat[] {
  if (type === 'square' && squareMode === 'front') {
    return Array.from({ length: count }, (_, index) => ({
      id: `${tableId}-seat-${index + 1}`,
      label: `${index + 1}`,
      x: count === 1 ? 50 : 10 + (index / (count - 1)) * 80,
      y: 88,
      personId: null,
      locked: false,
    }));
  }

  if (type === 'square') {
    return Array.from({ length: count }, (_, index) => {
      const perimeter = (index / count) * 4;
      const side = Math.floor(perimeter);
      const progress = perimeter - side;
      const [x, y] = side === 0 ? [10 + progress * 80, 8]
        : side === 1 ? [92, 10 + progress * 80]
          : side === 2 ? [90 - progress * 80, 92]
            : [8, 90 - progress * 80];
      return {
        id: `${tableId}-seat-${index + 1}`,
        label: `${index + 1}`,
        x,
        y,
        personId: null,
        locked: false,
      };
    });
  }

  return Array.from({ length: count }, (_, index) => {
    const angle = ((Math.PI * 2) / count) * index - Math.PI / 2;
    const radiusX = 45;
    const radiusY = 45;
    const rawX = Math.cos(angle);
    const rawY = Math.sin(angle);
    return {
      id: `${tableId}-seat-${index + 1}`,
      label: `${index + 1}`,
      x: 50 + rawX * radiusX,
      y: 50 + rawY * radiusY,
      personId: null,
      locked: false,
    };
  });
}

export function generateLayout(settings: SeatingSettings): Pick<SeatingProjectPayload, 'tables' | 'theaterSeats'> {
  if (settings.layoutType === 'theater') {
    const seats = Array.from({ length: settings.totalTheaterSeats }, (_, index) => {
      const row = Math.floor(index / settings.seatsPerRow);
      const column = index % settings.seatsPerRow;
      const rowCount = Math.ceil(settings.totalTheaterSeats / settings.seatsPerRow);
      const aisleEvery = settings.aisleCount > 0
        ? Math.ceil(settings.seatsPerRow / (settings.aisleCount + 1))
        : settings.seatsPerRow + 1;
      const aisleOffset = Math.floor(column / aisleEvery) * 3.5;
      return {
        id: `theater-seat-${index + 1}`,
        label: `${row + 1}-${column + 1}`,
        x: 5 + (column / Math.max(1, settings.seatsPerRow - 1)) * (90 - settings.aisleCount * 3.5) + aisleOffset,
        y: 9 + (row / Math.max(1, rowCount - 1)) * 84,
        personId: null,
        locked: false,
      } satisfies SeatingSeat;
    });
    return { tables: [], theaterSeats: seats };
  }

  const tableType = settings.layoutType;
  const tables = Array.from({ length: settings.tableCount }, (_, index) => {
    const id = `table-${index + 1}`;
    return {
      id,
      name: `Table ${index + 1}`,
      ...normalizedGridPosition(index, settings.tableCount, settings),
      rotation: 0,
      locked: false,
      seats: createTableSeats(id, settings.seatsPerTable, tableType, settings.squareMode),
    } satisfies SeatingTable;
  });
  return { tables, theaterSeats: [] };
}

export function getAllSeats(project: SeatingProjectPayload): SeatingSeat[] {
  return project.settings.layoutType === 'theater'
    ? project.theaterSeats
    : project.tables.flatMap((table) => table.seats);
}

export function getAssignedPersonIds(project: SeatingProjectPayload): Set<string> {
  return new Set(getAllSeats(project).flatMap((seat) => seat.personId ? [seat.personId] : []));
}

export function getUnassignedPeople(project: SeatingProjectPayload): SeatingPerson[] {
  const assigned = getAssignedPersonIds(project);
  return project.people.filter((person) => !assigned.has(person.id));
}

function randomShuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function autoAssignPeople(project: SeatingProjectPayload): SeatingProjectPayload {
  const lockedAssignments = new Map<string, string>();
  getAllSeats(project).forEach((seat) => {
    if (seat.locked && seat.personId) lockedAssignments.set(seat.id, seat.personId);
  });
  const lockedPeople = new Set(lockedAssignments.values());
  const availablePeople = project.people.filter((person) => !lockedPeople.has(person.id));
  const orderedPeople = project.settings.assignmentMode === 'random'
    ? randomShuffle(availablePeople)
    : [...availablePeople].sort((a, b) => a.group.localeCompare(b.group, 'ko') || a.name.localeCompare(b.name, 'ko'));
  let personIndex = 0;
  const assignSeat = (seat: SeatingSeat): SeatingSeat => {
    if (seat.locked) return seat;
    const person = orderedPeople[personIndex];
    personIndex += 1;
    return { ...seat, personId: person?.id ?? null };
  };

  return {
    ...project,
    tables: project.tables.map((table) => ({ ...table, seats: table.seats.map(assignSeat) })),
    theaterSeats: project.theaterSeats.map(assignSeat),
  };
}

export function movePerson(
  project: SeatingProjectPayload,
  personId: string,
  targetSeatId: string | null,
): SeatingProjectPayload {
  const seats = getAllSeats(project);
  const sourceSeat = seats.find((seat) => seat.personId === personId);
  const targetSeat = targetSeatId ? seats.find((seat) => seat.id === targetSeatId) : undefined;
  if (sourceSeat?.locked || targetSeat?.locked || (targetSeatId && !targetSeat)) return project;
  const displacedPersonId = targetSeat?.personId ?? null;

  const updateSeat = (seat: SeatingSeat): SeatingSeat => {
    if (targetSeat && seat.id === targetSeat.id) return { ...seat, personId };
    if (sourceSeat && seat.id === sourceSeat.id) return { ...seat, personId: displacedPersonId };
    return seat;
  };
  return {
    ...project,
    tables: project.tables.map((table) => ({ ...table, seats: table.seats.map(updateSeat) })),
    theaterSeats: project.theaterSeats.map(updateSeat),
  };
}

export function removeMissingAssignments(project: SeatingProjectPayload): SeatingProjectPayload {
  const ids = new Set(project.people.map((person) => person.id));
  const clean = (seat: SeatingSeat): SeatingSeat => seat.personId && !ids.has(seat.personId)
    ? { ...seat, personId: null }
    : seat;
  return {
    ...project,
    tables: project.tables.map((table) => ({ ...table, seats: table.seats.map(clean) })),
    theaterSeats: project.theaterSeats.map(clean),
  };
}

export function findDuplicateTableNames(project: SeatingProjectPayload): string[] {
  const counts = new Map<string, number>();
  project.tables.forEach((table) => {
    const name = table.name.trim().toLocaleLowerCase('ko');
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  });
  return [...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name);
}
