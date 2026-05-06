import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, throwError, catchError } from 'rxjs';
import { User, AuthResponse } from '../models/user.model';
import { environment } from '../../environments/environment';

const TOKEN_KEY = 'mfp_auth_token';
const USER_KEY = 'mfp_auth_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/api/auth`;

  private currentUserSubject = new BehaviorSubject<User | null>(this.loadStoredUser());
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get isLoggedIn(): boolean {
    return this.currentUser !== null;
  }

  get isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap((res) => this.storeSession(res)),
      catchError(this.handleError)
    );
  }

  register(email: string, password: string, role?: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, { email, password, role }).pipe(
      tap((res) => this.storeSession(res)),
      catchError(this.handleError)
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUserSubject.next(null);
  }

  private storeSession(res: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this.currentUserSubject.next(res.user);
  }

  private loadStoredUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }

  private handleError(err: { error?: { message?: string }; message?: string }): Observable<never> {
    const message = err?.error?.message ?? err?.message ?? 'An unexpected error occurred.';
    return throwError(() => new Error(message));
  }
}
