import { Injectable } from '@angular/core';
import { Performance } from '../models/performance.model';

const STORAGE_KEY = 'mfp_performances';

const SEED_PERFORMANCES: Performance[] = [
  { id: '1', festivalId: '1', artistName: 'The Neon Shadows',    stageName: 'Main Stage',   date: '2026-08-01', startTime: '18:00', endTime: '19:30', genre: 'Rock' },
  { id: '2', festivalId: '1', artistName: 'DJ Horizon',          stageName: 'Dance Tent',   date: '2026-08-01', startTime: '18:00', endTime: '19:00', genre: 'Electronic' },
  { id: '3', festivalId: '1', artistName: 'Electric Pulse',      stageName: 'Main Stage',   date: '2026-08-01', startTime: '20:00', endTime: '21:30', genre: 'Electronic' },
  { id: '4', festivalId: '1', artistName: 'Acoustic Wanderers',  stageName: 'Forest Stage', date: '2026-08-02', startTime: '14:00', endTime: '15:00', genre: 'Folk' },
];

@Injectable({
  providedIn: 'root',
})
export class ScheduleService {
  private performances: Performance[];
  private nextId: number;

  constructor() {
    this.performances = this.loadFromStorage();
    this.nextId = this.performances.reduce((max, p) => Math.max(max, Number(p.id) || 0), 0) + 1;
  }

  // ---- Storage -------------------------------------------------------

  private loadFromStorage(): Performance[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw !== null) {
        const parsed = JSON.parse(raw) as Performance[];
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // corrupted data — fall through to seed
    }
    return [...SEED_PERFORMANCES];
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.performances));
    } catch {
      // storage full or unavailable — continue in-memory only
    }
  }

  // ---- Queries -------------------------------------------------------

  getPerformancesByFestival(festivalId: string): Performance[] {
    return this.performances
      .filter((p) => p.festivalId === festivalId)
      .map((p) => ({ ...p }));
  }

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

  /**
   * Returns true if the stage already has a performance overlapping the given time slot.
   */
  isStageOccupied(
    festivalId: string,
    stageName: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeId?: string
  ): boolean {
    const newStart = this.toMinutes(startTime);
    const newEnd   = this.toMinutes(endTime);

    if (newStart === null || newEnd === null) return false;
    if (newStart >= newEnd) return false;

    return this.performances.some((p) => {
      if (p.festivalId !== festivalId) return false;
      if (p.stageName !== stageName)   return false;
      if (p.date !== date)             return false;
      if (excludeId && p.id === excludeId) return false;

      const existingStart = this.toMinutes(p.startTime);
      const existingEnd   = this.toMinutes(p.endTime);
      if (existingStart === null || existingEnd === null) return false;

      return newStart < existingEnd && newEnd > existingStart;
    });
  }

  // ---- Mutations -----------------------------------------------------

  createPerformance(data: Omit<Performance, 'id'>): Performance {
    const startMinutes = this.toMinutes(data.startTime);
    const endMinutes   = this.toMinutes(data.endTime);

    if (startMinutes === null || endMinutes === null) {
      throw new Error('Start and end times must be valid 24-hour times (H:mm or HH:mm).');
    }

    if (startMinutes >= endMinutes) {
      throw new Error('End time must be later than start time.');
    }

    if (this.isStageOccupied(data.festivalId, data.stageName, data.date, data.startTime, data.endTime)) {
      throw new Error(`"${data.stageName}" is already booked during that time slot.`);
    }

    const performance: Performance = { id: String(this.nextId++), ...data };
    this.performances.push(performance);
    this.saveToStorage();
    return { ...performance };
  }

  deletePerformance(id: string): boolean {
    const index = this.performances.findIndex((p) => p.id === id);
    if (index === -1) return false;
    this.performances.splice(index, 1);
    this.saveToStorage();
    return true;
  }

  clearPerformancesByFestival(festivalId: string): void {
    this.performances = this.performances.filter((p) => p.festivalId !== festivalId);
    this.saveToStorage();
  }
}
