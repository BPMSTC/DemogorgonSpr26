import { Injectable } from '@angular/core';
import { Performance } from '../models/performance.model';

// ---- Storage Configuration -------------------------------------------------

/** localStorage key used to persist all performances across page navigations. */
const PERFORMANCES_STORAGE_KEY = 'mfp_performances';

/**
 * Pre-loaded demo performances shown the very first time the app opens
 * (i.e. when localStorage has no saved data yet).
 * Gives new users something to explore immediately.
 */
const DEMO_PERFORMANCES: Performance[] = [
  { id: '1', festivalId: '1', artistName: 'The Neon Shadows',   stageName: 'Main Stage',   date: '2026-08-01', startTime: '18:00', endTime: '19:30', genre: 'Rock' },
  { id: '2', festivalId: '1', artistName: 'DJ Horizon',         stageName: 'Dance Tent',   date: '2026-08-01', startTime: '18:00', endTime: '19:00', genre: 'Electronic' },
  { id: '3', festivalId: '1', artistName: 'Electric Pulse',     stageName: 'Main Stage',   date: '2026-08-01', startTime: '20:00', endTime: '21:30', genre: 'Electronic' },
  { id: '4', festivalId: '1', artistName: 'Acoustic Wanderers', stageName: 'Forest Stage', date: '2026-08-02', startTime: '14:00', endTime: '15:00', genre: 'Folk' },
];

// ---- Service ---------------------------------------------------------------

@Injectable({
  providedIn: 'root', // singleton — shared across the entire app
})
export class ScheduleService {
  /** The working in-memory list of all performances. Kept in sync with localStorage. */
  private allPerformances: Performance[];

  /** Counter used to generate unique numeric IDs for new performances. */
  private nextPerformanceId: number;

  constructor() {
    // Hydrate from localStorage on startup so data survives page refreshes.
    this.allPerformances = this.loadPerformancesFromStorage();

    // Set the next ID to one above the highest existing ID to avoid collisions.
    this.nextPerformanceId = this.allPerformances
      .reduce((highestId, performance) => Math.max(highestId, Number(performance.id) || 0), 0) + 1;
  }

  // ---- Private Storage Helpers -------------------------------------------

  /**
   * Reads and parses performances from localStorage.
   * Falls back to the demo dataset if storage is empty or the data is corrupted.
   */
  private loadPerformancesFromStorage(): Performance[] {
    try {
      const storedJson = localStorage.getItem(PERFORMANCES_STORAGE_KEY);

      // Only use stored data if it exists and contains at least one entry.
      if (storedJson) {
        const parsedPerformances = JSON.parse(storedJson) as Performance[];
        if (Array.isArray(parsedPerformances) && parsedPerformances.length > 0) {
          return parsedPerformances;
        }
      }
    } catch {
      // JSON.parse throws if the stored string is malformed — use demo data instead.
    }

    // First-time visitor or corrupted storage: seed with demo performances.
    return [...DEMO_PERFORMANCES];
  }

  /**
   * Serializes the current performances array to localStorage.
   * Called after every create/delete operation to keep storage in sync.
   */
  private persistPerformancesToStorage(): void {
    try {
      localStorage.setItem(PERFORMANCES_STORAGE_KEY, JSON.stringify(this.allPerformances));
    } catch {
      // Storage quota exceeded or unavailable (private browsing) — silently
      // continue with the in-memory state; the app still functions correctly.
    }
  }

  // ---- Private Time Utility ----------------------------------------------

  /**
   * Converts a 24-hour time string ("H:mm" or "HH:mm") to a total-minutes integer.
   * Returns null if the format is invalid so callers can handle bad input gracefully.
   *
   * Examples:  "9:00" → 540,  "18:30" → 1110,  "bad" → null
   */
  private convertTimeStringToMinutes(timeString: string): number | null {
    const timePattern = /^(\d{1,2}):(\d{2})$/;
    const patternMatch = timePattern.exec(timeString.trim());
    if (!patternMatch) return null;

    const hours   = Number(patternMatch[1]);
    const minutes = Number(patternMatch[2]);

    // Validate that the parsed values are real integers within clock bounds.
    if (!Number.isInteger(hours)   || !Number.isInteger(minutes))  return null;
    if (hours   < 0 || hours   > 23) return null;
    if (minutes < 0 || minutes > 59) return null;

    return hours * 60 + minutes;
  }

  // ---- Public Query Methods ----------------------------------------------

  /**
   * Returns a shallow copy of all performances belonging to the given festival.
   * Copies prevent external code from mutating the internal array directly.
   */
  getPerformancesByFestival(festivalId: string): Performance[] {
    return this.allPerformances
      .filter((performance) => performance.festivalId === festivalId)
      .map((performance) => ({ ...performance })); // spread creates a safe copy
  }

  /**
   * Checks whether a specific stage is already booked during the requested time window.
   * Uses the "overlap" formula: two intervals overlap when A.start < B.end AND A.end > B.start.
   *
   * @param excludeId  Optional — ID of an existing performance to skip (used when editing).
   * @returns true if the stage is occupied (conflict exists), false if the slot is free.
   */
  isStageOccupied(
    festivalId: string,
    stageName:  string,
    date:       string,
    startTime:  string,
    endTime:    string,
    excludeId?: string
  ): boolean {
    const newStartMinutes = this.convertTimeStringToMinutes(startTime);
    const newEndMinutes   = this.convertTimeStringToMinutes(endTime);

    // If either time is unparseable or the window is empty, treat it as no conflict.
    if (newStartMinutes === null || newEndMinutes === null) return false;
    if (newStartMinutes >= newEndMinutes) return false;

    // Walk every stored performance and test for a time overlap on the same stage/day.
    return this.allPerformances.some((existingPerformance) => {
      if (existingPerformance.festivalId !== festivalId) return false;
      if (existingPerformance.stageName  !== stageName)  return false;
      if (existingPerformance.date       !== date)       return false;

      // Skip the performance being edited so it doesn't conflict with itself.
      if (excludeId && existingPerformance.id === excludeId) return false;

      const existingStartMinutes = this.convertTimeStringToMinutes(existingPerformance.startTime);
      const existingEndMinutes   = this.convertTimeStringToMinutes(existingPerformance.endTime);
      if (existingStartMinutes === null || existingEndMinutes === null) return false;

      // Standard interval-overlap test.
      return newStartMinutes < existingEndMinutes && newEndMinutes > existingStartMinutes;
    });
  }

  // ---- Public Mutation Methods -------------------------------------------

  /**
   * Validates and saves a new performance to the schedule.
   * Throws a descriptive Error if validation fails — the caller shows it to the user.
   */
  createPerformance(newPerformanceData: Omit<Performance, 'id'>): Performance {
    const startMinutes = this.convertTimeStringToMinutes(newPerformanceData.startTime);
    const endMinutes   = this.convertTimeStringToMinutes(newPerformanceData.endTime);

    // Guard: both times must parse successfully.
    if (startMinutes === null || endMinutes === null) {
      throw new Error('Start and end times must be valid 24-hour times (H:mm or HH:mm).');
    }

    // Guard: the performance must have positive duration.
    if (startMinutes >= endMinutes) {
      throw new Error('End time must be later than start time.');
    }

    // Guard: the stage must not be double-booked during this window.
    if (
      this.isStageOccupied(
        newPerformanceData.festivalId,
        newPerformanceData.stageName,
        newPerformanceData.date,
        newPerformanceData.startTime,
        newPerformanceData.endTime
      )
    ) {
      throw new Error(`"${newPerformanceData.stageName}" is already booked during that time slot.`);
    }

    // Assign a unique ID and append to the in-memory list.
    const savedPerformance: Performance = {
      id: String(this.nextPerformanceId++),
      ...newPerformanceData,
    };

    this.allPerformances.push(savedPerformance);
    this.persistPerformancesToStorage(); // keep localStorage in sync
    return { ...savedPerformance };     // return a copy, not the stored reference
  }

  /**
   * Removes a single performance by its ID.
   * @returns true if a matching performance was found and removed, false otherwise.
   */
  deletePerformance(performanceId: string): boolean {
    const performanceIndex = this.allPerformances.findIndex(
      (performance) => performance.id === performanceId
    );

    if (performanceIndex === -1) return false; // ID not found — nothing to delete

    this.allPerformances.splice(performanceIndex, 1); // remove the one entry
    this.persistPerformancesToStorage();              // sync localStorage
    return true;
  }

  /**
   * Removes ALL performances for a given festival in one operation.
   * Used by the "Clear All" button on the performance-list page.
   */
  clearPerformancesByFestival(festivalId: string): void {
    // Keep every performance that does NOT belong to this festival.
    this.allPerformances = this.allPerformances.filter(
      (performance) => performance.festivalId !== festivalId
    );
    this.persistPerformancesToStorage(); // sync localStorage
  }
}
