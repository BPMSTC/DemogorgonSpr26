import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Stage } from '../models/stage.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class StageService {
  private readonly apiUrl = `${environment.apiUrl}/api/stages`;

  /** In-memory cache: stages from all festivals loaded so far. */
  private cache: Stage[] = [];

  constructor(private http: HttpClient) {}

  /** Shallow clone; Stage model currently contains only primitive fields. */
  private cloneStage(stage: Stage): Stage {
    return { ...stage };
  }

  private cloneStageList(stages: Stage[]): Stage[] {
    return stages.map((stage) => this.cloneStage(stage));
  }

  // ---- Data loading ---------------------------------------------------------

  /**
   * Fetches all stages for a specific festival, replacing any previously cached
   * stages for that festival.  Components call this in ngOnInit.
   */
  loadByFestival(festivalId: string): Observable<Stage[]> {
    return this.http
      .get<Stage[]>(`${this.apiUrl}?festivalId=${encodeURIComponent(festivalId)}`)
      .pipe(
        tap((stages) => {
          const clonedStages = this.cloneStageList(stages);
          // Replace cached entries for this festival only.
          this.cache = [
            ...this.cache.filter((s) => s.festivalId !== festivalId),
            ...clonedStages,
          ];
        }),
        catchError(this.handleError)
      );
  }

  // ---- Synchronous reads (from cache) --------------------------------------

  /** Returns cached stages for the given festival. */
  getStagesByFestival(festivalId: string): Stage[] {
    return this.cache
      .filter((s) => s.festivalId === festivalId)
      .map((s) => this.cloneStage(s));
  }

  /** Returns a cached stage by ID, or undefined. */
  getStageById(id: string): Stage | undefined {
    const stage = this.cache.find((s) => s.id === id);
    return stage ? this.cloneStage(stage) : undefined;
  }

  // ---- Mutations ------------------------------------------------------------

  /** Creates a stage and appends it to the local cache on success. */
  createStage(data: Omit<Stage, 'id'>): Observable<Stage> {
    return this.http.post<Stage>(this.apiUrl, data).pipe(
      tap((stage) => {
        this.cache.push(this.cloneStage(stage));
      }),
      catchError(this.handleError)
    );
  }

  /** Deletes a single stage and removes it from the local cache. */
  deleteStage(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        this.cache = this.cache.filter((s) => s.id !== id);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Deletes all stages for a festival (cascade delete).
   * Called when a festival is removed.
   */
  clearStagesByFestival(festivalId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/festival/${encodeURIComponent(festivalId)}`).pipe(
      tap(() => {
        this.cache = this.cache.filter((s) => s.festivalId !== festivalId);
      }),
      catchError(this.handleError)
    );
  }

  /** Stub: conflict checking is delegated to ScheduleService. */
  isStageAvailable(
    _festivalId: string,
    _stageName: string,
    _date: string,
    _startTime: string,
    _endTime: string,
    _excludePerformanceId?: string
  ): boolean {
    return true;
  }

  // ---- Error handling -------------------------------------------------------

  private handleError(err: { error?: { message?: string }; message?: string }): Observable<never> {
    const message =
      err?.error?.message ?? err?.message ?? 'An unexpected error occurred.';
    return throwError(() => new Error(message));
  }
}
