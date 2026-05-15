import { Injectable, Inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Performance } from '../models/performance.model';
import { LOCAL_STORAGE } from './schedule.service';

// ---- Storage Configuration -------------------------------------------------

/** localStorage key for the user's personal saved performances. */
// The key name used to store and retrieve the personal schedule from the browser.
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
  // Holds the current list of saved performances and broadcasts any changes.
  private savedSubject: BehaviorSubject<Performance[]>;

  /** Public Observable that components subscribe to for live updates. */
  // Components subscribe to this to be notified whenever the saved list changes.
  readonly saved$: Observable<Performance[]>;

  constructor(@Inject(LOCAL_STORAGE) private storage: Storage) {
    // Read whatever was saved previously so the user's choices survive a page refresh.
    const initial = this.loadFromStorage();
    // Initialise the live data stream with the previously saved performances.
    this.savedSubject = new BehaviorSubject<Performance[]>(initial);
    // Expose a read-only version of the subject for components to subscribe to.
    this.saved$ = this.savedSubject.asObservable();
  }

  // ---- Snapshot accessor --------------------------------------------------

  /** Synchronous snapshot — useful for one-off checks without subscribing. */
  // Returns the current list of saved performances without needing a subscription.
  get saved(): Performance[] {
    return this.savedSubject.getValue();
  }

  // ---- Public API ---------------------------------------------------------

  /**
   * Returns true if the given performance ID is already in the personal schedule.
   * Used to drive the "Add / In My Schedule" button state in the timetable.
   */
  // Checks whether the user has already saved this particular performance.
  isSaved(performanceId: string): boolean {
    return this.saved.some(p => p.id === performanceId);
  }

  /**
   * Adds a performance to the personal schedule (no-op if already present).
   * Emits the updated list and persists to localStorage.
   */
  // Saves a performance to the user's personal schedule if it isn't there already.
  add(performance: Performance): void {
    // Do nothing if this performance is already in the schedule.
    if (this.isSaved(performance.id)) return;
    // Build a new list that includes the new performance alongside the existing ones.
    const updated = [...this.saved, { ...performance }];
    // Push the updated list out to all subscribers.
    this.savedSubject.next(updated);
    // Write the new list to local storage so it survives a page refresh.
    this.saveToStorage(updated);
  }

  /**
   * Removes a performance from the personal schedule by ID (no-op if absent).
   * Emits the updated list and persists to localStorage.
   */
  // Takes a performance out of the user's personal schedule.
  remove(performanceId: string): void {
    // Build a new list that excludes the performance being removed.
    const updated = this.saved.filter(p => p.id !== performanceId);
    // Push the updated list out to all subscribers.
    this.savedSubject.next(updated);
    // Write the trimmed list to local storage.
    this.saveToStorage(updated);
  }

  /**
   * Toggles a performance: removes it if already saved, adds it otherwise.
   * Convenient single entry-point for the button click handler.
   */
  // Adds the performance if it isn't saved yet, or removes it if it already is.
  toggle(performance: Performance): void {
    this.isSaved(performance.id) ? this.remove(performance.id) : this.add(performance);
  }

  /**
   * Removes all saved performances (clear-all action on the personal schedule page).
   */
  // Wipes the entire personal schedule clean.
  clearAll(): void {
    // Broadcast an empty list to all subscribers.
    this.savedSubject.next([]);
    // Overwrite local storage with an empty list.
    this.saveToStorage([]);
  }

  /**
   * Formats a stored 24-hour time string for display in 12-hour format.
   *
   * @param timeString Time string in HH:mm or H:mm format.
   * @returns Formatted time string such as "06:00 PM".
   */
  // Converts a 24-hour time string into a friendlier 12-hour display format.
  private formatDisplayTime(timeString: string): string {
    // Split the time string into its hour and minute parts.
    const [hoursText, minutesText] = timeString.split(':');
    // Convert the text parts to numbers for arithmetic.
    const hours = Number(hoursText);
    const minutes = Number(minutesText);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      // If the string wasn't a valid time, return it unchanged rather than crashing.
      return timeString;
    }

    // Decide whether the time falls in the morning or afternoon.
    const suffix = hours >= 12 ? 'PM' : 'AM';
    // Convert from 24-hour to 12-hour notation, treating midnight/noon as 12.
    const normalizedHours = hours % 12 || 12;
    // Assemble the final display string with zero-padded numbers.
    return `${String(normalizedHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${suffix}`;
  }

  /**
   * Removes all performances from a specific festival from the personal schedule.
   * Called when a festival is deleted to clean up its associated performances.
   *
   * @param festivalId The ID of the festival whose performances should be removed.
   */
  // Cleans up the personal schedule when a festival is deleted, removing all its performances.
  removePerformancesByFestival(festivalId: string): void {
    // Keep only the performances that belong to other festivals.
    const updated = this.saved.filter(p => p.festivalId !== festivalId);
    // Broadcast the trimmed list to all subscribers.
    this.savedSubject.next(updated);
    // Persist the trimmed list to local storage.
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
  // Finds every pair of saved performances that clash in time so the user can be warned.
  getPersonalConflicts(): PersonalConflict[] {
    // Start with the full list of saved performances.
    const perfs = this.saved;
    // Collect all discovered conflicts here.
    const conflicts: PersonalConflict[] = [];

    // Helper that converts an "HH:mm" string to a total number of minutes since midnight.
    const toMin = (t: string): number => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    // Helper that converts a minute count back into an "HH:mm" string.
    const toTimeStr = (m: number): string =>
      `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

    // Compare every possible pair of saved performances exactly once.
    for (let i = 0; i < perfs.length; i++) {
      for (let j = i + 1; j < perfs.length; j++) {
        const a = perfs[i];
        const b = perfs[j];

        // Only compare performances on the same date.
        if (a.date !== b.date) continue;

        // Convert all four boundary times to minutes for easy arithmetic.
        const aStart = toMin(a.startTime);
        const aEnd   = toMin(a.endTime);
        const bStart = toMin(b.startTime);
        const bEnd   = toMin(b.endTime);

        // Two intervals overlap when one starts before the other ends (and vice versa).
        if (aStart < bEnd && aEnd > bStart) {
          // The overlap window is the later start to the earlier end.
          const overlapStart = Math.max(aStart, bStart);
          const overlapEnd   = Math.min(aEnd, bEnd);
          // Record the pair along with a formatted description of when they clash.
          conflicts.push({
            a,
            b,
            overlapWindow: `${this.formatDisplayTime(toTimeStr(overlapStart))}–${this.formatDisplayTime(toTimeStr(overlapEnd))}`,
          });
        }
      }
    }

    // Return every conflict that was found.
    return conflicts;
  }

  // ---- Private Storage Helpers --------------------------------------------

  // Reads the saved performances from local storage and returns them as an array.
  private loadFromStorage(): Performance[] {
    try {
      // Retrieve the raw JSON string from the browser.
      const raw = this.storage.getItem(PERSONAL_SCHEDULE_KEY);
      // If there's nothing stored yet, start with an empty schedule.
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      // Protect against stored data that is not an array.
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
      // If parsing fails for any reason, discard the corrupt data and start fresh.
      return [];
    }
  }

  // Writes the current list of performances to local storage.
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
