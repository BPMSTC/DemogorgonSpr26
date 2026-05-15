import { Injectable, InjectionToken, Signal, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Performance } from '../models/performance.model';
import { environment } from '../environments/environment';

/**
 * Re-exported so PersonalScheduleService (which still uses localStorage) can
 * continue to import LOCAL_STORAGE from this module without breaking.
 */
// Provide a dependency-injection token for localStorage so it can be swapped in tests.
export const LOCAL_STORAGE = new InjectionToken<Storage>('localStorage', {
  providedIn: 'root',
  factory: () => localStorage,
});

// ---- Service ---------------------------------------------------------------

@Injectable({
  providedIn: 'root',
})
export class ScheduleService {
  // Base URL for all performance-related API requests.
  private readonly apiUrl = `${environment.apiUrl}/api/performances`;

  /**
   * In-memory signal holding all performances loaded across festivals.
   * Components that use effect() will react automatically when this updates.
   */
  // Stores all loaded performances in a reactive signal so the UI updates without manual refresh.
  private readonly performancesState = signal<Performance[]>([]);

  /** Read-only signal for components that need reactive schedule state. */
  // Exposes the performances signal to components without letting them write to it directly.
  readonly performancesSignal: Signal<Performance[]> =
    this.performancesState.asReadonly();

  constructor(private http: HttpClient) {}

  // ---- Data loading ---------------------------------------------------------

  /**
   * Fetches all performances for a festival and merges them into the signal.
   * Components call this in ngOnInit; the signal update triggers any effect()
   * that reads performancesSignal or getPerformancesByFestival().
   */
  // Loads performances for a specific festival from the server and updates the in-memory signal.
  loadByFestival(festivalId: string): Observable<Performance[]> {
    return this.http
      .get<Performance[]>(`${this.apiUrl}?festivalId=${encodeURIComponent(festivalId)}`)
      .pipe(
        tap((perfs) => {
          // Keep all performances that belong to other festivals.
          const current = this.performancesState().filter(
            (p) => p.festivalId !== festivalId
          );
          // Merge the fresh festival performances in with the ones we kept.
          this.performancesState.set([...current, ...perfs]);
        }),
        // Format any error into a readable message.
        catchError(this.handleError)
      );
  }

  // ---- Synchronous reads (from signal) -------------------------------------

  /** Returns performances for the given festival from the in-memory signal. */
  // Filters the in-memory signal for one festival and returns safe copies to avoid mutation.
  getPerformancesByFestival(festivalId: string): Performance[] {
    return this.performancesState()
      // Only keep performances that belong to the requested festival.
      .filter((p) => p.festivalId === festivalId)
      // Return a shallow copy of each so callers cannot accidentally mutate the signal.
      .map((p) => ({ ...p }));
  }

  /**
   * Tests whether a stage is already booked during the requested time window.
   * Uses the standard interval-overlap formula against in-memory signal state.
   * The backend also validates this on POST, providing a double safety net.
   */
  // Checks whether any existing performance would conflict with the proposed time slot on a stage.
  isStageOccupied(
    festivalId: string,
    stageName: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeId?: string
  ): boolean {
    // Convert the proposed start and end times to minute totals for easy comparison.
    const newStart = this.toMinutes(startTime);
    const newEnd = this.toMinutes(endTime);
    // If the times are invalid or the window is empty, treat the stage as free.
    if (newStart === null || newEnd === null || newStart >= newEnd) return false;

    // Search the in-memory signal for any performance that overlaps the proposed slot.
    return this.performancesState().some((p) => {
      // Skip performances at other festivals.
      if (p.festivalId !== festivalId) return false;
      // Skip performances on other stages.
      if (p.stageName !== stageName) return false;
      // Skip performances on other dates.
      if (p.date !== date) return false;
      // Skip the performance we are currently editing, if one was provided.
      if (excludeId && p.id === excludeId) return false;

      // Convert this performance's times to minutes for arithmetic comparison.
      const s = this.toMinutes(p.startTime);
      const e = this.toMinutes(p.endTime);
      // If this performance has invalid times, it cannot block a slot.
      if (s === null || e === null) return false;
      // Two intervals overlap when one starts before the other ends (and vice versa).
      return newStart < e && newEnd > s;
    });
  }

  // ---- Mutations ------------------------------------------------------------

  /**
   * Validates timing and double-booking locally for immediate UX feedback,
   * then persists to the API.  Updates the signal so reactive components
   * (effect()) re-render without needing an extra network round-trip.
   */
  // Validates the new performance locally, sends it to the server, and adds it to the signal on success.
  createPerformance(data: Omit<Performance, 'id'>): Observable<Performance> {
    // Convert the start and end times to minutes so we can compare them.
    const startMinutes = this.toMinutes(data.startTime);
    const endMinutes = this.toMinutes(data.endTime);

    // Reject the request immediately if either time string is not a valid time.
    if (startMinutes === null || endMinutes === null) {
      return throwError(
        () =>
          new Error(
            'Start and end times must be valid 24-hour times (H:mm or HH:mm).'
          )
      );
    }
    // Reject the request if the performance ends before or exactly when it starts.
    if (startMinutes >= endMinutes) {
      return throwError(() => new Error('End time must be later than start time.'));
    }
    // Reject the request if another performance already occupies the stage at this time.
    if (
      this.isStageOccupied(
        data.festivalId,
        data.stageName,
        data.date,
        data.startTime,
        data.endTime
      )
    ) {
      return throwError(
        () =>
          new Error(`"${data.stageName}" is already booked during that time slot.`)
      );
    }

    // All local checks passed — send the new performance to the server.
    return this.http.post<Performance>(this.apiUrl, data).pipe(
      // Add the server-assigned performance (with its new ID) to the in-memory signal.
      tap((perf) => this.performancesState.update((p) => [...p, perf])),
      // Format any error into a readable message.
      catchError(this.handleError)
    );
  }

  /** Deletes a single performance by ID and removes it from the signal. */
  // Asks the server to delete a performance, then removes it from the signal so the UI updates.
  deletePerformance(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      // Drop the deleted performance from the signal by keeping everything else.
      tap(() =>
        this.performancesState.update((p) => p.filter((perf) => perf.id !== id))
      ),
      // Format any error into a readable message.
      catchError(this.handleError)
    );
  }

  /**
   * Deletes all performances for a festival (cascade delete / clear all).
   * Removes them from the signal so reactive components update immediately.
   */
  // Removes every performance for a festival from both the server and the in-memory signal.
  clearPerformancesByFestival(festivalId: string): Observable<void> {
    return this.http
      .delete<void>(`${this.apiUrl}/festival/${encodeURIComponent(festivalId)}`)
      .pipe(
        // Remove all performances for this festival from the signal.
        tap(() =>
          this.performancesState.update((p) =>
            p.filter((perf) => perf.festivalId !== festivalId)
          )
        ),
        // Format any error into a readable message.
        catchError(this.handleError)
      );
  }

  // ---- Private helpers ------------------------------------------------------

  // Converts a time string like "14:30" into a total number of minutes since midnight.
  private toMinutes(time: string): number | null {
    // Match the expected HH:mm or H:mm format using a regular expression.
    const match = /^(\d{1,2}):(\d{2})$/.exec((time ?? '').trim());
    // Return null if the string does not match the expected pattern.
    if (!match) return null;
    // Parse the hour and minute parts as numbers.
    const h = Number(match[1]);
    const m = Number(match[2]);
    // Return null if either part is not a whole number.
    if (!Number.isInteger(h) || !Number.isInteger(m)) return null;
    // Return null if the values are outside the valid range for a clock time.
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    // Combine hours and minutes into a single comparable number.
    return h * 60 + m;
  }

  // Pulls a readable message out of an error response and wraps it as a thrown error.
  private handleError(err: { error?: { message?: string }; message?: string }): Observable<never> {
    // Prefer the server's own message, then the generic HTTP message, then a fallback.
    const message =
      err?.error?.message ?? err?.message ?? 'An unexpected error occurred.';
    return throwError(() => new Error(message));
  }
}
