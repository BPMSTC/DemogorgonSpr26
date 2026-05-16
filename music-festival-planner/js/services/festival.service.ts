import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Festival } from '../models/festival.model';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class FestivalService {
  // Base URL for all festival-related API requests.
  private readonly apiUrl = `${environment.apiUrl}/api/festivals`;

  /** In-memory cache populated by the most recent load() call. */
  // Holds the festivals fetched from the server so components can read them without extra network calls.
  private cache: Festival[] = [];

  constructor(private http: HttpClient) {}

  /** Shallow clone; Festival model currently contains only primitive fields. */
  // Creates a safe copy of a festival so outside code cannot accidentally mutate the cached version.
  private cloneFestival(festival: Festival): Festival {
    return { ...festival };
  }

  // Produces a safe copy of every festival in a list.
  private cloneFestivalList(festivals: Festival[]): Festival[] {
    return festivals.map((festival) => this.cloneFestival(festival));
  }

  // ---- Data loading ---------------------------------------------------------

  /**
   * Fetches all festivals from the API and refreshes the local cache.
   * Components should call this in ngOnInit and subscribe to receive the data.
   */
  // Pulls the full list of festivals from the server and stores them locally.
  load(): Observable<Festival[]> {
    return this.http.get<Festival[]>(this.apiUrl).pipe(
      // Replace the cache with fresh data from the server.
      tap((festivals) => {
        this.cache = this.cloneFestivalList(festivals);
      }),
      // Return safe copies to callers rather than the raw cache entries.
      map(() => this.cloneFestivalList(this.cache)),
      // Format any error into a readable message.
      catchError(this.handleError),
    );
  }

  /** Fetches a single festival by ID and updates/adds it in the local cache. */
  // Loads one festival from the server and refreshes its entry in the local cache.
  loadById(id: string): Observable<Festival> {
    return this.http.get<Festival>(`${this.apiUrl}/${id}`).pipe(
      tap((festival) => {
        // Store a safe copy of the returned festival.
        const clonedFestival = this.cloneFestival(festival);
        // Check whether this festival is already in the cache.
        const idx = this.cache.findIndex((f) => f.id === id);
        if (idx === -1) {
          // It's new — add it to the end of the cache.
          this.cache.push(clonedFestival);
        } else {
          // It already exists — replace the stale entry with the updated one.
          this.cache[idx] = clonedFestival;
        }
      }),
      // Give the caller a safe copy rather than a direct reference.
      map((festival) => this.cloneFestival(festival)),
      // Format any error into a readable message.
      catchError(this.handleError),
    );
  }

  // ---- Synchronous reads (from cache) --------------------------------------

  /** Returns a shallow copy of the cached festival list. */
  // Lets components read all festivals instantly from memory without hitting the network.
  getFestivals(): Festival[] {
    return this.cloneFestivalList(this.cache);
  }

  /** Finds a cached festival by ID, or undefined if not found. */
  // Looks up one festival by its ID and returns a safe copy, or nothing if it hasn't been loaded yet.
  getFestivalById(id: string): Festival | undefined {
    const festival = this.cache.find((f) => f.id === id);
    return festival ? this.cloneFestival(festival) : undefined;
  }

  // ---- Mutations ------------------------------------------------------------

  /** Creates a festival and adds it to the local cache on success. */
  // Sends a new festival to the server and immediately adds it to the local cache so the UI updates.
  createFestival(data: Omit<Festival, 'id'>): Observable<Festival> {
    return this.http.post<Festival>(this.apiUrl, data).pipe(
      // Add the server-assigned festival (including its new ID) to the local cache.
      tap((festival) => {
        this.cache.push(this.cloneFestival(festival));
      }),
      // Format any error into a readable message.
      catchError(this.handleError),
    );
  }

  /** Partially updates a festival and refreshes its cache entry on success. */
  // Sends only the changed fields to the server and updates the matching cache entry on success.
  updateFestival(id: string, fields: Partial<Omit<Festival, 'id'>>): Observable<Festival> {
    return this.http.patch<Festival>(`${this.apiUrl}/${id}`, fields).pipe(
      tap((updated) => {
        // Find the position of the old entry in the cache.
        const idx = this.cache.findIndex((f) => f.id === id);
        // Replace it with the updated version returned by the server.
        if (idx !== -1) this.cache[idx] = this.cloneFestival(updated);
      }),
      // Format any error into a readable message.
      catchError(this.handleError),
    );
  }

  /** Deletes a festival and removes it from the local cache on success. */
  // Asks the server to delete a festival, then removes it from the local cache so the UI stays in sync.
  deleteFestival(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      // Drop the deleted festival from the cache by keeping everything else.
      tap(() => {
        this.cache = this.cache.filter((f) => f.id !== id);
      }),
      // Format any error into a readable message.
      catchError(this.handleError),
    );
  }

  // ---- Error handling -------------------------------------------------------

  // Pulls a readable message out of an error response and wraps it as a thrown error.
  private handleError(err: { error?: { message?: string }; message?: string }): Observable<never> {
    const message = err?.error?.message ?? err?.message ?? 'An unexpected error occurred.';
    return throwError(() => new Error(message));
  }
}
