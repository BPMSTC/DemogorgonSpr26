import { Injectable } from '@angular/core';
import { Stage } from '../models/stage.model';

@Injectable({
  providedIn: 'root',
})
export class StageService {
  private stages: Stage[] = [
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

  private nextId = 5;

  getStagesByFestival(festivalId: string): Stage[] {
    return this.stages
      .filter((s) => s.festivalId === festivalId)
      .map((s) => ({ ...s }));
  }

  getStageById(id: string): Stage | undefined {
    const found = this.stages.find((s) => s.id === id);
    return found ? { ...found } : undefined;
  }

  createStage(data: Omit<Stage, 'id'>): Stage {
    // Enforce: only one performance slot at a time per stage (name uniqueness per festival)
    const duplicate = this.stages.find(
      (s) => s.festivalId === data.festivalId &&
             s.name.toLowerCase() === data.name.toLowerCase()
    );
    if (duplicate) {
      throw new Error(`A stage named "${data.name}" already exists for this festival.`);
    }
    const stage: Stage = { id: String(this.nextId++), ...data };
    this.stages.push(stage);
    return { ...stage };
  }

  updateStage(id: string, updates: Partial<Omit<Stage, 'id'>>): Stage | null {
    const index = this.stages.findIndex((s) => s.id === id);
    if (index === -1) return null;
    this.stages[index] = { ...this.stages[index], ...updates };
    return { ...this.stages[index] };
  }

  deleteStage(id: string): boolean {
    const index = this.stages.findIndex((s) => s.id === id);
    if (index === -1) return false;
    this.stages.splice(index, 1);
    return true;
  }

  /** Used by ScheduleService to validate a stage has no conflicts */
  isStageAvailable(
    festivalId: string,
    stageName: string,
    date: string,
    startTime: string,
    endTime: string,
    excludePerformanceId?: string
  ): boolean {
    // This hook is intentionally left for ScheduleService to call —
    // conflict logic lives in ScheduleService where performances are stored.
    return true;
  }
}