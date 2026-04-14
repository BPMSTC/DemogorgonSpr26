import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Festival } from '../models/festival.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class FestivalService {
  private readonly apiUrl = `${environment.apiUrl}/api/festivals`;

  /** In-memory cache populated by the most recent load() call. */
  private cache: Festival[] = [];

  constructor(private http: HttpClient) {}

  // ---- Data loading ---------------------------------------------------------

  /**
   * Fetches all festivals from the API and refreshes the local cache.
   * Components should call this in ngOnInit and subscribe to receive the data.
   */
  load(): Observable<Festival[]> {
    return this.http.get<Festival[]>(this.apiUrl).pipe(
      tap((festivals) => {
        this.cache = festivals;
      }),
      catchError(this.handleError)
    );
  }

  // ---- Synchronous reads (from cache) --------------------------------------

  /** Returns a shallow copy of the cached festival list. */
  getFestivals(): Festival[] {
    return [...this.cache];
  }

  /** Finds a cached festival by ID, or undefined if not found. */
  getFestivalById(id: string): Festival | undefined {
    return this.cache.find((f) => f.id === id);
  }

  // ---- Mutations ------------------------------------------------------------

  /** Creates a festival and adds it to the local cache on success. */
  createFestival(data: Omit<Festival, 'id'>): Observable<Festival> {
    return this.http.post<Festival>(this.apiUrl, data).pipe(
      tap((festival) => {
        this.cache.push(festival);
      }),
      catchError(this.handleError)
    );
  }

  /** Partially updates a festival and refreshes its cache entry on success. */
  updateFestival(
    id: string,
    fields: Partial<Omit<Festival, 'id'>>
  ): Observable<Festival> {
    return this.http.patch<Festival>(`${this.apiUrl}/${id}`, fields).pipe(
      tap((updated) => {
        const idx = this.cache.findIndex((f) => f.id === id);
        if (idx !== -1) this.cache[idx] = updated;
      }),
      catchError(this.handleError)
    );
  }

  /** Deletes a festival and removes it from the local cache on success. */
  deleteFestival(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        this.cache = this.cache.filter((f) => f.id !== id);
      }),
      catchError(this.handleError)
    );
  }

  // ---- Error handling -------------------------------------------------------

  private handleError(err: { error?: { message?: string }; message?: string }): Observable<never> {
    const message =
      err?.error?.message ?? err?.message ?? 'An unexpected error occurred.';
    return throwError(() => new Error(message));
  }
}
