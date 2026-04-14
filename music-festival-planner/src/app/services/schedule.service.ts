import { Injectable, InjectionToken, Signal, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Performance } from '../models/performance.model';
import { environment } from '../../environments/environment';

/**
 * Re-exported so PersonalScheduleService (which still uses localStorage) can
 * continue to import LOCAL_STORAGE from this module without breaking.
 */
export const LOCAL_STORAGE = new InjectionToken<Storage>('localStorage', {
  providedIn: 'root',
  factory: () => localStorage,
});

// ---- Service ---------------------------------------------------------------

@Injectable({
  providedIn: 'root',
})
export class ScheduleService {
  private readonly apiUrl = `${environment.apiUrl}/api/performances`;

  /**
   * In-memory signal holding all performances loaded across festivals.
   * Components that use effect() will react automatically when this updates.
   */
  private readonly performancesState = signal<Performance[]>([]);

  /** Read-only signal for components that need reactive schedule state. */
  readonly performancesSignal: Signal<Performance[]> =
    this.performancesState.asReadonly();

  constructor(private http: HttpClient) {}

  // ---- Data loading ---------------------------------------------------------

  /**
   * Fetches all performances for a festival and merges them into the signal.
   * Components call this in ngOnInit; the signal update triggers any effect()
   * that reads performancesSignal or getPerformancesByFestival().
   */
  loadByFestival(festivalId: string): Observable<Performance[]> {
    return this.http
      .get<Performance[]>(`${this.apiUrl}?festivalId=${encodeURIComponent(festivalId)}`)
      .pipe(
        tap((perfs) => {
          const current = this.performancesState().filter(
            (p) => p.festivalId !== festivalId
          );
          this.performancesState.set([...current, ...perfs]);
        }),
        catchError(this.handleError)
      );
  }

  // ---- Synchronous reads (from signal) -------------------------------------

  /** Returns performances for the given festival from the in-memory signal. */
  getPerformancesByFestival(festivalId: string): Performance[] {
    return this.performancesState()
      .filter((p) => p.festivalId === festivalId)
      .map((p) => ({ ...p }));
  }

  /**
   * Tests whether a stage is already booked during the requested time window.
   * Uses the standard interval-overlap formula against in-memory signal state.
   * The backend also validates this on POST, providing a double safety net.
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
    const newEnd = this.toMinutes(endTime);
    if (newStart === null || newEnd === null || newStart >= newEnd) return false;

    return this.performancesState().some((p) => {
      if (p.festivalId !== festivalId) return false;
      if (p.stageName !== stageName) return false;
      if (p.date !== date) return false;
      if (excludeId && p.id === excludeId) return false;

      const s = this.toMinutes(p.startTime);
      const e = this.toMinutes(p.endTime);
      if (s === null || e === null) return false;
      return newStart < e && newEnd > s;
    });
  }

  // ---- Mutations ------------------------------------------------------------

  /**
   * Validates timing and double-booking locally for immediate UX feedback,
   * then persists to the API.  Updates the signal so reactive components
   * (effect()) re-render without needing an extra network round-trip.
   */
  createPerformance(data: Omit<Performance, 'id'>): Observable<Performance> {
    const startMinutes = this.toMinutes(data.startTime);
    const endMinutes = this.toMinutes(data.endTime);

    if (startMinutes === null || endMinutes === null) {
      return throwError(
        () =>
          new Error(
            'Start and end times must be valid 24-hour times (H:mm or HH:mm).'
          )
      );
    }
    if (startMinutes >= endMinutes) {
      return throwError(() => new Error('End time must be later than start time.'));
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
      return throwError(
        () =>
          new Error(`"${data.stageName}" is already booked during that time slot.`)
      );
    }

    return this.http.post<Performance>(this.apiUrl, data).pipe(
      tap((perf) => this.performancesState.update((p) => [...p, perf])),
      catchError(this.handleError)
    );
  }

  /** Deletes a single performance by ID and removes it from the signal. */
  deletePerformance(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() =>
        this.performancesState.update((p) => p.filter((perf) => perf.id !== id))
      ),
      catchError(this.handleError)
    );
  }

  /**
   * Deletes all performances for a festival (cascade delete / clear all).
   * Removes them from the signal so reactive components update immediately.
   */
  clearPerformancesByFestival(festivalId: string): Observable<void> {
    return this.http
      .delete<void>(`${this.apiUrl}/festival/${encodeURIComponent(festivalId)}`)
      .pipe(
        tap(() =>
          this.performancesState.update((p) =>
            p.filter((perf) => perf.festivalId !== festivalId)
          )
        ),
        catchError(this.handleError)
      );
  }

  // ---- Private helpers ------------------------------------------------------

  private toMinutes(time: string): number | null {
    const match = /^(\d{1,2}):(\d{2})$/.exec((time ?? '').trim());
    if (!match) return null;
    const h = Number(match[1]);
    const m = Number(match[2]);
    if (!Number.isInteger(h) || !Number.isInteger(m)) return null;
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return h * 60 + m;
  }

  private handleError(err: { error?: { message?: string }; message?: string }): Observable<never> {
    const message =
      err?.error?.message ?? err?.message ?? 'An unexpected error occurred.';
    return throwError(() => new Error(message));
  }
}
