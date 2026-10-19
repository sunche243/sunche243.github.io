export type LayoutType = 'round' | 'square' | 'theater';
export type SquareSeatingMode = 'front' | 'surround';
export type AssignmentMode = 'group' | 'random';

export interface SeatingPerson {
  id: string;
  name: string;
  group: string;
  identifier: string;
}

export interface SeatingSeat {
  id: string;
  label: string;
  x: number;
  y: number;
  personId: string | null;
  locked: boolean;
}

export interface SeatingTable {
  id: string;
  name: string;
  x: number;
  y: number;
  rotation: number;
  locked: boolean;
  seats: SeatingSeat[];
}

export interface SeatingSettings {
  layoutType: LayoutType;
  tableCount: number;
  seatsPerTable: number;
  squareMode: SquareSeatingMode;
  totalTheaterSeats: number;
  seatsPerRow: number;
  aisleCount: number;
  assignmentMode: AssignmentMode;
}

export interface FloorPlanReference {
  fileName: string;
  dataUrl: string;
  opacity: number;
}

export interface SeatingProjectPayload {
  schemaVersion: 1;
  name: string;
  settings: SeatingSettings;
  people: SeatingPerson[];
  tables: SeatingTable[];
  theaterSeats: SeatingSeat[];
  floorPlan: FloorPlanReference | null;
}

export interface SeatingProjectRecord {
  id: string;
  name: string;
  payload: SeatingProjectPayload;
  createdAt: string;
  updatedAt: string;
}

export interface SeatingTransferPayload {
  version: 1;
  createdAt: string;
  people: SeatingPerson[];
}

export interface WorkbookPreview {
  fileName: string;
  headers: string[];
  rows: unknown[][];
  nameColumn: number;
  groupColumn: number | null;
  identifierColumn: number | null;
}

export interface FloorPlanDraft {
  source: FloorPlanReference;
  tables: SeatingTable[];
  theaterSeats: SeatingSeat[];
  detectedCount: number;
  confidence: 'high' | 'medium' | 'low';
}
