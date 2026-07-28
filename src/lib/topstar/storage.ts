import { createSaveFile, hydrateState } from "@/lib/topstar/game";
import type { GameState, SaveFile, SaveSlotId } from "@/lib/topstar/types";

const AUTOSAVE_KEY = "topstar.autosave";

function getSlotKey(slotId: SaveSlotId): string {
  return `topstar.${slotId}`;
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readSave(key: string): SaveFile | null {
  if (!canUseStorage()) return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SaveFile;
    if (!parsed?.state) return null;
    return {
      ...parsed,
      state: hydrateState(parsed.state),
    };
  } catch {
    return null;
  }
}

function writeSave(key: string, save: SaveFile): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(save));
}

export function loadAutosave(): GameState | null {
  return readSave(AUTOSAVE_KEY)?.state ?? null;
}

export function saveAutosave(state: GameState): void {
  writeSave(AUTOSAVE_KEY, createSaveFile(state));
}

export function loadManualSlot(slotId: SaveSlotId): SaveFile | null {
  return readSave(getSlotKey(slotId));
}

export function saveManualSlot(slotId: SaveSlotId, state: GameState): SaveFile {
  const save: SaveFile = {
    ...createSaveFile(state),
    slotId,
  };
  writeSave(getSlotKey(slotId), save);
  return save;
}

export function clearManualSlot(slotId: SaveSlotId): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(getSlotKey(slotId));
}
