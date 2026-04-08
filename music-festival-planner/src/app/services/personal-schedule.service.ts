import { Injectable, Inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Performance } from '../models/performance.model';
import { LOCAL_STORAGE } from './schedule.service';

// ---- Storage Configuration -------------------------------------------------

/** localStorage key for the user's personal saved performances. */
const PERSONAL_SCHEDULE_KEY = 'mfp_personal_schedule';

// ---- Service ---------------------------------------------------------------

/**
 * Manages the attendee's personal schedule — the subset of festival performances
 * they have explicitly bookmarked.
 *
 * State is stored in localStorage so it survives page refreshes, and exposed as
 * an Observable so any component can react to additions/removals without polling.
 */
@Injectable({
  providedIn: 'root',
})
export class PersonalScheduleService {
  /** Internal BehaviorSubject — source of truth for saved performances. */
  private savedSubject: BehaviorSubject<Performance[]>;

  /** Public Observable that components subscribe to for live updates. */
  readonly saved$: Observable<Performance[]>;

  constructor(@Inject(LOCAL_STORAGE) private storage: Storage) {
    const initial = this.loadFromStorage();
    this.savedSubject = new BehaviorSubject<Performance[]>(initial);
    this.saved$ = this.savedSubject.asObservable();
  }

  // ---- Snapshot accessor --------------------------------------------------

  /** Synchronous snapshot — useful for one-off checks without subscribing. */
  get saved(): Performance[] {
    return this.savedSubject.getValue();
  }

  // ---- Public API ---------------------------------------------------------

  /**
   * Returns true if the given performance ID is already in the personal schedule.
   * Used to drive the "Add / In My Schedule" button state in the timetable.
   */
  isSaved(performanceId: string): boolean {
    return this.saved.some(p => p.id === performanceId);
  }

  /**
   * Adds a performance to the personal schedule (no-op if already present).
   * Emits the updated list and persists to localStorage.
   */
  add(performance: Performance): void {
    if (this.isSaved(performance.id)) return;
    const updated = [...this.saved, { ...performance }];
    this.savedSubject.next(updated);
    this.saveToStorage(updated);
  }

  /**
   * Removes a performance from the personal schedule by ID (no-op if absent).
   * Emits the updated list and persists to localStorage.
   */
  remove(performanceId: string): void {
    const updated = this.saved.filter(p => p.id !== performanceId);
    this.savedSubject.next(updated);
    this.saveToStorage(updated);
  }

  /**
   * Toggles a performance: removes it if already saved, adds it otherwise.
   * Convenient single entry-point for the button click handler.
   */
  toggle(performance: Performance): void {
    this.isSaved(performance.id) ? this.remove(performance.id) : this.add(performance);
  }

  /**
   * Removes all saved performances (clear-all action on the personal schedule page).
   */
  clearAll(): void {
    this.savedSubject.next([]);
    this.saveToStorage([]);
  }

  /**
   * Formats a stored 24-hour time string for display in 12-hour format.
   *
   * @param timeString Time string in HH:mm or H:mm format.
   * @returns Formatted time string such as "06:00 PM".
   */
  private formatDisplayTime(timeString: string): string {
    const [hoursText, minutesText] = timeString.split(':');
    const hours = Number(hoursText);
    const minutes = Number(minutesText);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return timeString;
    }

    const suffix = hours >= 12 ? 'PM' : 'AM';
    const normalizedHours = hours % 12 || 12;
    return `${String(normalizedHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${suffix}`;
  }

  /**
   * Removes all performances from a specific festival from the personal schedule.
   * Called when a festival is deleted to clean up its associated performances.
   *
   * @param festivalId The ID of the festival whose performances should be removed.
   */
  removePerformancesByFestival(festivalId: string): void {
    const updated = this.saved.filter(p => p.festivalId !== festivalId);
    this.savedSubject.next(updated);
    this.saveToStorage(updated);
  }

  // ---- Personal Conflict Detection ----------------------------------------

  /**
   * Detects time-overlap conflicts within the user's saved personal schedule.
   * Unlike the festival-wide conflict detection (same stage), personal conflicts
   * occur when two saved performances from ANY stage overlap in time — because
   * the attendee cannot physically be in two places at once.
   *
   * @returns Array of conflict pairs: each entry is a tuple of two overlapping
   *          performances, plus the formatted overlap window string.
   */
  getPersonalConflicts(): PersonalConflict[] {
    const perfs = this.saved;
    const conflicts: PersonalConflict[] = [];

    const toMin = (t: string): number => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const toTimeStr = (m: number): string =>
      `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

    for (let i = 0; i < perfs.length; i++) {
      for (let j = i + 1; j < perfs.length; j++) {
        const a = perfs[i];
        const b = perfs[j];

        // Only compare performances on the same date.
        if (a.date !== b.date) continue;

        const aStart = toMin(a.startTime);
        const aEnd   = toMin(a.endTime);
        const bStart = toMin(b.startTime);
        const bEnd   = toMin(b.endTime);

        if (aStart < bEnd && aEnd > bStart) {
          const overlapStart = Math.max(aStart, bStart);
          const overlapEnd   = Math.min(aEnd, bEnd);
          conflicts.push({
            a,
            b,
            overlapWindow: `${this.formatDisplayTime(toTimeStr(overlapStart))}–${this.formatDisplayTime(toTimeStr(overlapEnd))}`,
          });
        }
      }
    }

    return conflicts;
  }

  // ---- Private Storage Helpers --------------------------------------------

  private loadFromStorage(): Performance[] {
    try {
      const raw = this.storage.getItem(PERSONAL_SCHEDULE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Basic shape validation: require id and festivalId at minimum.
      return parsed.filter(
        (p): p is Performance =>
          p !== null &&
          typeof p === 'object' &&
          typeof p['id'] === 'string' &&
          typeof p['festivalId'] === 'string'
      );
    } catch {
      return [];
    }
  }

  private saveToStorage(performances: Performance[]): void {
    try {
      this.storage.setItem(PERSONAL_SCHEDULE_KEY, JSON.stringify(performances));
    } catch {
      // Storage quota exceeded — keep in-memory state, skip persistence.
    }
  }
}

// ---- Exported Types --------------------------------------------------------

/** A detected overlap between two personally-saved performances. */
export interface PersonalConflict {
  a: Performance;
  b: Performance;
  /** Formatted as "HH:mm–HH:mm" e.g. "18:00–19:00". */
  overlapWindow: string;
}