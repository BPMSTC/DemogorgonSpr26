import { Injectable, Inject, InjectionToken, Signal, signal } from '@angular/core';
import { Performance } from '../models/performance.model';

// ---- Storage Abstraction ---------------------------------------------------

/**
 * InjectionToken for the browser Storage used by ScheduleService.
 * Providing an InjectionToken instead of calling `localStorage` directly
 * lets unit tests inject a hermetic in-memory substitute (MockStorage)
 * so tests run without touching the real browser storage.
 */
export const LOCAL_STORAGE = new InjectionToken<Storage>('localStorage', {
  providedIn: 'root',
  factory: () => localStorage, // production: use the real browser localStorage
});

// ---- Storage Configuration -------------------------------------------------

/** The key under which all performances are stored in localStorage. */
const STORAGE_KEY = 'mfp_performances';

/**
 * Pre-loaded demo performances shown the very first time the app opens
 * (i.e. when localStorage has no saved data yet).
 * Gives new users something to explore right away without creating anything.
 */
const SEED_PERFORMANCES: Performance[] = [
  { id: '1', festivalId: '1', artistName: 'The Neon Shadows',    stageName: 'Main Stage',   date: '2026-08-01', startTime: '18:00', endTime: '19:30', genre: 'Rock' },
  { id: '2', festivalId: '1', artistName: 'DJ Horizon',          stageName: 'Dance Tent',   date: '2026-08-01', startTime: '18:00', endTime: '19:00', genre: 'Electronic' },
  { id: '3', festivalId: '1', artistName: 'Electric Pulse',      stageName: 'Main Stage',   date: '2026-08-01', startTime: '20:00', endTime: '21:30', genre: 'Electronic' },
  { id: '4', festivalId: '1', artistName: 'Acoustic Wanderers',  stageName: 'Forest Stage', date: '2026-08-02', startTime: '14:00', endTime: '15:00', genre: 'Folk' },
];

// ---- Service ---------------------------------------------------------------

@Injectable({
  providedIn: 'root', // singleton — one shared instance across the entire app
})
export class ScheduleService {
  /**
   * Canonical in-memory schedule state for the entire app.
   * All schedule reads and mutations go through this single signal source.
   */
  private readonly performancesState = signal<Performance[]>([]);

  /** Read-only signal exposed for components that need reactive schedule state. */
  readonly performancesSignal: Signal<Performance[]> = this.performancesState.asReadonly();

  /** Auto-incrementing counter for assigning unique numeric IDs to new performances. */
  private nextId: number;

  constructor(
    // Inject the storage abstraction so tests can substitute MockStorage.
    @Inject(LOCAL_STORAGE) private storage: Storage
  ) {
    // Hydrate from storage on startup so data survives page refreshes.
    const initialPerformances = this.loadFromStorage();
    this.performancesState.set(initialPerformances);

    // Set the counter to one above the highest existing ID to avoid collisions
    // with data that was already stored from a previous session.
    this.nextId = initialPerformances.reduce(
      (highestId, p) => Math.max(highestId, Number(p.id) || 0), 0
    ) + 1;
  }

  // ---- Private Storage Helpers -------------------------------------------

  /**
   * Validates that a value loaded from storage has the minimum shape required
   * to be safely treated as a Performance for scheduling logic.
   *
   * We only require fields that are used by time and layout calculations:
   * id, festivalId, stageName, date, startTime, endTime — all as strings.
   *
   * @param entry Arbitrary value parsed from JSON storage.
   * @returns True if the entry looks like a valid stored Performance.
   */
  private isValidStoredPerformance(entry: unknown): entry is Performance {
    if (entry === null || typeof entry !== 'object') {
      return false;
    }

    const candidate = entry as { [key: string]: unknown };
    const requiredKeys: Array<keyof Performance> = [
      'id',
      'festivalId',
      'stageName',
      'date',
      'startTime',
      'endTime',
    ];

    for (const key of requiredKeys) {
      if (typeof candidate[key] !== 'string') {
        return false;
      }
    }

    return true;
  }

  /**
   * Reads and deserializes performances from storage.
   * Falls back to SEED_PERFORMANCES if storage is empty, the JSON is corrupted,
   * or the stored data does not contain at least one valid performance entry.
   */
  private loadFromStorage(): Performance[] {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);

      // Only use stored data if it exists and deserializes to a valid array
      // with at least one structurally valid performance.
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter((entry) =>
            this.isValidStoredPerformance(entry)
          );

          if (valid.length > 0) {
            // Return a cloned array so in-memory mutations do not accidentally
            // modify any shared references from parsing.
            return valid.map((p) => ({ ...p } as Performance));
          }
        }
      }
    } catch {
      // JSON.parse throws on malformed data — fall through to seed data.
    }

    // First run, corrupted storage, or no valid entries: seed with demo performances.
    return [...SEED_PERFORMANCES];
  }

  /**
   * Serializes the current performances array back to storage.
   * Called after every create/delete to keep storage in sync with memory.
   */
  private saveToStorage(): void {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.performancesState()));
    } catch {
      // Storage quota exceeded or unavailable (e.g. private browsing mode).
      // Continue with in-memory state — the app still works for this session.
    }
  }

  // ---- Private Time Utility ----------------------------------------------

  /**
   * Converts a "H:mm" or "HH:mm" time string to a total-minutes integer.
   * Returns null for any input that doesn't match the expected format.
   *
   * Examples:  "9:00" → 540,  "18:30" → 1110,  "bad" → null
   * Used internally to compare time windows as plain numbers.
   */
  private toMinutes(time: string): number | null {
    const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
    if (!match) return null;

    const hours   = Number(match[1]);
    const minutes = Number(match[2]);

    // Reject non-integers and out-of-range clock values.
    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
    if (hours < 0 || hours > 23)     return null;
    if (minutes < 0 || minutes > 59) return null;

    return hours * 60 + minutes;
  }

  // ---- Public Query Methods ----------------------------------------------

  /**
   * Returns a shallow copy of all performances belonging to the given festival.
   * Returning copies prevents external code from accidentally mutating the store.
   */
  getPerformancesByFestival(festivalId: string): Performance[] {
    return this.performancesState()
      .filter((p) => p.festivalId === festivalId)
      .map((p) => ({ ...p })); // spread creates a safe independent copy
  }

  /**
   * Tests whether a stage is already booked during the requested time window.
   * Uses the standard interval-overlap formula:
   *   Two ranges [A.start, A.end) and [B.start, B.end) overlap when
   *   A.start < B.end  AND  A.end > B.start.
   *
   * @param excludeId  Skip this performance ID when scanning (used when editing
   *                   an existing performance so it doesn't conflict with itself).
   * @returns true = slot is taken (conflict), false = slot is free.
   */
  isStageOccupied(
    festivalId: string,
    stageName:  string,
    date:       string,
    startTime:  string,
    endTime:    string,
    excludeId?: string
  ): boolean {
    const newStart = this.toMinutes(startTime);
    const newEnd   = this.toMinutes(endTime);

    // Unparseable times or zero-duration windows cannot conflict.
    if (newStart === null || newEnd === null) return false;
    if (newStart >= newEnd) return false;

    // Walk every stored performance and test for an overlap on the same stage/day.
    return this.performancesState().some((p) => {
      if (p.festivalId !== festivalId)          return false;
      if (p.stageName  !== stageName)           return false;
      if (p.date       !== date)                return false;
      if (excludeId && p.id === excludeId)      return false; // skip self when editing

      const existingStart = this.toMinutes(p.startTime);
      const existingEnd   = this.toMinutes(p.endTime);
      if (existingStart === null || existingEnd === null) return false;

      // Interval-overlap test.
      return newStart < existingEnd && newEnd > existingStart;
    });
  }

  // ---- Public Mutation Methods -------------------------------------------

  /**
   * Validates and saves a new performance.
   * Throws a human-readable Error for any validation failure so the calling
   * component can display it directly in the form's error banner.
   */
  createPerformance(data: Omit<Performance, 'id'>): Performance {
    const startMinutes = this.toMinutes(data.startTime);
    const endMinutes   = this.toMinutes(data.endTime);

    // Guard: both times must be parseable 24-hour strings.
    if (startMinutes === null || endMinutes === null) {
      throw new Error('Start and end times must be valid 24-hour times (H:mm or HH:mm).');
    }

    // Guard: the performance must have a positive duration.
    if (startMinutes >= endMinutes) {
      throw new Error('End time must be later than start time.');
    }

    // Guard: the stage must not already be booked during this time window.
    if (this.isStageOccupied(data.festivalId, data.stageName, data.date, data.startTime, data.endTime)) {
      throw new Error(`"${data.stageName}" is already booked during that time slot.`);
    }

    // Assign the next available ID, append to the store, and persist.
    const performance: Performance = { id: String(this.nextId++), ...data };
    this.performancesState.update((current) => [...current, performance]);
    this.saveToStorage();
    return { ...performance }; // return a copy, not the stored reference
  }

  /**
   * Removes a single performance by its ID.
   * @returns true if the ID was found and deleted, false if it did not exist.
   */
  deletePerformance(id: string): boolean {
    const current = this.performancesState();
    const next = current.filter((p) => p.id !== id);
    if (next.length === current.length) return false; // ID not found — nothing to remove

    this.performancesState.set(next);
    this.saveToStorage();               // sync storage
    return true;
  }

  /**
   * Removes ALL performances for a given festival in one operation.
   * Called by the "Clear All" button on the performance-list page.
   */
  clearPerformancesByFestival(festivalId: string): void {
    // Keep every performance that belongs to a DIFFERENT festival.
    this.performancesState.update((current) =>
      current.filter((p) => p.festivalId !== festivalId)
    );
    this.saveToStorage(); // sync storage
  }
}
