import { useMemo, useState, type CSSProperties, type DragEvent, type PointerEvent as ReactPointerEvent } from 'react';
import type { SeatingProjectPayload, SeatingSeat, SeatingTable } from './types';

interface SeatCanvasProps {
  project: SeatingProjectPayload;
  selectedPersonId: string | null;
  searchQuery: string;
  showEmptySeats: boolean;
  readOnly?: boolean;
  onSelectPerson: (personId: string | null) => void;
  onMovePerson: (personId: string, seatId: string | null) => void;
  onMoveTable: (tableId: string, x: number, y: number) => void;
  onRenameTable: (tableId: string, name: string) => void;
  onRotateTable: (tableId: string) => void;
  onToggleTableLock: (tableId: string) => void;
  onToggleSeatLock: (seatId: string) => void;
}

interface DraggingTable {
  id: string;
  x: number;
  y: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function SeatCanvas({
  project,
  selectedPersonId,
  searchQuery,
  showEmptySeats,
  readOnly = false,
  onSelectPerson,
  onMovePerson,
  onMoveTable,
  onRenameTable,
  onRotateTable,
  onToggleTableLock,
  onToggleSeatLock,
}: SeatCanvasProps) {
  const [draggingTable, setDraggingTable] = useState<DraggingTable | null>(null);
  const peopleById = useMemo(() => new Map(project.people.map((person) => [person.id, person])), [project.people]);
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase('ko');
  const frontFacing = project.settings.layoutType === 'square' && project.settings.squareMode === 'front';
  const stageHeight = frontFacing ? Math.max(720, project.tables.length * 210 + 140) : 720;
  const tableWidth = frontFacing ? Math.max(170, project.settings.seatsPerTable * 58 + 60) : 190;

  function startTableDrag(event: ReactPointerEvent<HTMLButtonElement>, table: SeatingTable) {
    if (readOnly || table.locked) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingTable({ id: table.id, x: table.x, y: table.y });
  }

  function moveTableDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!draggingTable) return;
    const stage = event.currentTarget.closest('.seating-stage');
    if (!(stage instanceof HTMLElement)) return;
    const rect = stage.getBoundingClientRect();
    setDraggingTable((current) => current ? {
      ...current,
      x: clamp(((event.clientX - rect.left) / rect.width) * 100, 7, 93),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100, 9, 91),
    } : null);
  }

  function finishTableDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!draggingTable) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    onMoveTable(draggingTable.id, draggingTable.x, draggingTable.y);
    setDraggingTable(null);
  }

  function handlePersonDrop(event: DragEvent, seatId: string) {
    event.preventDefault();
    const personId = event.dataTransfer.getData('application/x-seating-person');
    if (personId) onMovePerson(personId, seatId);
  }

  function handleSeatClick(seat: SeatingSeat) {
    if (readOnly) return;
    if (selectedPersonId) {
      onMovePerson(selectedPersonId, seat.id);
      onSelectPerson(null);
      return;
    }
    if (seat.personId) onSelectPerson(seat.personId);
  }

  function renderSeat(seat: SeatingSeat, compact = false) {
    const person = seat.personId ? peopleById.get(seat.personId) : undefined;
    if (!person && !showEmptySeats && !compact) return null;
    const highlighted = Boolean(person && normalizedSearch && `${person.name} ${person.group} ${person.identifier}`.toLocaleLowerCase('ko').includes(normalizedSearch));
    return (
      <button
        key={seat.id}
        className={`canvas-seat${compact ? ' canvas-seat--theater' : ''}${seat.locked ? ' is-locked' : ''}${highlighted ? ' is-highlighted' : ''}${selectedPersonId === person?.id ? ' is-selected' : ''}`}
        style={{ left: `${seat.x}%`, top: `${seat.y}%` }}
        type="button"
        title={
          person
            ? `${person.name} · ${person.group}${seat.locked ? ' · 잠금' : ''}`
            : showEmptySeats
              ? `${seat.label} · 빈 좌석`
              : '빈 좌석'
        }
        draggable={!readOnly && Boolean(person) && !seat.locked}
        onDragStart={(event) => {
          if (!person) return;
          event.dataTransfer.setData('application/x-seating-person', person.id);
          event.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={(event) => { if (!readOnly && !seat.locked) event.preventDefault(); }}
        onDrop={(event) => { if (!readOnly && !seat.locked) handlePersonDrop(event, seat.id); }}
        onClick={() => handleSeatClick(seat)}
        onDoubleClick={(event) => {
          event.stopPropagation();
          if (!readOnly) onToggleSeatLock(seat.id);
        }}
      >
        <span>{person?.name ?? (showEmptySeats ? seat.label : '')}</span>
        {person && !compact ? <small>{person.group}</small> : null}
        {seat.locked ? <i aria-label="좌석 잠금">●</i> : null}
      </button>
    );
  }

  return (
    <div className="seating-stage-scroll">
      <div
        className={`seating-stage seating-stage--${project.settings.layoutType}${frontFacing ? ' seating-stage--square-front' : ''}`}
        style={{ height: stageHeight }}
        aria-label="좌석 배치 편집 영역"
      >
        {project.floorPlan ? (
          <img
            className="seating-stage__reference"
            src={project.floorPlan.dataUrl}
            alt="업로드한 업체 좌석 배치도"
            style={{ opacity: project.floorPlan.opacity }}
          />
        ) : null}
        {project.settings.layoutType === 'theater' ? (
          <>
            <div className="theater-screen">STAGE / SCREEN</div>
            {project.theaterSeats.map((seat) => renderSeat(seat, true))}
          </>
        ) : project.tables.map((table) => {
          const position = draggingTable?.id === table.id ? draggingTable : table;
          return (
            <article
              className={`canvas-table canvas-table--${project.settings.layoutType}${table.locked ? ' is-locked' : ''}`}
              key={table.id}
              style={{ left: `${position.x}%`, top: `${position.y}%`, transform: `translate(-50%, -50%) rotate(${table.rotation}deg)`, '--table-width': `${tableWidth}px` } as CSSProperties}
            >
              <button
                className="canvas-table__surface"
                type="button"
                aria-label={`${table.name} 이동`}
                onPointerDown={(event) => startTableDrag(event, table)}
                onPointerMove={moveTableDrag}
                onPointerUp={finishTableDrag}
                onPointerCancel={finishTableDrag}
              >
                <span>{table.name}</span>
                {!readOnly ? <small>{table.locked ? '고정됨' : '드래그해서 이동'}</small> : null}
              </button>
              {table.seats.map((seat) => renderSeat(seat))}
              {!readOnly ? (
                <div className="canvas-table__tools">
                  <input
                    aria-label={`${table.name} 이름`}
                    value={table.name}
                    maxLength={30}
                    onChange={(event) => onRenameTable(table.id, event.target.value)}
                  />
                  <button type="button" onClick={() => onRotateTable(table.id)}>90° 회전</button>
                  <button type="button" onClick={() => onToggleTableLock(table.id)}>{table.locked ? '이동 잠금 해제' : '이동 잠금'}</button>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
