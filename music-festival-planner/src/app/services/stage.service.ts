import { Injectable } from '@angular/core';
import { Stage } from '../models/stage.model';

@Injectable({
  providedIn: 'root', // singleton — one shared instance across the whole app
})
export class StageService {
  /**
   * Pre-loaded demo stages for Festival ID "1".
   * Gives new users a ready-to-explore lineup without having to create stages first.
   */
  private stageStore: Stage[] = [
    {
      id: '1',
      festivalId: '1',
      name: 'Main Stage',
      capacity: 5000,
      environment: 'outdoor',
      status: 'active',
      notes: 'Primary headliner stage with full production.',
    },
    {
      id: '2',
      festivalId: '1',
      name: 'Indie Stage',
      capacity: 1500,
      environment: 'outdoor',
      status: 'active',
      notes: 'Emerging artists and indie acts.',
    },
    {
      id: '3',
      festivalId: '1',
      name: 'Dance Tent',
      capacity: 800,
      environment: 'indoor',
      status: 'active',
      notes: 'Electronic and DJ sets.',
    },
    {
      id: '4',
      festivalId: '1',
      name: 'Forest Stage',
      capacity: 600,
      environment: 'outdoor',
      status: 'inactive',
      notes: 'Acoustic sets in a natural setting.',
    },
  ];

  /** Auto-incrementing counter for unique stage IDs (starts above the demo data). */
  private nextStageId = 5;

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
    return true;
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
