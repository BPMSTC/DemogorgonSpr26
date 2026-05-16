import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Stage } from '../models/stage.model';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class StageService {
  // Base URL for all stage-related API requests.
  private readonly apiUrl = `${environment.apiUrl}/api/stages`;

  /** In-memory cache: stages from all festivals loaded so far. */
  // Holds all stages fetched from the server so components can read them without extra network calls.
  private cache: Stage[] = [];

  constructor(private http: HttpClient) {}

  /** Shallow clone; Stage model currently contains only primitive fields. */
  // Creates a safe copy of a stage so outside code cannot accidentally mutate the cached version.
  private cloneStage(stage: Stage): Stage {
    return { ...stage };
  }

  // Produces a safe copy of every stage in a list.
  private cloneStageList(stages: Stage[]): Stage[] {
    return stages.map((stage) => this.cloneStage(stage));
  }

  // ---- Data loading ---------------------------------------------------------

  /**
   * Fetches all stages for a specific festival, replacing any previously cached
   * stages for that festival.  Components call this in ngOnInit.
   */
  // Loads stages for a specific festival from the server and updates the local cache.
  loadByFestival(festivalId: string): Observable<Stage[]> {
    return this.http
      .get<Stage[]>(`${this.apiUrl}?festivalId=${encodeURIComponent(festivalId)}`)
      .pipe(
        tap((stages) => {
          // Make safe copies of everything the server returned.
          const clonedStages = this.cloneStageList(stages);
          // Replace cached entries for this festival only, keeping stages from other festivals intact.
          this.cache = [...this.cache.filter((s) => s.festivalId !== festivalId), ...clonedStages];
        }),
        // Format any error into a readable message.
        catchError(this.handleError),
      );
  }

  // ---- Synchronous reads (from cache) --------------------------------------

  /** Returns cached stages for the given festival. */
  // Lets components read stages for a festival instantly from memory without hitting the network.
  getStagesByFestival(festivalId: string): Stage[] {
    return (
      this.cache
        // Keep only stages that belong to the requested festival.
        .filter((s) => s.festivalId === festivalId)
        // Return a safe copy of each so callers cannot accidentally mutate the cache.
        .map((s) => this.cloneStage(s))
    );
  }

  /** Returns a cached stage by ID, or undefined. */
  // Looks up one stage by its ID and returns a safe copy, or nothing if it hasn't been loaded yet.
  getStageById(id: string): Stage | undefined {
    // Search the cache for a matching stage.
    const stage = this.cache.find((s) => s.id === id);
    // Return a safe copy if found, or undefined if the stage is not in the cache.
    return stage ? this.cloneStage(stage) : undefined;
  }

  // ---- Mutations ------------------------------------------------------------

  /** Creates a stage and appends it to the local cache on success. */
  // Sends a new stage to the server and immediately adds it to the local cache so the UI updates.
  createStage(data: Omit<Stage, 'id'>): Observable<Stage> {
    return this.http.post<Stage>(this.apiUrl, data).pipe(
      tap((stage) => {
        // Add the server-assigned stage (including its new ID) to the local cache.
        this.cache.push(this.cloneStage(stage));
      }),
      // Format any error into a readable message.
      catchError(this.handleError),
    );
  }

  /** Deletes a single stage and removes it from the local cache. */
  // Asks the server to delete a stage, then removes it from the local cache so the UI stays in sync.
  deleteStage(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        // Drop the deleted stage from the cache by keeping everything else.
        this.cache = this.cache.filter((s) => s.id !== id);
      }),
      // Format any error into a readable message.
      catchError(this.handleError),
    );
  }

  /**
   * Deletes all stages for a festival (cascade delete).
   * Called when a festival is removed.
   */
  // Removes every stage for a festival from both the server and the local cache.
  clearStagesByFestival(festivalId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/festival/${encodeURIComponent(festivalId)}`).pipe(
      tap(() => {
        // Remove all stages belonging to this festival from the cache.
        this.cache = this.cache.filter((s) => s.festivalId !== festivalId);
      }),
      // Format any error into a readable message.
      catchError(this.handleError),
    );
  }

  /** Stub: conflict checking is delegated to ScheduleService. */
  // Always returns true here because actual availability checking happens in ScheduleService.
  isStageAvailable(
    _festivalId: string,
    _stageName: string,
    _date: string,
    _startTime: string,
    _endTime: string,
    _excludePerformanceId?: string,
  ): boolean {
    return true;
  }

  // ---- Error handling -------------------------------------------------------

  // Pulls a readable message out of an error response and wraps it as a thrown error.
  private handleError(err: { error?: { message?: string }; message?: string }): Observable<never> {
    // Prefer the server's own message, then the generic HTTP message, then a fallback.
    const message = err?.error?.message ?? err?.message ?? 'An unexpected error occurred.';
    return throwError(() => new Error(message));
  }
}
