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

  private toMinutes(time: string): number | null {
    const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
    if (!match) return null;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);

    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
    if (hours < 0 || hours > 23) return null;
    if (minutes < 0 || minutes > 59) return null;

    return hours * 60 + minutes;
  }

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
    const newStartMinutes = this.toMinutes(startTime);
    const newEndMinutes = this.toMinutes(endTime);

    if (newStartMinutes === null || newEndMinutes === null) return false;
    if (newStartMinutes >= newEndMinutes) return false;

    return this.mockPerformances.some((p) => {
      if (p.festivalId !== festivalId) return false;
      if (p.stageName !== stageName) return false;
      if (p.date !== date) return false;
      if (excludeId && p.id === excludeId) return false;

      const existingStartMinutes = this.toMinutes(p.startTime);
      const existingEndMinutes = this.toMinutes(p.endTime);
      if (existingStartMinutes === null || existingEndMinutes === null) return false;

      // Overlap: new start < existing end AND new end > existing start
      return newStartMinutes < existingEndMinutes && newEndMinutes > existingStartMinutes;
    });
  }

  createPerformance(data: Omit<Performance, 'id'>): Performance | { error: string } {
    const startMinutes = this.toMinutes(data.startTime);
    const endMinutes = this.toMinutes(data.endTime);

    if (startMinutes === null || endMinutes === null) {
      return {
        error: 'Start and end times must be valid 24-hour times (H:mm or HH:mm).',
      };
    }

    if (startMinutes >= endMinutes) {
      return {
        error: 'End time must be later than start time.',
      };
    }

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