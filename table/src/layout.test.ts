import { describe, expect, it } from 'vitest';
import {
  autoAssignPeople,
  createEmptyProject,
  generateLayout,
  getUnassignedPeople,
  movePerson,
} from './layout';

describe('seating layout', () => {
  it('creates evenly spaced round seats and editable table names', () => {
    const project = createEmptyProject();
    expect(project.tables).toHaveLength(8);
    expect(project.tables[0].name).toBe('Table 1');
    expect(project.tables[0].seats).toHaveLength(10);
    const distances = project.tables[0].seats.map((seat) => Math.hypot(seat.x - 50, seat.y - 50));
    expect(Math.max(...distances) - Math.min(...distances)).toBeLessThan(0.001);
  });

  it('creates theater seats with visible aisle gaps', () => {
    const layout = generateLayout({
      ...createEmptyProject().settings,
      layoutType: 'theater',
      totalTheaterSeats: 24,
      seatsPerRow: 12,
      aisleCount: 2,
    });
    expect(layout.theaterSeats).toHaveLength(24);
    const firstRow = layout.theaterSeats.slice(0, 12);
    const gaps = firstRow.slice(1).map((seat, index) => seat.x - firstRow[index].x);
    expect(Math.max(...gaps)).toBeGreaterThan(Math.min(...gaps));
  });

  it('swaps occupied seats and sends displaced pool occupants back to the pool', () => {
    const base = createEmptyProject();
    const people = [
      { id: 'a', name: '가', group: 'A', identifier: '' },
      { id: 'b', name: '나', group: 'B', identifier: '' },
      { id: 'c', name: '다', group: 'C', identifier: '' },
    ];
    const first = base.tables[0].seats[0].id;
    const second = base.tables[0].seats[1].id;
    let project = { ...base, people };
    project = movePerson(project, 'a', first);
    project = movePerson(project, 'b', second);
    project = movePerson(project, 'a', second);
    expect(project.tables[0].seats[0].personId).toBe('b');
    expect(project.tables[0].seats[1].personId).toBe('a');
    project = movePerson(project, 'c', second);
    expect(project.tables[0].seats[1].personId).toBe('c');
    expect(getUnassignedPeople(project).map((person) => person.id)).toContain('a');
  });

  it('keeps locked assignments during automatic group placement', () => {
    const base = createEmptyProject();
    const people = [
      { id: 'a', name: '가', group: '2', identifier: '' },
      { id: 'b', name: '나', group: '1', identifier: '' },
    ];
    const lockedSeat = { ...base.tables[0].seats[0], personId: 'a', locked: true };
    const project = {
      ...base,
      people,
      tables: [{ ...base.tables[0], seats: [lockedSeat, ...base.tables[0].seats.slice(1)] }, ...base.tables.slice(1)],
    };
    const assigned = autoAssignPeople(project);
    expect(assigned.tables[0].seats[0].personId).toBe('a');
    expect(assigned.tables[0].seats[1].personId).toBe('b');
  });
});
