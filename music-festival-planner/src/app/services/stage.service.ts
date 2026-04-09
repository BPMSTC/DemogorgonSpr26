import { Injectable, Inject } from '@angular/core';
import { Stage } from '../models/stage.model';
import { LOCAL_STORAGE } from './schedule.service';

const STORAGE_KEY = 'mfp_stages';

@Injectable({
  providedIn: 'root', // singleton — one shared instance across the whole app
})
export class StageService {
  /**
   * In-memory stage store — starts empty.
   * Users must create festivals and stages explicitly.
   */
  private stageStore: Stage[] = [];

  /** Auto-incrementing counter for unique stage IDs. */
  private nextStageId = 1;

  constructor(@Inject(LOCAL_STORAGE) private storage: Storage) {
    const loadedStages = this.loadFromStorage();
    if (loadedStages.length > 0) {
      this.stageStore = loadedStages;
      this.nextStageId = this.stageStore.reduce((maxId, stage) => Math.max(maxId, Number(stage.id) || 0), 0) + 1;
    } else {
      this.saveToStorage();
    }
  }

  private isValidStoredStage(entry: unknown): entry is Stage {
    if (entry === null || typeof entry !== 'object') return false;
    const candidate = entry as { [key: string]: unknown };

    if (
      typeof candidate['id'] !== 'string' ||
      typeof candidate['festivalId'] !== 'string' ||
      typeof candidate['name'] !== 'string' ||
      typeof candidate['capacity'] !== 'number' ||
      typeof candidate['environment'] !== 'string' ||
      typeof candidate['status'] !== 'string'
    ) {
      return false;
    }

    return true;
  }

  private loadFromStorage(): Stage[] {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (raw === null) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((entry) => this.isValidStoredStage(entry))
        .map((stage) => ({ ...stage }));
    } catch {
      return [];
    }
  }

  private saveToStorage(): void {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.stageStore));
    } catch {
      // ignore storage write failures
    }
  }

  // ---- Read Methods ------------------------------------------------------

  /**
   * Returns shallow copies of all stages belonging to the given festival.
   * Copying prevents external code from accidentally mutating the store.
   */
  getStagesByFestival(festivalId: string): Stage[] {
    return this.stageStore
      .filter((stage) => stage.festivalId === festivalId)
      .map((stage) => ({ ...stage }));
  }

  /**
   * Finds a single stage by its unique ID.
   * Returns undefined (not an error) if the ID does not exist.
   */
  getStageById(targetId: string): Stage | undefined {
    const matchedStage = this.stageStore.find((stage) => stage.id === targetId);
    return matchedStage ? { ...matchedStage } : undefined;
  }

  // ---- Write Methods -----------------------------------------------------

  /**
   * Validates and saves a new stage to the store.
   * Throws a descriptive Error that the calling component displays to the user.
   */
  createStage(newStageData: Omit<Stage, 'id'>): Stage {
    // Capacity must be a whole positive number (not 0, not a decimal).
    if (!Number.isInteger(newStageData.capacity) || newStageData.capacity <= 0) {
      throw new Error('capacity must be a positive integer.');
    }

    // Stage names must be unique within the same festival (case-insensitive).
    const duplicateStage = this.stageStore.find(
      (existingStage) =>
        existingStage.festivalId === newStageData.festivalId &&
        existingStage.name.toLowerCase() === newStageData.name.toLowerCase()
    );

    if (duplicateStage) {
      throw new Error(`A stage named "${newStageData.name}" already exists for this festival.`);
    }

    const savedStage: Stage = {
      id: String(this.nextStageId++), // assign next available ID
      ...newStageData,
    };

    this.stageStore.push(savedStage);
    this.saveToStorage();
    return { ...savedStage }; // return a copy, not the store reference
  }

  /**
   * Merges partial field updates into an existing stage record.
   * Returns the updated stage, or null if the ID was not found.
   */
  updateStage(
    targetId: string,
    fieldsToUpdate: Partial<Omit<Stage, 'id'>>
  ): Stage | null {
    const stageIndex = this.stageStore.findIndex((stage) => stage.id === targetId);

    if (stageIndex === -1) return null; // no such stage

    // Spread existing values first so only the provided fields are overwritten.
    this.stageStore[stageIndex] = {
      ...this.stageStore[stageIndex],
      ...fieldsToUpdate,
    };

    this.saveToStorage();
    return { ...this.stageStore[stageIndex] };
  }

  /**
   * Permanently removes a stage by ID.
   * @returns true if the stage was found and deleted, false if the ID was unknown.
   */
  deleteStage(targetId: string): boolean {
    const stageIndex = this.stageStore.findIndex((stage) => stage.id === targetId);

    if (stageIndex === -1) return false;

    this.stageStore.splice(stageIndex, 1); // remove the single entry
    this.saveToStorage();
    return true;
  }

  /**
   * Removes ALL stages for a given festival in one operation.
   * Called by the cascade delete orchestration when a festival is removed.
   */
  clearStagesByFestival(festivalId: string): void {
    this.stageStore = this.stageStore.filter((stage) => stage.festivalId !== festivalId);
    this.saveToStorage();
  }

  /**
   * Placeholder availability hook — conflict logic lives in ScheduleService
   * where performance time-slots are stored. This stub exists so ScheduleService
   * can call through if cross-service checks are added in the future.
   */
  isStageAvailable(
    _festivalId:          string,
    _stageName:           string,
    _date:                string,
    _startTime:           string,
    _endTime:             string,
    _excludePerformanceId?: string
  ): boolean {
    return true; // real conflict checking is handled by ScheduleService
  }
}
