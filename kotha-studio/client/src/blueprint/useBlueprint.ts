import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { uid } from '../lib/store';
import { DEFAULT_WALL_THICKNESS } from './geometry';
import type { BlueprintDoc, Floor, Room } from './types';

const HISTORY_LIMIT = 60;

function keyFor(projectId: string) {
  return `kotha:blueprint:${projectId}`;
}

function blankFloor(index: number): Floor {
  return {
    id: uid('floor'),
    name: index === 0 ? 'Ground floor' : `${index}${index === 1 ? 'st' : index === 2 ? 'nd' : index === 3 ? 'rd' : 'th'} floor`,
    walls: [],
    openings: [],
    rooms: [],
    furniture: [],
  };
}

/** A small, honest starter room so the sheet is never a dead canvas. */
function starterFloor(): Floor {
  const room: Room = {
    id: uid('room'),
    name: 'Living room',
    kind: 'room',
    points: [
      { x: 0, y: 0 },
      { x: 4200, y: 0 },
      { x: 4200, y: 3600 },
      { x: 0, y: 3600 },
    ],
  };
  const wall = (a: Room['points'][number], b: Room['points'][number]) => ({
    id: uid('wall'),
    a,
    b,
    thickness: DEFAULT_WALL_THICKNESS,
  });
  return {
    id: uid('floor'),
    name: 'Ground floor',
    walls: [wall(room.points[0], room.points[1]), wall(room.points[1], room.points[2]), wall(room.points[2], room.points[3]), wall(room.points[3], room.points[0])],
    openings: [],
    rooms: [room],
    furniture: [],
  };
}

function newDoc(projectId: string, name: string): BlueprintDoc {
  return {
    version: 1,
    projectId,
    name,
    wallHeight: 2800,
    updatedAt: new Date().toISOString(),
    floors: [starterFloor()],
  };
}

function load(projectId: string, name: string): BlueprintDoc {
  try {
    const raw = window.localStorage.getItem(keyFor(projectId));
    if (!raw) return newDoc(projectId, name);
    const parsed = JSON.parse(raw) as BlueprintDoc;
    if (!parsed || !Array.isArray(parsed.floors) || parsed.floors.length === 0) {
      return newDoc(projectId, name);
    }
    return { ...newDoc(projectId, name), ...parsed, name: parsed.name || name };
  } catch {
    return newDoc(projectId, name);
  }
}

export function useBlueprint(projectId: string, projectName: string) {
  const [doc, setDoc] = useState<BlueprintDoc>(() => load(projectId, projectName));
  const [activeFloorId, setActiveFloorId] = useState<string>(doc.floors[0].id);
  const past = useRef<BlueprintDoc[]>([]);
  const future = useRef<BlueprintDoc[]>([]);
  const [, force] = useState(0);

  // Keep the editor pointed at a floor that still exists.
  useEffect(() => {
    if (!doc.floors.some((floor) => floor.id === activeFloorId)) {
      setActiveFloorId(doc.floors[0].id);
    }
  }, [doc.floors, activeFloorId]);

  const persist = useCallback(
    (next: BlueprintDoc) => {
      try {
        window.localStorage.setItem(keyFor(projectId), JSON.stringify(next));
      } catch {
        /* keep working in memory */
      }
    },
    [projectId],
  );

  const commit = useCallback(
    (updater: (current: BlueprintDoc) => BlueprintDoc) => {
      setDoc((current) => {
        const next = updater(current);
        if (next === current) return current;
        past.current = [...past.current, current].slice(-HISTORY_LIMIT);
        future.current = [];
        const stamped = { ...next, updatedAt: new Date().toISOString() };
        persist(stamped);
        return stamped;
      });
      force((n) => n + 1);
    },
    [persist],
  );

  const undo = useCallback(() => {
    const previous = past.current.pop();
    if (!previous) return;
    setDoc((current) => {
      future.current = [...future.current, current];
      persist(previous);
      return previous;
    });
    force((n) => n + 1);
  }, [persist]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    setDoc((current) => {
      past.current = [...past.current, current];
      persist(next);
      return next;
    });
    force((n) => n + 1);
  }, [persist]);

  const floor = useMemo(
    () => doc.floors.find((entry) => entry.id === activeFloorId) ?? doc.floors[0],
    [doc.floors, activeFloorId],
  );

  const updateFloor = useCallback(
    (updater: (current: Floor) => Floor) => {
      commit((current) => ({
        ...current,
        floors: current.floors.map((entry) => (entry.id === floor.id ? updater(entry) : entry)),
      }));
    },
    [commit, floor.id],
  );

  const setWallHeight = useCallback(
    (value: number) => commit((current) => ({ ...current, wallHeight: value })),
    [commit],
  );

  const renameProject = useCallback(
    (value: string) => commit((current) => ({ ...current, name: value })),
    [commit],
  );

  const addFloor = useCallback(
    (copyCurrent = false) => {
      const next = copyCurrent
        ? {
            ...structuredClone(floor),
            id: uid('floor'),
            name: `${doc.floors.length}${doc.floors.length === 1 ? 'st' : doc.floors.length === 2 ? 'nd' : doc.floors.length === 3 ? 'rd' : 'th'} floor`,
            walls: floor.walls.map((w) => ({ ...w, id: uid('wall') })),
            openings: floor.openings.map((o) => ({ ...o, id: uid('opening') })),
            rooms: floor.rooms.map((r) => ({ ...r, id: uid('room'), points: r.points.map((p) => ({ ...p })) })),
            furniture: floor.furniture.map((f) => ({ ...f, id: uid('piece') })),
          }
        : blankFloor(doc.floors.length);
      commit((current) => ({ ...current, floors: [...current.floors, next] }));
      setActiveFloorId(next.id);
    },
    [commit, doc.floors.length, floor],
  );

  const deleteFloor = useCallback(
    (id: string) => {
      if (doc.floors.length === 1) return;
      commit((current) => ({ ...current, floors: current.floors.filter((entry) => entry.id !== id) }));
    },
    [commit, doc.floors.length],
  );

  const renameFloor = useCallback(
    (id: string, name: string) =>
      commit((current) => ({
        ...current,
        floors: current.floors.map((entry) => (entry.id === id ? { ...entry, name } : entry)),
      })),
    [commit],
  );

  const moveFloor = useCallback(
    (id: string, direction: -1 | 1) =>
      commit((current) => {
        const index = current.floors.findIndex((entry) => entry.id === id);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= current.floors.length) return current;
        const floors = [...current.floors];
        [floors[index], floors[target]] = [floors[target], floors[index]];
        return { ...current, floors };
      }),
    [commit],
  );

  const clearFloor = useCallback(() => {
    updateFloor(() => ({
      ...floor,
      walls: [],
      openings: [],
      rooms: [],
      furniture: [],
    }));
  }, [floor, updateFloor]);

  const resetAll = useCallback(() => {
    const next = newDoc(projectId, projectName);
    past.current = [];
    future.current = [];
    setDoc(next);
    setActiveFloorId(next.floors[0].id);
    persist(next);
  }, [persist, projectId, projectName]);

  return {
    doc,
    floor,
    activeFloorId,
    setActiveFloorId,
    commit,
    updateFloor,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    setWallHeight,
    renameProject,
    addFloor,
    deleteFloor,
    renameFloor,
    moveFloor,
    clearFloor,
    resetAll,
  };
}
