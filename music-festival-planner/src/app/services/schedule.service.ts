import { Injectable } from '@angular/core';
import { Performance } from '../models/performance.model';

@Injectable({
  providedIn: 'root',
})
export class ScheduleService {
  private mockPerformances: Performance[] = [
    { id: '1', festivalId: '1', artistName: 'The Neon Shadows',    stageName: 'Main Stage',   date: '2026-08-01', startTime: '18:00', endTime: '19:30' },
    { id: '2', festivalId: '1', artistName: 'DJ Horizon',          stageName: 'Dance Tent',   date: '2026-08-01', startTime: '18:00', endTime: '19:00' },
    { id: '3', festivalId: '1', artistName: 'Electric Pulse',      stageName: 'Main Stage',   date: '2026-08-01', startTime: '20:00', endTime: '21:30' },
    { id: '4', festivalId: '1', artistName: 'Acoustic Wanderers',  stageName: 'Forest Stage', date: '2026-08-02', startTime: '14:00', endTime: '15:00' },
  ];

  private nextId = 5;

  getPerformancesByFestival(festivalId: string): Performance[] {
    return this.mockPerformances
      .filter((p) => p.festivalId === festivalId)
      .map((p) => ({ ...p }));
  }

  /**
   * Returns true if the stage already has a performance overlapping the given time slot.
   * A stage can only have ONE performance at a time.
   */
  isStageOccupied(
    festivalId: string,
    stageName: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeId?: string
  ): boolean {
    return this.mockPerformances.some((p) => {
      if (p.festivalId !== festivalId) return false;
      if (p.stageName !== stageName) return false;
      if (p.date !== date) return false;
      if (excludeId && p.id === excludeId) return false;
      // Overlap: new start < existing end AND new end > existing start
      return startTime < p.endTime && endTime > p.startTime;
    });
  }

  createPerformance(data: Omit<Performance, 'id'>): Performance | { error: string } {
    if (
      this.isStageOccupied(
        data.festivalId,
        data.stageName,
        data.date,
        data.startTime,
        data.endTime
      )
    ) {
      return {
        error: `"${data.stageName}" is already booked during that time slot.`,
      };
    }
    const performance: Performance = { id: String(this.nextId++), ...data };
    this.mockPerformances.push(performance);
    return { ...performance };
  }

  deletePerformance(id: string): boolean {
    const index = this.mockPerformances.findIndex((p) => p.id === id);
    if (index === -1) return false;
    this.mockPerformances.splice(index, 1);
    return true;
  }
}