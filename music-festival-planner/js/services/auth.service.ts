import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, throwError, catchError } from 'rxjs';
import { User, AuthResponse } from '../models/user.model';
import { environment } from '../environments/environment';

// Key used to store the authentication token in the browser's local storage.
const TOKEN_KEY = 'mfp_auth_token';
// Key used to store the logged-in user's details in the browser's local storage.
const USER_KEY = 'mfp_auth_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Base URL for all authentication-related API requests.
  private readonly apiUrl = `${environment.apiUrl}/api/auth`;

  // Holds the currently logged-in user and broadcasts changes to any subscribers.
  private currentUserSubject = new BehaviorSubject<User | null>(this.loadStoredUser());
  // Public stream that any component can subscribe to for live user state changes.
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Returns whoever is currently logged in, or null if nobody is.
  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // Quickly checks whether someone is logged in right now.
  get isLoggedIn(): boolean {
    return this.currentUser !== null;
  }

  // Checks whether the current user has the admin role.
  get isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  // Retrieves the stored authentication token so it can be attached to API requests.
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  // Sends the user's credentials to the server and saves the session if successful.
  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      // Save the token and user data that came back from the server.
      tap((res) => this.storeSession(res)),
      // Pass any error through a friendly message formatter.
      catchError(this.handleError),
    );
  }

  // Creates a new account and immediately logs the user in on success.
  register(email: string, password: string, role?: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, { email, password, role }).pipe(
      // Save the session details returned after registration.
      tap((res) => this.storeSession(res)),
      // Pass any error through a friendly message formatter.
      catchError(this.handleError),
    );
  }

  // Clears all stored credentials and signals to subscribers that no one is logged in.
  logout(): void {
    // Remove the authentication token from the browser.
    localStorage.removeItem(TOKEN_KEY);
    // Remove the stored user details from the browser.
    localStorage.removeItem(USER_KEY);
    // Notify all subscribers that the user is now logged out.
    this.currentUserSubject.next(null);
  }

  // Saves the token and user returned by the server so the session survives a page refresh.
  private storeSession(res: AuthResponse): void {
    // Persist the authentication token to local storage.
    localStorage.setItem(TOKEN_KEY, res.token);
    // Persist the user details as a JSON string to local storage.
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    // Update the in-memory subject so all subscribers see the newly logged-in user.
    this.currentUserSubject.next(res.user);
  }

  // Reads any previously saved user from local storage when the service first starts up.
  private loadStoredUser(): User | null {
    try {
      // Check whether there is a stored user string in local storage.
      const raw = localStorage.getItem(USER_KEY);
      // Parse it back into a User object, or return null if nothing was stored.
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      // If the stored data is corrupt or unreadable, treat the user as logged out.
      return null;
    }
  }

  // Pulls a readable message out of an error response and wraps it as a thrown error.
  private handleError(err: { error?: { message?: string }; message?: string }): Observable<never> {
    // Prefer the server's own message, then the generic HTTP message, then a fallback.
    const message = err?.error?.message ?? err?.message ?? 'An unexpected error occurred.';
    return throwError(() => new Error(message));
  }
}
